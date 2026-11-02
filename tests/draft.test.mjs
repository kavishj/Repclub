import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDraft, DRAFT_TTL, draftPrefix } from '../lib/workout-draft.ts';
const now=Date.now(),draft={version:1,savedAt:now,requestId:crypto.randomUUID(),title:'Upper body',type:'Strength',date:'2026-11-02',duration:45,notes:'A note',exercises:[{id:crypto.randomUUID(),name:'Bench press',sets:3,reps:null,weight:40}]};
test('workout drafts preserve partially entered numbers and the retry ID',()=>{assert.deepEqual(parseDraft(JSON.stringify(draft),now),draft);const manual={...draft,finishManually:true};assert.deepEqual(parseDraft(JSON.stringify(manual),now),manual);});
test('expired, future, malformed, and oversized drafts are ignored',()=>{assert.equal(parseDraft(JSON.stringify(draft),now+DRAFT_TTL),null);assert.equal(parseDraft(JSON.stringify({...draft,savedAt:now+60001}),now),null);assert.equal(parseDraft('{bad',now),null);assert.equal(parseDraft(JSON.stringify({...draft,exercises:Array(13).fill(draft.exercises[0])}),now),null);assert.equal(parseDraft(JSON.stringify({...draft,requestId:'bad'}),now),null);});
test('draft storage is scoped to a specific account',()=>{assert.notEqual(draftPrefix('one'),draftPrefix('two'));assert.ok(!draftPrefix('one:two').startsWith(draftPrefix('one')));});
