# Gamebuds

A TypeScript Phaser game packaged for iOS and Android with Capacitor.

## Requirements

- Node.js 24+
- pnpm 10+
- Xcode for iOS development
- Android Studio for Android development

## Commands

```bash
pnpm install
pnpm dev       # Run the browser version
pnpm build     # Type-check and create dist/
pnpm sync      # Build and copy the web game into both native projects
pnpm ios       # Sync and run in an available iOS Simulator
pnpm android   # Sync and run on an Android emulator/device
```

The game entry point is `src/main.ts`; the initial Phaser scene is in `src/game-scene.ts`.
