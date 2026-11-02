"use client";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Check, ChevronDown, Clock3, Dumbbell, Loader2, Plus, RotateCcw, ScanLine, Trash2, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import NumberFlow from "@number-flow/react";
import { dayKey, shiftDay, type Session } from "../lib/league";
import { draftPrefix, parseDraft, type WorkoutDraft } from "../lib/workout-draft";
import { CompactSelect, EntryNumber, ExerciseName } from "./entry-controls";
import { exerciseList, type Exercise } from "./ui";
export type EditorConfig={mode:"manual"|"edit"|"manual-finish";session?:Session;repeat?:Session;date?:string};
type Props={config:EditorConfig;userId:string;campusId:string;history:Session[];busy:boolean;error:string;onSave:(payload:Record<string,unknown>&{action:string})=>Promise<boolean>;onClose:()=>void};
const catalog=["Bench press","Incline dumbbell press","Push-up","Shoulder press","Lateral raise","Triceps pushdown","Squat","Leg press","Romanian deadlift","Deadlift","Lunge","Leg curl","Calf raise","Lat pulldown","Pull-up","Seated row","Barbell row","Biceps curl","Plank","Crunch","Treadmill","Cycling","Rowing"];
const activities=["Strength","Cardio","Mixed"].map(value=>({value,label:value}));
const numberMotion={duration:180};
export default function WorkoutEditor({config,userId,campusId,history,busy,error,onSave,onClose}:Props){
  const source=config.session??config.repeat,manual=config.mode!=="edit";
  const seed=():WorkoutDraft=>({version:1,savedAt:Date.now(),requestId:crypto.randomUUID(),title:source?.title??"",type:(source?.type??"Strength") as WorkoutDraft["type"],date:config.mode==="manual-finish"?source!.date:config.date??dayKey(),duration:config.mode==="manual-finish"?Math.max(1,Math.min(1440,Math.floor((Date.now()-source!.startedAt!)/60000))):source?.duration||45,notes:config.repeat?"":source?.notes??"",exercises:source?exerciseList(source).map(e=>({...e,id:crypto.randomUUID()})):[]});
  const [draft,setDraft]=useState(seed),[ready,setReady]=useState(false),[draftMessage,setDraftMessage]=useState(""),[localError,setLocalError]=useState(""),[expanded,setExpanded]=useState<string|null>(null),[notesOpen,setNotesOpen]=useState(!!source?.notes);
  const key=`${draftPrefix(userId)}${encodeURIComponent(campusId)}:${config.mode}:${config.session?.id??config.repeat?.id??config.date??"new"}`;
  const latest=useRef(draft),cleared=useRef(false),loaded=useRef(false),form=useRef<HTMLFormElement>(null);
  useEffect(()=>{latest.current=draft;},[draft]);
  useEffect(()=>{
    let mounted=true;
    queueMicrotask(()=>{if(!mounted)return;
    try{const restored=parseDraft(localStorage.getItem(key));if(restored){setDraft(restored);latest.current=restored;setExpanded(restored.exercises.at(-1)?.id??null);setNotesOpen(!!restored.notes);setDraftMessage("Draft restored");}else{localStorage.removeItem(key);}}catch{setDraftMessage("Draft unavailable on this device");}
    loaded.current=true;setReady(true);form.current?.querySelector<HTMLInputElement>("#workout-title")?.focus({preventScroll:true});});
    const flush=()=>{if(loaded.current&&!cleared.current){try{localStorage.setItem(key,JSON.stringify({...latest.current,savedAt:Date.now()}));}catch{}}};
    const hide=()=>{if(document.visibilityState==="hidden")flush();};
    window.addEventListener("pagehide",flush);document.addEventListener("visibilitychange",hide);
    return ()=>{mounted=false;flush();window.removeEventListener("pagehide",flush);document.removeEventListener("visibilitychange",hide);};
  },[key]);
  useEffect(()=>{if(!ready||cleared.current)return;const timer=setTimeout(()=>{try{localStorage.setItem(key,JSON.stringify({...draft,savedAt:Date.now()}));setDraftMessage("Draft saved on this device");}catch{setDraftMessage("Draft unavailable on this device");}},450);return()=>clearTimeout(timer);},[draft,key,ready]);
  const recent=useMemo(()=>{const map=new Map<string,Exercise>();for(const session of history)for(const exercise of exerciseList(session))if(!map.has(exercise.name.toLowerCase()))map.set(exercise.name.toLowerCase(),exercise);return map;},[history]);
  const suggestions=useMemo(()=>[...new Set([...recent.values()].map(e=>e.name).concat(catalog))],[recent]);
  const totals=draft.exercises.reduce((sum,e)=>({sets:sum.sets+(e.sets??0),volume:sum.volume+(e.sets??0)*(e.reps??0)*(e.weight??0)}),{sets:0,volume:0});
  function update(values:Partial<WorkoutDraft>){setDraft(current=>({...current,...values}));setLocalError("");}
  function updateExercise(id:string,values:Partial<WorkoutDraft["exercises"][number]>){setDraft(current=>({...current,exercises:current.exercises.map(e=>e.id===id?{...e,...values}:e)}));setLocalError("");}
  function addExercise(){const row={id:crypto.randomUUID(),name:"",sets:3,reps:10,weight:0};setDraft(current=>({...current,exercises:[...current.exercises,row]}));setExpanded(row.id);setTimeout(()=>form.current?.querySelector<HTMLInputElement>(`[data-exercise-id="${row.id}"] input`)?.focus(),100);}
  function completeExercise(id:string){form.current?.querySelector<HTMLButtonElement>(`[data-exercise-id="${id}"] .entry-exercise-toggle`)?.focus({preventScroll:true});setExpanded(null);}
  function clearDraft(){cleared.current=true;try{localStorage.removeItem(key);}catch{}onClose();}
  async function submit(event:FormEvent){event.preventDefault();
    if(!draft.title.trim()||draft.title.trim().length<2){setLocalError("Add a workout name of at least 2 characters.");return;}
    const invalid=draft.exercises.find(e=>!e.name.trim()||e.sets===null||!Number.isInteger(e.sets)||e.sets<1||e.sets>20||e.reps===null||!Number.isInteger(e.reps)||e.reps<1||e.reps>100||e.weight===null||e.weight<0||e.weight>1000);
    if(invalid){setExpanded(invalid.id);setLocalError("Complete each exercise: 1–20 sets, 1–100 reps and 0–1,000 kg.");return;}
    if(manual&&(draft.duration===null||!Number.isInteger(draft.duration)||draft.duration<1||draft.duration>1440)){setLocalError("Enter a duration from 1 to 1,440 minutes.");return;}
    const details={title:draft.title.trim(),type:draft.type,notes:draft.notes.trim(),exercises:draft.exercises.map(exercise=>({name:exercise.name.trim(),sets:exercise.sets,reps:exercise.reps,weight:exercise.weight}))};
    const payload=config.mode==="edit"?{action:"workoutDetails",id:config.session!.id,...details}:config.mode==="manual-finish"?{action:"manualFinish",id:config.session!.id,duration:draft.duration,...details}:{action:"workout",requestId:draft.requestId,date:draft.date,duration:draft.duration,...details};
    if(await onSave(payload))clearDraft();
  }
  return <form ref={form} className="workout-editor" onSubmit={submit}><fieldset disabled={busy} className="entry-fieldset">
    <header className="entry-header"><span className="entry-mark"><Dumbbell size={21}/></span><div><span className="eyebrow">{config.mode==="edit"?"WORKOUT DETAILS":config.mode==="manual-finish"?"FINISH WITHOUT CHECKOUT":"WORKOUT LOG"}</span><h2 id="modal-title">{config.repeat?"Repeat workout":config.mode==="edit"?"Workout details":config.mode==="manual-finish"?"Save your workout":"Log workout"}</h2></div></header>
    <div className={`entry-notice ${manual?"":"scanned"}`}>{manual?<Clock3 size={16}/>:<ScanLine size={16}/>}<span>{config.mode==="manual-finish"?"Ends this timer and saves a manual log. No league XP or achievements.":manual?"Manual log · Kept in your history, without rewards.":"Scan times stay fixed. Rewards require checkout and staff review."}</span></div>
    <div className="entry-workout-name"><label htmlFor="workout-title">Workout name</label><input id="workout-title" value={draft.title} onChange={e=>update({title:e.target.value})} placeholder="e.g. Upper body" minLength={2} maxLength={80} required autoComplete="off"/></div>
    <div className={`entry-meta ${manual?"":"scan-meta"}`}><div><span className="entry-label">Activity</span><CompactSelect label="Workout activity" value={draft.type} onChange={value=>update({type:value as WorkoutDraft["type"]})} items={activities}/></div>{manual&&<><label className="entry-date">Date<input type="date" value={draft.date} onChange={e=>update({date:e.target.value})} min={shiftDay(dayKey(),-6)} max={dayKey()} disabled={config.mode==="manual-finish"} required/></label><EntryNumber label="Duration" unit="min" value={draft.duration} onChange={duration=>update({duration})} min={1} max={1440}/></>}</div>
    <section className="entry-exercises" aria-label="Exercises"><div className="entry-section-heading"><h3>Exercises <span>{draft.exercises.length}/12</span></h3><button className="text-button" type="button" onClick={addExercise} disabled={busy||draft.exercises.length>=12}><Plus size={16}/> Add exercise</button></div>
      {!draft.exercises.length&&<button type="button" className="entry-empty-exercises" onClick={addExercise}><span><Plus size={21}/></span><strong>Add your first exercise</strong><small>Search exercises or enter your own</small></button>}
      <div className="entry-exercise-list"><AnimatePresence initial={false}>{draft.exercises.map((exercise,index)=>{const isExpanded=expanded===exercise.id,last=recent.get(exercise.name.toLowerCase());return <m.div layout="position" key={exercise.id} data-exercise-id={exercise.id} className={`entry-exercise ${isExpanded?"expanded":""}`} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,height:0}} transition={{duration:.16}}>
        <div className="entry-exercise-top"><button type="button" className="entry-exercise-toggle" onClick={()=>setExpanded(isExpanded?null:exercise.id)} aria-expanded={isExpanded}><span className="exercise-index">{String(index+1).padStart(2,"0")}</span><span><strong>{exercise.name||"Choose an exercise"}</strong><small>{exercise.sets??"–"} × {exercise.reps??"–"} reps · {exercise.weight??"–"} kg</small></span><ChevronDown size={16}/></button><button type="button" className="entry-remove" disabled={busy} aria-label={`Remove ${exercise.name||`exercise ${index+1}`}`} onClick={()=>{setDraft(current=>({...current,exercises:current.exercises.filter(e=>e.id!==exercise.id)}));if(isExpanded)setExpanded(null);}}><X size={17}/></button></div>
        {isExpanded&&<m.div className="entry-exercise-body" initial={{opacity:0}} animate={{opacity:1}}><ExerciseName value={exercise.name} onChange={name=>updateExercise(exercise.id,{name})} items={suggestions} recent={new Set(recent.keys())}/>{last&&<div className="entry-previous"><span>Last: {last.sets} × {last.reps} · {last.weight} kg</span><button type="button" onClick={()=>updateExercise(exercise.id,{sets:last.sets,reps:last.reps,weight:last.weight})}><RotateCcw size={13}/> Use values</button></div>}<div className="entry-numbers"><EntryNumber label="Sets" value={exercise.sets} onChange={sets=>updateExercise(exercise.id,{sets})} min={1} max={20}/><EntryNumber label="Reps" value={exercise.reps} onChange={reps=>updateExercise(exercise.id,{reps})} min={1} max={100}/><EntryNumber label="Weight" unit="kg" value={exercise.weight} onChange={weight=>updateExercise(exercise.id,{weight})} min={0} max={1000} step={.25}/></div><button className="entry-done" type="button" onClick={()=>completeExercise(exercise.id)}><Check size={14}/> Done</button></m.div>}
      </m.div>;})}</AnimatePresence></div>
    </section>
    <div className="entry-notes"><button type="button" className="text-button" aria-expanded={notesOpen} onClick={()=>setNotesOpen(!notesOpen)}>{notesOpen?<ChevronDown size={15}/>:<Plus size={15}/>} Session notes <span className="optional">optional</span></button>{notesOpen&&<textarea value={draft.notes} onChange={e=>update({notes:e.target.value})} maxLength={600} rows={2} placeholder="How did it feel?" aria-label="Session notes"/>}</div>
    {(localError||error)&&<p role="alert" className="form-error entry-error">{localError||error}</p>}
    <div className="entry-totals" aria-label="Workout summary"><span><NumberFlow value={draft.exercises.length} transformTiming={numberMotion} spinTiming={numberMotion}/> exercises</span><span><NumberFlow value={totals.sets} transformTiming={numberMotion} spinTiming={numberMotion}/> sets</span><span><NumberFlow value={totals.volume} locales="en-IN" format={{maximumFractionDigits:1}} transformTiming={numberMotion} spinTiming={numberMotion}/> kg volume</span></div>
    <footer className="entry-footer"><div><small role="status">{ready?draftMessage:"Loading draft…"}</small><button type="button" onClick={clearDraft} disabled={busy} className="entry-discard"><Trash2 size={13}/> Discard</button></div><button className="btn primary" disabled={busy||!ready}>{busy?<Loader2 className="spin" size={16}/>:<Check size={17}/>} {config.mode==="edit"?"Save details":"Save workout"}</button></footer>
  </fieldset></form>;
}
