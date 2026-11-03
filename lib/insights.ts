import { dayKey,shiftDay,weekKey,type ActivitySummary,type Member,type Plan } from "./league";

export function weeklyRecap(activity:ActivitySummary,plans:Plan[],goal:number,now=Date.now()) {
  const today=dayKey(now),week=weekKey(today),last=shiftDay(week,-7);
  const current=activity.attendance.filter(s=>s.date>=week&&s.date<=today),previous=activity.attendance.filter(s=>s.date>=last&&s.date<week);
  const verified=(rows:ActivitySummary["attendance"])=>new Set(rows.filter(s=>s.status==="verified").map(s=>s.date)).size;
  const done=verified(current),before=verified(previous),pending=current.filter(s=>s.status==="pending").length,manual=current.filter(s=>s.status==="manual").length;
  const target=plans.find(p=>p.week===week)?.goal??goal,remaining=Math.max(0,target-done);
  return {week,done,before,pending,manual,logged:current.filter(s=>s.status!=="recording").length,target,remaining,
    message:done>=target?"Your weekly commitment is complete.":pending>=remaining&&remaining>0?"Your completed scans are awaiting review.":remaining===1?"One more verified gym day meets your weekly goal.":`${remaining} more verified gym days meet your weekly goal.`};
}

export type PilotStats = {members:number;activated:number;weeklyActive:number;goalsMet:number;starts:number;checkouts:number;averageReviewMinutes:number|null;retained:number;retentionCohort:number};
export function pilotStats(members:Member[],qualified:{userId:string;date:string}[],plans:Plan[],operations:{starts:number;checkouts:number;averageReviewMinutes:number|null},now=Date.now()):PilotStats {
  const today=dayKey(now),week=weekKey(today),dates=new Map<string,string[]>();
  for(const row of qualified){if(!dates.has(row.userId))dates.set(row.userId,[]);dates.get(row.userId)!.push(row.date);}
  let activated=0,weeklyActive=0,goalsMet=0,retained=0,retentionCohort=0;
  for(const member of members){
    const visits=[...new Set(dates.get(member.userId)??[])].sort(),first=visits[0];
    if(!first)continue;activated++;
    const count=visits.filter(d=>d>=week&&d<=today).length;if(count)weeklyActive++;
    if(count>=(plans.find(p=>p.userId===member.userId&&p.week===week)?.goal??member.goal))goalsMet++;
    if(first>=shiftDay(today,-55)&&first<=shiftDay(today,-28)){retentionCohort++;if(visits.some(d=>d>=shiftDay(first,21)&&d<=shiftDay(first,27)))retained++;}
  }
  return {members:members.length,activated,weeklyActive,goalsMet,...operations,retained,retentionCohort};
}

const weekdays=["MO","TU","WE","TH","FR","SA","SU"];
export function workoutCalendar({days,time,duration=60,reminder=30,name,now=Date.now()}:{days:number[];time:string;duration?:number;reminder?:number;name:string;now?:number}) {
  if(!days.length||days.some(d=>!Number.isInteger(d)||d<0||d>6)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error("Choose at least one planned day and a valid time.");
  if(!Number.isInteger(duration)||duration<15||duration>240||![10,30,60].includes(reminder))throw new Error("Choose a valid session length and reminder.");
  const selected=[...new Set(days)].sort(),today=dayKey(now);
  let first=today;
  for(let offset=0;offset<8;offset++){const date=shiftDay(today,offset),index=(new Date(date+"T12:00:00Z").getUTCDay()+6)%7;if(selected.includes(index)&&Date.parse(`${date}T${time}:00+05:30`)>now){first=date;break;}}
  const escape=(s:string)=>s.replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");
  const stamp=new Date(now).toISOString().replace(/[-:]|\.\d{3}/g,"");
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//RepClub//Workout plan//EN","CALSCALE:GREGORIAN","BEGIN:VTIMEZONE","TZID:Asia/Kolkata","BEGIN:STANDARD","DTSTART:19700101T000000","TZOFFSETFROM:+0530","TZOFFSETTO:+0530","TZNAME:IST","END:STANDARD","END:VTIMEZONE","BEGIN:VEVENT",`UID:${crypto.randomUUID()}@repclub`,`DTSTAMP:${stamp}`,`DTSTART;TZID=Asia/Kolkata:${first.replaceAll("-","")}T${time.replace(":","")}00`,`DURATION:PT${duration}M`,`RRULE:FREQ=WEEKLY;BYDAY=${selected.map(d=>weekdays[d]).join(",")}`,"SUMMARY:Gym time",`LOCATION:${escape(name)}`,"DESCRIPTION:Your RepClub plan. Scan in at the gym and scan out when you finish.","BEGIN:VALARM",`TRIGGER:-PT${reminder}M`,"ACTION:DISPLAY","DESCRIPTION:Your planned gym session starts soon.","END:VALARM","BEGIN:VALARM","TRIGGER;RELATED=END:PT0M","ACTION:DISPLAY","DESCRIPTION:Finished your workout? Remember to scan out at the gym.","END:VALARM","END:VEVENT","END:VCALENDAR",""];
  const encoder=new TextEncoder();
  return lines.map(line=>{let result="",bytes=0;for(const char of line){const size=encoder.encode(char).length;if(bytes+size>75){result+="\r\n ";bytes=1;}result+=char;bytes+=size;}return result;}).join("\r\n");
}
