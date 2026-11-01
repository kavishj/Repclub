import { env } from "cloudflare:workers";
import { getDb } from "../db";
import { campuses, members, squads, sessions, plans, cheers, deskCodes } from "../db/schema";
import { eq } from "drizzle-orm";
import { rankMembers, weekKey, type AppState } from "./league";
export function rawDb() { if (!env.DB) throw new Error("Storage is temporarily unavailable."); return env.DB; }
export async function memberFor(userId: string) { return (await getDb().select().from(members).where(eq(members.userId, userId)))[0] ?? null; }
export async function stateFor(user: { userId: string; displayName: string } | null): Promise<AppState> {
  const empty: AppState = { user: user ? { userId: user.userId, name: user.displayName } : null, campus: null, me: null, members: [], squads: [], feed: [], mine: [], activeSession: null, serverNow: Date.now(), reviews: [], week: weekKey(), deskCode: null, plans: [] };
  if (!user) return empty;
  const me = await memberFor(user.userId); if (!me) return empty;
  const db = getDb();
  const [campusRows, memberRows, squadRows, sessionRows, planRows, cheerRows, codes] = await Promise.all([
    db.select().from(campuses).where(eq(campuses.id, me.campusId)), db.select().from(members).where(eq(members.campusId, me.campusId)),
    db.select().from(squads).where(eq(squads.campusId, me.campusId)), db.select().from(sessions).where(eq(sessions.campusId, me.campusId)),
    db.select({ id: plans.id, userId: plans.userId, week: plans.week, goal: plans.goal, days: plans.days }).from(plans).innerJoin(members, eq(plans.userId, members.userId)).where(eq(members.campusId, me.campusId)),
    db.select({ userId: cheers.userId, sessionId: cheers.sessionId }).from(cheers).innerJoin(sessions, eq(cheers.sessionId, sessions.id)).where(eq(sessions.campusId, me.campusId)),
    me.role !== "member" ? db.select().from(deskCodes).where(eq(deskCodes.campusId, me.campusId)) : Promise.resolve([]),
  ]);
  const ranked = rankMembers(memberRows, sessionRows, planRows);
  const enriched = sessionRows.map(s => ({ ...s, status: s.timingSource === "manual" && s.status === "pending" ? "manual" : s.status, cheers: cheerRows.filter(c => c.sessionId === s.id).length, cheered: cheerRows.some(c => c.sessionId === s.id && c.userId === me.userId) })).sort((a, b) => b.createdAt - a.createdAt);
  const peerIds = new Set(memberRows.filter(m => me.squadId && m.squadId === me.squadId).map(m => m.userId));
  return { ...empty, serverNow: Date.now(), campus: { ...campusRows[0], inviteCode: me.role !== "member" ? campusRows[0].inviteCode : undefined }, me: ranked.find(m => m.userId === me.userId)!, members: ranked,
    squads: squadRows.map(s => ({ ...s, inviteCode: s.id === me.squadId || me.role !== "member" ? s.inviteCode : undefined })),
    feed: enriched.filter(s => (s.userId === me.userId || peerIds.has(s.userId)) && s.status !== "declined" && s.status !== "recording").slice(0, 40),
    mine: enriched.filter(s => s.userId === me.userId && s.status !== "recording"),
    activeSession: enriched.find(s => s.userId === me.userId && s.status === "recording") ?? null,
    reviews: me.role !== "member" ? enriched.filter(s => s.status === "pending" && s.timingSource === "scan") : [],
    plans: planRows.filter(p => p.userId === me.userId), deskCode: codes[0] && codes[0].expiresAt > Date.now() ? { code: codes[0].code, expiresAt: codes[0].expiresAt } : null,
  };
}
