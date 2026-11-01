export const TIMEZONE = "Asia/Kolkata";
export type Member = { userId: string; campusId: string; name: string; role: string; goal: number; days: string; squadId: string | null; joinedAt: number };
export type Session = { id: string; campusId: string; userId: string; title: string; type: string; date: string; duration: number; notes: string; exercises: string; status: string; deskSupported: number; timingSource: string; startedAt: number | null; endedAt: number | null; createdAt: number; reviewedBy: string | null; reviewedAt: number | null; reviewNote: string | null; cheers?: number; cheered?: boolean };
export type Plan = { id: string; userId: string; week: string; goal: number; days: string };
export type Stats = { count: number; goal: number; percent: number; points: number; xp: number; total: number; goalWeeks: number; comeback: boolean };
export type RankedMember = Member & { stats: Stats; rank: number };
export type Campus = { id: string; name: string; gymName: string; inviteCode?: string; ownerId: string; createdAt: number };
export type Squad = { id: string; campusId: string; name: string; inviteCode?: string; createdAt: number };
export type AppState = { user: { userId: string; name: string } | null; campus: Campus | null; me: RankedMember | null; members: RankedMember[]; squads: Squad[]; feed: Session[]; mine: Session[]; activeSession: Session | null; serverNow: number; reviews: Session[]; week: string; deskCode: { code: string; expiresAt: number } | null; plans: Plan[] };
export const MIN_SCAN_DURATION = 5 * 60_000;
export const MAX_SCAN_DURATION = 240 * 60_000;
export function dayKey(value: number | Date = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  return ["year", "month", "day"].map(k => parts.find(p => p.type === k)!.value).join("-");
}
export function shiftDay(day: string, offset: number) { const d = new Date(day + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10); }
export function weekKey(day = dayKey()) { const weekday = new Date(day + "T12:00:00Z").getUTCDay(); return shiftDay(day, -((weekday + 6) % 7)); }
export function isScanTimed(session: Session): boolean {
  return session.timingSource === "scan" && Number.isSafeInteger(session.startedAt) && Number.isSafeInteger(session.endedAt) &&
    session.startedAt! > 0 && session.endedAt! >= session.startedAt!;
}
export function countsForRewards(session: Session, now = Date.now()): boolean {
  if (session.status !== "verified" || !isScanTimed(session) || session.endedAt! > now) return false;
  const elapsed = session.endedAt! - session.startedAt!;
  return elapsed >= MIN_SCAN_DURATION && elapsed <= MAX_SCAN_DURATION &&
    session.duration === Math.floor(elapsed / 60_000) && session.date === dayKey(session.startedAt!);
}
export function statsFor(member: Member, all: Session[], plans: Plan[], now = Date.now()): Stats {
  const today = dayKey(now), week = weekKey(today);
  const valid = [...new Set(all.filter(s => s.userId === member.userId && countsForRewards(s, now) && s.date <= today).map(s => s.date))].sort();
  const groups = new Map<string, number>();
  for (const day of valid) groups.set(weekKey(day), (groups.get(weekKey(day)) || 0) + 1);
  const goalFor = (w: string) => plans.find(p => p.userId === member.userId && p.week === w)?.goal ?? member.goal;
  const goal = goalFor(week), count = Math.min(groups.get(week) || 0, goal);
  let xp = 0, goalWeeks = 0;
  for (const [w, n] of groups) { xp += Math.min(n, goalFor(w)) * 10; if (n >= goalFor(w)) goalWeeks++; }
  return { count, goal, percent: Math.round(count / goal * 100), points: count * 10, xp, total: valid.length, goalWeeks, comeback: valid.some((d, i) => i > 0 && (Date.parse(d) - Date.parse(valid[i - 1])) / 86400000 >= 7) };
}
export function rankMembers(members: Member[], sessions: Session[], plans: Plan[], now = Date.now()): RankedMember[] {
  const ranked = members.map(m => ({ ...m, stats: statsFor(m, sessions, plans, now), rank: 0 })).sort((a, b) => b.stats.percent - a.stats.percent || a.name.localeCompare(b.name));
  let rank = 1;
  return ranked.map((m, i) => { if (i && m.stats.percent !== ranked[i - 1].stats.percent) rank = i + 1; return { ...m, rank }; });
}
export function badgeList(s: Stats) { return [
  { id: "first", name: "First visit", detail: "Your first scan-timed, staff-verified visit", progress: Math.min(s.total, 1), target: 1, earned: s.total >= 1 },
  { id: "week", name: "Weekly goal", detail: "Meet your weekly commitment", progress: Math.min(s.count, s.goal), target: s.goal, earned: s.goalWeeks >= 1 },
  { id: "ten", name: "10 visits", detail: "Log 10 qualifying gym days", progress: Math.min(s.total, 10), target: 10, earned: s.total >= 10 },
  { id: "four", name: "Four weeks", detail: "Meet your goal in four weeks", progress: Math.min(s.goalWeeks, 4), target: 4, earned: s.goalWeeks >= 4 },
  { id: "back", name: "Return visit", detail: "Return after a break of 7+ days", progress: s.comeback ? 1 : 0, target: 1, earned: s.comeback },
]; }


export function newMilestone(previous: AppState | null, next: AppState): string | null {
  if (!previous?.me || !next.me || previous.me.userId !== next.me.userId ||
      previous.campus?.id !== next.campus?.id || next.me.stats.total <= previous.me.stats.total) return null;
  if (previous.week === next.week && previous.me.stats.percent < 100 && next.me.stats.percent === 100 &&
      next.me.stats.count > previous.me.stats.count) return "Weekly goal complete";
  const earnedBefore = new Set(badgeList(previous.me.stats).filter(badge => badge.earned).map(badge => badge.id));
  const unlocked = badgeList(next.me.stats).find(badge => badge.earned && !earnedBefore.has(badge.id));
  return unlocked ? `Unlocked: ${unlocked.name}` : null;
}
