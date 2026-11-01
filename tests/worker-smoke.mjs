import {createRequire} from 'node:module';
import {realpathSync,readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
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
 const original=globalThis.fetch;
 globalThis.fetch=(url,options)=>mf.dispatchFetch(url,options);
 try {await import('./api-smoke.mjs');} finally {globalThis.fetch=original;}
} finally {await mf.dispose();}
