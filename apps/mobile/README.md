# `@gamebuds/mobile`

The client is the existing Capacitor + Vite + Phaser application. Its native
projects live beside the web source so Capacitor continues to resolve `dist/`
relative to this workspace.

```bash
pnpm --filter @gamebuds/mobile dev:web
pnpm --filter @gamebuds/mobile dev:ios
pnpm --filter @gamebuds/mobile dev:web:remote
pnpm --filter @gamebuds/mobile dev:ios:remote
pnpm --filter @gamebuds/mobile dev:android
pnpm --filter @gamebuds/mobile build
pnpm --filter @gamebuds/mobile build:remote
pnpm --filter @gamebuds/mobile sync
pnpm --filter @gamebuds/mobile sync:remote
pnpm --filter @gamebuds/mobile ios
pnpm --filter @gamebuds/mobile ios:remote
pnpm --filter @gamebuds/mobile android
```

`dev:ios` starts Vite and launches the iOS app with Capacitor live reload, so
changes to the web client appear in the simulator without rebuilding the
native app. Run `pnpm --filter @gamebuds/api dev` separately when the local API
is needed.

`dev:android` provides the same live-reload workflow for an Android emulator
or connected device.

Phaser renders the game canvas at least at 2× density (or the device pixel
ratio when higher). The camera and text textures use the same density, so
drawn UI and future sprites retain their logical on-screen size while staying
sharp on high-density displays.

Set `VITE_API_URL` in `.env.local` when the API is not at the local default.
Use an HTTPS URL for installed and deployed clients. The committed `.env.remote`
profile points to `https://app.game-buds.com`, and every `*:remote` command
uses it. `dev:web:remote` runs a browser client against that API;
`dev:ios:remote` uses it with iOS live reload; `ios:remote` embeds it in the
native build. The Phaser entry point currently runs the throwaway Split Signal
prototype for issue #8. Start the API separately for local development, then
open the web client at:

```text
http://localhost:5173/?host=1&name=Host
```

Share the room code shown in the prototype with two to four Players. Joiners
use `?room=ROOMCODE&name=Player`; `variant=A`, `variant=B`, and `variant=C`
switch the three disposable layouts. The relay is intentionally in-memory and
is not production networking.
