import { isAdmin, sameOrigin } from '../../../lib/admin';
import { loadCatalogue, refreshCatalogue } from '../../../lib/price-store';
export async function POST(request:Request){
 if(!await isAdmin())return Response.json({error:'Only the catalogue owner can run source checks.'},{status:403});
 if(!sameOrigin(request))return Response.json({error:'Request origin rejected.'},{status:403});
 try{const result=await refreshCatalogue();return Response.json({...await loadCatalogue(),...result},{headers:{'Cache-Control':'no-store'}});}
 catch(e){console.error('Source check failed',e);return Response.json({error:'Source checking is unavailable. Earlier observations were preserved.'},{status:503});}
}
