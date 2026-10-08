import { safeProductUrl, validateDeal, type Deal } from './catalog';
export function extractProduct(html:string,source:string):any|null{
 const target=new URL(source);
 for(const [,attrs,body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
  if(!/type\s*=\s*["']application\/ld\+json["']/i.test(attrs))continue;
  let parsed;try{parsed=JSON.parse(body);}catch{continue;}
  const candidates=Array.isArray(parsed)?parsed:parsed['@graph']||[parsed];
  for(const p of candidates){
   const types=Array.isArray(p['@type'])?p['@type']:[p['@type']];if(!types.includes('Product'))continue;
   const offers=Array.isArray(p.offers)?p.offers:[p.offers];
   for(const offer of offers){
    if(!offer||offer['@type']!=='Offer'||offer.priceCurrency!=='AUD')continue;
    const url=offer.url||p.url||p.mainEntityOfPage;
    try{const u=new URL(url);if(u.hostname!==target.hostname||u.pathname.replace(/\/$/,'')!==target.pathname.replace(/\/$/,''))continue;}catch{continue;}
    if(!Number.isFinite(Number(offer.price))||Number(offer.price)<=0)continue;
    return {product:p,offer};
   }
  }
 }
 return null;
}
export async function readRetailerPage(d:Deal,fetcher:typeof fetch=fetch):Promise<Deal>{
 if(!safeProductUrl(d.source,d.retailer))throw Error('Retailer URL rejected.');
 const response=await fetcher(d.source,{headers:{'User-Agent':'SaveHalf-SchoolProject/1.0','Accept':'text/html'},redirect:'manual',signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error('Retailer returned '+response.status+'.');
 if(!response.headers.get('Content-Type')?.includes('text/html'))throw Error('Expected retailer HTML.');
 if(Number(response.headers.get('Content-Length')||0)>2000000)throw Error('Retailer response exceeded size limit.');
 const reader=response.body?.getReader();if(!reader)throw Error('No retailer response.');
 const decoder=new TextDecoder();let html='',size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2000000){await reader.cancel();throw Error('Retailer response exceeded size limit.');}html+=decoder.decode(value,{stream:true});}html+=decoder.decode();}finally{reader.releaseLock();}
 const result=extractProduct(html,d.source);if(!result)throw Error('No usable AUD product price. The page may need a store selection or API access.');
 const price=Number(result.offer.price);
 const updated=validateDeal({...d,price,original:null,checked:new Date().toISOString(),lastAttempt:new Date().toISOString(),syncError:undefined,method:'structured-page',stock:/OutOfStock|Discontinued/.test(result.offer.availability||'')?'unavailable':'unverified'});
 if(!updated)throw Error('Product price validation failed.');return updated;
}
