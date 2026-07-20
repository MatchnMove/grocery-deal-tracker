# Grocery Deal Tracker

Private mobile-first Progressive Web App for weekly meal planning, grocery list generation, supermarket price comparison and route-aware shopping recommendations in New Zealand.

This is a separate Next.js application intended to run as its own Railway service and PostgreSQL database. It is not part of Match 'n Move routes, UI or database.

## What Is Included

- Next.js App Router, TypeScript, React, Tailwind CSS and Prisma.
- PostgreSQL through `DATABASE_URL`; no SQLite, bundled database or local Docker database.
- Administrator login with bcrypt password hashing, HTTP-only session cookies, SameSite protection and login rate limiting.
- Prisma schema covering users, sessions, settings, supermarkets, stores, meal plans, requirements, products, aliases, prices, shopping lists, price sources, collection runs, notifications, push subscriptions and audit logs.
- Seed data for the default household settings, meal plan, grocery requirements, product categories, aliases, supermarket chains and placeholder branches requiring verification.
- Manual price entry and CSV import adapters.
- Disabled Woolworths, PAK'nSAVE and New World adapter placeholders.
- PWA manifest, safe service worker, offline fallback, app icons and Apple touch icon.
- Unit and service tests for unit conversion, pack calculation, price selection, stale prices, matching, CSV validation, auth protection and route recommendations.

## Required Environment Variables

Copy `.env.example` to `.env` for local development and fill in values:

```bash
DATABASE_URL=
AUTH_SECRET=
CRON_SECRET=
NEXT_PUBLIC_APP_URL=
ADMIN_EMAIL=
ADMIN_PASSWORD=
DEFAULT_TIMEZONE=Pacific/Auckland
DEFAULT_FUEL_PRICE_NZD=2.70
DEFAULT_FUEL_ECONOMY_L_PER_100KM=7.5
```

Use a strong random value for `AUTH_SECRET` with at least 32 characters. Use a separate strong value for `CRON_SECRET`. Never commit real credentials.

## Local Development

Local development can connect to a Railway PostgreSQL database using the Railway-provided connection string. A local PostgreSQL database is not required.

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

Production uses deployed migrations:

```bash
npx prisma migrate deploy
```

## Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run db:migrate
npm run db:seed
npm run prices:update
```

`npm run prices:update` records a skipped collection run unless a compliant automatic source has been configured. Manual and CSV price entry remain operational.

## Railway Deployment

1. Push this repository to GitHub.
2. In the existing Railway project, create a new service from this repository.
3. Do not select or modify the existing Match 'n Move service.
4. Add a new Railway PostgreSQL service for this grocery app.
5. In the grocery app service, add `DATABASE_URL` as a reference variable from the new PostgreSQL service.
6. Add `AUTH_SECRET`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `DEFAULT_TIMEZONE`, `DEFAULT_FUEL_PRICE_NZD` and `DEFAULT_FUEL_ECONOMY_L_PER_100KM`.
7. Deploy the service. Railway will run `npm run build` and `npm run start`.
8. Run migrations with `npm run db:migrate`.
9. Run the seed with `npm run db:seed`.
10. Generate a Railway public domain for the grocery service.
11. Set `NEXT_PUBLIC_APP_URL` to the Railway public URL, then redeploy.
12. Test `https://your-railway-domain/api/health`.
13. Later, add the custom domain `groceries.matchnmove.co.nz` to this service and update DNS as Railway instructs.
14. Set `NEXT_PUBLIC_APP_URL=https://groceries.matchnmove.co.nz` after the custom domain is active.
15. Install the app from Safari on iPhone or Chrome on Android using the browser's Add to Home Screen flow.

Do not reuse the Match 'n Move database unless you explicitly decide to do so later. Do not run `prisma migrate reset`, drop tables or overwrite existing Railway variables.

## Daily Update Setup

Create a separate Railway scheduled service or job that runs:

```bash
npm run prices:update
```

Automatic supermarket collection remains disabled until a lawful, reliable and documented data source is configured for a source adapter. The dashboard intentionally shows:

```text
Automatic price collection is not configured.
Manual prices are currently being used.
```

## Desktop Price Collector

The optional companion collector uses a visible Chrome window on your computer and sends timestamped observations to the private app. It does not run inside Railway or bypass retailer access controls, and may ask you to sign in, select a branch or complete a retailer challenge.

1. Set `COLLECTOR_APP_URL` to the deployed app URL.
2. Set the same random `COLLECTOR_SECRET` (at least 32 characters) in Railway and on the collector computer.
3. Run `npm run collector` on a computer with Google Chrome installed and keep it open.
4. Open Prices in the app and select **Collect latest prices**.
5. In the visible Chrome window, confirm the correct branch when a retailer asks.

The browser profile is retained in `.collector-profile/` so sessions and store choices survive restarts. Never commit that directory or share the collector secret. Retailer pages can change, so review low-confidence matches before relying on them.

## CSV Import

The importer accepts:

```text
store, branch, product_name, brand, pack_size, unit, normal_price, loyalty_price, special_start, special_end, product_url, checked_at
```

An example file is available at `public/samples/example-prices.csv`.

## PWA Notes

The service worker only caches safe static app-shell assets and the offline fallback. Authenticated API responses and private grocery/location data are not cached. If the install button does not appear, confirm the app is served over HTTPS, the manifest is reachable and icons return valid PNG responses.

## Troubleshooting

- Database connection failure: confirm the Railway `DATABASE_URL` reference points to the grocery PostgreSQL service and not another app.
- Prisma migration failure: run `npm run db:migrate` and inspect the Railway deploy logs; do not run destructive reset commands against production.
- Missing admin credentials: set `ADMIN_EMAIL` and a 12+ character `ADMIN_PASSWORD`, then rerun `npm run db:seed`.
- PWA install button not appearing: verify HTTPS, manifest, icons and service worker registration in the browser application panel.
- Service-worker cache updates: redeploy, close all app tabs and reopen; the worker deletes old shell caches on activation.
- Failed price collection: confirm `CRON_SECRET`; automatic supermarket adapters stay disabled until explicitly configured.
- Stale prices: add manual prices or import a fresh CSV.
- Railway build failures: run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` locally first, then compare Node and environment variables.

## Operational Price Adapters

- Manual price entry: operational.
- CSV import: operational.

## Disabled Price Adapters

- Woolworths future integration.
- PAK'nSAVE future integration.
- New World future integration.

These adapters are intentionally disabled and do not scrape or fabricate live supermarket prices.
