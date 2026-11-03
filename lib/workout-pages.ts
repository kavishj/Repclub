import type { Session } from "./league";
import type { WorkoutPage } from "./workout-query";

export function refreshWorkoutHead(previous:WorkoutPage,next:WorkoutPage):WorkoutPage {
  if(!next.nextCursor||previous.items.length<=next.items.length)return next;
  const boundary=next.items.at(-1);if(!boundary)return next;
  const ids=new Set(next.items.map(s=>s.id));
  const older=previous.items.filter((s:Session)=>!ids.has(s.id)&&(s.createdAt<boundary.createdAt||s.createdAt===boundary.createdAt&&s.id<boundary.id));
  return {...next,items:[...next.items,...older],nextCursor:older.length?previous.nextCursor:next.nextCursor};
}
