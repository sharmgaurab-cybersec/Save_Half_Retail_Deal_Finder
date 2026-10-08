import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
const source=ts.transpileModule(readFileSync('lib/catalog.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {validateDeal,isFresh}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const snapshot=JSON.parse(readFileSync('data/retailer-catalogue.json','utf8'));
for(const d of snapshot.deals){assert.ok(d.title.trim());assert.ok(validateDeal(d,Date.parse(snapshot.importedAt)+60000),`Invalid ${d.id}: ${d.source}`);if(d.availabilityNote?.startsWith('Cached listing'))assert.equal(isFresh(d,Date.parse(d.checked)),false);}
assert.equal(new Set(snapshot.deals.map(d=>d.id)).size,snapshot.deals.length);
assert.equal(new Set(snapshot.deals.map(d=>d.source)).size,snapshot.deals.length);
for(const retailer of ['Coles','Woolworths','JB Hi-Fi']){const count=snapshot.deals.filter(d=>d.retailer===retailer).length;assert.ok(count>=50&&count<=100,`${retailer}: ${count}`);}
for(const d of snapshot.deals.filter(d=>/2\s*[xX]\s*125g/i.test(d.title)))assert.equal(d.quantity,.25);
assert.ok(snapshot.deals.every(d=>d.stock==='unverified'||d.stock==='unavailable'));
console.log('Passed: 50–100 official listings per requested retailer, unique IDs/URLs, valid AUD observations and cached-price exclusion.');
