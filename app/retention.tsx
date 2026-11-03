"use client";
import {useState} from "react";
import {ArrowRight,CalendarDays,ChevronDown,Play,Trash2} from "lucide-react";
import type {AppState} from "../lib/league";
import {starterRoutines,type Routine} from "../lib/routines";
import {weeklyRecap,workoutCalendar,type PilotStats} from "../lib/insights";
import {CompactSelect} from "./entry-controls";

export function RoutineLibrary({routines,busy,onUse,onDelete}:{routines:Routine[];busy:boolean;onUse:(routine:Routine)=>void;onDelete:(id:string)=>Promise<boolean>}){
 const [removing,setRemoving]=useState<string|null>(null);
 return <><h2 id="modal-title">Your routines</h2><p className="modal-intro">Start with a template or reuse your own. Set your reps and weights before saving.</p>
  {routines.length>0&&<section className="routine-section"><h3>Saved routines</h3>{[...routines].sort((a,b)=>b.updatedAt-a.updatedAt).map(r=><div className="routine-row" key={r.id}><button className="routine-use" disabled={busy} onClick={()=>onUse(r)}><span><strong>{r.name}</strong><small>{JSON.parse(r.exercises).length} exercises · {r.type}</small></span><Play size={16}/></button>{removing===r.id?<div className="routine-confirm"><button disabled={busy} className="text-button danger-text" onClick={async()=>{if(await onDelete(r.id))setRemoving(null);}}>Remove</button><button className="text-button" disabled={busy} onClick={()=>setRemoving(null)}>Cancel</button></div>:<button className="icon-button" aria-label={`Remove ${r.name} routine`} disabled={busy} onClick={()=>setRemoving(r.id)}><Trash2 size={15}/></button>}</div>)}</section>}
  <section className="routine-section"><h3>Starter templates</h3>{starterRoutines.map(r=><button className="routine-row routine-use" key={r.id} disabled={busy} onClick={()=>onUse(r)}><span><strong>{r.name}</strong><small>{(JSON.parse(r.exercises) as {name:string}[]).map(e=>e.name).join(" · ")}</small></span><ArrowRight size={17}/></button>)}</section>
  {!routines.length&&<p className="fine-print">Use “Save as routine” in your workout to keep your own version.</p>}
 </>;
}

export function CalendarPlan({days,gymName,userId,busy=false,onSavePlan}:{days:number[];gymName:string;userId:string;busy?:boolean;onSavePlan?:()=>Promise<boolean>}){
 const [time,setTime]=useState("18:00"),[duration,setDuration]=useState("60"),[reminder,setReminder]=useState("30"),[message,setMessage]=useState("");
 async function download(){
  try{if(onSavePlan&&!await onSavePlan())return;const content=workoutCalendar({days,time,duration:Number(duration),reminder:Number(reminder),name:gymName}),url=URL.createObjectURL(new Blob([content],{type:"text/calendar;charset=utf-8"})),link=document.createElement("a");link.href=url;link.download="repclub-gym-plan.ics";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage("Calendar file downloaded. Open it in your calendar to add the reminders.");}
  catch(e){setMessage(e instanceof Error?e.message:"Could not prepare your reminders.");}
 }
 return <section className="calendar-plan" aria-labelledby={`calendar-plan-${userId}`}><h3 id={`calendar-plan-${userId}`}><CalendarDays size={16}/> Gym reminders</h3><p className="section-caption">Your calendar reminds you before gym time and to scan out at the planned end. Reimport after changing your plan; remove the old calendar event to avoid duplicates.</p>
  <div className="reminder-fields"><label>Gym time<input type="time" value={time} onChange={e=>setTime(e.target.value)} aria-label="Planned gym time in India"/></label><label>Session length<CompactSelect label="Planned workout length" value={duration} onChange={setDuration} items={[30,45,60,90,120].map(v=>({value:String(v),label:`${v} min`}))}/></label><label>Remind me<CompactSelect label="Gym reminder lead time" value={reminder} onChange={setReminder} items={[10,30,60].map(v=>({value:String(v),label:`${v} min before`}))}/></label></div>
  <button type="button" className="btn secondary" disabled={busy||!days.length||!time} onClick={()=>void download()}>Add plan to calendar<ArrowRight size={15}/></button>{!days.length&&<p className="fine-print">Choose planned days above to enable reminders.</p>}<p className="fine-print">Times use India time. Calendar reminders do not start or end a workout.</p>{message&&<p className="fine-print" role="status">{message}</p>}
 </section>;
}

export function WeeklyReview({data,onPlan,onRoutines}:{data:AppState;onPlan:()=>void;onRoutines:()=>void}){
 const r=weeklyRecap(data.activity,data.plans,data.me!.stats.goal,data.serverNow);
 return <><h2 id="modal-title">Your weekly recap</h2><p className="modal-intro">{r.message}</p><dl className="recap-metrics"><div><dt>Verified gym days</dt><dd>{r.done}<small> / {r.target}</small></dd></div><div><dt>Awaiting review</dt><dd>{r.pending}</dd></div><div><dt>Workouts logged</dt><dd>{r.logged}</dd></div><div><dt>Manual logs</dt><dd>{r.manual}</dd></div></dl><p className="recap-comparison">Last week: {r.before} verified {r.before===1?"day":"days"}. This week: {r.done}.</p><p className="section-caption">Reps and weights in your workout history are self-reported. Your weekly attendance goal uses verified gym visits.</p><div className="recap-actions"><button className="btn primary" onClick={onRoutines}>Choose a routine<ArrowRight size={15}/></button><button className="text-button" onClick={onPlan}>Edit weekly plan</button></div></>;
}

export function PilotPanel({stats}:{stats:PilotStats}){
 const percent=(n:number,total:number)=>total?`${Math.round(n/total*100)}%`:"—";
 return <details className="pilot-report"><summary>Pilot results<ChevronDown size={17}/></summary><dl className="pilot-metrics"><div><dt>First verified visit</dt><dd>{stats.activated}/{stats.members}<small>{percent(stats.activated,stats.members)} of enrolled members</small></dd></div><div><dt>Active this week</dt><dd>{stats.weeklyActive}<small>At least one verified visit</small></dd></div><div><dt>Weekly goal met</dt><dd>{stats.goalsMet}<small>{percent(stats.goalsMet,stats.members)} of enrolled members</small></dd></div><div><dt>QR checkout completion</dt><dd>{percent(stats.checkouts,stats.starts)}<small>{stats.checkouts}/{stats.starts} starts in the past 28 days</small></dd></div><div><dt>Average staff review</dt><dd>{stats.averageReviewMinutes===null?"—":stats.averageReviewMinutes<60?`${Math.round(stats.averageReviewMinutes)} min`:`${(stats.averageReviewMinutes/60).toFixed(1)} hr`}<small>Checkout to recorded decision, past 28 days</small></dd></div><div><dt>Week-four return</dt><dd>{stats.retentionCohort?percent(stats.retained,stats.retentionCohort):"Not enough history"}<small>{stats.retentionCohort?`${stats.retained}/${stats.retentionCohort} members returned in days 22–28` : "Appears after the first four weeks"}</small></dd></div></dl><p className="section-caption">Week-four return uses members whose first verified visit was 28–55 days ago. These numbers describe the pilot; they do not prove a change in attendance.</p></details>;
}
