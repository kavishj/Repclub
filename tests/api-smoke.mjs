import assert from 'node:assert/strict';
import { dayKey, shiftDay, weekKey } from '../lib/league.ts';

export async function runApiSmoke(db) {
 const base='http://127.0.0.1:4173';
 const tag=crypto.randomUUID().slice(0,8), owner='qa-owner-'+tag, student='qa-student-'+tag, outsider='qa-other-'+tag;
 const profile={name:'QA Member',goal:3,days:[0,2,4],consent:true};
 const headers=user=>user?{'oai-authenticated-user-id':user,'oai-authenticated-user-email':user+'@sites.test'}:{};
 async function request(user,path,payload,expected=200){
  const r=await fetch(base+path,{method:payload?'POST':'GET',headers:{...headers(user),...(payload?{'Content-Type':'application/json'}:{})},...(payload?{body:JSON.stringify(payload)}:{})});
  const data=await r.json();assert.equal(r.status,expected,JSON.stringify(data));return data;
 }
 const act=(user,payload,status=200)=>request(user,'/api/actions',payload,status), state=user=>request(user,'/api/state');
 const post=(user,payload)=>fetch(base+'/api/actions',{method:'POST',headers:{...headers(user),'Content-Type':'application/json'},body:JSON.stringify(payload)});
 const qr=async user=>{await act(user,{action:'desk'});return (await state(user)).deskCode.code;};
 // Only the ephemeral test database is changed to simulate elapsed time. There is no app clock override.
 const elapsed=async (id,milliseconds)=>{
  const startedAt=Date.now()-milliseconds;
  await db.prepare('UPDATE sessions SET started_at=?,date=? WHERE id=?').bind(startedAt,dayKey(startedAt),id).run();
  return startedAt;
 };

 await act(null,{action:'desk'},401);
 const anonymous=await state(null);assert.equal(anonymous.user,null);assert.equal(anonymous.activeSession,null);assert.equal(anonymous.members.length,0);
 const firstVisit=await fetch(base+'/',{headers:headers(owner)});assert.equal(firstVisit.status,200);assert.ok((await firstVisit.text()).includes('Set up RepClub'));
 await act(owner,{action:'createCampus',...profile,consent:false,name:'QA Owner',campusName:'QA Campus '+tag,gymName:'QA Gym'},400);
 assert.equal((await state(owner)).me,null);
 await act(student,{action:'joinCampus',...profile,code:'BADCODE2'},404);assert.equal((await state(student)).me,null);
 await act(owner,{action:'createCampus',...profile,name:'QA Owner',campusName:'QA Campus '+tag,gymName:'QA Gym'});
 let o=await state(owner);assert.equal(o.me.role,'owner');assert.equal(o.me.stats.xp,0);assert.equal(o.me.name,'QA Owner');assert.equal(o.me.goal,3);assert.equal(o.me.days,'[0,2,4]');
 const returning=await fetch(base+'/',{headers:headers(owner)});const dashboard=await returning.text();
 assert.equal(returning.status,200);assert.ok(dashboard.includes('QA Campus '+tag));assert.ok(dashboard.includes('Finish setup'));assert.ok(dashboard.includes('Scan to start'));assert.ok(dashboard.includes('Workout timer'));assert.ok(dashboard.includes('aria-label="Mobile navigation"'));
 await act(student,{action:'joinCampus',...profile,name:'QA Student',code:o.campus.inviteCode});
 await act(outsider,{action:'createCampus',...profile,name:'QA Outsider',campusName:'Other Campus '+tag,gymName:'Other Gym'});
 await act(student,{action:'desk'},403);
 await act(owner,{action:'createSquad',name:'QA Squad'});o=await state(owner);const squad=o.squads.find(s=>s.id===o.me.squadId);
 await act(outsider,{action:'joinSquad',code:squad.inviteCode},404);await act(student,{action:'joinSquad',code:squad.inviteCode});
 const invited='qa-invite-'+tag;await act(invited,{action:'joinCampus',...profile,name:'Invited Student',code:squad.inviteCode});assert.equal((await state(invited)).me.squadId,squad.id);

 const manual={action:'workout',title:'Manual strength',type:'Strength',date:dayKey(),duration:45,notes:'Synthetic local test',exercises:[{name:'Row',sets:3,reps:10,weight:20}]};
 await act(student,{...manual,date:shiftDay(dayKey(),1)},400);
 await act(student,{...manual,timingSource:'scan',startedAt:Date.now()-45*60000,endedAt:Date.now()},400);
 await act(student,{...manual,code:'000000'});await act(student,manual);
 let s=await state(student);const manualId=s.mine[0].id;
 assert.equal(s.mine.length,2);assert.equal(s.mine[0].status,'manual');assert.equal(s.mine[0].timingSource,'manual');assert.equal(s.mine[0].startedAt,null);assert.equal(s.mine[0].endedAt,null);assert.equal(s.me.stats.xp,0);assert.equal(s.me.stats.total,0);assert.equal((await state(owner)).reviews.length,0);
 await act(owner,{action:'review',id:manualId,decision:'verified',confirmed:true,note:''},409);
 await act(student,{action:'plan',goal:2,days:[0,2]});await act(student,{action:'plan',goal:3,days:[0,2,4]});

 const code=await qr(owner), otherCode=await qr(outsider);
 assert.match(code,/^repclub:gym:v1:[a-f0-9]{64}$/);assert.notEqual(code,otherCode);assert.equal((await state(student)).deskCode,null);
 await act(student,{action:'scanStart',code:'000000'},400);
 await act(student,{action:'scanStart',code:otherCode},400);
 await act(student,{action:'scanStart',code,startedAt:Date.now()-3600000},400);
 await act(student,{action:'scanFinish',id:'missing',code},404);
 const starts=await Promise.all([post(student,{action:'scanStart',code}),post(student,{action:'scanStart',code})]);
 assert.deepEqual(starts.map(r=>r.status).sort(),[200,409]);
 s=await state(student);const sid=s.activeSession.id, originalStart=s.activeSession.startedAt;
 assert.equal(s.activeSession.duration,0);assert.equal(s.activeSession.endedAt,null);assert.equal(s.activeSession.status,'recording');assert.ok(Math.abs(originalStart-Date.now())<60000);
 assert.equal((await state(student)).activeSession.startedAt,originalStart);assert.equal((await state(owner)).activeSession,null);assert.equal((await state(owner)).reviews.length,0);assert.ok(!(await state(owner)).feed.some(item=>item.id===sid));
 await act(student,{action:'plan',goal:2,days:[0,2]},409);
 const details={action:'workoutDetails',id:sid,title:'Scanned strength',type:'Strength',notes:'Timed visit',exercises:manual.exercises};
 await act(owner,details,409);await act(student,{...details,duration:999},400);await act(student,details);
 await act(student,{action:'scanFinish',id:sid,code},400);
 await act(outsider,{action:'scanCancel',id:sid},404);
 await act(outsider,{action:'scanFinish',id:sid,code:otherCode},404);
 const startedAt=await elapsed(sid,45*60000+500);
 await db.prepare('UPDATE desk_codes SET expires_at=? WHERE campus_id=?').bind(Date.now()-1,o.campus.id).run();
 await act(student,{action:'scanFinish',id:sid,code},400);
 const freshCode=await qr(owner);assert.notEqual(freshCode,code);
 await act(student,{action:'scanFinish',id:sid,code:otherCode},400);
 await act(student,{action:'scanFinish',id:sid,code:freshCode,duration:200,endedAt:Date.now()+3600000},400);
 const finishes=await Promise.all([post(student,{action:'scanFinish',id:sid,code:freshCode}),post(student,{action:'scanFinish',id:sid,code:freshCode})]);
 assert.deepEqual(finishes.map(r=>r.status).sort(),[200,409]);
 s=await state(student);const completed=s.mine.find(item=>item.id===sid);
 assert.equal(s.activeSession,null);assert.equal(completed.startedAt,startedAt);assert.equal(completed.duration,Math.floor((completed.endedAt-completed.startedAt)/60000));assert.equal(completed.duration,45);assert.equal(completed.status,'pending');assert.equal(s.me.stats.xp,0);assert.equal(s.me.stats.total,0);
 await act(student,{action:'scanFinish',id:sid,code:freshCode},409);await act(student,{action:'scanCancel',id:sid},409);
 if(completed.date===dayKey()) await act(student,{action:'scanStart',code:freshCode},409);
 await act(student,{action:'review',id:sid,decision:'verified',confirmed:true,note:''},403);
 await act(outsider,{action:'review',id:sid,decision:'verified',confirmed:true,note:''},404);
 await act(owner,{action:'review',id:sid,decision:'verified',confirmed:false,note:''},400);
 await act(owner,{action:'review',id:sid,decision:'verified',confirmed:true,note:'Attendance independently checked.'});
 s=await state(student);assert.equal(s.me.stats.xp,10);assert.equal(s.me.stats.total,1);assert.equal(s.me.stats.count,weekKey(completed.date)===s.week?1:0);
 await act(owner,{action:'review',id:sid,decision:'verified',confirmed:true,note:''},409);await act(student,details,409);

 // Abandoned and expired visits remain history-only and release the active-session slot.
 let ownerCode=await qr(owner);await act(owner,{action:'scanStart',code:ownerCode});o=await state(owner);let ownId=o.activeSession.id;
 await act(owner,{action:'scanCancel',id:ownId});o=await state(owner);let saved=o.mine.find(item=>item.id===ownId);
 assert.equal(saved.status,'manual');assert.equal(saved.endedAt,null);assert.equal(saved.timingSource,'manual');assert.equal(o.me.stats.xp,0);assert.equal(o.activeSession,null);
 await act(owner,{action:'scanStart',code:ownerCode});o=await state(owner);ownId=o.activeSession.id;await elapsed(ownId,5*60*60000);
 await act(owner,{action:'scanFinish',id:ownId,code:ownerCode},409);await act(owner,{action:'scanCancel',id:ownId});assert.equal((await state(owner)).me.stats.xp,0);
 ownerCode=await qr(owner);await act(owner,{action:'scanStart',code:ownerCode});o=await state(owner);ownId=o.activeSession.id;await elapsed(ownId,6*60000);
 await act(owner,{action:'scanFinish',id:ownId,code:ownerCode});
 await act(owner,{action:'review',id:ownId,decision:'verified',confirmed:true,note:''},403);
 await act(student,{action:'role',id:owner,role:'staff'},403);await act(owner,{action:'role',id:student,role:'staff'});
 await act(student,{action:'review',id:ownId,decision:'verified',confirmed:true,note:'Independently checked.'});assert.equal((await state(owner)).me.stats.xp,10);
 await act(owner,{action:'cheer',id:sid});assert.equal((await state(owner)).feed.find(item=>item.id===sid).cheers,1);
 await act(owner,{action:'cheer',id:sid});assert.equal((await state(owner)).feed.find(item=>item.id===sid).cheers,0);
 const manualWrites=await Promise.all([post(owner,manual),post(owner,manual)]);assert.deepEqual(manualWrites.map(r=>r.status),[200,200]);assert.equal((await state(owner)).me.stats.xp,10);
 const other=await state(outsider);assert.equal(other.feed.length,0);assert.equal(other.members.length,1);assert.equal(other.reviews.length,0);
 const isolated=await fetch(base+'/',{headers:headers(outsider)});const isolatedHtml=await isolated.text();assert.ok(isolatedHtml.includes('Other Campus '+tag));assert.ok(!isolatedHtml.includes('QA Campus '+tag));
 console.log('PASS: onboarding, manual-log exclusion, scan clocks and reload, expired/foreign QR rejection, forged timestamps, duplicate/concurrent scans, immutable durations, independent review, abandoned sessions, permissions, private feeds, rewards, and durable reload.');
}
