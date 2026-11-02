import { z } from "zod";
const number=z.number().finite().nullable();
export const draftSchema=z.object({
  version:z.literal(1),savedAt:z.number().finite(),requestId:z.string().uuid(),title:z.string().max(80),type:z.enum(["Strength","Cardio","Mixed"]),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),duration:number,notes:z.string().max(600),
  exercises:z.array(z.object({id:z.string().uuid(),name:z.string().max(60),sets:number,reps:number,weight:number})).max(12),
});
export type WorkoutDraft=z.infer<typeof draftSchema>;
export const DRAFT_TTL=7*86400000;
export function parseDraft(value:string|null,now=Date.now()):WorkoutDraft|null {
  if(!value)return null;
  try{const parsed=draftSchema.safeParse(JSON.parse(value));return parsed.success&&parsed.data.savedAt<=now+60000&&now-parsed.data.savedAt<DRAFT_TTL?parsed.data:null;}catch{return null;}
}
export function draftPrefix(userId:string){return `repclub:draft:${encodeURIComponent(userId)}:`;}
export function clearWorkoutDrafts(userId:string){try{const prefix=draftPrefix(userId);for(const key of Object.keys(localStorage))if(key.startsWith(prefix))localStorage.removeItem(key);}catch{}}
