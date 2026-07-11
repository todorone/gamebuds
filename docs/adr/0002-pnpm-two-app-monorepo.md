---
status: accepted
---

# pnpm two-app monorepo

The repository will be a pnpm workspace with exactly two deployable applications: `apps/mobile`, which owns the complete Capacitor, Vite, Phaser, iOS, and Android mobile client, and `apps/api`, which hosts the Hono backend. Root-level commands use pnpm recursive execution rather than Turborepo, keeping the initial infrastructure small while preserving independent app boundaries; `pnpm dev` starts both applications and filtered commands remain available for focused work. Each workspace owns formatting, linting, typechecking, tests, and builds, and root commands run each quality gate recursively. GitHub Actions runs that portable root quality contract for pushes and pull requests, excluding Capacitor sync and native iOS/Android builds until their runner and signing strategy is designed. The API includes D1/Drizzle configuration and local migration commands; remote database provisioning remains a deployment-stage concern. Shared packages will be introduced only when a real cross-app contract emerges. The API exposes a client-safe typed Hono RPC entry point for the mobile client, while Worker, database, and authentication internals remain private to the API workspace. Its initial contract is the tested `GET /health` endpoint, providing a typed-client smoke test without game behavior. The API enforces a configuration-driven CORS allowlist for Vite development, Capacitor WebViews, and deployed clients. The mobile client receives the API origin through `VITE_API_URL`: `http://localhost:8787` for browser development and an HTTPS Worker URL for installed and deployed clients. Authentication is deliberately deferred until the separate Session Identity and Player Account design establishes its behavior and provider configuration.

## Considered Options

- **Turborepo**: rejected initially because task caching does not justify another orchestration layer for two applications.
- **An initial shared package**: rejected because no common client/API contract exists yet and an empty package would obscure ownership.
