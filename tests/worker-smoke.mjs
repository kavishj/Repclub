import {createRequire} from 'node:module';
import {realpathSync,readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {dayKey} from '../lib/league.ts';
const require=createRequire(realpathSync('node_modules/wrangler/package.json'));
const {Miniflare}=require('miniflare');
const root=resolve('dist/server');
const paths=readdirSync(root,{recursive:true}).filter(p=>p.endsWith('.js')).sort((a,b)=>a==='index.js'?-1:b==='index.js'?1:a.localeCompare(b));
const mf=new Miniflare({modules:paths.map(p=>({type:'ESModule',path:resolve(root,p)})),modulesRoot:root,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'repclub-smoke'},cf:false});
try {
 const db=await mf.getD1Database('DB');
 for (const file of readdirSync('drizzle').filter(p=>p.endsWith('.sql')).sort()) {
  const sql=readFileSync('drizzle/'+file,'utf8');
  await db.batch(sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
  if(file.startsWith('0001_')) {
   await db.batch([
    db.prepare("INSERT INTO campuses (id,name,gym_name,invite_code,owner_id,created_at) VALUES ('migration-campus','Migration Campus','Gym','LEGACY12','migration-user',0)"),
    db.prepare("INSERT INTO members (user_id,campus_id,name,role,goal,days,joined_at) VALUES ('migration-user','migration-campus','Legacy Member','owner',3,'[]',0)"),
    db.prepare("INSERT INTO sessions (id,campus_id,user_id,title,type,date,duration,notes,exercises,status,desk_supported,created_at) VALUES ('migration-session','migration-campus','migration-user','Legacy visit','Strength',?,45,'','[]','verified',1,0)").bind(dayKey()),
   ]);
  }
 }
 const page=await mf.dispatchFetch('http://127.0.0.1:4173/');
 assert.equal(page.status,200);
 const html=await page.text();
 assert.match(html,/data-theme="dark"/);
 assert.ok(html.includes('Set up RepClub'));
 assert.ok(html.includes('Join a campus'));
 assert.ok(html.includes('Create a campus'));
 assert.ok(html.includes('Try demo'));
 assert.ok(html.includes('repclub-theme'));
 assert.ok(!html.includes('Sample workouts'));
 assert.ok(!html.includes('aria-label="Mobile navigation"'));
 console.log('PASS: first-run onboarding, explicit demo entry, and theme bootstrap.');
 const legacyResponse=await mf.dispatchFetch('http://127.0.0.1:4173/api/state',{headers:{'oai-authenticated-user-id':'migration-user','oai-authenticated-user-email':'migration@sites.test'}});
 const legacy=await legacyResponse.json();
 assert.equal(legacy.mine[0].duration,45);assert.equal(legacy.mine[0].status,'verified');assert.equal(legacy.mine[0].timingSource,'manual');assert.equal(legacy.mine[0].startedAt,null);assert.equal(legacy.mine[0].endedAt,null);assert.equal(legacy.me.stats.xp,0);assert.equal(legacy.me.stats.total,0);
 console.log('PASS: migration preserves legacy workouts and excludes unscanned duration from rewards.');
 const original=globalThis.fetch;
 globalThis.fetch=(url,options)=>mf.dispatchFetch(url,options);
 try {const {runApiSmoke}=await import('./api-smoke.mjs');await runApiSmoke(db);} finally {globalThis.fetch=original;}
} finally {await mf.dispose();}
