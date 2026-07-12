# Phaser render-density camera positioning in Playwright

_Research snapshot: 12 July 2026_

## Finding

The cropped Split Signal canvas was caused by application camera geometry, not
Playwright, Chromium, SwiftShader, or GPU acceleration.

The e2e spike runs installed Google Chrome through Playwright's `channel:
'chrome'`. Runtime inspection reported the Apple Metal ANGLE renderer. At the
pinned `390×844` viewport, the application created a `780×1688` backing canvas,
displayed it at `390×844` CSS pixels, and set the Phaser camera zoom to `2`.

Phaser calculates the camera world view around the camera's existing physical
center. With zero scroll:

```text
camera width     = 780
camera zoom      = 2
visible width    = 780 / 2 = 390
camera midpoint  = 780 / 2 = 390
visible start x  = 390 - 390 / 2 = 195
```

The equivalent vertical calculation starts the world view at `y=422`. Split
Signal lays out its UI in logical coordinates from `(0, 0)` to `(390, 844)`, so
the camera displayed only the lower-right portion of that logical scene in the
top-left of the canvas.

## Correction

The application-owned render-density helper now:

1. applies the density as camera zoom; and
2. centers the camera on the logical viewport center.

It reapplies both operations after the Phaser scale manager resizes the backing
canvas. This preserves the 2× backing-store policy while making the camera world
view start at `(0, 0)`.

The Playwright seam exposes the live `camera.worldView`, and the e2e regression
requires `{ x: 0, y: 0, width: 390, height: 844 }`. Before the correction it
failed deterministically with `{ x: 195, y: 422, width: 390, height: 844 }`.
Every passing test also attaches a full active-game screenshot to its result.

## Separate headed-window effect

When Playwright uses a fixed `390×844` viewport in headed mode, the operating
system's Chrome window can be wider than the emulated page viewport. Any gray
area beside the page belongs to the headed browser window; it is separate from
the Phaser camera crop and does not appear in Playwright's page screenshot.
