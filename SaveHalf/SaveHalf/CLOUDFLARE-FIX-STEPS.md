# SaveHalf: free Cloudflare CPU-limit fix

This replacement removes request-time React/Next rendering from the deployed Worker. The homepage, login page, CSS, JavaScript and catalogue are static assets. Only email OTP/session/favourites APIs execute Worker code. Search, filtering, comparison and pagination run in the browser.

## Upload the replacement files

1. Download and extract `SaveHalf-Cloudflare-replacement-files.zip`.
2. Open your existing GitHub repository `Save_Half_Retail_Deal_Finder`.
3. Click the existing `SaveHalf` folder. You must upload INSIDE this folder.
4. Click **Add file → Upload files**.
5. Open the ZIP's extracted `SaveHalf` folder on your computer. Drag its CONTENTS into GitHub: the folders `cloudflare`, `static`, `scripts`, `tests`, plus `vite.cloudflare.config.ts`, `wrangler.cloudflare.jsonc`, and this guide.
6. Commit to `main`. Do not upload the ZIP itself and do not create `SaveHalf/SaveHalf`.

These files are additions. Keep all your existing files, including `lib`, `data`, `drizzle`, `package.json`, `pnpm-lock.yaml` and your existing `scripts` files. The replacement `scripts` folder contains only the new build script; uploading it must merge the contents, not delete existing scripts. You do not need to delete or recreate the repository or database. The ZIP intentionally excludes dependency folders, generated assets, credentials and the old Sites deployment state.

## Change Cloudflare build settings (required)

Open Cloudflare → Workers & Pages → `save-half-retail-deal-finder` → Settings → Build settings.

- Root directory: `SaveHalf`
- Production branch: `main`
- Build command:

```sh
pnpm install --frozen-lockfile && node scripts/build-cloudflare.mjs
```

- Deploy command:

```sh
pnpm exec wrangler deploy --config wrangler.cloudflare.jsonc
```

Do not use the old `pnpm run build` or `dist/server/wrangler.json` commands for this replacement. The new build creates `dist-cloudflare`. No package.json or lockfile change is required.

If a deploy started automatically before you changed the commands, allow that run to finish, save these settings and then retry the latest commit.

## Keep your current database and variables

The replacement already targets:

- Worker: `save-half-retail-deal-finder`
- D1 binding: `DB`
- Database: `savehalf-db`
- Database UUID: `eb713092-165c-49b5-bb1b-6285775edf04`

Keep these runtime variables under the Worker's Variables and Secrets:

- `SUPABASE_URL` = `https://cbxmeevehwidmdukqjob.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY` = your existing Supabase publishable key

`keep_vars` is enabled to preserve dashboard-managed variables. Confirm both are present after deployment. Do not enter a Supabase secret/service-role key, Google password or Google App Password in the repository or this Worker configuration. Gmail SMTP credentials stay in Supabase.

The existing `saved_deals` and `auth_rate_limits` tables are reused, along with the same `email:<Supabase UUID>` account IDs. No destructive SQL or new migration is needed.

## Supabase email settings

Use the Supabase project matching the URL above. Keep email signups and confirmation enabled, six-digit OTPs, and a 600-second expiry. The Magic link or OTP template must contain `{{ .Token }}`. For a new email account, ensure the Confirm signup template also displays `{{ .Token }}` so first-time signups receive a code rather than only a link.

Example subject: `Your SaveHalf verification code`.

```html
<h2>SaveHalf login code</h2>
<p>Your verification code is: {{ .Token }}</p>
```

Save your Gmail custom SMTP settings using a Google App Password. Your personal/project Gmail sender address is visible to recipients.

Set Authentication → URL Configuration → Site URL to:

`https://save-half-retail-deal-finder.sharmagaurab534.workers.dev`

This build uses typed OTP verification and has no magic-link callback or Google OAuth flow. Google sign-in has not been added to this Cloudflare fix.

## Verify after deployment

1. Open `https://save-half-retail-deal-finder.sharmagaurab534.workers.dev/` in a private browser window. The catalogue should load without Error 1102.
2. Search for `oats`, filter by retailer, open a comparison and use Load more.
3. Open `/login` directly. Enter your email and request a code once.
4. Check Inbox and Spam. Enter the latest code yourself. Do not share OTPs or passwords.
5. Save a product, reload, sign out and sign back in. The favourite should remain.
6. Use a second account to confirm it does not see the first account's favourites.
7. Check Worker Metrics for new CPU-limit errors. Static homepage/asset responses bypass the Worker; APIs still have the free CPU allowance.

If a code fails to send, check Supabase Auth logs and SMTP setup. Worker logs now include safe failure categories (`missing_database_table`, `database_error`, `provider_timeout`, `api_error`) and provider HTTP status, without credentials or email bodies.

## Scope and limitations

- Keeps the existing dated observations: 3,412 products after validation/deduplication, across ALDI, Coles, Woolworths and JB Hi-Fi. It does not claim fresh live stock or prices. All source timestamps are retained; older observations remain marked for rechecking.
- Catalogue updates now require updating `data/aldi-catalogue.json` / `data/retailer-catalogue.json` and rebuilding. Reloading the catalogue does not scrape retailers or update source dates.
- The old platform-owner importer and admin-write APIs are disabled. No unauthenticated replacement is introduced. D1-only catalogue edits are not included in the static snapshot; export any such edits to the repository if needed.
- ChatGPT login is removed from this deployment. It relies on the original ChatGPT hosting. Email favourites remain isolated by the independently verified Supabase user ID.
- Sessions use Secure, HttpOnly, SameSite=Lax cookies with at most one hour of lifetime. Sign in again after expiry. Up to 100 favourites per account.
- New-user email, real Gmail delivery and actual Cloudflare Free API CPU usage must be verified after you deploy. Local mocks do not prove provider delivery or production limits.

## Validation performed

- Production static build succeeded.
- TypeScript frontend check passed.
- Wrangler deploy dry run succeeded: about 10 KiB Worker, about 3.6 KiB compressed; no React server or catalogue imported into the Worker.
- Automated tests passed for origin rejection, OTP verification errors, cookie flags/lifetime, send throttling, expired sessions, forged ChatGPT auth headers, known product IDs, account-isolated favourites and disabled platform admin endpoints.

For maintainers using Node 22.13+:

```sh
node scripts/build-cloudflare.mjs
node tests/cloudflare-worker.mjs
pnpm exec wrangler deploy --config wrangler.cloudflare.jsonc --dry-run
```

The Node SQLite test requires a Node version exposing `node:sqlite`; it is not part of the deployment build.
