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
 // Rotation must preserve the previous QR until its original displayed expiry.
 const previousExpiry=Date.now()+11000;
 await db.prepare('UPDATE desk_codes SET expires_at=? WHERE campus_id=?').bind(previousExpiry,o.campus.id).run();
 const rotatedCode=await qr(owner);assert.notEqual(rotatedCode,code);
 const rotated=await db.prepare('SELECT previous_code,previous_expires_at FROM desk_codes WHERE campus_id=?').bind(o.campus.id).first();assert.equal(rotated.previous_code,code);assert.equal(rotated.previous_expires_at,previousExpiry);
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
 assert.equal((await state(student)).activity.goalLocked,true);
 await act(outsider,{action:'scanCancel',id:sid},404);
 await act(outsider,{action:'scanFinish',id:sid,code:otherCode},404);
 const startedAt=await elapsed(sid,45*60000+500);
 await db.prepare('UPDATE desk_codes SET expires_at=?,previous_expires_at=? WHERE campus_id=?').bind(Date.now()-1,Date.now()-1,o.campus.id).run();
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
 assert.equal(o.activity.goalLocked,true);await db.prepare('UPDATE plans SET locked_at=NULL WHERE user_id=? AND week=?').bind(owner,o.week).run();await act(owner,{action:'plan',goal:2,days:[1,4]},409);await act(owner,{action:'plan',goal:3,days:[1,3,5]});
 assert.equal(saved.status,'manual');assert.equal(saved.endedAt,null);assert.equal(saved.timingSource,'manual');assert.equal(o.me.stats.xp,0);assert.equal(o.activeSession,null);
 await act(owner,{action:'scanStart',code:ownerCode});o=await state(owner);ownId=o.activeSession.id;await elapsed(ownId,5*60*60000);
 await act(owner,{action:'scanFinish',id:ownId,code:ownerCode});o=await state(owner);assert.equal(o.activeSession,null);const overlong=o.mine.find(s=>s.id===ownId);assert.equal(overlong.status,'unqualified');assert.ok(overlong.endedAt);assert.equal(o.me.stats.xp,0);await act(student,{action:'review',id:ownId,decision:'verified',confirmed:true,note:''},403);
 ownerCode=await qr(owner);await act(owner,{action:'scanStart',code:ownerCode});o=await state(owner);ownId=o.activeSession.id;await elapsed(ownId,6*60000);
 await act(owner,{action:'scanFinish',id:ownId,code:ownerCode});
 await act(owner,{action:'review',id:ownId,decision:'verified',confirmed:true,note:''},403);
 await act(student,{action:'role',id:owner,role:'staff'},403);await act(owner,{action:'role',id:student,role:'staff'});
 await act(student,{action:'review',id:ownId,decision:'verified',confirmed:true,note:'Independently checked.'});assert.equal((await state(owner)).me.stats.xp,10);
 await act(owner,{action:'cheer',id:sid});assert.equal((await state(owner)).feed.find(item=>item.id===sid).cheers,1);
 await act(owner,{action:'cheer',id:sid});assert.equal((await state(owner)).feed.find(item=>item.id===sid).cheers,0);
 const manualWrites=await Promise.all([post(owner,manual),post(owner,manual)]);assert.deepEqual(manualWrites.map(r=>r.status),[200,200]);assert.equal((await state(owner)).me.stats.xp,10);
 // Short visits record checkout, earn nothing, and allow a later real attempt.
 const earlyCode=await qr(owner);await act(invited,{action:'scanStart',code:earlyCode});let early=await state(invited);const earlyId=early.activeSession.id;
 await act(invited,{action:'scanFinish',id:earlyId,code:earlyCode});early=await state(invited);assert.equal(early.activeSession,null);assert.equal(early.mine.find(s=>s.id===earlyId).status,'unqualified');assert.equal(early.me.stats.xp,0);assert.ok(early.mine[0].endedAt);
 await act(owner,{action:'review',id:earlyId,decision:'verified',confirmed:true,note:''},409);
 await act(invited,{action:'scanStart',code:earlyCode});early=await state(invited);const fallbackId=early.activeSession.id,beforeFallback=early.pages.mine.total;
 const fallback={action:'manualFinish',id:fallbackId,title:'Recovered session',type:'Mixed',duration:32,notes:'No checkout available',exercises:manual.exercises};
 await act(outsider,fallback,404);await act(invited,fallback);await act(invited,fallback);early=await state(invited);const fallbackSaved=early.mine.find(s=>s.id===fallbackId);
 assert.equal(early.activeSession,null);assert.equal(early.pages.mine.total,beforeFallback+1);assert.equal(fallbackSaved.status,'manual');assert.equal(fallbackSaved.duration,32);assert.equal(fallbackSaved.endedAt,null);assert.equal(fallbackSaved.title,'Recovered session');await act(invited,{...fallback,title:'Conflicting late edit'},409);assert.equal(early.activity.goalLocked,true);assert.equal(early.me.stats.xp,0);await act(invited,{action:'plan',goal:2,days:[0,2]},409);
 // A retried manual save uses the same request ID and cannot create duplicates.
 const requestId=crypto.randomUUID();await Promise.all([act(invited,{...manual,requestId}),act(invited,{...manual,requestId})]);early=await state(invited);assert.equal(early.mine.filter(s=>s.id===requestId).length,1);await act(outsider,{...manual,requestId},409);
 // Bound initial payloads, deterministic cursors, complete search/export, and campus privacy.
 const bulkAt=Date.now()+1000;
 await db.batch(Array.from({length:45},(_,i)=>db.prepare("INSERT INTO sessions (id,campus_id,user_id,title,type,date,duration,notes,exercises,status,timing_source,created_at) VALUES (?,?,?,?,'Strength',?,30,'','[]','manual','manual',?)").bind(`page-${tag}-${String(i).padStart(3,'0')}`,o.campus.id,owner,i===0?'Hidden matching exercise':'Page fixture '+i,dayKey(),bulkAt)));
 o=await state(owner);assert.equal(o.mine.length,20);assert.ok(o.pages.mine.nextCursor);assert.ok(o.pages.mine.total>=45);assert.equal(o.me.stats.xp,10);assert.ok(o.activity.attendance.some(s=>s.status==='verified'));
 const seen=new Set();let cursor=null,total;
 do{const page=await request(owner,'/api/workouts?scope=mine'+(cursor?'&cursor='+encodeURIComponent(cursor):''));assert.ok(page.items.length<=20);total=page.total;for(const item of page.items){assert.ok(!seen.has(item.id));seen.add(item.id);assert.equal(item.userId,owner);}cursor=page.nextCursor;}while(cursor);
 assert.equal(seen.size,total);const searched=await request(owner,'/api/workouts?scope=mine&q=Hidden%20matching');assert.equal(searched.items.length,1);assert.equal(searched.total,1);
 const filtered=await request(owner,'/api/workouts?scope=mine&status=manual');assert.ok(filtered.items.every(s=>s.status==='manual'));
 await request(invited,'/api/workouts?scope=reviews',null,403);await request(owner,'/api/workouts?cursor=bad',null,400);await request(owner,'/api/workouts?from=2026-02-30',null,400);await request(null,'/api/workouts',null,401);
 const exported=await request(owner,'/api/export');assert.equal(exported.workouts.length,total);assert.ok(exported.workouts.every(s=>s.userId===owner));await request(null,'/api/export',null,401);
 const other=await state(outsider);assert.equal(other.feed.length,0);assert.equal(other.members.length,1);assert.equal(other.reviews.length,0);
 const isolated=await fetch(base+'/',{headers:headers(outsider)});const isolatedHtml=await isolated.text();assert.ok(isolatedHtml.includes('Other Campus '+tag));assert.ok(!isolatedHtml.includes('QA Campus '+tag));
 console.log('PASS: QR overlap expiry, durable goal locks, atomic manual fallback, short/long checkout, idempotent saves, bounded pagination/search/export, privacy, and onboarding, manual-log exclusion, scan clocks and reload, expired/foreign QR rejection, forged timestamps, duplicate/concurrent scans, immutable durations, independent review, abandoned sessions, permissions, private feeds, rewards, and durable reload.');
}
