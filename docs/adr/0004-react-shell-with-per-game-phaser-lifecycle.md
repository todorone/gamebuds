---
status: accepted
---

# React shell with per-game Phaser lifecycle

Gamebuds is a **Catalog** of **Games**, but the mobile client booted a single hard-wired
`Phaser.Game` in its entry point, and the sole content — the Split Signal **Prototype** —
drew its own landing, buttons, and navigation inside the Phaser canvas. There was no home
screen, no way to browse Games, and no way to add a second Game without entangling it with
the first. We introduced a React root that owns the **shell** — the Catalog and
navigation — while each Game owns its own `Phaser.Game` instance, mounted when a Player
enters it and destroyed when they leave. React renders the browse-and-navigate DOM it is
good at; Phaser renders only the live game canvas it is good at. This amends only the
**Client foundation** clause of [ADR 0001](0001-solo-mobile-and-realtime-architecture.md);
the backend, WebRTC transport, auth, and purchase decisions there are untouched.

## Decisions

- **Shell / canvas split.** A React root renders the Catalog and routes to a game host.
  Each Game renders inside its own `Phaser.Game`. No shell chrome overlaps the game
  canvas — Games are full-bleed.
- **Game seam (the contract).** A Game exposes a lightweight **manifest** — cheap metadata
  the Catalog lists without loading game code (id, display name, tagline, min/max Players,
  and a `status` of `catalog` or `prototype`) — and a lazily-imported **module** with
  `mount(container, ctx) => handle`, where the handle's `destroy()` tears the Phaser
  instance down. `ctx` is `{ exit() }`; a Game reads its own URL params directly and calls
  `exit()` to return to the Catalog.
- **One live instance.** Entering a Game loads its chunk and mounts it; leaving destroys
  it. Two live `Phaser.Game` instances never coexist — mobile WebGL contexts are scarce and
  memory is reclaimed on exit.
- **Registry.** A single registry holds every mountable catalog entry (Games and
  Prototypes). It exposes a resolve-by-id operation that returns the entry for any
  registered id regardless of status (so prototype deep links still resolve in production),
  and a listing operation that returns `status: 'catalog'` entries always and
  `status: 'prototype'` entries only in a development build. Each entry's `load` is a
  dynamic import, so a Game is a separate code-split chunk and Phaser is a shared chunk
  absent from the Catalog's initial bundle.
- **Router.** Hand-rolled — a switch on the current path, no routing dependency. `/` is the
  Catalog; `/games/:gameId` mounts a Game via a game-host component and leaves the query
  string untouched so a Game's session params survive navigation. Back navigation is owned
  by browser/hardware history, returning to `/`.
- **Session Invitation URLs become game-scoped.** An invitation changes from a root
  `…/?room=ABCD` to `…/games/<gameId>?room=ABCD`; whatever mints invitation links must
  include the Game id.
- **Split Signal carried across unchanged.** Its scene and networking files are untouched.
  The Phaser bootstrap that lived in the old entry point — the game config plus the
  window-resize → `scale.resize` bridge — relocated verbatim into the Prototype's own mount
  module and gained a `destroy` path that removes the resize listener and destroys the
  game. Split Signal is registered with `status: 'prototype'`.
- **Entry point.** The app entry is now the React root; the root element id changed from
  the game container to a standard app root, and the full-viewport CSS followed it.
- **Dead-code removal.** The unused `GameScene` scaffold and its now-empty directory were
  deleted; the registry model is the only way a Game reaches the screen.

## Considered options

- **Keep growing the single Phaser instance and have each Game draw its own in-canvas
  navigation**: rejected — it entangles every future Game with whichever Game currently
  owns the canvas and gives no shared browse surface.
- **A routing library (React Router or similar)**: rejected for a two-view surface (Catalog,
  game host); a hand-rolled path switch keeps the client dependency-free per the repo's
  minimal-deps ethos.
- **Multiple simultaneous or background-running Phaser instances**: rejected — mobile WebGL
  contexts are scarce and only one Game is ever in view.
- **Shared cross-cutting services in `ctx` now** (Session Identity, API client, WebRTC
  connection, Group Unlock entitlement): rejected as premature; `ctx` carries only `exit()`
  until a real catalog Game needs more.

## Consequences

- Split Signal, left as-is, has no in-canvas "back to Catalog" control, so on a device with
  no back gesture (iOS native WebView) a Player cannot return to the Catalog from inside it.
  Accepted because Split Signal is a browser-tested throwaway Prototype; future Games call
  `ctx.exit()`.
- Every future catalog Game must register a manifest and a lazily-loaded mount module
  against the same contract; there is no other path onto the screen.
- [ADR 0001](0001-solo-mobile-and-realtime-architecture.md)'s Client foundation clause
  ("keep the existing Capacitor + Phaser + Vite/TypeScript scaffold") is superseded by this
  ADR for the shell/navigation layer; Capacitor, Phaser, and Vite/TypeScript themselves are
  unchanged.
