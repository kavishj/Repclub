"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { AppState, Session } from "../lib/league";
import type { WorkoutPage, WorkoutScope } from "../lib/workout-query";
type Options={scope:WorkoutScope;status?:string;query?:string;from?:string;to?:string;active?:boolean};
type PageState={key:string;page:WorkoutPage;loading:boolean;error:string};
export function useWorkoutPage(data:AppState,demo:boolean,{scope,status="all",query="",from,to,active=true}:Options){
  const params=new URLSearchParams({scope,status});if(query.trim())params.set("q",query.trim().slice(0,100));if(from)params.set("from",from);if(to)params.set("to",to);
  const signature=params.toString(),baseline=status==="all"&&!query.trim()&&!from&&!to;
  const source=scope==="mine"?data.mine:scope==="feed"?data.feed:data.reviews;
  const [stored,setStored]=useState<PageState|null>(null),[retry,setRetry]=useState(0);
  const key=`${data.me?.userId}:${data.campus?.id}:${data.serverNow}:${signature}:${retry}`;
  const generation=useRef(0),controller=useRef<AbortController|null>(null),inFlight=useRef(false);
  const demoItems=demo?source.filter(s=>(status==="all"||s.status===status)&&(!from||s.date>=from)&&(!to||s.date<=to)&&(!query.trim()||`${s.title} ${s.notes} ${s.type} ${s.exercises} ${data.members.find(m=>m.userId===s.userId)?.name??""}`.toLowerCase().includes(query.trim().toLowerCase()))):[];
  const page=demo?{items:demoItems,total:demoItems.length,nextCursor:null}:stored?.key===key?stored.page:baseline?{items:source,...data.pages[scope]}:{items:[],total:0,nextCursor:null};
  const loading=!demo&&(stored?.key===key?stored.loading:!baseline&&active),error=stored?.key===key?stored.error:"";
  useEffect(()=>{
    const job=++generation.current;controller.current?.abort();inFlight.current=false;
    if(demo||baseline||!active)return;
    const abort=new AbortController();controller.current=abort;
    const timer=setTimeout(async()=>{
      try{const response=await fetch(`/api/workouts?${signature}`,{cache:"no-store",signal:abort.signal}),body=await response.json() as WorkoutPage&{error?:string};if(!response.ok)throw new Error(body.error||"Could not load workouts.");if(job===generation.current)setStored({key,page:body,loading:false,error:""});}
      catch(error){if(!abort.signal.aborted&&job===generation.current)setStored({key,page:{items:[],total:0,nextCursor:null},loading:false,error:error instanceof Error?error.message:"Could not load workouts."});}
    },signature.includes("q=")?200:0);
    return()=>{clearTimeout(timer);abort.abort();};
  },[key,signature,active,baseline,demo]);
  async function loadMore(){
    if(inFlight.current||!page.nextCursor||demo)return;
    const job=generation.current,abort=new AbortController();controller.current=abort;inFlight.current=true;setStored({key,page,loading:true,error:""});
    try{const response=await fetch(`/api/workouts?${signature}&cursor=${encodeURIComponent(page.nextCursor)}`,{cache:"no-store",signal:abort.signal}),body=await response.json() as WorkoutPage&{error?:string};if(!response.ok)throw new Error(body.error||"Could not load workouts.");if(job===generation.current)setStored({key,page:{...body,items:[...page.items,...body.items.filter((item:Session)=>!page.items.some(s=>s.id===item.id))]},loading:false,error:""});}
    catch(error){if(!abort.signal.aborted&&job===generation.current)setStored({key,page,loading:false,error:error instanceof Error?error.message:"Could not load workouts."});}
    finally{if(job===generation.current)inFlight.current=false;}
  }
  useEffect(()=>()=>{generation.current++;controller.current?.abort();},[]);
  return {...page,loading,error,loadMore,retry:()=>setRetry(n=>n+1)};
}
export function WorkoutPageControls({page}:{page:ReturnType<typeof useWorkoutPage>}){
  return <div className="workout-page-controls">{page.error&&<div className="connection-error" role="alert"><span>{page.error}</span><button onClick={()=>{if(page.items.length&&page.nextCursor)void page.loadMore();else page.retry();}}>Retry <RefreshCw size={13}/></button></div>}{page.loading?<span className="page-loading" role="status"><Loader2 size={16} className="spin"/> Loading workouts</span>:page.nextCursor&&<button className="btn secondary load-more" onClick={()=>void page.loadMore()}>Load more workouts</button>}</div>;
}
