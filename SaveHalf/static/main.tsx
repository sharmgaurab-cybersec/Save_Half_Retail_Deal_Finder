import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import DealBrowser from './DealBrowser';
import LoginForm from './LoginForm';
import type { Deal } from '../lib/catalog';
import './styles.css';

type Catalogue = { deals: Deal[]; aldiCoverage: { offers: number; pagesRead: number; totalPages: number; complete: boolean; importedAt: string | null } };
function App() {
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [session, setSession] = useState<{ signedIn: boolean; email?: string; enabled: boolean } | null>(null);
  const [error, setError] = useState('');
  const login = /^\/login\/?$/.test(location.pathname);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      // Public catalogue loading does not depend on an available authentication service.
      if (!login) {
        try {
          const r = await fetch('/catalogue.json', { signal: controller.signal });
          if (!r.ok) throw Error('Could not load the catalogue. Please refresh the page.');
          setCatalogue(await r.json());
        } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Catalogue unavailable.'); }
      }
      try {
        const r = await fetch('/api/session', { cache: 'no-store', signal: controller.signal });
        if (!r.ok) throw Error('Login service unavailable.');
        setSession(await r.json());
      } catch { if (!controller.signal.aborted) setSession({ signedIn: false, enabled: false }); }
    };
    void load();
    return () => controller.abort();
  }, [login]);
  if (login) return session ? <LoginForm enabled={session.enabled} /> : <main><p>Checking email login…</p></main>;
  if (error) return <main><h1>SaveHalf</h1><p role="alert">{error}</p><button onClick={() => location.reload()}>Retry</button></main>;
  if (!catalogue) return <main><h1>SaveHalf</h1><p>Loading the published catalogue…</p></main>;
  return <DealBrowser initialDeals={catalogue.deals} signedIn={session?.signedIn ?? false} userEmail={session?.email} admin={false} aldiCoverage={catalogue.aldiCoverage} />;
}
createRoot(document.getElementById('root')!).render(<App />);
