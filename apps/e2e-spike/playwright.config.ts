import { defineConfig } from '@playwright/test';

// PROTOTYPE spike for issue #24 — throwaway. See NOTES.md.
//
// Dedicated ports (5273/8887): the default 5173/8787 collide with an
// unrelated worktree's dev servers on this machine.
const MOBILE_PORT = 5273;
const API_PORT = 8887;

export default defineConfig({
	testDir: './tests',
	timeout: 30_000,
	fullyParallel: false,
	workers: 1,
	preserveOutput: 'always',
	use: {
		channel: 'chrome',
		baseURL: `http://localhost:${MOBILE_PORT}`,
		// Chromium can throttle setInterval/setTimeout in a page it considers
		// backgrounded — in a multi-context test, that's whichever page you
		// aren't actively driving right now, and Split Signal's client polls
		// the relay every 700ms via setInterval. These flags remove that
		// specific cause of delay. Tested A/B (see NOTES.md): they do NOT
		// eliminate the flakiness this spike hit under mobile emulation —
		// that turned out to be a separate, harder problem (a real TOCTOU
		// race against the canvas itself, documented in
		// tests/split-signal-seam.spec.ts). Left in as harmless, generally
		// correct practice for any multi-instance harness relying on
		// client-side polling — just don't expect it to be a fix on its own.
		launchOptions: {
			args: [
				'--disable-background-timer-throttling',
				'--disable-backgrounding-occluded-windows',
				'--disable-renderer-backgrounding',
			],
			// Set via `pnpm test:slow` (SLOWMO env var) to watch clicks/taps
			// land in real time with `--headed`. Unset/0 for normal runs.
			slowMo: process.env.SLOWMO ? Number(process.env.SLOWMO) : undefined,
		},
	},
	webServer: [
		{
			command: `pnpm --filter @gamebuds/mobile exec vite --port ${MOBILE_PORT} --strictPort`,
			url: `http://localhost:${MOBILE_PORT}`,
			reuseExistingServer: !process.env.CI,
			timeout: 120_000,
			env: { VITE_API_URL: `http://localhost:${API_PORT}` },
		},
		{
			// CORS_ORIGINS in wrangler.jsonc only lists the app's real dev
			// ports; override it so this spike's dedicated mobile port is
			// allowed too.
			command: `pnpm --filter @gamebuds/api exec wrangler dev --port ${API_PORT} --var CORS_ORIGINS:http://localhost:${MOBILE_PORT}`,
			url: `http://localhost:${API_PORT}/health`,
			reuseExistingServer: !process.env.CI,
			timeout: 120_000,
		},
	],
});
