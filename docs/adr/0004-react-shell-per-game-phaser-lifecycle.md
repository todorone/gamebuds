---
status: accepted
---

# React shell with per-game Phaser lifecycle

The mobile client is becoming a Catalog of many Games, but today it boots a single
`Phaser.Game` in `main.ts` with one hard-wired scene, and Phaser is a poor tool for
the browse-and-navigate DOM the Catalog needs. We are introducing a React root that
owns the shell (Catalog and navigation) while each Game owns its own `Phaser.Game`
instance, mounted when a Player enters it and destroyed when they leave. This amends
only the **Client foundation** clause of [ADR-0001](./0001-solo-mobile-and-realtime-architecture.md)
("keep the existing Capacitor + Phaser + Vite/TypeScript scaffold; not reopened by
this ADR") — the backend, WebRTC transport, auth, and purchase decisions in that ADR
are unchanged.

## Decisions

- **React owns the shell, Phaser owns the canvas.** React renders the Catalog and
  routes to a game host; each Game renders inside its own `Phaser.Game`. No shell
  chrome overlaps the game canvas — Games are full-bleed.
- **Game seam.** A Game exposes a lightweight `GameManifest` (cheap metadata the
  Catalog lists without loading any game code) and a lazily-imported `GameModule`
  with `mount(container, ctx) => GameHandle`. `GameHandle.destroy()` tears the Phaser
  instance down. `ctx` is `{ exit() }` — a Game reads its own URL params directly and
  calls `exit()` to return to the Catalog.
- **One live instance at a time.** Entering a Game loads its chunk and mounts it;
  leaving destroys it. Two live `Phaser.Game` instances never coexist (scarce mobile
  WebGL contexts; memory reclaimed on exit).
- **Hand-rolled router.** `/` is the Catalog; `/games/:gameId` mounts a Game and
  preserves the query string so a Game's session params survive navigation. A tiny
  `switch` on `location.pathname`, no routing dependency.
- **Catalog lists Games; the registry resolves everything.** The registry contains
  every mountable entry (Games and Prototypes) so `/games/:gameId` deep links always
  resolve. The Catalog list shows `status: 'catalog'` in production and additionally
  `status: 'prototype'` only when `import.meta.env.DEV`, keeping the shipped Catalog
  free of throwaway Prototypes.
- **Split Signal is unchanged.** Its scene and networking files are untouched; the
  Phaser bootstrap that lived in `main.ts` (game config plus the window-resize bridge)
  moves verbatim into an additive `prototypes/split-signal/mount.ts` and gains a
  `destroy` path.

## Considered options

- **Pure-Phaser shell** (a Catalog scene): rejected — list, navigation, and future
  lobby/Result Card UI are HTML work Phaser handles poorly.
- **React Router:** deferred, not rejected — the routing surface is two views today;
  a hand-rolled router avoids the dependency and matches the repo's minimal-deps
  ethos. Revisit if deep-link/back-stack handling outgrows it.
- **Multiple simultaneous Phaser instances / a persistent background Game:** rejected
  for v1; one active Game keeps WebGL and memory pressure bounded.

## Consequences

- **Session Invitation URLs become game-scoped:** `…/?room=ABCD` today becomes
  `…/games/split-signal?room=ABCD`. Whatever mints invitation links must include the
  Game id.
- **Phaser becomes a shared, code-split chunk:** each Game is dynamically imported, so
  the Catalog's initial bundle carries neither Phaser nor any game code.
- **Known gap:** Split Signal, left as-is, has no in-canvas "back to Catalog" control,
  so on a device with no back gesture (iOS native WebView) a Player cannot return to
  the Catalog from inside it. Accepted because Split Signal is a browser-tested
  throwaway Prototype; future Games call `ctx.exit()`.
