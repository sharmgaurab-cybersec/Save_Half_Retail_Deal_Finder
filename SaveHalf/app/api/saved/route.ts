import { env } from 'cloudflare:workers';
import { getUser } from '../../../lib/email-auth';
import { loadCatalogue } from '../../../lib/price-store';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
async function identity(){return (await getUser())?.userId;}
export async function GET(){
 const user=await identity();if(!user)return reply({error:'Sign in to save deals.'},401);
 try {if(!env.DB)throw new Error('DB unavailable');const rows=await env.DB.prepare('SELECT deal_id FROM saved_deals WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').bind(user).all<{deal_id:string}>();return reply({ids:rows.results.map(r=>r.deal_id)});}
 catch(e){console.error('Saved deals read failed',e);return reply({error:'Saved deals are temporarily unavailable. Please try again.'},503);}
}
async function write(request:Request,remove:boolean){
 const user=await identity();if(!user)return reply({error:'Sign in to save deals.'},401);
 const origin=request.headers.get('Origin');if(!origin||origin!==new URL(request.url).origin)return reply({error:'Request origin rejected.'},403);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'JSON required.'},415);
 if(Number(request.headers.get('Content-Length')||0)>1024)return reply({error:'Request too large.'},413);
 let body;try{const raw=await request.text();if(raw.length>1024)return reply({error:'Request too large.'},413);body=JSON.parse(raw);}catch{return reply({error:'Invalid request.'},400);}
 if(!body||typeof body.id!=='string'||!(await loadCatalogue()).deals.some(d=>d.id===body.id))return reply({error:'Unknown deal.'},400);
 try{if(!env.DB)throw new Error('DB unavailable');
 if(remove)await env.DB.prepare('DELETE FROM saved_deals WHERE user_id = ? AND deal_id = ?').bind(user,body.id).run();
 else await env.DB.prepare('INSERT OR IGNORE INTO saved_deals (user_id,deal_id,created_at) VALUES (?,?,?)').bind(user,body.id,Date.now()).run();
 return reply({ok:true});}
 catch(e){console.error('Saved deals write failed',e);return reply({error:'Could not update your saved deals. Please try again.'},503);}
}
export async function POST(request:Request){return write(request,false);}
export async function DELETE(request:Request){return write(request,true);}
