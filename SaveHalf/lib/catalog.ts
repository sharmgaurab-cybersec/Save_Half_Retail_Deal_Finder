export type Deal = { id:string; product:string; family:string; title:string; brand:string; category:string; retailer:string; price:number|null; original:number|null; shipping:number|null; expires:string|null; source:string; checked:string; discount:number; description:string; quantity:number; unit:'kg'|'L'|'each'; method:'structured-page'|'manual-observation'|'catalogue-page'; stock:'unverified'|'unavailable'; location:string; lastAttempt?:string; syncError?:string; availabilityNote?:string; sizeLabel?:string; unitPriceKnown?:boolean };
export const RETAILERS=['Woolworths','Coles','ALDI','JB Hi-Fi'];
const hosts:Record<string,string>={Woolworths:'www.woolworths.com.au',Coles:'www.coles.com.au',ALDI:'www.aldi.com.au','JB Hi-Fi':'www.jbhifi.com.au'};
export function safeProductUrl(value:string,retailer:string){
 try{const u=new URL(value);if(u.protocol!=='https:'||u.hostname!==hosts[retailer]||u.username||u.password||u.port||u.search||u.hash)return false;
 return retailer==='Woolworths'?/^\/shop\/productdetails\/\d+(?:\/[a-z0-9-]+)?$/.test(u.pathname):/^\/products?\/(?:[a-z0-9.'+-]|%27|%2[Bb])+$/.test(u.pathname);
 }catch{return false;}
}
export function validateDeal(value:unknown,now=Date.now()):Deal|null{
 if(!value||typeof value!=='object')return null;const d=value as Deal;
 if(!['id','product','family','title','brand','category','retailer','source','checked','location'].every(k=>typeof (d as any)[k]==='string'&&(d as any)[k].length>0&&(d as any)[k].length<=500))return null;
 if(!/^[a-z0-9-]{1,80}$/.test(d.id)||!RETAILERS.includes(d.retailer)||!safeProductUrl(d.source,d.retailer))return null;
 if(d.price!==null&&(!Number.isFinite(d.price)||d.price<=0||d.price>100000))return null;
 if(d.original!==null&&(!Number.isFinite(d.original)||d.original<=0||d.original>100000))return null;
 if(d.shipping!==null&&(!Number.isFinite(d.shipping)||d.shipping<0||d.shipping>10000))return null;
 if(!Number.isFinite(d.quantity)||d.quantity<=0||d.quantity>100000||!['kg','L','each'].includes(d.unit))return null;
 if(!['structured-page','manual-observation','catalogue-page'].includes(d.method)||!['unverified','unavailable'].includes(d.stock))return null;
 if(d.availabilityNote!==undefined&&(typeof d.availabilityNote!=='string'||d.availabilityNote.length>200))return null;
 if(d.sizeLabel!==undefined&&(typeof d.sizeLabel!=='string'||d.sizeLabel.length>100))return null;
 if(d.unitPriceKnown!==undefined&&typeof d.unitPriceKnown!=='boolean')return null;
 if(!Number.isFinite(Date.parse(d.checked))||Date.parse(d.checked)>now+60000)return null;
 if(d.expires!==null&&!Number.isFinite(Date.parse(d.expires)))return null;
 return {...d,discount:d.price!==null&&d.original!==null&&d.original>d.price?Math.round((1-d.price/d.original)*100):0,description:typeof d.description==='string'?d.description.slice(0,500):''};
}
// Actual retailer-page observations, not invented prices. None is a store-specific quote.
export const observedOffers:Deal[]=[
 {id:'woolworths-oats',product:'ww-rolled-oats-750g',family:'rolled-oats',title:'Woolworths Rolled Traditional Oats 750g',brand:'Woolworths',retailer:'Woolworths',price:1.7,quantity:.75,source:'https://www.woolworths.com.au/shop/productdetails/321220/woolworths-rolled-traditional-oats',method:'structured-page'},
 {id:'aldi-oats',product:'hillcrest-rolled-oats-750g',family:'rolled-oats',title:'Hillcrest Rolled Oats 750g',brand:'HILLCREST',retailer:'ALDI',price:1.49,quantity:.75,source:'https://www.aldi.com.au/product/hillcrest-rolled-oats-750g-000000000000619060',method:'structured-page'},
 {id:'woolworths-uncle-oats',product:'uncle-tobys-traditional-oats-1kg',family:'rolled-oats',title:'Uncle Tobys Traditional Rolled Oats 1kg',brand:'Uncle Tobys',retailer:'Woolworths',price:6.5,quantity:1,source:'https://www.woolworths.com.au/shop/productdetails/33036/uncle-tobys-rolled-oats-traditional-porridge',method:'structured-page'},
 {id:'coles-uncle-oats',product:'uncle-tobys-traditional-oats-1kg',family:'rolled-oats',title:'Uncle Tobys Traditional Rolled Oats 1kg',brand:'Uncle Tobys',retailer:'Coles',price:3.25,original:6.5,quantity:1,source:'https://www.coles.com.au/product/uncle-tobys-porridge-oats-original-1kg-254971',method:'manual-observation'},
 {id:'coles-oats',product:'coles-rolled-oats-900g',family:'rolled-oats',title:'Coles Rolled Oats 900g',brand:'Coles',retailer:'Coles',price:null,quantity:.9,stock:'unavailable',source:'https://www.coles.com.au/product/coles-oats-rolled-900g-5290305',method:'manual-observation'},
 {id:'jb-sony-headphones',product:'sony-whch520-black',family:'headphones',title:'Sony WH-CH520 Wireless Headphones — Black',brand:'Sony',retailer:'JB Hi-Fi',price:59,quantity:1,unit:'each',source:'https://www.jbhifi.com.au/products/sony-wh-ch520-wireless-on-ear-headphones-black',method:'structured-page'},
].map(x=>({unit:'kg',original:null,shipping:null,expires:null,stock:'unverified',description:'',location:'Retailer website default context; store/postcode not selected',checked:'2026-10-01T04:29:09Z',...x,category:x.retailer==='JB Hi-Fi'?'Tech':'Groceries',discount:0} as Deal)).map(x=>{
 // Workers can expose an epoch clock during module initialization. Validate
 // immutable observations against their recorded date; request-time imports
 // still use the current clock to reject future observations.
 const deal=validateDeal(x,Date.parse(x.checked));
 if(!deal)throw new Error('Invalid bundled price observation');
 return deal;
});
export function isFresh(d:Deal,now=Date.now()){return now-Date.parse(d.checked)<=6*60*60*1000&&(!d.expires||Date.parse(d.expires)>now)&&d.price!==null&&d.stock!=='unavailable'&&!/^(on sale|cached listing)/i.test(d.availabilityNote||'');}
export function unitPrice(d:Deal){return d.price===null||d.unitPriceKnown===false?null:d.price/d.quantity;}
export function aggregateDeals(now=new Date()){return {deals:observedOffers.filter(d=>!d.expires||Date.parse(d.expires)>now.getTime()),mode:'observed',sources:4};}
