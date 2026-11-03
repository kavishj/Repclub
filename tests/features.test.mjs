import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.'))return next(specifier+'.ts',context);throw error;}}});
const {weeklyRecap,workoutCalendar,pilotStats}=await import('../lib/insights.ts');
const {refreshWorkoutHead}=await import('../lib/workout-pages.ts');
const {addRoutine}=await import('../lib/routines.ts');
const now=Date.parse('2026-11-03T10:00:00+05:30');

test('refreshing the first page retains older loaded workouts and updates existing records',()=>{
 const items=Array.from({length:40},(_,i)=>({id:String(100-i),createdAt:100-i,title:'Old'}));
 const previous={items,total:40,nextCursor:'60|60'},fresh={items:[{id:'101',createdAt:101,title:'New'},...items.slice(0,19).map(s=>({...s,title:'Updated'}))],total:41,nextCursor:'82|82'};
 const result=refreshWorkoutHead(previous,fresh);assert.equal(result.items.length,41);assert.equal(result.items[0].id,'101');assert.equal(result.items[1].title,'Updated');assert.equal(result.items.at(-1).id,'61');assert.equal(result.nextCursor,'60|60');assert.equal(new Set(result.items.map(s=>s.id)).size,41);
 assert.deepEqual(refreshWorkoutHead(previous,{items:[],total:0,nextCursor:null}),{items:[],total:0,nextCursor:null});
});
test('refresh removes deleted records within the refreshed head without dropping the older tail',()=>{
 const items=Array.from({length:40},(_,i)=>({id:String(100-i),createdAt:100-i}));const next={items:items.filter(s=>s.id!=='95').slice(0,20),total:39,nextCursor:'80|80'};
 const merged=refreshWorkoutHead({items,total:40,nextCursor:'60|60'},next);assert.equal(merged.items.length,39);assert(!merged.items.some(s=>s.id==='95'));assert.equal(merged.items.at(-1).id,'61');
});
test('recaps keep pending and manual logs separate from verified goal progress',()=>{
 const activity={attendance:[{date:'2026-11-02',status:'verified'},{date:'2026-11-02',status:'verified'},{date:'2026-11-03',status:'pending'},{date:'2026-11-03',status:'manual'},{date:'2026-10-26',status:'verified'},{date:'2026-10-28',status:'verified'},{date:'2026-11-04',status:'recording'}]};
 const r=weeklyRecap(activity,[{week:'2026-11-02',goal:3}],5,now);assert.equal(r.done,1);assert.equal(r.target,3);assert.equal(r.pending,1);assert.equal(r.manual,1);assert.equal(r.remaining,2);assert.equal(r.before,2);
});
test('calendar reminders use India time, start in the future, and do not record attendance',()=>{
 const text=workoutCalendar({days:[0,2,4],time:'06:00',name:'Gym, Floor; 1\nDesk',now});
 assert(text.includes('DTSTART;TZID=Asia/Kolkata:20261104T060000'));assert(text.includes('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR'));
 assert(text.includes('TRIGGER:-PT30M'));assert(text.includes('TRIGGER;RELATED=END:PT0M'));assert(text.includes('LOCATION:Gym\\, Floor\\; 1\\nDesk'));
 assert.throws(()=>workoutCalendar({days:[],time:'18:00',name:'Gym',now}));assert.throws(()=>workoutCalendar({days:[1],time:'28:00',name:'Gym',now}));
});
test('calendar handles a planned time before India midnight without changing weekdays',()=>{
 const text=workoutCalendar({days:[1],time:'00:15',name:'Gym',now:Date.parse('2026-11-02T23:55:00+05:30')});assert(text.includes('DTSTART;TZID=Asia/Kolkata:20261103T001500'));assert(text.includes('BYDAY=TU'));
});
test('adding a routine preserves partial workout values and caps the exercise count',()=>{
 const draft={title:'My session',type:'Mixed',notes:'Keep this',exercises:[{id:crypto.randomUUID(),name:'Squat',sets:null,reps:8,weight:45}]};
 const routine={name:'Full body',type:'Strength',exercises:JSON.stringify([{name:'Squat',sets:3,reps:10,weight:0},{name:'Row',sets:3,reps:10,weight:0}])};
 const result=addRoutine(draft,routine);assert.equal(result.title,'My session');assert.equal(result.type,'Mixed');assert.equal(result.notes,'Keep this');assert.equal(result.exercises[0].sets,null);assert.equal(result.exercises[0].weight,45);assert.equal(result.exercises.length,2);assert.equal(draft.exercises.length,1);
 const full={...draft,exercises:Array.from({length:12},(_,i)=>({...draft.exercises[0],name:'Exercise '+i}))};assert.equal(addRoutine(full,routine).exercises.length,12);
});
test('pilot return rate excludes members who have not yet completed four weeks',()=>{
 const members=[{userId:'a',goal:2},{userId:'b',goal:3},{userId:'new',goal:3}],dates=[{userId:'a',date:'2026-10-01'},{userId:'a',date:'2026-10-23'},{userId:'b',date:'2026-10-01'},{userId:'new',date:'2026-11-02'}];
 const r=pilotStats(members,dates,[],{starts:5,checkouts:4,averageReviewMinutes:null},now);assert.equal(r.activated,3);assert.equal(r.retentionCohort,2);assert.equal(r.retained,1);assert.equal(r.weeklyActive,1);assert.equal(r.goalsMet,0);assert.equal(r.averageReviewMinutes,null);
});

test('calendar text folds long unicode lines without corrupting names',()=>{const text=workoutCalendar({days:[0],time:'18:00',name:'जिम'.repeat(30),now});for(const line of text.split('\r\n'))assert(Buffer.byteLength(line,'utf8')<=75);assert(text.replace(/\r\n /g,'').includes('LOCATION:'+'जिम'.repeat(30)));});
