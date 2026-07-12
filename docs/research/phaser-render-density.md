# Phaser 4.2.1 render density

_Research snapshot: 11 July 2026_

## Decision

Phaser 4.2.1 has **no supported global `GameConfig` or `RenderConfig` option for render resolution, DPR, or a canvas backing-store multiplier**. In particular, `resolution: 2` is not a Phaser 4 configuration API and must not become the application's proposed one-place setting.

There are two independent concerns:

1. **Game canvas backing-store density.** This controls how many physical pixels Phaser renders for one displayed CSS pixel. Phaser's supported configuration takes `width` and `height` as the canvas / game size. Its `zoom` setting changes CSS display size, not the canvas pixel dimensions. Phaser detects device DPR, but does not feed it into renderer sizing automatically.[^config][^create-renderer][^scale-base][^scale-resize][^device]
2. **Texture-source density.** A sprite only gains detail if its bitmap or atlas contains more source pixels. A larger game canvas cannot invent absent sprite detail. Phaser Texture Sources default to resolution 1; its render path divides frame dimensions by that source-resolution value. The 4.2.1 loader/config API does not document automatic `@2x` asset selection or source-resolution declaration, so either must be explicit application asset handling.[^game-config][^texture-source][^texturer]

Therefore, centralize an **application-level render-density policy**, but do not claim it is a native Phaser setting. That policy must own game-canvas sizing, resize handling, and any generated-text resolution. Asset export/loading remains a separate asset contract.

## What Phaser 4.2.1 supports

`GameConfig` and `RenderConfig` enumerate scale, renderer, antialiasing, pixel-art, and WebGL options, but neither includes `resolution`, `pixelRatio`, or `devicePixelRatio`.[^game-config][^render-config]

At boot, Phaser creates the canvas at `game.scale.baseSize`; `ScaleManager` initializes that base size from configured width and height. Its own resize documentation says that `zoom` changes the canvas CSS width/height while its pixel size remains untouched.[^create-renderer][^scale-base][^scale-resize]

For pixel-art filtering rather than density, `render.pixelArt: true` is the relevant supported option: it uses nearest-neighbour texture filtering, disables antialiasing, and enables integer positioning. It does not increase the backing-store or sprite-source resolution.[^config]

For generated `Text`, Phaser exposes per-object `Text#setResolution(value)`. The implementation currently forces an omitted Text-style resolution to 1, and the API warns that higher-resolution text costs texture memory. This means a canvas-density policy does not automatically make Phaser `Text` canvases denser.[^text-default][^text-resolution]

## Upstream history and guidance

Phaser's maintainer recorded that the old global `resolution` mechanism was fixed at 1 after the Scale Manager was introduced and could not be changed. That is an important historical warning: Phaser 3 examples or advice using `resolution: window.devicePixelRatio` are not a Phaser 4 solution.[^issue-3198]

In a Phaser 4 issue, a maintainer confirmed that increasing the game canvas adds render pixels, whereas CSS scaling only stretches existing pixels; Phaser deliberately does not prescribe one universal pixel-art approach.[^issue-7188]

## Recommendation for Gamebuds

Use one small app-owned module as the canonical policy, for example a `render-density` module that supplies:

- the selected density (at least 2, optionally capped for GPU/memory safety);
- the single Phaser game/config factory and resize adapter that apply it to the backing canvas;
- a text-style / text-factory helper for generated Phaser `Text` objects where crisp text is required; and
- an explicit asset convention for logical sprite size versus 2x atlas/image dimensions.

Do not use `scale.zoom` as a substitute for a DPR setting: it scales presentation, while Phaser's documented canvas pixel dimensions still come from game/base size. Also, do not make every scene repeat `resolution: density`; that is an application abstraction around a per-Text Phaser API, not a renderer configuration.

Before changing the implementation, choose which target the requirement means:

| Requirement                                                       | Correct control                                                                   |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Sharper lines, shapes, and final compositing on high-DPI displays | Backing canvas policy                                                             |
| Sharper Phaser-generated labels                                   | Per-Text resolution, centralized through a helper                                 |
| More visual detail in sprites                                     | Export/load real 2x source images or atlases, preserve their logical display size |
| Crisp pixel-art edges                                             | `render.pixelArt` / texture filter policy; not a density multiplier               |

## Sources

[^game-config]: [Phaser 4.2.1 `GameConfig`](https://github.com/phaserjs/phaser/blob/v4.2.1/src/core/typedefs/GameConfig.js)

[^render-config]: [Phaser 4.2.1 `RenderConfig`](https://github.com/phaserjs/phaser/blob/v4.2.1/src/core/typedefs/RenderConfig.js)

[^config]: [Phaser 4.2.1 configuration parsing](https://github.com/phaserjs/phaser/blob/v4.2.1/src/core/Config.js#L51-L98)

[^create-renderer]: [Phaser 4.2.1 renderer creation](https://github.com/phaserjs/phaser/blob/v4.2.1/src/core/CreateRenderer.js#L54-L88)

[^scale-base]: [Phaser 4.2.1 `ScaleManager` base-size initialization](https://github.com/phaserjs/phaser/blob/v4.2.1/src/scale/ScaleManager.js#L553-L575)

[^scale-resize]: [Phaser 4.2.1 `ScaleManager#resize` documentation](https://github.com/phaserjs/phaser/blob/v4.2.1/src/scale/ScaleManager.js#L803-L862)

[^device]: [Phaser 4.2.1 device DPR detection](https://github.com/phaserjs/phaser/blob/v4.2.1/src/device/OS.js#L181)

[^text-default]: [Phaser 4.2.1 Text default resolution](https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/text/Text.js#L248-L284)

[^text-resolution]: [Phaser 4.2.1 `Text#setResolution`](https://github.com/phaserjs/phaser/blob/v4.2.1/src/gameobjects/text/Text.js#L1060-L1076)

[^texture-source]: [Phaser 4.2.1 Texture Source resolution](https://github.com/phaserjs/phaser/blob/v4.2.1/src/textures/TextureSource.js#L108-L115)

[^texturer]: [Phaser 4.2.1 image texturer uses source resolution](https://github.com/phaserjs/phaser/blob/v4.2.1/src/renderer/webgl/renderNodes/texturer/TexturerImage.js#L130-L135)

[^issue-3198]: [Phaser issue #3198 maintainer comment](https://github.com/phaserjs/phaser/issues/3198#issuecomment-554499713)

[^issue-7188]: [Phaser issue #7188 maintainer guidance](https://github.com/phaserjs/phaser/issues/7188#issuecomment-3781294803)
