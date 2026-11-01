import test from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, weekKey, statsFor, rankMembers, newMilestone, countsForRewards, badgeList } from '../lib/league.ts';
const now = Date.parse('2026-10-31T10:00:00Z');
const member = {userId:'a',campusId:'c',name:'A',role:'member',goal:3,days:'[0,2,4]',squadId:null,joinedAt:0};
const session = (date,status='verified',userId='a') => {const startedAt=Date.parse(date+'T08:00:00+05:30');return {id:crypto.randomUUID(),campusId:'c',userId,date,status,timingSource:'scan',startedAt,endedAt:startedAt+45*60000,duration:45};};
test('India day and Monday rollover use the actual India boundary', () => {
 assert.equal(dayKey(Date.parse('2026-11-01T18:29:00Z')),'2026-11-01');
 assert.equal(dayKey(Date.parse('2026-11-01T18:30:00Z')),'2026-11-02');
 assert.equal(weekKey('2026-11-01'),'2026-10-26'); assert.equal(weekKey('2026-11-02'),'2026-11-02');
});
test('only unique verified past days earn points', () => {
 const stats=statsFor(member,[session('2026-10-26'),session('2026-10-26'),session('2026-10-27','pending'),session('2026-10-28','declined'),session('2026-11-03'),session('2026-10-29','verified','b')],[],now);
 assert.equal(stats.count,1); assert.equal(stats.xp,10); assert.equal(stats.total,1);
});
test('XP and weekly scores cap at the agreed commitment', () => {
 const stats=statsFor({...member,goal:2},[session('2026-10-26'),session('2026-10-27'),session('2026-10-28')],[],now);
 assert.equal(stats.percent,100); assert.equal(stats.xp,20); assert.equal(stats.points,20); assert.equal(stats.total,3);
});
test('past weeks use the recorded goal, not a newly selected target', () => {
 const stats=statsFor({...member,goal:5},[session('2026-10-19'),session('2026-10-21')],[{id:'p',userId:'a',week:'2026-10-19',goal:2,days:'[]'}],now);
 assert.equal(stats.xp,20); assert.equal(stats.goalWeeks,1);
});
test('different commitments can share first place without extra-session tie breakers', () => {
 const members=[{...member,goal:2},{...member,userId:'b',name:'B'},{...member,userId:'c',name:'C'}];
 const sessions=[session('2026-10-26'),session('2026-10-28'),...['2026-10-26','2026-10-28','2026-10-30'].map(d=>session(d,'verified','b')),session('2026-10-26','verified','c')];
 const ranked=rankMembers(members,sessions,[],now); assert.deepEqual(ranked.map(m=>m.rank),[1,1,3]); assert.deepEqual(ranked.map(m=>m.stats.percent),[100,100,33]);
});
test('comeback recognition requires two verified visits at least seven days apart', () => {
 assert.equal(statsFor(member,[session('2026-10-19'),session('2026-10-28')],[],now).comeback,true);
 assert.equal(statsFor(member,[session('2026-10-26'),session('2026-10-28')],[],now).comeback,false);
});

const progressState = (stats, userId = 'a', campusId = 'c') => ({week:'2026-10-26',campus:{id:campusId},me:{userId,stats}});
const before = {count:2,goal:3,percent:67,points:20,xp:20,total:2,goalWeeks:0,comeback:false};
test('milestones ignore initial loads, unchanged pending logs, and other accounts', () => {
 const previous=progressState(before), complete=progressState({...before,count:3,percent:100,total:3,goalWeeks:1});
 assert.equal(newMilestone(null,complete),null);
 assert.equal(newMilestone(previous,progressState({...before})),null);
 assert.equal(newMilestone(previous,progressState(complete.me.stats,'b')),null);
 assert.equal(newMilestone(previous,progressState(complete.me.stats,'a','other-campus')),null);
});
test('goal changes alone cannot trigger a verified milestone', () => {
 assert.equal(newMilestone(progressState(before),progressState({...before,goal:2,percent:100,goalWeeks:1})),null);
});
test('new verified visits celebrate goal completion and newly earned badges once', () => {
 const previous=progressState(before), complete=progressState({...before,count:3,percent:100,total:3,goalWeeks:1});
 assert.equal(newMilestone(previous,complete),'Weekly goal complete');
 assert.equal(newMilestone(complete,complete),null);
 assert.equal(newMilestone(progressState({...before,total:0}),progressState({...before,total:1})),'Unlocked: First visit');
});

test('manual, legacy, incomplete, and client-edited durations earn no points or achievements', () => {
 const valid=session('2026-10-26');
 const invalid=[{...valid,timingSource:'manual'},{...valid,timingSource:undefined,startedAt:undefined,endedAt:undefined},{...valid,endedAt:null},{...valid,startedAt:null},{...valid,duration:200},{...valid,endedAt:valid.startedAt-1},{...valid,date:'2026-10-27'},{...valid,endedAt:now+60000}];
 for(const entry of invalid){
  assert.equal(countsForRewards(entry,now),false);
  const stats=statsFor(member,[entry],[],now);
  assert.equal(stats.total,0);assert.equal(stats.xp,0);assert.equal(stats.percent,0);
  assert.ok(badgeList(stats).every(badge=>!badge.earned));
 }
 assert.equal(countsForRewards(valid,now),true);
});
test('reward time boundaries use exact elapsed milliseconds, including checkout across midnight', () => {
 const startedAt=Date.parse('2026-10-26T23:55:00+05:30');
 const base={...session('2026-10-26'),startedAt};
 for(const [elapsed,expected] of [[299999,false],[300000,true],[14400000,true],[14400001,false]]){
  const entry={...base,endedAt:startedAt+elapsed,duration:Math.floor(elapsed/60000)};
  assert.equal(countsForRewards(entry,now),expected);
 }
});
test('manual logs cannot improve rankings or create comeback and multiweek badges', () => {
 const all=['2026-10-05','2026-10-07','2026-10-09','2026-10-19','2026-10-21','2026-10-23','2026-10-26','2026-10-28','2026-10-30'].map(date=>({...session(date),timingSource:'manual'}));
 const stats=statsFor(member,all,[],now);assert.equal(stats.xp,0);assert.equal(stats.goalWeeks,0);assert.equal(stats.comeback,false);
 const ranked=rankMembers([member,{...member,userId:'b',name:'B'}],[...all,session('2026-10-26','verified','b')],[],now);
 assert.equal(ranked[0].userId,'b');assert.equal(ranked.find(m=>m.userId==='a').stats.percent,0);
});
