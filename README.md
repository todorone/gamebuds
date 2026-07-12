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
`VITE_API_URL`. The committed remote profile points to
`https://app.game-buds.com`; it is safe for browser and installed-client
testing.

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

## Contribution flow

Create each change on a feature branch based on the current `main` branch, and
open a pull request with a clear title and description before merging it.

## Client commands

```bash
pnpm --filter @gamebuds/mobile sync
pnpm --filter @gamebuds/mobile ios
pnpm --filter @gamebuds/mobile android
pnpm --filter @gamebuds/mobile dev:web:remote
pnpm --filter @gamebuds/mobile dev:ios:remote
pnpm --filter @gamebuds/mobile ios:remote
```

Native sync and iOS/Android builds are intentionally not part of the portable
GitHub Actions checks.

`dev:web:remote` starts the Vite client against the deployed API.
`dev:ios:remote` does the same with iOS live reload; `ios:remote` builds the
remote configuration into the native bundle and launches it without live
reload.

## API and local D1

```bash
pnpm --filter @gamebuds/api db:generate
pnpm --filter @gamebuds/api db:migrate
```

These commands generate Drizzle migrations and apply them to Wrangler's local
D1 database. The deployed Worker uses the `gamebuds` D1 database and its API
is available at `https://app.game-buds.com`.

```bash
pnpm --filter @gamebuds/api run deploy
pnpm --filter @gamebuds/api db:migrate:remote
```

Deploy publishes the Worker and its exact CORS allowlist, including the
production game-buds.com origins, localhost browser development, and the
Capacitor iOS WebView origin. Run the remote migration command after adding a
new D1 migration.

The initial API contract is `GET /health`. Its typed client boundary is
available only from `@gamebuds/api/client`; Worker, D1, Drizzle, and future
authentication internals remain private to the API workspace.
