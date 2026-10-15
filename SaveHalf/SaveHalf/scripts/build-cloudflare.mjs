import { readFile, writeFile, mkdir, rm, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { build } from 'vite';

await build({ configFile: resolve('vite.cloudflare.config.ts') });
// These pure catalogue utilities have no server imports. Compile them at build time only.
const temp = resolve('.cloudflare-build');
await mkdir(temp, { recursive: true });
try {
  for (const name of ['catalog', 'product-families']) {
    const source = await readFile(`lib/${name}.ts`, 'utf8');
    const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
    await writeFile(`${temp}/${name}.mjs`, result.outputText);
  }
  const { observedOffers, validateDeal } = await import(pathToFileURL(`${temp}/catalog.mjs`).href);
  const { alternativeFamily } = await import(pathToFileURL(`${temp}/product-families.mjs`).href);
  const aldi = JSON.parse(await readFile('data/aldi-catalogue.json', 'utf8'));
  const retailers = JSON.parse(await readFile('data/retailer-catalogue.json', 'utf8'));
  const knownSources = new Map(observedOffers.map(d => [d.source, d]));
  const offers = new Map(observedOffers.map(d => [d.id, d]));
  for (const raw of [...aldi.deals, ...retailers.deals]) {
    const known = knownSources.get(raw.source);
    const d = validateDeal({ ...raw, id: known?.id || raw.id, product: known?.product || raw.product, family: alternativeFamily(raw.title) || raw.family });
    if (d) {
      const existing = offers.get(d.id);
      if (!existing || Date.parse(d.checked) > Date.parse(existing.checked)) offers.set(d.id, d);
    }
  }
  const catalogue = {
    deals: [...offers.values()],
    aldiCoverage: { offers: aldi.deals.length, pagesRead: aldi.pagesRead, totalPages: aldi.totalPages, complete: aldi.completeListing, importedAt: aldi.importedAt },
  };
  await writeFile('dist-cloudflare/catalogue.json', JSON.stringify(catalogue));
  // One tiny static file per product validates saves without loading the entire catalogue in the Worker.
  await mkdir('dist-cloudflare/catalogue/ids', { recursive: true });
  for (const d of catalogue.deals) await writeFile(`dist-cloudflare/catalogue/ids/${d.id}.json`, '{}');
  await mkdir('dist-cloudflare/login', { recursive: true });
  await copyFile('dist-cloudflare/index.html', 'dist-cloudflare/login/index.html');
  await writeFile('dist-cloudflare/404.html', '<!doctype html><title>SaveHalf</title><h1>Page not found</h1><a href="/">Back to products</a>');
  await writeFile('dist-cloudflare/_headers', '/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/catalogue.json\n  Cache-Control: public, max-age=300\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n');
  console.log(`Static catalogue built: ${catalogue.deals.length} dated product observations. No request-time server rendering.`);
} finally { await rm(temp, { recursive: true, force: true }); }
