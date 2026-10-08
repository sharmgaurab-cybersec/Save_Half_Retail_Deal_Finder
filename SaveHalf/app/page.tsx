import DealBrowser from './deal-browser';
import aldiSnapshot from '../data/aldi-catalogue.json';
import { getUser } from '../lib/email-auth';
import { loadCatalogue } from '../lib/price-store';
import { isAdmin } from '../lib/admin';
export const dynamic='force-dynamic';
export default async function Home(){const [user,admin,catalogue]=await Promise.all([getUser(),isAdmin(),loadCatalogue()]);return <DealBrowser initialDeals={catalogue.deals} signedIn={!!user} userEmail={user?.email} admin={admin} initialWarning={catalogue.warning} aldiCoverage={{offers:aldiSnapshot.deals.length,pagesRead:aldiSnapshot.pagesRead,totalPages:aldiSnapshot.totalPages,complete:aldiSnapshot.completeListing,importedAt:aldiSnapshot.importedAt}}/>;}
