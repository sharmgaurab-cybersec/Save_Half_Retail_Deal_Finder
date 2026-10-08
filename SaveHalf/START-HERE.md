# SaveHalf: source export and setup

This ZIP contains the source of the real price observation MVP, including the homepage startup-clock fix. It does not contain hosted database records, accounts, secrets, node_modules, or Git history.

## Open in Cursor on Windows
1. Extract this ZIP.
2. In Cursor, choose File > Open Folder and select the SaveHalf folder.
3. Install Node.js 22.13 or newer and pnpm 11.25.0.
4. In Cursor's terminal, run:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open http://localhost:5173. This is a development server; do not open index.html directly. Clean exports automatically use the portable execution profile. The existing install:ci script is intended for Linux; use pnpm install on Windows.

Public browsing searches the bundled ALDI listing snapshot plus 80 Coles, 67 Woolworths and 65 JB Hi-Fi public listings without login. Local favourites require a local D1 database and the development-only mock sign-in; hosted email favourites use verified Supabase identity after activation. This mock sign-in is not production authentication. Catalogue editing also requires the server-side SAVEHALF_ADMIN_EMAIL setting; the mock local email is seedy@sites.test.

## Database setup
The source uses Cloudflare D1 with binding name DB. Both migrations are in drizzle/. After building, initialize the local database:

```sh
pnpm build
pnpm exec wrangler d1 execute site-creator-d1 --local --config dist/server/wrangler.json --file drizzle/0000_wakeful_calypso.sql
pnpm exec wrangler d1 execute site-creator-d1 --local --config dist/server/wrangler.json --file drizzle/0001_tired_mentor.sql
pnpm exec wrangler d1 execute site-creator-d1 --local --config dist/server/wrangler.json --file drizzle/0002_dear_living_tribunal.sql
```

Apply these to the same local persistence directory used by your server. Without migrations, catalogue browsing falls back to bundled observations; saving and updates may be unavailable. Configure runtime variables through your host or Wrangler configuration, never in frontend code.

## Upload to GitHub
Create a repository in your own account. Upload the extracted contents of SaveHalf, including README.md, app/, lib/, db/, drizzle/, build/, scripts/, public/, package.json, pnpm-lock.yaml and configuration files. Do not upload just the ZIP if you want a browsable source repository. Keep .gitignore. Never commit .env, .dev.vars, credentials, node_modules, runtime state or database contents.

GitHub stores the code. GitHub Pages cannot run this server backend. Independent deployment requires a Cloudflare-compatible Worker/D1 host or adapting the backend to another host.

## Independent hosting requirements
The exported .openai/hosting.json retains logical database configuration but has no existing Site ID. It does not provision a server or database.

Replace the placeholder D1 ID in vite.config.ts with your own database configuration, apply all three migrations, and configure SAVEHALF_ADMIN_EMAIL server-side. Configure managed Supabase email OTP using EMAIL-OTP-SETUP.md if deploying outside Sites, and replace the platform-only owner authorization with an appropriate verified administrator check. Do not trust client-supplied oai-authenticated-user-* headers: they are trusted only behind the Sites dispatcher. Protect administrator routes and favourites before public deployment. The source is editable, but not a one-click independent production deployment.

## Price data boundaries
The ALDI snapshot contains 3,197 unique listings from 107 of 108 advertised catalogue pages; the final advertised page returned an empty grid. Other retailers include selected public grocery and technology listings. This is not full catalogue search across all four stores. Bundled prices are historical observations dated 1 October 2026; check freshness before use. Public-page readers are not official APIs and may fail. Coles category observations are marked cached and excluded from recent-price ranking. No hosted favourites or observation history are exported.

## Checks
```sh
pnpm exec tsc --noEmit
node tests/security.mjs
node tests/aldi-catalogue.mjs
node tests/retailer-catalogue.mjs
node tests/email-auth.mjs
pnpm build
```

See README.md for architecture, retailer-source handling and current security boundaries.

## Refreshing ALDI
Use the owner-only Refresh ALDI catalogue button for page-by-page stored updates, or run node scripts/import-aldi.mjs to regenerate the source snapshot before building. Source checks can fail; a complete import is not guaranteed. Future-sale products are labelled and excluded from current lowest-price ranking. Products without explicit pack-size data have no unit price. See README.md for coverage and security details.

## Email login and favourites
The new login page supports Gmail-compatible one-time codes through managed Supabase Auth. It stays unavailable until you configure your project and custom SMTP; ChatGPT sign-in is available on the hosted Site. Follow EMAIL-OTP-SETUP.md. Email accounts and ChatGPT accounts keep separate favourite lists. No provider credentials, real codes, accounts or hosted favourites are included in this export.
