import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import worker from '../cloudflare/worker.mjs';
const sql = new DatabaseSync(':memory:');
for (const file of ['0000_wakeful_calypso','0001_tired_mentor','0002_dear_living_tribunal']) sql.exec(await readFile(`drizzle/${file}.sql`,'utf8'));
const DB = {prepare(query) {const stmt=sql.prepare(query); let args=[]; const api={bind(...v){args=v;return api},async run(){const r=stmt.run(...args);return {meta:{changes:Number(r.changes)}}},async all(){return {results:stmt.all(...args)}},async first(){return stmt.get(...args)||null}};return api}};
const env={DB,SUPABASE_URL:'https://testproject.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',ASSETS:{async fetch(r){return new Response('{}',{status:r.url.endsWith('/catalogue/ids/aldi-oats.json')?200:404})}}};
const ids={alice:'11111111-1111-4111-8111-111111111111',bob:'22222222-2222-4222-8222-222222222222'};
const oldFetch=globalThis.fetch;
let providerCalls=0;
globalThis.fetch=async(url,init)=>{providerCalls++;const path=new URL(url).pathname;
 if(path.endsWith('/user')){const token=init.headers.Authorization?.slice(7);return token==='alice'||token==='bob'?Response.json({id:ids[token],email:token+'@example.com',email_confirmed_at:'2026-10-01'}):Response.json({error:'invalid'}, {status:401})}
 if(path.endsWith('/verify')){const b=JSON.parse(init.body);return b.token==='123456'?Response.json({access_token:'alice',expires_in:7200}):Response.json({error:'invalid'},{status:400})}
 return Response.json({});};
function request(path,method='GET',data,token,origin='https://savehalf.test') {return new Request('https://savehalf.test'+path,{method,headers:{Origin:origin,...(data?{'Content-Type':'application/json'}:{}),...(token?{Cookie:'__Host-savehalf-session='+token}:{}),'CF-Connecting-IP':'192.0.2.1'},...(data?{body:JSON.stringify(data)}:{})})}
try{
 let r=await worker.fetch(request('/api/session'),env);assert.deepEqual(await r.json(),{enabled:true,signedIn:false});
 r=await worker.fetch(new Request('https://savehalf.test/api/saved',{headers:{'oai-authenticated-user-id':ids.alice,'oai-authenticated-user-email':'alice@example.com'}}),env);assert.equal(r.status,401);
 const before=providerCalls;r=await worker.fetch(request('/api/auth/request-code','POST',{email:'alice@example.com'},null,'https://evil.test'),env);assert.equal(r.status,403);assert.equal(providerCalls,before);
 r=await worker.fetch(request('/api/auth/verify-code','POST',{email:'alice@example.com',token:'000000'}),env);assert.equal(r.status,401);
 r=await worker.fetch(request('/api/auth/verify-code','POST',{email:'alice@example.com',token:'123456'}),env);assert.equal(r.status,200);const cookie=r.headers.get('Set-Cookie');for(const flag of ['Secure','HttpOnly','SameSite=Lax','Max-Age=3600'])assert.ok(cookie.includes(flag));
 r=await worker.fetch(request('/api/saved','POST',{id:'aldi-oats'},'alice'),env);assert.equal(r.status,200);
 r=await worker.fetch(request('/api/saved','GET',undefined,'bob'),env);assert.deepEqual(await r.json(),{ids:[]});
 r=await worker.fetch(request('/api/saved','GET',undefined,'alice'),env);assert.deepEqual(await r.json(),{ids:['aldi-oats']});
 r=await worker.fetch(request('/api/saved','DELETE',{id:'aldi-oats'},'bob'),env);assert.equal(r.status,200);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM saved_deals').get().n,1);
 r=await worker.fetch(request('/api/saved','POST',{id:'invented-product'},'alice'),env);assert.equal(r.status,400);
 r=await worker.fetch(request('/api/saved','POST',{id:'../secret'},'alice'),env);assert.equal(r.status,400);
 r=await worker.fetch(request('/api/saved','GET',undefined,'expired'),env);assert.equal(r.status,401);
 r=await worker.fetch(request('/api/auth/logout','POST',undefined,'alice'),env);assert.ok(r.headers.get('Set-Cookie').includes('Max-Age=0'));
 for(let i=0;i<3;i++){r=await worker.fetch(request('/api/auth/request-code','POST',{email:'limited@example.com'}),env);assert.equal(r.status,200)}
 r=await worker.fetch(request('/api/auth/request-code','POST',{email:'limited@example.com'}),env);assert.equal(r.status,429);
 r=await worker.fetch(request('/api/admin/offers','POST',{id:'aldi-oats'},'alice'),env);assert.equal(r.status,403);
 console.log('PASS: OTP validation, cookie flags, origin checks, rate limits, expired sessions, forged platform headers, unknown IDs, per-account favourites and disabled platform admin.');
}finally{globalThis.fetch=oldFetch;sql.close()}
