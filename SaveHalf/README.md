# SaveHalf — real price observation MVP

School retail price comparison project by Gaurab Sharma, using React, Vinext, a Cloudflare-compatible Worker and D1.

## What is working

- A catalogue containing 3,197 unique ALDI listings imported from 107 of 108 advertised public listing pages, plus 80 Coles, 67 Woolworths and 65 JB Hi-Fi selected public product listings (before merging the original tracked observations). ALDI’s last advertised page returned an empty grid, so coverage is explicitly marked partial. These are actual dated website observations, not fictional offers.
- Woolworths, ALDI and JB Hi-Fi public product-page structured-data readers. These are **not official retailer API integrations**.
- Coles category-page observations with resolved official product URLs. Cached prices are labelled explicitly and excluded from recent lowest-price ranking.
- Owner-only catalogue editor: add tracked product URLs, pack quantities, verified prices, pricing context and observation dates.
- Owner-triggered retailer checks, limited by a shared database lock to once every 30 minutes, two bounded requests at a time.
- Customer search and filters within tracked products, matching-product comparison and separately labelled alternatives with unit prices.
- Persistent user-owned favourites, price observations, observation history and source-check events.
- Freshness labels, unavailable prices, official product links and graceful source/storage failure states.

## Important product boundaries

This is **not catalogue-wide live search across all four retailers**. ALDI’s public listing snapshot is searchable, with selected grocery listings for Coles/Woolworths and technology products for JB Hi-Fi. The stored catalogue supports up to 5,000 records. A 108-page download produced 107 non-empty pages, 3,209 tiles and 3,197 unique ALDI IDs; 12 repeated IDs were deduplicated. One advertised page returned no tiles and is recorded as missing. ALDI listings can include seasonal, future-sale and non-grocery products. All local store stock remains unverified. Requests to blocked or dynamic pages do not solve challenges or invent prices. A failed fetch keeps the earlier observed timestamp and records the failure.

Prices observed more than six hours ago, expired promotions and unavailable products are excluded from lowest-price ranking. Historical amounts remain visible with a recheck label. Source pages can change; prices are website default-context observations, not a selected store or postcode quote. Delivery charges are unknown and excluded; no free-delivery claim is made. JSON-LD stock flags are not treated as verified local stock. Reference prices and promotion expiry are omitted unless actually supplied in a manual observation. Automatically retrieved observations discard an older reference price rather than assuming the discount still applies.

Same-product matching requires product key, brand, quantity and unit. An owner must assign the same key only to genuinely identical variants. A family key permits comparisons between **alternatives**, not identical products. Unit-price ranking is useful only for compatible products with the same base unit.

## Access and security

Favourites use a platform-authenticated ID or a server-verified Supabase user UUID and bound SQL queries. Email OTP integration is prepared; activation requires the owner’s Supabase project and custom SMTP configuration. See `EMAIL-OTP-SETUP.md`. All writes verify request origin. Catalogue mutations and source checks require the configured owner email; this value stays in the server-side `SAVEHALF_ADMIN_EMAIL` environment entry. It is configured for the owner in Sites. Authentication headers are trusted only behind the Sites dispatcher; do not expose a standalone Worker with client-controlled identity headers.

Collectors accept only HTTPS URLs on four exact retailer hosts with product-page paths, no custom ports, credentials, query strings or redirects. Fetches have a timeout, response byte cap, AUD-only validation and URL-matched Product/Offer extraction. Catalogue fields and dates are validated server-side. The refresh lock is stored in D1 and shared across requests.

This is a security-conscious MVP, not a complete distributed zero-trust architecture. Independently deployed collectors, service identities, broader abuse protection, central security monitoring, activation of the email provider and production security review remain required.

## Development

Preserve `pnpm-lock.yaml` and the existing project scripts. `DB` is configured through `.openai/hosting.json`. Store `SAVEHALF_ADMIN_EMAIL` in hosted runtime settings; never in client code. For portable local development, use the repository’s existing local-only auth simulation. Clean clones default to the portable execution profile. For managed previews, use Sites' supervisor.

Checks:

- `node node_modules/typescript/bin/tsc --noEmit`
- `node tests/security.mjs`
- `node tests/aldi-catalogue.mjs`
- `node tests/retailer-catalogue.mjs`
- `node tests/email-auth.mjs`
- `npm run build`
- `npm run db:generate` after schema changes

Apply all three immutable SQL migrations in `drizzle/` before running local database-backed features. The migration contains schema only; observations are written through the application rather than seeded in migrations.

## Owner workflow

1. Open **Catalogue** as the owner.
2. Use **Check retailer pages** to update readable tracked sources.
3. For a blocked source such as Coles, open the official product URL, verify its price and store context, and record the observation in the form using the existing offer ID.
4. To add a new product, leave Offer ID blank and supply the correct brand, pack quantity, exact-product key and alternative family.
5. Customer search immediately includes newly stored records. Reloading the catalogue retrieves stored observations and does **not** change their freshness timestamps.

## Validation and limitations

Type checking, deployable build, catalogue/URL validation, source parser integrity, failed/oversized/redirected responses, owner and origin checks, favourite ownership and storage error behavior are tested. Actual downloaded Woolworths, ALDI and JB Hi-Fi pages were parsed during development; Coles public category pages were retrieved through web research, with product URLs resolved individually. Direct Coles requests can still return a blocked/empty page. The shared refresh lock was exercised with SQLite. The test harness mocks platform identity and D1; it is not a penetration test or proof of production retailer access. Browser visual testing was unavailable.

## Next step for complete coverage

Obtain a supported data feed or API agreement with sufficient retailer and product coverage. JB Hi-Fi publishes a credentialed Business Connect catalogue API. A licensed third-party product API may provide grocery search, but its retailer coverage, refresh cadence, credentials and terms must be verified before integration. Do not describe public-page readers as official retailer APIs or promise live access until the deployed connectors have succeeded.

## ALDI catalogue expansion (1 October 2026)

`data/aldi-catalogue.json` stores dated listing-page observations and exact coverage metadata. `lib/aldi-catalogue.ts` parses only ALDI product tiles, retains unavailable prices when parsing is ambiguous, and derives unit prices only from explicit supported pack-size fields. Unknown pack sizes do not get unit prices. Future-sale labels exclude offers from current cheapest-price ranking. Product keys are unique to ALDI IDs unless an existing known mapping is present: no unverified cross-retailer matches are invented. Search filters apply across the entire loaded catalogue; only 60 cards are rendered initially, with a Show more control.

The owner’s **Refresh ALDI catalogue** action reads one listing page per request, persists observations and can resume after a failure in the same open tab. A 30-minute per-page database lock restricts repeated imports. A failed page keeps existing prices. Closing the tab stops the interactive import; it is not a scheduler. When the advertised final page is empty, the importer reports the failure instead of claiming full coverage. Coverage metadata on the Sources screen describes the bundled snapshot, not a newly completed owner import.

For a fresh source snapshot before a build, run `node scripts/import-aldi.mjs`. It uses only public listing pages, does not bypass challenges, and leaves a previous snapshot unchanged if any advertised page fails. The ALDI listing feed is not an official API and does not prove local stock. The normal **Check retailer pages** button checks up to 20 individually tracked product pages; it excludes bulk catalogue rows.

Additional verification: `node tests/aldi-catalogue.mjs` checks actual downloaded listing excerpts, prices and pack conversions, future-sale exclusion, unknown pack sizes, ambiguous price handling, safe URLs, fetch size limits and import endpoint authorisation.

## Expanded retailer snapshot (1 October 2026)

`data/retailer-catalogue.json` contains 212 deduplicated selected listings: 80 Coles groceries, 67 Woolworths groceries, and 65 JB Hi-Fi technology products. JB Hi-Fi’s offerings are separate from grocery alternatives. Woolworths and JB Hi-Fi pages were fetched directly and their matching AUD JSON-LD offers extracted: 36 Woolworths and 65 JB Hi-Fi listings exposed usable prices. The remaining Woolworths listings have no price rather than a guessed amount. Local store stock is unverified.

Coles prices came from public pasta/rice/legume category pages retrieved through web research; resolved links point to official product pages. These are cached observations. Their timestamp records retrieval, not a live retailer price check, and they are excluded from the recent-price ranking. Selected listings do not prove stock or cover every product. Common grocery types are grouped as broad alternatives; product identities remain distinct unless a previously verified mapping exists. Original favourite IDs are preserved when snapshot URLs match known offers.

Email verification is implemented against managed Supabase Auth, without application-issued codes. Tests cover provider errors, invalid codes, forged tokens, email mismatch, private cookie flags, expiry bounds, origin checks and persistent rate limits. Successful real Gmail delivery and provider-side expiry/replay testing require activation and are not yet completed. See `EMAIL-OTP-SETUP.md`.
