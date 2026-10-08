import { validateDeal, type Deal } from './catalog';

const entities:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',rsquo:'’',lsquo:'‘',ndash:'–',mdash:'—'};
function text(html:string){return html.replace(/<[^>]*>/g,' ').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>String.fromCodePoint(n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n))).replace(/&(amp|lt|gt|quot|apos|nbsp|rsquo|lsquo|ndash|mdash);/g,(_,n)=>(entities[n]||'')).replace(/\s+/g,' ').trim();}
function field(html:string,name:string){return text(html.match(new RegExp('data-test="product-tile__'+name+'"[^>]*>([\\s\\S]*?)</(?:div|span)>'))?.[1]||'');}
export function parseAldiListing(html:string,checked=new Date().toISOString()){
 const deals:Deal[]=[];let tiles=0,skipped=0;
 for(const match of html.matchAll(/<a\b[^>]*href="(\/product\/[a-z0-9.-]+)"[^>]*class="[^"]*product-tile__link[^"]*"[^>]*>([\s\S]*?)<\/a>/g)){
  tiles++;const [_,path,body]=match;const sku=path.match(/-(\d+)$/)?.[1];
  const title=field(body,'name'),brand=field(body,'brandname')||'ALDI';
  if(!sku||!title){skipped++;continue;}
  const size=field(body,'unit-of-measurement');const sized=size.replace(/,/g,'').match(/^(\d+(?:\.\d+)?)\s*(kg|g|ml|l|each)$/i);
  let quantity=1,unit:Deal['unit']='each';
  if(sized){quantity=Number(sized[1]);const raw=sized[2].toLowerCase();unit=raw==='kg'||raw==='g'?'kg':raw==='ml'||raw==='l'?'L':'each';if(raw==='g'||raw==='ml')quantity/=1000;}
  const pricing=body.match(/data-test="product-tile__price"[^>]*>([\s\S]*)/)?.[1]||'';
  const amounts=[...text(pricing).matchAll(/\$\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/g)].map(m=>Number(m[1].replace(/,/g,'')));
  // Ambiguous discount structures retain no price rather than guessing which
  // of several amounts is the current price.
  const price=amounts.length===1?amounts[0]:null;
  const note=field(body,'on-sale-label');
  const isOats=sku==='000000000000619060';
  const deal=validateDeal({id:isOats?'aldi-oats':'aldi-'+sku,product:isOats?'hillcrest-rolled-oats-750g':'aldi-'+sku,family:isOats?'rolled-oats':'aldi-'+sku,title:brand+' '+title,brand,category:'ALDI catalogue',retailer:'ALDI',price,original:null,shipping:null,expires:null,source:'https://www.aldi.com.au'+path,checked,quantity,unit,method:'catalogue-page',stock:'unverified',location:'ALDI website default context; store/postcode not selected',description:'',availabilityNote:note,sizeLabel:size,unitPriceKnown:!!sized},Date.parse(checked));
  if(deal)deals.push(deal);else skipped++;
 }
 const pages=[...html.matchAll(/href="\/products\?[^"<>]*\bpage=(\d+)/g)].map(m=>Number(m[1]));
 return {deals,tiles,skipped,totalPages:Math.max(1,...pages)};
}

export async function fetchAldiListing(page:number,fetcher:typeof fetch=fetch){
 if(!Number.isInteger(page)||page<1||page>200)throw Error('Invalid catalogue page.');
 const url='https://www.aldi.com.au/products'+(page===1?'':'?page='+page);
 const response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{Accept:'text/html','User-Agent':'SaveHalf school catalogue reader'}});
 if(!response.ok)throw Error('ALDI catalogue returned '+response.status);
 if(!response.headers.get('Content-Type')?.includes('text/html'))throw Error('Unexpected catalogue content type.');
 if(Number(response.headers.get('Content-Length'))>2000000)throw Error('Catalogue response exceeds size limit.');
 const reader=response.body?.getReader();if(!reader)throw Error('Empty catalogue response.');
 const chunks:Uint8Array[]=[];let bytes=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2000000)throw Error('Catalogue response exceeds size limit.');chunks.push(value);}}finally{await reader.cancel();}
 const data=new Uint8Array(bytes);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length;}
 const parsed=parseAldiListing(new TextDecoder().decode(data));
 if(!parsed.tiles||!parsed.deals.length)throw Error('No usable ALDI catalogue tiles; source may have changed.');
 return parsed;
}
