import { env } from 'cloudflare:workers';
import aldiSnapshot from '../data/aldi-catalogue.json';
import retailerSnapshot from '../data/retailer-catalogue.json';
import { alternativeFamily } from './product-families';
import { observedOffers, validateDeal, type Deal } from './catalog';
import { readRetailerPage } from './retailer-pages';
export async function loadCatalogue():Promise<{deals:Deal[];warning?:string}>{
 const offers=new Map(observedOffers.map(d=>[d.id,d]));
 for(const raw of [...aldiSnapshot.deals,...retailerSnapshot.deals]){const known=observedOffers.find(d=>d.source===raw.source);const d=validateDeal({...raw,id:known?.id||raw.id,product:known?.product||raw.product,family:alternativeFamily(raw.title)||raw.family});if(d){const existing=offers.get(d.id);if(!existing||Date.parse(d.checked)>Date.parse(existing.checked))offers.set(d.id,d);}}
 try{if(!env.DB)throw Error('Database binding unavailable');const r=await env.DB.prepare('SELECT payload FROM price_offers ORDER BY updated_at DESC LIMIT 5000').all<{payload:string}>();
 for(const row of r.results){try{const d=validateDeal(JSON.parse(row.payload));if(d){const existing=offers.get(d.id);if(!existing||Date.parse(d.checked)>=Date.parse(existing.checked))offers.set(d.id,d);}}catch{}}
 return {deals:[...offers.values()]};
 }catch(e){console.error('Catalogue read failed',e);return {deals:[...offers.values()],warning:'Database unavailable. Showing dated source observations; saving and updates may be unavailable.'};}
}
export async function saveOffer(d:Deal,event='manual'){
 if(!env.DB)throw Error('Database unavailable');
 const historyId=d.id+'-'+d.checked;
 await env.DB.batch([
 env.DB.prepare('INSERT INTO price_offers (id,payload,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at').bind(d.id,JSON.stringify(d),Date.now()),
 env.DB.prepare('INSERT OR IGNORE INTO price_history (id,offer_id,price_cents,observed_at,method) VALUES (?,?,?,?,?)').bind(historyId,d.id,d.price===null?null:Math.round(d.price*100),d.checked,d.method),
 env.DB.prepare('INSERT INTO sync_events (id,offer_id,status,message,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),d.id,event,'Source observation stored.',Date.now()),
 ]);
}
export async function refreshCatalogue(){
 if(!env.DB)throw Error('Database unavailable');
 const now=Date.now();
 const claim=await env.DB.prepare('INSERT INTO sync_locks (name,started_at) VALUES (?,?) ON CONFLICT(name) DO UPDATE SET started_at=excluded.started_at WHERE sync_locks.started_at < ?').bind('retailer-pages',now,now-30*60*1000).run();
 if(!claim.meta.changes)return {status:'cached',message:'Price checks run at most once every 30 minutes. Last observations are shown.'};
 const catalogue=await loadCatalogue();const deals=catalogue.deals.filter(d=>d.method!=='catalogue-page').slice(0,20);let success=0,failed=0;
 // Two bounded requests at a time; no challenge solving, impersonation or proxy rotation.
 for(let i=0;i<deals.length;i+=2)await Promise.all(deals.slice(i,i+2).map(async d=>{
  try{const next=await readRetailerPage(d);await saveOffer(next,'updated');success++;}
  catch(e){failed++;const message=e instanceof Error?e.message:'Retailer request failed.';
   const next={...d,lastAttempt:new Date().toISOString(),syncError:message};
   await env.DB!.batch([
    env.DB!.prepare('INSERT INTO price_offers (id,payload,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').bind(d.id,JSON.stringify(next),now),
    env.DB!.prepare('INSERT INTO sync_events (id,offer_id,status,message,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),d.id,'failed',message,now),
   ]);
  }
 }));
 return {status:'checked',success,failed,message:`${success} source pages updated; ${failed} could not be read. Earlier observations retain their original timestamps.`};
}
