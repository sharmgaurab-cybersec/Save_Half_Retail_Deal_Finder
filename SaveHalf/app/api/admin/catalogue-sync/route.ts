import { env } from 'cloudflare:workers';
import { isAdmin, sameOrigin } from '../../../../lib/admin';
import { fetchAldiListing } from '../../../../lib/aldi-catalogue';
import { saveOffer } from '../../../../lib/price-store';

export async function POST(request:Request){
 if(!await isAdmin())return Response.json({error:'Catalogue owner access required.'},{status:403});
 if(!sameOrigin(request))return Response.json({error:'Request origin rejected.'},{status:403});
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return Response.json({error:'JSON required.'},{status:415});
 if(!env.DB)return Response.json({error:'Catalogue storage is unavailable.'},{status:503});
 const raw=await request.text();if(raw.length>1000)return Response.json({error:'Request too large.'},{status:413});
 let page:number;try{page=JSON.parse(raw).page;}catch{return Response.json({error:'Invalid JSON.'},{status:400});}
 if(!Number.isInteger(page)||page<1||page>200)return Response.json({error:'Invalid catalogue page.'},{status:400});
 const now=Date.now();
 try{
  const claim=await env.DB.prepare('INSERT INTO sync_locks (name,started_at) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET started_at=excluded.started_at WHERE sync_locks.started_at < ?').bind('aldi-list-page-'+page,now,now-30*60*1000).run();
  if(!claim.meta.changes)return Response.json({error:'This page was checked recently. Try again after 30 minutes.'},{status:429});
  const parsed=await fetchAldiListing(page);
  for(const deal of parsed.deals)await saveOffer(deal,'catalogue-import');
  return Response.json({page,totalPages:parsed.totalPages,imported:parsed.deals.length,skipped:parsed.skipped},{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  // A failed check never replaces an earlier observation or advances the page.
  await env.DB.prepare('DELETE FROM sync_locks WHERE name=? AND started_at=?').bind('aldi-list-page-'+page,now).run().catch(()=>{});
  console.error('ALDI catalogue import failed',e);
  return Response.json({error:'ALDI catalogue page could not be imported. Earlier observations were preserved.'},{status:503});
 }
}
