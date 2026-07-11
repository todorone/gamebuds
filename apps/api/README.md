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

## Local D1 and Drizzle

```bash
pnpm --filter @gamebuds/api db:generate
pnpm --filter @gamebuds/api db:migrate
```

The schema is intentionally empty until the product domain is designed. The
Wrangler configuration is local-only: remote D1 provisioning, IDs, and remote
migrations are out of scope.

The only client-safe import is `@gamebuds/api/client`. The Worker entry point,
D1 binding, Drizzle schema, and authentication internals are API-private.
