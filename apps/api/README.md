# `@gamebuds/api`

This workspace is a Hono application deployed as a Cloudflare Worker. Start it
locally with:

```bash
pnpm --filter @gamebuds/api dev
```

The initial endpoint is `GET /health`. The `CORS_ORIGINS` Worker variable is a
comma-separated exact-origin allowlist. Without it, local Vite and Capacitor
origins are allowed:

```text
http://localhost:5173,http://localhost:4173,capacitor://localhost,http://localhost,https://localhost
```

Configure it in `apps/api/.dev.vars` for local overrides. Requests with an
Origin outside the allowlist receive `403`; requests without an Origin remain
usable by command-line and server-side callers.

## Deployment

The Worker is published on `https://app.game-buds.com`. Its checked-in
configuration binds the existing remote `gamebuds` D1 database and allows the
game-buds.com browser origins, local Vite, and the Capacitor iOS WebView.

```bash
pnpm --filter @gamebuds/api run deploy
pnpm --filter @gamebuds/api db:migrate:remote
```

Run the migration command after adding a migration; the current prototype
does not require one.

## Local D1 and Drizzle

```bash
pnpm --filter @gamebuds/api db:generate
pnpm --filter @gamebuds/api db:migrate
```

The schema is intentionally empty until the product domain is designed.

The only client-safe import is `@gamebuds/api/client`. The Worker entry point,
D1 binding, Drizzle schema, and authentication internals are API-private.

The `/prototype/split-signal` routes are a disposable, in-memory relay for
issue #8's Stage A game experiment. They are deliberately outside the durable
API design: no auth, D1, or production WebRTC behavior is provided here.
