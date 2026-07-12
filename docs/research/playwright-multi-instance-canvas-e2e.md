# Playwright multi-instance e2e against a canvas-only Phaser UI

_Research snapshot: 12 July 2026_

## Decision this research supports

This research feeds the decision on **how to drive and assert a canvas-only Phaser UI from Playwright** for a reusable, multi-instance Split Signal e2e harness (2–4 concurrent player "instances" against one relay session). It is tracked against GitHub issue #24.

It **does not** itself pick an approach. Playwright is already the chosen tool; the open question is the *seam* between the test and a game whose entire UI is painted to one `<canvas>` with no DOM roles or text. Below, each option is weighed with cited primary-source evidence so a human can choose. Where the official docs are silent (e.g. Playwright ships no first-class canvas-testing API), that is stated explicitly rather than papered over with an invented citation.

All Playwright citations are from the official docs at `playwright.dev`; Phaser citations are from the official API docs at `docs.phaser.io`. Every page in the Sources list was fetched for this note.

## Bottom line

- **Multi-user is a first-class Playwright pattern, but not multi-threaded.** One test can hold several fully isolated `browser.newContext()` sessions (separate cookies/storage) — Playwright names multi-user chat as the motivating use case.[^contexts] The catch for our harness: a single test body is one async function in one worker process,[^parallel] so the 2–4 instances are *interleaved by `await` ordering*, not run on parallel threads. Genuine overlap needs `Promise.all`; deterministic coordination is easier done step-by-step with retrying waits.
- **The canvas is the crux, and it defeats Playwright's ergonomic path.** Locators and auto-waiting are built on the DOM/accessibility tree — `getByRole`/`getByText`/`getByLabel` and web-first assertions like `toHaveText`.[^locators][^actionability] Our UI exposes only `<div id="game">` and a `<canvas>`; drawn Phaser rectangles have no role, text, or bounding box Playwright can see. So the whole family of retrying DOM assertions is unavailable, and you must substitute one of: a **test seam** on `window`, **pixel-coordinate clicks**, **screenshot** comparison, or **API-driven** state.
- **The seam is the best-supported substitute.** `page.addInitScript` runs "after the document was created but before any of its scripts were run",[^page] so it can inject/seed globals before `main.ts` boots Phaser; `page.evaluate` reads live `window` state back out.[^page] Phaser hands you the hooks (`game.scene.getScene(key)`),[^phaser-game][^phaser-scenemanager] but does **not** attach the game to `window` automatically[^phaser-game] — publishing a reference is a small, deliberate app change.
- **Pixel-clicking is real but brittle here.** `locator.click({ position })` clicks relative to the element's padding-box top-left,[^locator] and the `Mouse` API works in "main-frame CSS pixels relative to the top-left corner of the viewport".[^mouse] But our scene lays every button out from `window.innerWidth/innerHeight` under `Scale.RESIZE` + `autoCenter`, so those coordinates move whenever the viewport does. It exercises the real input pipeline; it pays for that with layout coupling.
- **`window.prompt` on the landing screen needs a dialog handler — or bypass it.** Playwright auto-dismisses dialogs by default (so `prompt()` returns `null` and the handler early-returns); you must register `page.on('dialog', d => d.accept('Host'))` to get past it.[^dialogs][^dialog] The pragmatic escape is the app's **URL-driven flow**: navigate straight to `?host=1&name=X` / `?room=CODE&name=X` and skip the prompts entirely.
- **Screenshots suit a couple of masked smoke shots, not gameplay.** `toHaveScreenshot()` is real and auto-retries to stability,[^snapshots] but our canvas is saturated with non-determinism (room codes, player names, `charCodeAt`-derived target order, event-log text, hover alpha) and baselines are per-platform (`chromium-darwin`).[^snapshots] High maintenance for dynamic state.
- **Two dev servers boot from one `webServer` array; eventual state is handled with `expect.poll`/`toPass`, not sleeps.** `webServer` accepts an array to launch Vite and Wrangler together,[^webserver] and `expect.poll`/`expect(...).toPass()` retry until state converges after the 700 ms poll cycle.[^assertions] The **Clock API** looks tempting for skipping the 700 ms wait but is risky: it overrides `requestAnimationFrame`,[^clock] which is exactly what Phaser's render loop rides — and it cannot speed up the real backend round-trip.

---

## (A) Coordinating multiple concurrent browser contexts as separate users

**Multiple isolated sessions in one test is explicitly supported.** The docs state Playwright "can create multiple browser contexts within a single scenario" and call out that this "is useful when you want to test for multi-user functionality, like a chat."[^contexts] Each context is an independent, isolated session — a `newContext()` "won't share cookies/cache with other browser contexts",[^browser] and isolation covers cookies, local storage, and session storage.[^contexts] The canonical shape is one context per user, one page per context:

```js
const browser = await chromium.launch();
const hostCtx = await browser.newContext();
const p2Ctx   = await browser.newContext();
const hostPage = await hostCtx.newPage();
const p2Page   = await p2Ctx.newPage();
```

For our harness this maps cleanly onto 2–4 players: each player is its own context, so each gets an independent Split Signal `playerId` and URL. `browser.newPage()` is a convenience that creates a throwaway context tied to one page and "should only be used for the single-page scenarios";[^browser] a 2–4 player harness should use explicit `newContext()` per player for lifecycle control and true isolation.

**Isolation guarantee vs. concurrency model — the important nuance.** The isolation is strong: the docs describe contexts as isolated even within a single browser.[^contexts] But *isolation is not parallelism*. Playwright's parallelism is across **worker processes** — "All tests run in worker processes. These processes are OS processes, running independently"[^parallel] — and "Tests in a single file are run in order, in the same worker process."[^parallel] The docs describe **no** concurrency mechanism *inside* a single test body. So when one test drives four contexts, the test is a single async function issuing serialized `await`ed commands. The four browser sessions themselves are independent (their timers, network, and Phaser render loops advance in real wall-clock time concurrently), but *your commands to them* interleave only where you order the `await`s, or overlap only where you wrap them in `Promise.all([...])`.

Practical consequence for Split Signal: because coordination is turn-ordered (host starts, then each slot repairs its node in `targetOrder`), a mostly-sequential script — host acts → wait for propagation → next player reads/acts — is both natural and easier to make deterministic than `Promise.all` racing. The place you *need* to be careful is **eventual consistency across contexts**: after the host POSTs `start`, player 2's canvas does not change until player 2's own 700 ms poll fires and its `fetch` resolves. That waiting is section (C)'s problem, and it is why per-context assertions must retry rather than assert-once.

> Gap: the docs quantify worker-level parallelism but say nothing about intra-test scheduling of multiple contexts. The "interleave via `await`, overlap via `Promise.all`" statement above is analysis grounded in the single-process worker model,[^parallel] not a direct doc claim.

---

## (B) Driving and asserting a canvas-only UI (the crux)

### Why the default Playwright model does not apply

Playwright's core is DOM- and accessibility-tree-shaped. Locators "are the central piece of Playwright's auto-waiting and retry-ability" and the recommended ones — `getByRole`, `getByText`, `getByLabel`, `getByPlaceholder`, `getByAltText`, `getByTitle`, `getByTestId` — resolve to DOM elements and ARIA roles/accessible names.[^locators] Actionability checks before a click (visible = "non-empty bounding box", stable = "same bounding box for at least two consecutive animation frames", receives events, enabled) all assume "locator resolves to exactly one element" in the DOM first.[^actionability]

Our Split Signal UI renders **entirely to one `<canvas>`**; the only DOM nodes are `<div id="game">` and the canvas Phaser injects. A "Repair" button is a drawn `Phaser.GameObjects.Rectangle` with a `POINTER_DOWN` handler — it has no DOM node, no role, no text, no independent bounding box. Therefore:

- `getByRole('button', { name: 'Repair' })`, `getByText('ROOM ABC123')`, etc. match nothing.
- Web-first retrying assertions (`toHaveText`, `toBeVisible`, …) have no locator to retry against.
- Auto-wait cannot wait for "the Start button" to appear because there is no element to wait on.

Playwright ships **no first-class canvas/WebGL testing API** — there is no documented "read the canvas scene graph" primitive. Confirmed by absence across the locators, actionability, and page docs.[^locators][^actionability][^page] This is the gap every option below works around.

### Option 1 — Test seam on `window` (inject before load, read with `evaluate`)

**Mechanics and timing.** `page.addInitScript` "is evaluated after the document was created but before any of its scripts were run", on every navigation.[^page] So a test can seed globals or flags *before* `apps/mobile/src/main.ts` constructs `new Phaser.Game(...)`. To read live state back, `page.evaluate` runs a function "in the page's browser context" and returns a serializable value[^page] — e.g. the current phase or progress array.

Note the division of labor: `addInitScript` is *write-before-boot* (inject a hook, stub `Math.random`, preset a value the app reads at startup); it cannot read post-boot state because it runs first. Reading happens at assertion time via `evaluate`. They are complementary.

**Reaching Phaser state.** Phaser gives the retrieval hooks: `game.scene` is "an instance of the Scene Manager … responsible for creating, modifying and updating the Scenes",[^phaser-game] and `game.scene.getScene(key)` "Retrieves a Scene based on the given key."[^phaser-scenemanager] So `game.scene.getScene('split-signal-prototype')` reaches the running scene. **But** the game instance is *not* on `window` automatically — the docs give no auto-global; "Developers must explicitly store the reference."[^phaser-game] So the seam requires a small app change, e.g. in `main.ts` capture `const game = new Phaser.Game(...)` and assign a test-only hook, or (cleaner and decoupled from Phaser internals) have the scene publish `window.__splitSignal = { getState: () => this.state, sendAction: (t) => this.sendAction(t) }` in `create()`.

**Why this is the strongest fit.** With a state hook, the otherwise-missing retrying-assertion path returns via `expect.poll` (section C): `await expect.poll(() => hostPage.evaluate(() => window.__splitSignal.getState().phase)).toBe('active')`. It reads the *real* application state the canvas is drawn from, and it survives Phaser's responsive layout because it never touches pixels.

**Honest cost.** It requires a production-code seam (ideally compiled out or guarded so it doesn't ship), and it asserts *state*, not *rendering* — a hook that returns `phase === 'complete'` does not prove the "SYSTEM STABLE" text was actually painted.

### Option 2 — Pixel-coordinate clicking (+ dialog handling)

**Mechanics.** `page.locator('canvas').click({ position: { x, y } })` — the `position` option is "A point to use relative to the top-left corner of element padding box."[^locator] Lower-level, `page.mouse` "operates in main-frame CSS pixels relative to the top-left corner of the viewport."[^mouse] Either dispatches real mouse events that Phaser's input plugin turns into the `POINTER_DOWN` our buttons listen for — so this genuinely exercises the input pipeline end to end.

**`window.prompt` / `alert`.** The landing screen's "Host a Game Session" and "Join with a room code" buttons call `window.prompt(...)`. Playwright **auto-dismisses dialogs by default**,[^dialogs] which makes `prompt()` return `null`; the handlers then hit `if (!name) return` and do nothing. To drive them you must register a listener *before* the click — "The `page.on('dialog')` listener **must handle** the dialog. Otherwise your action will stall"[^dialogs] — and supply the value via `dialog.accept(promptText)`, where `promptText` is "A text to enter in prompt."[^dialog] The join flow fires *two* sequential prompts (code, then name), so the handler must respond in order (e.g. a small queue keyed off `dialog.message()`).

**Brittleness against our layout — the decisive downside.** The scene is `Scale.RESIZE` with `autoCenter: CENTER_BOTH`, and buttons are placed from `this.scale.width/height` at draw time (`height - 180`, `x + width * 0.56 + 32`, `Math.min(width - 56, 360)`, …). Every button coordinate is a function of the viewport, so a hard-coded pixel click is only valid for one exact viewport size, and even then you must re-derive the same arithmetic the scene uses. To make it deterministic you must pin the context `viewport` and mirror the layout math — a maintenance liability that breaks whenever the drawing code moves.

**Pragmatic mitigation.** Because the app is URL-driven, most flows need *no* clicking and *no* dialogs: `page.goto('/?host=1&name=Host')` creates the room; `page.goto('/?room=CODE&name=P2')` joins. Only the two in-game actions with no URL equivalent — `start` and `repair`/`ping` — need either a real pixel click or (via the seam) a direct `sendAction`. So pixel-clicking is best reserved for the *few* tests that specifically want to prove a drawn button is hittable, not as the harness's primary driver.

### Option 3 — Visual assertion via `toHaveScreenshot()`

**Mechanics.** `await expect(page).toHaveScreenshot()` captures and compares against a committed baseline, retaking "until two consecutive screenshots matched"; the first run writes the baseline into a `*-snapshots` folder that is committed, and images are named per browser/platform (e.g. `chromium-darwin`) because "Screenshots differ between browsers and platforms."[^snapshots] Tolerance knobs exist (`maxDiffPixels`, `threshold`, plus `stylePath` to hide volatile elements), and `--update-snapshots` refreshes baselines.[^snapshots]

**Trade-offs for our canvas.** This is the only option that asserts *actual rendered pixels* — attractive for a canvas since it is the one thing the seam can't verify. But Split Signal's canvas is highly dynamic: the room code, player names, `targetOrder` derived from `session.code.charCodeAt(0)`, the live event log, and hover-driven alpha changes all vary run to run, and rendering differs between a dev Mac and CI. That combination makes full-frame gameplay snapshots flaky and high-maintenance.[^snapshots] Realistic use: a *small* number of stable, masked smoke shots (e.g. the landing screen at a fixed viewport, or a "complete" panel with dynamic regions masked), not per-step gameplay verification.

### Option 4 — API-driven (drive/observe the relay, minimal UI)

**Mechanics.** Playwright can hit the backend directly: `APIRequestContext`/the `request` fixture/`page.request` send HTTP without the UI, and the docs list "Prepare server side state before visiting the web application" and "Validate server side post-conditions after running some actions in the browser" as intended uses.[^apitesting] For Split Signal this means POST `/sessions`, `/sessions/:code/players`, `/sessions/:code/actions` and GET the state directly.

**Trade-off.** Most robust and fastest for the *coordination and eventual-consistency logic* (which is really the relay's behavior), and immune to canvas/layout entirely — but it asserts essentially **none** of the real UI; at the limit it tests `apps/api`, not the Phaser client. Useful as scaffolding (seed a room, drive a co-player, assert server post-conditions) around a browser instance that carries the actual UI assertions.

### Phaser test-introspection summary

Phaser exposes what a seam needs — `Phaser.Game` is "the main controller for the entire Phaser game",[^phaser-game] `game.scene` is the Scene Manager,[^phaser-game] and `game.scene.getScene(key)` returns a running scene[^phaser-scenemanager] — but it publishes **nothing on `window` by default**,[^phaser-game] and (being canvas-rendered) contributes nothing to the accessibility tree Playwright locators need. So Phaser enables the seam approach but does not remove the need for an app-side reference.

### Comparison of the canvas-driving options

| Approach | Robustness (vs. RESIZE / dynamic content) | App-change cost | How much real UI it asserts |
| --- | --- | --- | --- |
| **Seam on `window`** (`addInitScript` + `evaluate`, read scene state)[^page][^phaser-scenemanager] | **High** — reads state, never touches pixels or layout | **Medium** — add a guarded `window.__splitSignal` hook in the scene / `main.ts`[^phaser-game] | **Low–medium** — asserts app state the canvas is drawn from, not the pixels themselves |
| **Pixel-coordinate click** (`locator.click({position})` / `mouse`, `page.on('dialog')`)[^locator][^mouse][^dialogs] | **Low** — coordinates track `window.innerWidth/Height` under RESIZE + autoCenter; must mirror layout math | **None** (URL flow can even skip most prompts) | **High for input path** — proves a drawn button is actually hittable end to end |
| **Screenshot** (`toHaveScreenshot`)[^snapshots] | **Low for gameplay** — room code / names / order / log / hover all vary; per-platform baselines | **None** | **Highest for rendering** — the only option that checks painted pixels |
| **API-driven** (`request` / `page.request`)[^apitesting] | **Highest** — no browser layout involved | **None** | **Lowest** — exercises the relay, not the Phaser client |

No single row wins; the shapes suggest a blend (seam for state assertions + a little pixel-clicking for input-path coverage + a couple of masked screenshots + API for setup). The choice is left to the human on issue #24.

---

## (C) Orchestrating dev servers + polling/eventual-consistency timing without flaky sleeps

### Booting Vite + Wrangler together with one `webServer` array

`webServer` accepts an **array**: "Multiple web servers (or background processes) can be launched simultaneously by providing an array of `webServer` configurations."[^webserver] So one config boots both our servers:

```ts
webServer: [
  { command: 'pnpm --filter @gamebuds/mobile dev:web', url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI, timeout: 120_000 },
  { command: 'pnpm --filter @gamebuds/api dev', /* port or a healthy url */
    reuseExistingServer: !process.env.CI, timeout: 120_000 },
]
```

Key fields:[^webserver]
- **`command`** — the shell command to start the dev server.
- **`url`** — Playwright polls it and treats the server ready when it "return[s] a 2xx, 3xx, 400, 401, 402, or 403 status code." (`port` is a deprecated alternative that only checks the TCP port is listening.)
- **`reuseExistingServer`** — "If `true`, it will re-use an existing server on the `port` or `url` when available," conventionally `!process.env.CI`, so local devs reuse already-running Vite/Wrangler.
- **`timeout`** — "How long to wait for the process to start up and be available… Defaults to 60000."
- **`cwd`**, **`stdout`** — working directory and log piping.

> **Practical gotcha for the Wrangler entry:** the readiness URL must return one of the accepted codes, and **404 is not in that list** (2xx/3xx/400/401/402/403 are).[^webserver] The API root and an unknown route both 404. Two clean options: (a) point `url` at a route that returns an accepted code — e.g. `GET /prototype/split-signal/sessions/ANYCODE` returns **404** (session not found, *not* accepted), but the handler returns **401** ("Player identity required") only when a session exists, so the reliable move is to add a tiny health route returning 200; or (b) use `port` for the Wrangler entry so readiness is just "port is listening." Flag this in implementation.

> **State-persistence note:** the relay is an in-memory global `Map`, wiped on worker restart and shared across requests. With `reuseExistingServer` true, a reused Wrangler process keeps state between runs. So tests must be **self-contained** — create a fresh room per test (the room code is unique per `POST /sessions`) rather than assuming a clean relay; never rely on seeded server state.

### Alternative: global setup / project dependencies

Playwright offers global setup two ways: a **setup project** (project dependency, recommended — "your HTML report will include the global setup, traces will be recorded, and fixtures can be used") or **`globalSetup`/`globalTeardown`** config functions, which "lack some features."[^globalsetup] These are aimed at authentication, DB seeding, and sharing state — not at supervising long-running dev servers, for which `webServer` is the idiomatic fit.[^globalsetup] For our stack there is little to seed (each test creates its own room), so `webServer` alone is likely sufficient; global setup would only earn its keep if a shared fixture (e.g. a pre-created room reused across tests) proved worthwhile.

### Waiting for eventual state without `waitForTimeout`

The timing reality: the client polls `GET …/sessions/:code` every **700 ms**, and it only re-renders when the serialized state changes. After player A POSTs an action, player B's UI/state does not update until B's next poll fires *and* its `fetch` resolves — a per-instance latency of up to ~700 ms plus network. Fixed `waitForTimeout(700)` sleeps would be both flaky (network jitter) and slow. Primary-source options, best-fit first:

1. **`expect.poll(fn).toBe(...)`** — converts a synchronous assertion into a polling one, repeatedly calling `fn` until it passes, with configurable `intervals`/`timeout`.[^assertions] This is the **best fit** for cross-instance convergence when combined with the seam: poll `page.evaluate(() => window.__splitSignal.getState().progress.length)` until it reaches the expected value. It naturally rides through as many 700 ms poll cycles as needed.

2. **`expect(async () => { … }).toPass()`** — "retry[s] blocks of code until they are passing," useful when a step needs several reads/assertions together; note "by default `toPass` has timeout 0 and does not respect custom expect timeout," so set a `timeout` explicitly.[^assertions] Good for "read state from two contexts and assert a relationship."

3. **Web-first retrying assertions** (`toHaveText`, `toBeVisible`, …) — these retry automatically,[^assertions] but they need a **DOM locator**, which our canvas does not provide. So for Split Signal they are effectively **unavailable** unless the app renders assertable DOM. This is the concrete reason the canvas pushes us onto `expect.poll`/`toPass` over `evaluate` rather than the more ergonomic web-first assertions.

4. **Clock API (`page.clock`)** — controls time in the page, overriding `Date`, `setTimeout`, `setInterval`, `requestAnimationFrame`, and `performance`; `fastForward`/`runFor` fire due timers and "All the timers due will fire once immediately, as in the real browser," and `install` "MUST occur before any other clock related calls."[^clock] In principle you could `fastForward(700)` to *trigger the poll immediately* instead of waiting. **In practice it is a poor fit here, for two cited reasons:** (a) it controls timers, not the network or the backend — fast-forwarding fires the poll's `setInterval` callback, but the resulting `fetch` still takes real wall-clock time and the real relay still has to have the new state, so you *still* need a retrying assertion afterward; and (b) Clock overrides `requestAnimationFrame`,[^clock] which is precisely what Phaser's game/render loop depends on — installing it risks freezing or desyncing the canvas render loop unless very carefully scoped. Net: Clock does not remove the need for `expect.poll`/`toPass`, and it introduces a real risk against a Phaser canvas. Reserve it (if at all) for narrowly controlling app-level timers, not the render loop.

**Recommended shape (not a decision):** `webServer` array (Vite + Wrangler, `reuseExistingServer` off in CI) → per-player `newContext` → drive via URL navigation and/or a state seam → assert convergence with `expect.poll`/`toPass` over `page.evaluate`. Avoid `waitForTimeout` and treat the Clock API as out of scope for the canvas render loop.

---

## Where the docs are silent / gaps found

- **No first-class canvas/WebGL testing API in Playwright.** Nothing in the locators, actionability, or page docs offers a way to introspect a canvas scene graph.[^locators][^actionability][^page] Every option in section (B) is a workaround; that is the central finding.
- **No intra-test parallelism guidance.** The parallel doc covers worker processes only;[^parallel] the "interleave via `await` / overlap via `Promise.all`" characterization is analysis, not a quoted claim.
- **`webServer` readiness excludes 404.** A non-obvious gotcha: the accepted-status list omits 404,[^webserver] and both the API root and unknown Split Signal routes 404 — a health route or `port`-based readiness is needed for the Wrangler server.
- **Web-first retrying assertions are unusable without DOM.** A real ergonomic loss caused by the canvas; the fallback is `expect.poll`/`toPass` over `evaluate`.[^assertions]
- **Clock vs. Phaser RAF is a genuine conflict, not a hypothetical.** The docs confirm Clock overrides `requestAnimationFrame`;[^clock] Phaser's loop depends on it. This makes an initially attractive "skip the 700 ms" idea risky.
- **Surprise (mild):** Playwright auto-*dismisses* dialogs by default,[^dialogs] so the landing-screen `window.prompt` flow silently no-ops under test unless a handler is registered — easy to misdiagnose as "the button doesn't work." The URL-driven flow sidesteps it entirely.

## Sources

All sources are official primary documentation fetched on 12 July 2026: Playwright at `playwright.dev` and Phaser at `docs.phaser.io`. Quoted text is from those pages; where a claim is analysis rather than a direct quote, the surrounding prose says so.

[^contexts]: Playwright, [Isolation / Multiple contexts](https://playwright.dev/docs/browser-contexts). "Playwright can create multiple browser contexts within a single scenario. This is useful when you want to test for multi-user functionality, like a chat." Contexts are isolated (cookies, local storage, session storage) even within one browser.
[^browser]: Playwright, [Browser class — `newContext()` / `newPage()`](https://playwright.dev/docs/api/class-browser). `newContext()` "won't share cookies/cache with other browser contexts"; `newPage()` is "a convenience API that should only be used for the single-page scenarios."
[^parallel]: Playwright, [Parallelism](https://playwright.dev/docs/test-parallel). "All tests run in worker processes. These processes are OS processes, running independently, orchestrated by the test runner." "Tests in a single file are run in order, in the same worker process." "You can't communicate between the workers." No intra-test concurrency mechanism is described.
[^locators]: Playwright, [Locators](https://playwright.dev/docs/locators). "Locators are the central piece of Playwright's auto-waiting and retry-ability." Recommended locators (`getByRole`, `getByText`, `getByLabel`, `getByPlaceholder`, `getByAltText`, `getByTitle`, `getByTestId`) resolve to DOM elements and ARIA roles/accessible names.
[^actionability]: Playwright, [Auto-waiting / Actionability](https://playwright.dev/docs/actionability). Pre-action checks: visible ("non-empty bounding box"), stable ("same bounding box for at least two consecutive animation frames"), receives events, enabled — after the "locator resolves to exactly one element."
[^page]: Playwright, [Page class — `addInitScript()` and `evaluate()`](https://playwright.dev/docs/api/class-page). `addInitScript`: "The script is evaluated after the document was created but before any of its scripts were run," on every navigation. `evaluate` runs a function in the page's browser context and resolves to a serializable return value.
[^locator]: Playwright, [Locator class — `click()`](https://playwright.dev/docs/api/class-locator). `position`: "A point to use relative to the top-left corner of element padding box. If not specified, uses some visible point of the element." `force` bypasses actionability checks.
[^mouse]: Playwright, [Mouse class](https://playwright.dev/docs/api/class-mouse). "The Mouse class operates in main-frame CSS pixels relative to the top-left corner of the viewport." `move`/`click`/`down`/`up`.
[^dialogs]: Playwright, [Dialogs](https://playwright.dev/docs/dialogs). Dialogs are auto-dismissed by default; a registered `page.on('dialog')` listener "must handle the dialog. Otherwise your action will stall."
[^dialog]: Playwright, [Dialog class — `accept([promptText])`](https://playwright.dev/docs/api/class-dialog). `promptText`: "A text to enter in prompt. Does not cause any effects if the dialog's `type` is not prompt." Also `type()`, `message()`, `dismiss()`.
[^snapshots]: Playwright, [Visual comparisons — `toHaveScreenshot()`](https://playwright.dev/docs/test-snapshots). Retakes "until two consecutive screenshots matched"; first run writes a committed baseline; images named per browser/platform because "Screenshots differ between browsers and platforms"; tolerance via `maxDiffPixels`/`threshold`; `stylePath` hides dynamic content; `--update-snapshots` refreshes.
[^webserver]: Playwright, [Web server](https://playwright.dev/docs/test-webserver). "Multiple web servers (or background processes) can be launched simultaneously by providing an array of `webServer` configurations." `url` ready on "a 2xx, 3xx, 400, 401, 402, or 403 status code"; `reuseExistingServer` "will re-use an existing server on the `port` or `url` when available"; `timeout` "Defaults to 60000."
[^assertions]: Playwright, [Assertions](https://playwright.dev/docs/test-assertions). Web-first assertions auto-retry (they require a locator). `expect(async () => {…}).toPass()` "retry[s] blocks of code until they are passing" ("by default `toPass` has timeout 0"). `expect.poll(fn, {intervals, timeout}).toBe(...)` converts a sync assertion into a polling one.
[^clock]: Playwright, [Clock](https://playwright.dev/docs/clock). Overrides `Date`, `setTimeout`, `setInterval`, `requestAnimationFrame`, `performance`. `install` "MUST occur before any other clock related calls." `fastForward`/`runFor`: "All the timers due will fire once immediately, as in the real browser."
[^globalsetup]: Playwright, [Global setup and teardown](https://playwright.dev/docs/test-global-setup-teardown). Setup project (recommended — appears in HTML report/traces, can use fixtures) vs. `globalSetup`/`globalTeardown` config (which "lack some features"). Aimed at auth, DB seeding, sharing state — not long-running dev servers.
[^apitesting]: Playwright, [API testing](https://playwright.dev/docs/api-testing). `APIRequestContext`/`request` fixture/`page.request` send HTTP without the UI; uses include "Prepare server side state before visiting the web application in a test" and "Validate server side post-conditions after running some actions in the browser."
[^phaser-game]: Phaser, [`Phaser.Game`](https://docs.phaser.io/api-documentation/class/game). "The Phaser.Game instance is the main controller for the entire Phaser game." `scene`: "An instance of the Scene Manager. The Scene Manager is a global system responsible for creating, modifying and updating the Scenes in your game." The instance is not attached to `window` automatically; the reference must be stored explicitly.
[^phaser-scenemanager]: Phaser, [`Phaser.Scenes.SceneManager`](https://docs.phaser.io/api-documentation/class/scenes-scenemanager). `getScene(key)`: "Retrieves a Scene based on the given key." Also `getScenes()`, `isActive(key)`.
