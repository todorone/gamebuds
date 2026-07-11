# `@gamebuds/mobile`

The client is the existing Capacitor + Vite + Phaser application. Its native
projects live beside the web source so Capacitor continues to resolve `dist/`
relative to this workspace.

```bash
pnpm --filter @gamebuds/mobile dev
pnpm --filter @gamebuds/mobile build
pnpm --filter @gamebuds/mobile sync
pnpm --filter @gamebuds/mobile ios
pnpm --filter @gamebuds/mobile android
```

Set `VITE_API_URL` in `.env.local` when the API is not at the local default.
Use an HTTPS URL for installed and deployed clients. The Phaser entry point
does not make a visible API request yet; the typed API client is prepared for
the Session Identity and Game Session work that follows.
