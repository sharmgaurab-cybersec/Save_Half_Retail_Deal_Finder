// Refresh the public ALDI catalogue snapshot before building/deploying.
// Usage: node scripts/import-aldi.mjs
import { readFileSync,writeFileSync,mkdirSync } from 'node:fs';
import ts from 'typescript';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleFrom=s=>import('data:text/javascript;base64,'+Buffer.from(compile(s)).toString('base64'));
globalThis.__aldiCatalogue=await moduleFrom(readFileSync('lib/catalog.ts','utf8'));
const parser=await moduleFrom('const {validateDeal}=globalThis.__aldiCatalogue;\n'+readFileSync('lib/aldi-catalogue.ts','utf8').replace(/^import .*;\n/gm,''));
const deals=new Map(),seen=new Set(),errors=[];let totalPages=1,parsedTiles=0,skipped=0;
for(let page=1;page<=totalPages;page++){
 try{
  const parsed=await parser.fetchAldiListing(page);if(page===1){totalPages=parsed.totalPages;if(totalPages>200)throw Error('Catalogue exceeds configured page limit.');}
  parsedTiles+=parsed.tiles;skipped+=parsed.skipped;for(const d of parsed.deals)deals.set(d.id,d);seen.add(page);
  console.log(`ALDI ${page}/${totalPages}: ${parsed.deals.length} offers`);
 }catch(e){errors.push({page,error:String(e)});console.error('Page failed',page,String(e));}
}
// Do not replace a complete previous snapshot with a partial failed crawl.
if(errors.length||seen.size!==totalPages||!deals.size){console.error('Snapshot unchanged: catalogue import incomplete.',errors);process.exit(1);}
mkdirSync('data',{recursive:true});
writeFileSync('data/aldi-catalogue.json',JSON.stringify({retailer:'ALDI',source:'https://www.aldi.com.au/products',importedAt:new Date().toISOString(),totalPages,pagesRead:seen.size,parsedTiles,skipped,completeListing:skipped===0,deals:[...deals.values()]},null,2)+'\n');
console.log('Snapshot saved:',deals.size,'unique ALDI offers. Deploy source changes to publish.');
