import type { WorkoutDraft } from "./workout-draft";

export type RoutineExercise = { name:string;sets:number;reps:number;weight:number };
export type Routine = { id:string;userId:string;campusId:string;name:string;type:"Strength"|"Cardio"|"Mixed";exercises:string;createdAt:number;updatedAt:number };
export const starterRoutines:Routine[] = [
  {id:"starter-full",name:"Full body",names:["Squat","Bench press","Seated row"]},
  {id:"starter-upper",name:"Upper body",names:["Bench press","Lat pulldown","Shoulder press"]},
  {id:"starter-lower",name:"Lower body",names:["Leg press","Leg curl","Calf raise"]},
].map(r=>({id:r.id,userId:"",campusId:"",name:r.name,type:"Strength",exercises:JSON.stringify(r.names.map(name=>({name,sets:3,reps:10,weight:0}))),createdAt:0,updatedAt:0}));

export function addRoutine(draft:WorkoutDraft,routine:Routine):WorkoutDraft {
  const existing=new Set(draft.exercises.map(e=>e.name.trim().toLowerCase()));
  const additions=(JSON.parse(routine.exercises) as RoutineExercise[]).filter(e=>!existing.has(e.name.trim().toLowerCase())).slice(0,12-draft.exercises.length);
  return {...draft,title:!draft.title.trim()||draft.title==="Gym workout"?routine.name:draft.title,type:draft.exercises.length?draft.type:routine.type,
    exercises:[...draft.exercises,...additions.map(e=>({...e,id:crypto.randomUUID()}))]};
}
