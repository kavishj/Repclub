import type { Member, Session } from "./league";
export type WorkoutScope = "mine" | "feed" | "reviews";
export type WorkoutPage = { items: Session[]; nextCursor: string | null; total: number };
export type WorkoutQuery = { scope: WorkoutScope; cursor?: string | null; status?: string; query?: string; from?: string; to?: string };
export const PAGE_SIZE = 20;
export function readWorkoutQuery(params: URLSearchParams): WorkoutQuery {
  const scope = params.get("scope") ?? "mine", status = params.get("status") ?? "all", query = (params.get("q") ?? "").trim();
  if (!["mine", "feed", "reviews"].includes(scope) || !["all", "manual", "pending", "verified", "declined", "unqualified"].includes(status) || query.length > 100) throw new Error("Invalid workout filter.");
  const result: WorkoutQuery = { scope: scope as WorkoutScope, status, query, cursor: params.get("cursor") };
  for (const key of ["from", "to"] as const) {
    const value = params.get(key);
    if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)) || new Date(value + "T12:00:00Z").toISOString().slice(0,10) !== value)) throw new Error("Invalid workout date.");
    if (value) result[key] = value;
  }
  if (result.cursor && !/^\d{1,16}\|[A-Za-z0-9-]{1,100}$/.test(result.cursor)) throw new Error("Invalid page cursor.");
  if(result.cursor&&!Number.isSafeInteger(Number(result.cursor.split("|")[0])))throw new Error("Invalid page cursor.");
  return result;
}
export async function workoutPage(db: D1Database, me: Member, query: WorkoutQuery): Promise<WorkoutPage> {
  if (query.scope === "reviews" && me.role === "member") throw new Error("Only gym staff can view the review queue.");
  const clauses = ["s.campus_id=?"], values: (string|number)[] = [me.campusId];
  if (query.scope === "mine") { clauses.push("s.user_id=?", "s.status!='recording'"); values.push(me.userId); }
  else if (query.scope === "reviews") clauses.push("s.status='pending'", "s.timing_source='scan'");
  else { clauses.push("s.status NOT IN ('recording','declined')", "(s.user_id=? OR (?<>'' AND m.squad_id=?))"); values.push(me.userId, me.squadId ?? "", me.squadId ?? ""); }
  if (query.status && query.status !== "all") { clauses.push("(CASE WHEN s.timing_source='manual' AND s.status='pending' THEN 'manual' ELSE s.status END)=?"); values.push(query.status); }
  if (query.from) { clauses.push("s.date>=?"); values.push(query.from); }
  if (query.to) { clauses.push("s.date<=?"); values.push(query.to); }
  if (query.query) { clauses.push("instr(lower(s.title || ' ' || s.type || ' ' || s.notes || ' ' || s.exercises || ' ' || m.name),lower(?))>0"); values.push(query.query); }
  const where = clauses.join(" AND ");
  const countStatement = db.prepare(`SELECT COUNT(*) AS n FROM sessions s JOIN members m ON m.user_id=s.user_id WHERE ${where}`).bind(...values);
  if (query.cursor) { const split = query.cursor.indexOf("|"), at = Number(query.cursor.slice(0,split)), id = query.cursor.slice(split+1); clauses.push("(s.created_at<? OR (s.created_at=? AND s.id<?))"); values.push(at, at, id); }
  const [count, rows] = await Promise.all([countStatement.first<{n:number}>(), db.prepare(`SELECT s.* FROM sessions s JOIN members m ON m.user_id=s.user_id WHERE ${clauses.join(" AND ")} ORDER BY s.created_at DESC,s.id DESC LIMIT ?`).bind(...values, PAGE_SIZE+1).all<Record<string, unknown>>()]);
  const source = rows.results.slice(0,PAGE_SIZE), ids = source.map(s=>s.id as string);
  const reactions = ids.length ? await db.prepare(`SELECT session_id,COUNT(*) AS n,MAX(CASE WHEN user_id=? THEN 1 ELSE 0 END) AS mine FROM cheers WHERE session_id IN (${ids.map(()=>"?").join(",")}) GROUP BY session_id`).bind(me.userId,...ids).all<{session_id:string;n:number;mine:number}>() : {results:[]};
  const byId = new Map(reactions.results.map(r=>[r.session_id,r]));
  const items = source.map(row=>{const s=mapSession(row), r=byId.get(s.id);return {...s,cheers:r?.n??0,cheered:!!r?.mine};});
  const last = items.at(-1);
  return {items, total:count?.n??0,nextCursor:rows.results.length>PAGE_SIZE && last ? `${last.createdAt}|${last.id}` : null};
}
export function mapSession(row: Record<string, unknown>): Session {
  const s:Record<string,unknown>={};
  for (const [key,value] of Object.entries(row)) s[key.replace(/_([a-z])/g,(_,letter:string)=>letter.toUpperCase())]=value;
  if (s.timingSource === "manual" && s.status === "pending") s.status="manual";
  return s as Session;
}
