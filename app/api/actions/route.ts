import { z } from "zod";
import { getChatGPTUser } from "../../chatgpt-auth";
import { memberFor, rawDb } from "../../../lib/server";
import { dayKey, shiftDay, weekKey } from "../../../lib/league";
export const dynamic = "force-dynamic";
const name = z.string().trim().min(2).max(50), goal = z.number().int().min(2).max(5);
const days = z.array(z.number().int().min(0).max(6)).max(7).refine(a => new Set(a).size === a.length);
const profile = { name, goal, days, consent: z.literal(true) };
const schemas = {
  createCampus: z.object({ action: z.literal("createCampus"), ...profile, campusName: name, gymName: name }),
  joinCampus: z.object({ action: z.literal("joinCampus"), ...profile, code: z.string().trim().min(6).max(12) }),
  plan: z.object({ action: z.literal("plan"), goal, days }),
  workout: z.object({ action: z.literal("workout"), title: z.string().trim().min(2).max(80), type: z.enum(["Strength", "Cardio", "Mixed"]), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), duration: z.number().int().min(5).max(240), notes: z.string().trim().max(600), code: z.string().trim().max(6), exercises: z.array(z.object({ name: z.string().trim().min(1).max(60), sets: z.number().int().min(1).max(20), reps: z.number().int().min(1).max(100), weight: z.number().min(0).max(1000) })).max(12) }),
  review: z.object({ action: z.literal("review"), id: z.string().min(1), decision: z.enum(["verified", "declined"]), confirmed: z.boolean(), note: z.string().trim().max(250) }),
  createSquad: z.object({ action: z.literal("createSquad"), name }),
  joinSquad: z.object({ action: z.literal("joinSquad"), code: z.string().trim().min(6).max(12) }),
  cheer: z.object({ action: z.literal("cheer"), id: z.string().min(1) }),
  desk: z.object({ action: z.literal("desk") }),
  role: z.object({ action: z.literal("role"), id: z.string().min(1), role: z.enum(["staff", "member"]) }),
};
class HttpError extends Error { constructor(message: string, public status = 400) { super(message); } }
const id = () => crypto.randomUUID();
function invite() { const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; return Array.from(crypto.getRandomValues(new Uint8Array(8)), v => alphabet[v % alphabet.length]).join(""); }
export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host") && new URL(origin).origin !== new URL(request.url).origin) throw new HttpError("This request did not originate from RepClub.", 403);
    const user = await getChatGPTUser(); if (!user) throw new HttpError("Sign in to save your campus activity.", 401);
    const body = z.object({ action: z.string() }).passthrough().parse(await request.json()) as { action: keyof typeof schemas };
    if (!Object.hasOwn(schemas, body.action)) throw new HttpError("Unknown action.");
    const data = schemas[body.action].parse(body), db = rawDb(), now = Date.now(), week = weekKey();
    const me = await memberFor(user.userId);
    if (data.action === "createCampus" || data.action === "joinCampus") {
      if (me) throw new HttpError("You already belong to a campus.", 409);
      let campusId: string, squadId: string | null = null;
      const statements: D1PreparedStatement[] = [];
      if (data.action === "createCampus") {
        campusId = id(); statements.push(db.prepare("INSERT INTO campuses (id,name,gym_name,invite_code,owner_id,created_at) VALUES (?,?,?,?,?,?)").bind(campusId, data.campusName, data.gymName, invite(), user.userId, now));
      } else {
        const code = data.code.toUpperCase();
        const campus = await db.prepare("SELECT id FROM campuses WHERE invite_code=?").bind(code).first<{ id: string }>();
        if (campus) campusId = campus.id;
        else { const squad = await db.prepare("SELECT id,campus_id FROM squads WHERE invite_code=?").bind(code).first<{ id: string; campus_id: string }>(); if (!squad) throw new HttpError("That invite code wasn't found. Check it with your friend.", 404); campusId = squad.campus_id; squadId = squad.id; }
        const size = await db.prepare("SELECT COUNT(*) AS n FROM members WHERE campus_id=?").bind(campusId).first<{ n: number }>();
        if ((size?.n || 0) >= 200) throw new HttpError("This pilot has reached its 200-member capacity.", 409);
      }
      statements.push(db.prepare("INSERT INTO members (user_id,campus_id,name,role,goal,days,squad_id,joined_at) VALUES (?,?,?,?,?,?,?,?)").bind(user.userId, campusId, data.name, data.action === "createCampus" ? "owner" : "member", data.goal, JSON.stringify(data.days), squadId, now));
      statements.push(db.prepare("INSERT INTO plans (id,user_id,week,goal,days) VALUES (?,?,?,?,?)").bind(id(), user.userId, week, data.goal, JSON.stringify(data.days)));
      await db.batch(statements); return Response.json({ ok: true });
    }
    if (!me) throw new HttpError("Create or join a campus first.", 403);
    const staff = () => { if (me.role === "member") throw new HttpError("Only gym staff can do that.", 403); };
    const existingPlan = await db.prepare("SELECT id FROM plans WHERE user_id=? AND week=?").bind(me.userId, week).first();
    if (!existingPlan) await db.prepare("INSERT OR IGNORE INTO plans (id,user_id,week,goal,days) VALUES (?,?,?,?,?)").bind(id(), me.userId, week, me.goal, me.days).run();
    switch (data.action) {
      case "plan": {
        const activity = await db.prepare("SELECT id FROM sessions WHERE user_id=? AND date>=? AND date<=? LIMIT 1").bind(me.userId, week, shiftDay(week, 6)).first();
        if (activity && data.goal !== me.goal) throw new HttpError("Your target is locked after your first log this week. You can still move your planned days.", 409);
        await db.batch([db.prepare("UPDATE members SET goal=?,days=? WHERE user_id=?").bind(data.goal, JSON.stringify(data.days), me.userId), db.prepare("UPDATE plans SET goal=?,days=? WHERE user_id=? AND week=?").bind(data.goal, JSON.stringify(data.days), me.userId, week)]); break;
      }
      case "workout": {
        const today = dayKey();
        if (data.date > today || data.date < shiftDay(today, -6) || Number.isNaN(Date.parse(data.date)) || new Date(data.date + "T12:00:00Z").toISOString().slice(0,10) !== data.date) throw new HttpError("Choose a real date within the last seven days.");
        const duplicate = await db.prepare("SELECT id FROM sessions WHERE user_id=? AND date=? AND status!='declined' LIMIT 1").bind(me.userId, data.date).first();
        if (duplicate) throw new HttpError("You already have a workout for this day. One gym day counts once.", 409);
        let deskSupported = 0;
        if (data.code) {
          if (data.date !== today) throw new HttpError("A gym desk code can only support today's attendance.");
          const code = await db.prepare("SELECT code FROM desk_codes WHERE campus_id=? AND code=? AND expires_at>?").bind(me.campusId, data.code, now).first();
          if (!code) throw new HttpError("That gym desk code has expired or is incorrect. Ask the desk for the current code."); deskSupported = 1;
        }
        await db.batch([
          db.prepare("INSERT OR IGNORE INTO plans (id,user_id,week,goal,days) VALUES (?,?,?,?,?)").bind(id(), me.userId, weekKey(data.date), me.goal, me.days),
          db.prepare("INSERT INTO sessions (id,campus_id,user_id,title,type,date,duration,notes,exercises,status,desk_supported,created_at) VALUES (?,?,?,?,?,?,?,?,?,'pending',?,?)").bind(id(), me.campusId, me.userId, data.title, data.type, data.date, data.duration, data.notes, JSON.stringify(data.exercises), deskSupported, now),
        ]); break;
      }
      case "review": {
        staff(); const session = await db.prepare("SELECT user_id,status FROM sessions WHERE id=? AND campus_id=?").bind(data.id, me.campusId).first<{ user_id: string; status: string }>();
        if (!session) throw new HttpError("Workout not found.", 404);
        if (session.user_id === me.userId) throw new HttpError("Another verifier must review your own attendance.", 403);
        if (session.status !== "pending") throw new HttpError("This workout has already been reviewed.", 409);
        if (data.decision === "verified" && !data.confirmed) throw new HttpError("Confirm that you independently checked this member's gym attendance.");
        if (data.decision === "declined" && data.note.length < 3) throw new HttpError("Give the member a short reason so they can resolve the issue.");
        await db.prepare("UPDATE sessions SET status=?,reviewed_by=?,reviewed_at=?,review_note=? WHERE id=? AND campus_id=? AND status='pending'").bind(data.decision, me.userId, now, data.note, data.id, me.campusId).run(); break;
      }
      case "createSquad": {
        const squadId = id(); await db.batch([db.prepare("INSERT INTO squads (id,campus_id,name,invite_code,created_at) VALUES (?,?,?,?,?)").bind(squadId, me.campusId, data.name, invite(), now), db.prepare("UPDATE members SET squad_id=? WHERE user_id=?").bind(squadId, me.userId)]); break;
      }
      case "joinSquad": {
        const squad = await db.prepare("SELECT id FROM squads WHERE invite_code=? AND campus_id=?").bind(data.code.toUpperCase(), me.campusId).first<{ id: string }>();
        if (!squad) throw new HttpError("That squad wasn't found in your campus.", 404);
        await db.prepare("UPDATE members SET squad_id=? WHERE user_id=?").bind(squad.id, me.userId).run(); break;
      }
      case "cheer": {
        const session = await db.prepare("SELECT s.user_id,m.squad_id FROM sessions s JOIN members m ON s.user_id=m.user_id WHERE s.id=? AND s.campus_id=?").bind(data.id, me.campusId).first<{ user_id: string; squad_id: string | null }>();
        if (!session || (session.user_id !== me.userId && (!me.squadId || session.squad_id !== me.squadId))) throw new HttpError("You can encourage workouts shared with your squad.", 403);
        const existing = await db.prepare("SELECT id FROM cheers WHERE session_id=? AND user_id=?").bind(data.id, me.userId).first<{ id: string }>();
        if (existing) await db.prepare("DELETE FROM cheers WHERE id=?").bind(existing.id).run();
        else await db.prepare("INSERT OR IGNORE INTO cheers (id,session_id,user_id) VALUES (?,?,?)").bind(id(), data.id, me.userId).run(); break;
      }
      case "desk": {
        staff(); const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000);
        await db.prepare("INSERT INTO desk_codes (campus_id,code,expires_at) VALUES (?,?,?) ON CONFLICT(campus_id) DO UPDATE SET code=excluded.code,expires_at=excluded.expires_at").bind(me.campusId, code, now + 15 * 60_000).run(); break;
      }
      case "role": {
        if (me.role !== "owner") throw new HttpError("Only the campus owner can appoint verifiers.", 403);
        if (data.id === me.userId) throw new HttpError("The campus owner role cannot be changed here.");
        const target = await db.prepare("SELECT user_id FROM members WHERE user_id=? AND campus_id=?").bind(data.id, me.campusId).first(); if (!target) throw new HttpError("Member not found.", 404);
        await db.prepare("UPDATE members SET role=? WHERE user_id=? AND campus_id=? AND role!='owner'").bind(data.role, data.id, me.campusId).run(); break;
      }
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return Response.json({ error: error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") }, { status: 400 });
    if (error instanceof SyntaxError) return Response.json({ error: "The request could not be read." }, { status: 400 });
    if (error instanceof Error && /UNIQUE constraint failed: sessions\.user_id, sessions\.date/.test(error.message)) return Response.json({ error: "You already have a workout for this day. One gym day counts once." }, { status: 409 });
    console.error("RepClub action failed", error instanceof Error ? error.message : "unknown"); return Response.json({ error: "We couldn't save that change. Please try again." }, { status: 500 });
  }
}
