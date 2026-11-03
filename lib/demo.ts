import { pilotStats } from "./insights";
import type { Routine } from "./routines";
import { dayKey, shiftDay, weekKey, rankMembers, activitySummary, type AppState, type Member, type Session, type Plan, type Squad } from "./league";
export function makeDemo() {
  const now = Date.now(), week = weekKey(), campusId = "sample-campus";
  const members: Member[] = [
    { userId: "you", name: "You", role: "owner", goal: 3, squadId: "regulars" },
    { userId: "aarav", name: "Aarav Shah", role: "member", goal: 3, squadId: "regulars" },
    { userId: "meera", name: "Meera Rao", role: "staff", goal: 3, squadId: "regulars" },
    { userId: "rohan", name: "Rohan Patel", role: "member", goal: 3, squadId: "regulars" },
    { userId: "sana", name: "Sana Khan", role: "member", goal: 2, squadId: "early" },
  ].map(m => ({ ...m, campusId, days: "[0,2,4]", joinedAt: now - 21 * 86400000 }));
  const sessions: Session[] = [], plans: Plan[] = [];
  const exercises = JSON.stringify([{ name: "Bench press", sets: 3, reps: 10, weight: 40 }, { name: "Lat pulldown", sets: 3, reps: 12, weight: 35 }, { name: "Seated row", sets: 3, reps: 12, weight: 30 }]);
  for (const [mi, m] of members.entries()) {
    for (let w = -3; w <= 0; w++) {
      const wk = shiftDay(week, w * 7); plans.push({ id: m.userId + wk, userId: m.userId, week: wk, goal: m.goal, days: m.days });
      const offsets = w === 0 ? (mi === 0 ? [0, 2] : mi === 1 || mi === 2 ? [0, 2, 4] : [0]) : [0, 2, 4];
      for (const [i, off] of offsets.entries()) {
        const date = shiftDay(wk, off); if (date > dayKey()) continue;
        const duration = [48, 55, 42][i % 3], endedAt = Math.min(now, Date.parse(date + "T12:00:00+05:30") + mi * 3600000);
        sessions.push({ id: m.userId + date, campusId, userId: m.userId, title: ["Upper body strength", "Leg day, done right", "Full body fundamentals"][(i + mi) % 3], type: "Strength", date, duration, notes: "", exercises, status: "verified", deskSupported: 1, timingSource: "scan", startedAt: endedAt - duration * 60000, endedAt, createdAt: Date.parse(date + "T12:00:00+05:30") + mi * 3600000, reviewedBy: "meera", reviewedAt: now, reviewNote: "Attendance confirmed by gym staff.", cheers: mi + 2, cheered: false });
      }
    }
  }
  sessions.push({ id: "pending-rohan", campusId, userId: "rohan", title: "Weekend strength session", type: "Strength", date: dayKey(), duration: 45, notes: "", exercises, status: "pending", deskSupported: 1, timingSource: "scan", startedAt: now - 45 * 60000, endedAt: now, createdAt: now - 1800000, reviewedBy: null, reviewedAt: null, reviewNote: null, cheers: 1, cheered: false });
  const squads: Squad[] = [{ id: "regulars", campusId, name: "The Regulars", inviteCode: "REPS2026", createdAt: now }, { id: "early", campusId, name: "Early Birds", inviteCode: "EARLY234", createdAt: now }];
  return { routines:[] as Routine[],members, sessions, plans, squads, deskCode: { code: "repclub:gym:v1:" + "a".repeat(64), expiresAt: now + 120000 }, campus: { id: campusId, name: "North Campus", gymName: "Campus Fitness Centre", ownerId: "you", inviteCode: "CAMP2026", createdAt: now - 21 * 86400000 } };
}
export type DemoData = ReturnType<typeof makeDemo>;
export function demoState(d: DemoData): AppState {
  const members = rankMembers(d.members, d.sessions, d.plans), me = members.find(m => m.userId === "you")!;
  const peerIds = new Set(members.filter(m => m.squadId === me.squadId).map(m => m.userId));
  const ordered = [...d.sessions].sort((a,b) => b.createdAt - a.createdAt);
  return { routines:d.routines,pilot:pilotStats(d.members,d.sessions.filter(s=>s.status==="verified").map(s=>({userId:s.userId,date:s.date})),d.plans,{starts:d.sessions.length,checkouts:d.sessions.length,averageReviewMinutes:8}),user: { userId: "you", name: "You" }, campus: d.campus, me, members, squads: d.squads, feed: ordered.filter(s => (s.userId === "you" || peerIds.has(s.userId)) && s.status !== "declined" && s.status !== "recording").slice(0, 40), mine: ordered.filter(s => s.userId === "you" && s.status !== "recording"), activeSession: ordered.find(s => s.userId === "you" && s.status === "recording") ?? null, serverNow: Date.now(), reviews: ordered.filter(s => s.status === "pending"), week: weekKey(), deskCode: d.deskCode, plans: d.plans.filter(p => p.userId === "you"), pages:{mine:{nextCursor:null,total:ordered.filter(s=>s.userId==="you"&&s.status!=="recording").length},feed:{nextCursor:null,total:ordered.length},reviews:{nextCursor:null,total:ordered.filter(s=>s.status==="pending").length}},activity:activitySummary(me,d.sessions,d.plans) };
}
