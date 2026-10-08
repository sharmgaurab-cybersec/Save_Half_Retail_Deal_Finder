import { loadCatalogue } from '../../../lib/price-store';
export async function GET(){return Response.json(await loadCatalogue(),{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}
