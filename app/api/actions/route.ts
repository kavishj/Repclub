import { z } from "zod";
import { getChatGPTUser } from "../../chatgpt-auth";
import { memberFor, rawDb } from "../../../lib/server";
import { dayKey, shiftDay, weekKey, MIN_SCAN_DURATION, MAX_SCAN_DURATION } from "../../../lib/league";
export const dynamic = "force-dynamic";
const name = z.string().trim().min(2).max(50), goal = z.number().int().min(2).max(5);
const days = z.array(z.number().int().min(0).max(6)).max(7).refine(a => new Set(a).size === a.length);
const profile = { name, goal, days, consent: z.literal(true) };
const workoutDetails = {
  title: z.string().trim().min(2).max(80), type: z.enum(["Strength", "Cardio", "Mixed"]),
  notes: z.string().trim().max(600),
  exercises: z.array(z.object({ name: z.string().trim().min(1).max(60), sets: z.number().int().min(1).max(20), reps: z.number().int().min(1).max(100), weight: z.number().min(0).max(1000) })).max(12),
};
const scanCode = z.string().regex(/^repclub:gym:v1:[a-f0-9]{64}$/);
const schemas = {
  createCampus: z.object({ action: z.literal("createCampus"), ...profile, campusName: name, gymName: name }),
  joinCampus: z.object({ action: z.literal("joinCampus"), ...profile, code: z.string().trim().min(6).max(12) }),
  plan: z.object({ action: z.literal("plan"), goal, days }),
  workout: z.object({ action: z.literal("workout"), ...workoutDetails, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), duration: z.number().int().min(1).max(1440), requestId: z.string().uuid().optional(), code: z.string().trim().max(6).optional() }).strict(),
  scanStart: z.object({ action: z.literal("scanStart"), code: scanCode }).strict(),
  scanFinish: z.object({ action: z.literal("scanFinish"), id: z.string().min(1), code: scanCode }).strict(),
  manualFinish: z.object({ action: z.literal("manualFinish"), id: z.string().min(1), ...workoutDetails, duration: z.number().int().min(1).max(1440) }).strict(),
  scanCancel: z.object({ action: z.literal("scanCancel"), id: z.string().min(1) }).strict(),
  workoutDetails: z.object({ action: z.literal("workoutDetails"), id: z.string().min(1), ...workoutDetails }).strict(),
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
    const checkScan = async (code: string) => {
      const valid = await db.prepare("SELECT campus_id FROM desk_codes WHERE campus_id=? AND ((code=? AND expires_at>?) OR (previous_code=? AND previous_expires_at>?))").bind(me.campusId, code, now, code, now).first();
      if (!valid) throw new HttpError("This gym QR has expired or belongs to another campus. Scan the current QR at your gym.");
    };
    const existingPlan = await db.prepare("SELECT id FROM plans WHERE user_id=? AND week=?").bind(me.userId, week).first();
    if (!existingPlan) await db.prepare("INSERT OR IGNORE INTO plans (id,user_id,week,goal,days) VALUES (?,?,?,?,?)").bind(id(), me.userId, week, me.goal, me.days).run();
    switch (data.action) {
      case "plan": {
        const activity = await db.prepare("SELECT id FROM plans WHERE user_id=? AND week=? AND (locked_at IS NOT NULL OR EXISTS (SELECT 1 FROM sessions WHERE user_id=? AND date>=? AND date<=? AND started_at IS NOT NULL)) LIMIT 1").bind(me.userId, week, me.userId, week, shiftDay(week, 6)).first();
        if (activity && data.goal !== me.goal) throw new HttpError("Your target is locked after your first scan this week. You can still move your planned days.", 409);
        const results = await db.batch([
          db.prepare("UPDATE members SET goal=?,days=? WHERE user_id=? AND (goal=? OR NOT EXISTS (SELECT 1 FROM plans WHERE user_id=? AND week=? AND locked_at IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM sessions WHERE user_id=? AND date>=? AND date<=? AND started_at IS NOT NULL))").bind(data.goal, JSON.stringify(data.days), me.userId, data.goal, me.userId, week, me.userId, week, shiftDay(week, 6)),
          db.prepare("UPDATE plans SET goal=(SELECT goal FROM members WHERE user_id=?),days=(SELECT days FROM members WHERE user_id=?) WHERE user_id=? AND week=?").bind(me.userId, me.userId, me.userId, week),
        ]);
        if (!results[0].meta.changes) throw new HttpError("Your target is locked after your first scan this week. You can still move your planned days.", 409);
        break;
      }
      case "workout": {
        const today = dayKey();
        if (data.date > today || data.date < shiftDay(today, -6) || Number.isNaN(Date.parse(data.date)) || new Date(data.date + "T12:00:00Z").toISOString().slice(0,10) !== data.date) throw new HttpError("Choose a real date within the last seven days.");
        if (data.requestId) {
          const previous = await db.prepare("SELECT user_id,campus_id,timing_source FROM sessions WHERE id=?").bind(data.requestId).first<{ user_id: string; campus_id: string; timing_source: string }>();
          if (previous) {
            if (previous.user_id !== me.userId || previous.campus_id !== me.campusId || previous.timing_source !== "manual") throw new HttpError("This save reference is unavailable.", 409);
            break;
          }
        }
        await db.batch([
          db.prepare("INSERT OR IGNORE INTO plans (id,user_id,week,goal,days) VALUES (?,?,?,?,?)").bind(id(), me.userId, weekKey(data.date), me.goal, me.days),
          db.prepare("INSERT OR IGNORE INTO sessions (id,campus_id,user_id,title,type,date,duration,notes,exercises,status,desk_supported,timing_source,created_at) VALUES (?,?,?,?,?,?,?,?,?,'manual',0,'manual',?)").bind(data.requestId ?? id(), me.campusId, me.userId, data.title, data.type, data.date, data.duration, data.notes, JSON.stringify(data.exercises), now),
        ]); break;
      }
      case "scanStart": {
        await checkScan(data.code);
        const active = await db.prepare("SELECT id FROM sessions WHERE user_id=? AND status='recording'").bind(me.userId).first();
        if (active) throw new HttpError("A workout is already running. Scan out or save it without checkout first.", 409);
        const duplicate = await db.prepare("SELECT id FROM sessions WHERE user_id=? AND date=? AND timing_source='scan' AND status IN ('recording','pending','verified')").bind(me.userId, dayKey(now)).first();
        if (duplicate) throw new HttpError("You already have a scan-timed workout for today. You can still add a manual log.", 409);
        await db.batch([db.prepare("INSERT INTO sessions (id,campus_id,user_id,title,type,date,duration,notes,exercises,status,desk_supported,timing_source,started_at,created_at) VALUES (?,?,?,'Gym workout','Strength',?,0,'','[]','recording',1,'scan',?,?)").bind(id(), me.campusId, me.userId, dayKey(now), now, now), db.prepare("UPDATE plans SET locked_at=COALESCE(locked_at,?) WHERE user_id=? AND week=?").bind(now, me.userId, week)]);
        break;
      }
      case "scanFinish": {
        const session = await db.prepare("SELECT status,started_at FROM sessions WHERE id=? AND user_id=? AND campus_id=?").bind(data.id, me.userId, me.campusId).first<{ status: string; started_at: number | null }>();
        if (!session) throw new HttpError("Workout not found.", 404);
        if (session.status !== "recording" || !session.started_at) throw new HttpError("This workout is no longer running. Refresh your activity.", 409);
        await checkScan(data.code);
        const elapsed = now - session.started_at;
        if (elapsed < 0) throw new HttpError("The workout clock is invalid. Refresh and try again.", 409);
        const status = elapsed >= MIN_SCAN_DURATION && elapsed <= MAX_SCAN_DURATION ? "pending" : "unqualified";
        const result = await db.prepare("UPDATE sessions SET ended_at=?,duration=?,status=? WHERE id=? AND user_id=? AND campus_id=? AND status='recording' AND ended_at IS NULL").bind(now, Math.floor(elapsed / 60_000), status, data.id, me.userId, me.campusId).run();
        if (!result.meta.changes) throw new HttpError("This workout has already ended. Refresh your activity.", 409);
        break;
      }
      case "manualFinish": {
        const session = await db.prepare("SELECT status,timing_source,started_at,title,type,duration,notes,exercises FROM sessions WHERE id=? AND user_id=? AND campus_id=?").bind(data.id, me.userId, me.campusId).first<{status:string;timing_source:string;started_at:number|null;title:string;type:string;duration:number;notes:string;exercises:string}>();
        if (!session) throw new HttpError("Workout not found.", 404);
        if (session.status === "manual" && session.timing_source === "manual" && session.started_at && session.title===data.title && session.type===data.type && session.duration===data.duration && session.notes===data.notes && session.exercises===JSON.stringify(data.exercises)) break;
        const result = await db.prepare("UPDATE sessions SET title=?,type=?,duration=?,notes=?,exercises=?,status='manual',timing_source='manual',ended_at=NULL WHERE id=? AND user_id=? AND campus_id=? AND status='recording'").bind(data.title, data.type, data.duration, data.notes, JSON.stringify(data.exercises), data.id, me.userId, me.campusId).run();
        if (!result.meta.changes) throw new HttpError("This workout has already ended. Refresh your activity.", 409);
        break;
      }
      case "scanCancel": {
        const session = await db.prepare("SELECT started_at,status FROM sessions WHERE id=? AND user_id=? AND campus_id=?").bind(data.id, me.userId, me.campusId).first<{ started_at: number | null; status: string }>();
        if (!session) throw new HttpError("Workout not found.", 404);
        if (session.status !== "recording" || !session.started_at) throw new HttpError("This workout is no longer running.", 409);
        const result = await db.prepare("UPDATE sessions SET status='manual',timing_source='manual',duration=?,ended_at=NULL WHERE id=? AND user_id=? AND status='recording'").bind(Math.max(0, Math.floor((now - session.started_at) / 60_000)), data.id, me.userId).run();
        if (!result.meta.changes) throw new HttpError("This workout has already ended.", 409);
        break;
      }
      case "workoutDetails": {
        const result = await db.prepare("UPDATE sessions SET title=?,type=?,notes=?,exercises=? WHERE id=? AND user_id=? AND campus_id=? AND timing_source='scan' AND status IN ('recording','pending')").bind(data.title, data.type, data.notes, JSON.stringify(data.exercises), data.id, me.userId, me.campusId).run();
        if (!result.meta.changes) throw new HttpError("This workout is unavailable or has already been reviewed.", 409);
        break;
      }
      case "review": {
        staff(); const session = await db.prepare("SELECT user_id,status,timing_source,started_at,ended_at FROM sessions WHERE id=? AND campus_id=?").bind(data.id, me.campusId).first<{ user_id: string; status: string; timing_source: string; started_at: number | null; ended_at: number | null }>();
        if (!session) throw new HttpError("Workout not found.", 404);
        if (session.user_id === me.userId) throw new HttpError("Another verifier must review your own attendance.", 403);
        if (session.status !== "pending") throw new HttpError("This workout has already been reviewed.", 409);
        if (session.timing_source !== "scan" || !session.started_at || !session.ended_at) throw new HttpError("Manual logs cannot earn rewards or be promoted to scan-timed visits.", 409);
        if (data.decision === "verified" && !data.confirmed) throw new HttpError("Confirm that you independently checked this member's gym attendance.");
        if (data.decision === "declined" && data.note.length < 3) throw new HttpError("Give the member a short reason so they can resolve the issue.");
        const result = await db.prepare("UPDATE sessions SET status=?,reviewed_by=?,reviewed_at=?,review_note=? WHERE id=? AND campus_id=? AND status='pending'").bind(data.decision, me.userId, now, data.note, data.id, me.campusId).run();
        if (!result.meta.changes) throw new HttpError("This workout has already been reviewed.", 409);
        break;
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
        staff(); const code = "repclub:gym:v1:" + Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, "0")).join("");
        await db.prepare("INSERT INTO desk_codes (campus_id,code,expires_at) VALUES (?,?,?) ON CONFLICT(campus_id) DO UPDATE SET previous_code=desk_codes.code,previous_expires_at=desk_codes.expires_at,code=excluded.code,expires_at=excluded.expires_at WHERE desk_codes.expires_at<=? OR desk_codes.code NOT LIKE 'repclub:gym:v1:%'").bind(me.campusId, code, now + 120_000, now + 15_000).run(); break;
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
    if (error instanceof Error && /UNIQUE constraint failed: sessions\.user_id/.test(error.message)) return Response.json({ error: "A scan-timed workout already exists or is still running. Refresh your activity.", }, { status: 409 });
    console.error("RepClub action failed", error instanceof Error ? error.message : "unknown"); return Response.json({ error: "We couldn't save that change. Please try again." }, { status: 500 });
  }
}
