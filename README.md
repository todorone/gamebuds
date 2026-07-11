# Gamebuds

Gamebuds is a pnpm monorepo with two deployable applications:

- `apps/mobile` — the Capacitor, Vite, Phaser, iOS, and Android mobile client.
- `apps/api` — the Hono Cloudflare Worker API.

## Requirements

- Node.js 24+
- pnpm 10+
- Xcode for iOS development
- Android Studio for Android development
- Wrangler authentication only for remote Cloudflare operations

## Install and run

```bash
pnpm install
pnpm --filter @gamebuds/mobile dev:web
pnpm --filter @gamebuds/api dev
```

The browser client uses `http://localhost:8787` as its API origin by default.
Copy `apps/mobile/.env.example` to `apps/mobile/.env.local` to override
`VITE_API_URL`. Installed and deployed clients must use an HTTPS Worker URL.

## Quality checks

```bash
pnpm checks              # Format, lint, types, tests, and builds
pnpm format
pnpm lint
pnpm types
pnpm test
pnpm build
```

The root scripts use pnpm recursive execution; no task-orchestration layer is
required for the two workspaces.

## Client commands

```bash
pnpm --filter @gamebuds/mobile sync
pnpm --filter @gamebuds/mobile ios
pnpm --filter @gamebuds/mobile android
```

Native sync and iOS/Android builds are intentionally not part of the portable
GitHub Actions checks.

## API and local D1

```bash
pnpm --filter @gamebuds/api db:generate
pnpm --filter @gamebuds/api db:migrate
```

These commands generate Drizzle migrations and apply them to Wrangler's local
D1 database. Remote D1 provisioning, identifiers, and migrations are deferred
until deployment configuration is designed.

The initial API contract is `GET /health`. Its typed client boundary is
available only from `@gamebuds/api/client`; Worker, D1, Drizzle, and future
authentication internals remain private to the API workspace.
