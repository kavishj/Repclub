import { env } from "cloudflare:workers";
import { getDb } from "../db";
import { campuses, members, squads, sessions, plans, deskCodes, routines } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { activitySummary, dayKey, rankFromDays, shiftDay, weekKey, type AppState, type Session } from "./league";
import { pilotStats } from "./insights";
import { mapSession, workoutPage } from "./workout-query";
export function rawDb() { if (!env.DB) throw new Error("Storage is temporarily unavailable."); return env.DB; }
export async function memberFor(userId: string) { return (await getDb().select().from(members).where(eq(members.userId, userId)))[0] ?? null; }
export async function stateFor(user: { userId: string; displayName: string } | null): Promise<AppState> {
  const now=Date.now(), week=weekKey(dayKey(now));
  const page = {nextCursor:null,total:0};
  const empty: AppState = { routines:[],pilot:null,user: user ? { userId: user.userId, name: user.displayName } : null, campus: null, me: null, members: [], squads: [], feed: [], mine: [], activeSession: null, serverNow: now, reviews: [], week, deskCode: null, plans: [], pages:{mine:page,feed:page,reviews:page},activity:{pending:0,goalLocked:false,hasScanWorkout:false,history:[],attendance:[]} };
  if (!user) return empty;
  const me = await memberFor(user.userId); if (!me) return empty;
  const db = getDb(), raw=rawDb();
  const [campusRows, memberRows, squadRows, scoreRows, planRows, codes, activeRows, mine, feed, reviews, recentRows, ownCounts, routineRows, operations] = await Promise.all([
    db.select().from(campuses).where(eq(campuses.id, me.campusId)),
    db.select().from(members).where(eq(members.campusId, me.campusId)),
    db.select().from(squads).where(eq(squads.campusId, me.campusId)),
    raw.prepare(`SELECT DISTINCT user_id AS userId,date FROM sessions WHERE campus_id=? AND status='verified' AND timing_source='scan'
      AND started_at>0 AND started_at<=9007199254740991 AND started_at=CAST(started_at AS INTEGER) AND ended_at=CAST(ended_at AS INTEGER) AND ended_at<=? AND ended_at>=started_at
      AND ended_at-started_at BETWEEN 300000 AND 14400000 AND duration=CAST((ended_at-started_at)/60000 AS INTEGER)
      AND date=date(started_at/1000,'unixepoch','+330 minutes')`).bind(me.campusId,now).all<{userId:string;date:string}>(),
    db.select({ id: plans.id, userId: plans.userId, week: plans.week, goal: plans.goal, days: plans.days, lockedAt: plans.lockedAt }).from(plans).innerJoin(members, eq(plans.userId, members.userId)).where(eq(members.campusId, me.campusId)),
    me.role !== "member" ? db.select().from(deskCodes).where(eq(deskCodes.campusId, me.campusId)) : Promise.resolve([]),
    db.select().from(sessions).where(and(eq(sessions.userId,me.userId),eq(sessions.status,"recording"))),
    workoutPage(raw,me,{scope:"mine"}),workoutPage(raw,me,{scope:"feed"}),
    me.role!=="member" ? workoutPage(raw,me,{scope:"reviews"}) : Promise.resolve({items:[],nextCursor:null,total:0}),
    raw.prepare("SELECT user_id,date,status,timing_source,started_at,ended_at,duration FROM sessions WHERE user_id=? AND date>=?").bind(me.userId,shiftDay(dayKey(now),-27)).all<Record<string,unknown>>(),
    raw.prepare("SELECT SUM(CASE WHEN status='pending' AND timing_source='scan' THEN 1 ELSE 0 END) AS pending,MAX(CASE WHEN started_at IS NOT NULL THEN 1 ELSE 0 END) AS scanned FROM sessions WHERE user_id=?").bind(me.userId).first<{pending:number;scanned:number}>(),
    db.select().from(routines).where(eq(routines.userId,me.userId)),
    me.role!=="member"?raw.prepare("SELECT COUNT(*) AS starts,COALESCE(SUM(CASE WHEN timing_source='scan' AND ended_at IS NOT NULL THEN 1 ELSE 0 END),0) AS checkouts,AVG(CASE WHEN reviewed_at>=ended_at AND ended_at IS NOT NULL THEN (reviewed_at-ended_at)/60000.0 END) AS averageReviewMinutes FROM sessions WHERE campus_id=? AND started_at>=?").bind(me.campusId,now-28*86400000).first<{starts:number;checkouts:number;averageReviewMinutes:number|null}>():Promise.resolve(null),
  ]);
  const ranked = rankFromDays(memberRows, scoreRows.results, planRows,now), ownPlans=planRows.filter(p=>p.userId===me.userId);
  const activity=activitySummary(me,recentRows.results.map(mapSession) as Session[],ownPlans,now);
  activity.pending=ownCounts?.pending??0; activity.hasScanWorkout=!!ownCounts?.scanned;
  const info=({nextCursor,total}:{nextCursor:string|null;total:number})=>({nextCursor,total});
  return { ...empty, routines:routineRows as import("./routines").Routine[],pilot:operations?pilotStats(memberRows,scoreRows.results,planRows,operations,now):null,campus: { ...campusRows[0], inviteCode: me.role !== "member" ? campusRows[0].inviteCode : undefined }, me: ranked.find(m => m.userId === me.userId)!, members: ranked,
    squads: squadRows.map(s => ({ ...s, inviteCode: s.id === me.squadId || me.role !== "member" ? s.inviteCode : undefined })),
    feed:feed.items,mine:mine.items,reviews:reviews.items,activeSession:activeRows[0]??null,plans:ownPlans,activity,
    pages:{mine:info(mine),feed:info(feed),reviews:info(reviews)},
    deskCode: codes[0] && codes[0].expiresAt > now ? { code: codes[0].code, expiresAt: codes[0].expiresAt } : null,
  };
}
