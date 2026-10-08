import { isAdmin, sameOrigin } from '../../../../lib/admin';
import { validateDeal } from '../../../../lib/catalog';
import { loadCatalogue,saveOffer } from '../../../../lib/price-store';
export async function POST(request:Request){
 if(!await isAdmin())return Response.json({error:'Catalogue owner access required.'},{status:403});
 if(!sameOrigin(request))return Response.json({error:'Request origin rejected.'},{status:403});
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return Response.json({error:'JSON required.'},{status:415});
 try{const raw=await request.text();if(raw.length>10000)return Response.json({error:'Request too large.'},{status:413});
 const body=JSON.parse(raw);const d=validateDeal({...body,method:'manual-observation',lastAttempt:undefined,syncError:undefined});
 if(!d||Date.now()-Date.parse(d.checked)>7*24*60*60*1000)return Response.json({error:'Check the product fields, official product URL and observation date (within 7 days).'}, {status:400});
 const current=await loadCatalogue();if(!current.deals.some(o=>o.id===d.id)&&current.deals.length>=5000)return Response.json({error:'Catalogue limit is 5,000 offers.'},{status:400});
 await saveOffer(d);return Response.json({ok:true,deals:(await loadCatalogue()).deals});
 }catch(e){console.error('Manual observation failed',e);return Response.json({error:'Could not store this observation. Check the input and try again.'},{status:400});}
}
