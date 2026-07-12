# e2e driving/asserting spike (issue #24)

## Question

Split Signal's UI is 100% Phaser canvas, so Playwright cannot locate its
buttons or labels through the DOM. This spike tests a mixed strategy:

- direct API calls create a fresh two-Player Game Session;
- isolated browser contexts represent the Players;
- real canvas clicks exercise Phaser input;
- a dev-only `window.__splitSignal` seam exposes state and camera geometry;
- `expect.poll` waits for each context's 700 ms relay polling cycle; and
- the active Player canvas is attached to the Playwright result.

## Run it

```bash
pnpm --filter @gamebuds/e2e-spike-issue-24 test
pnpm --filter @gamebuds/e2e-spike-issue-24 test:slow
```

The spike uses dedicated ports `5273` and `8887` so it can run beside another
Gamebuds checkout. The API server command overrides `CORS_ORIGINS` to allow the
dedicated mobile port.

## Canvas-position regression

The first click-based version exposed an application camera bug, not a
Playwright or graphics-backend defect. At a `390×844` logical viewport, the
render-density policy created a `780×1688` backing canvas and applied camera
zoom `2`. Phaser keeps an unscrolled camera centered on its physical viewport,
so the resulting world view began at `(195, 422)` instead of `(0, 0)`. The
canvas element filled the page, but Phaser rendered only the lower-right part
of the logical scene into its top-left corner.

The application now applies density zoom and then centers the camera on the
logical viewport. The same helper runs again after a resize. The e2e seam
reports the real Phaser `camera.worldView`, and the test requires exactly:

```text
{ x: 0, y: 0, width: 390, height: 844 }
```

This assertion failed with `{ x: 195, y: 422, width: 390, height: 844 }`
before the fix. The canvas buttons can now be clicked at their positions from
the scene's own layout math instead of coordinates found through grid search.

Every passing run writes and attaches `player-2-active.png` inside that test's
directory under `apps/e2e-spike/test-results/`. It provides a direct visual
artifact showing the whole active-game canvas.

## Remaining trade-offs

The seam remains necessary for state assertions because canvas text and buttons
do not exist in the DOM. `expect.poll` is also necessary: one Player sees its
own action immediately, while the other context observes it on a later relay
poll.

Fixed-coordinate canvas clicks are still tied to the pinned viewport and scene
layout. They are useful here to prove the Phaser input path, but a reusable
multi-game harness should drive coordination through a deliberate game seam and
reserve pixel clicks for a small input smoke test.

Full mobile-device emulation is outside this corrected spike. It uses a plain
desktop Chrome context at phone dimensions so the result tests the application
layout without adding mobile user-agent, touch, or device-scale-factor changes.
