import { expect, test } from '@playwright/test';

import type { SplitSignalTestSeam } from '../../mobile/src/prototypes/split-signal/split-signal-scene';

// PROTOTYPE spike for issue #24 — throwaway. See ../NOTES.md for the
// question this answers and the verdict once observed.
//
// Shape under test: API-driven setup (seed a Game Session + a second Player
// directly against the relay, bypassing window.prompt) → URL-driven load
// (each context navigates straight to its existing session/player id) → real
// mouse clicks on the drawn canvas buttons to drive actions (Option 2 from
// the research) → window.__splitSignal seam only to read state and assert
// convergence with expect.poll (Option 1).
//
// A plain 390x844 desktop-Chrome viewport keeps the spike focused on the
// phone layout without adding mobile user-agent or touch emulation variables.
const API_URL = 'http://localhost:8887';
const RELAY = `${API_URL}/prototype/split-signal`;

const VIEWPORT = { width: 390, height: 844 };

// Centers of the buttons drawn by drawActionPanel at this pinned viewport.
// The camera regression assertion below guarantees that logical scene
// coordinates map to the same CSS-pixel coordinates Playwright clicks.
const BUTTON_ROW_Y = 768;
const START_CLICK = { x: 195, y: BUTTON_ROW_Y };
const REPAIR_CLICK = { x: 138, y: BUTTON_ROW_Y };
const PING_CLICK = { x: 299, y: BUTTON_ROW_Y };

interface JoinResponse {
	playerId: string;
	state: { code: string };
}

declare global {
	interface Window {
		__splitSignal?: SplitSignalTestSeam;
	}
}

test('two players repair the system via real button clicks, asserted through the seam', async ({
	browser,
	request,
}, testInfo) => {
	// --- Setup via direct API calls, no UI involved ---
	const hostJoin = (await (
		await request.post(`${RELAY}/sessions`, { data: { name: 'Host' } })
	).json()) as JoinResponse;
	const sessionCode = hostJoin.state.code;
	const p2Join = (await (
		await request.post(`${RELAY}/sessions/${sessionCode}/players`, {
			data: { name: 'P2' },
		})
	).json()) as JoinResponse;

	// --- Two isolated phone-sized (but plain desktop) contexts ---
	const hostCtx = await browser.newContext({ viewport: VIEWPORT });
	const p2Ctx = await browser.newContext({ viewport: VIEWPORT });
	const hostPage = await hostCtx.newPage();
	const p2Page = await p2Ctx.newPage();

	// URL-driven load: each page already knows its Game Session + Player id, so no
	// window.prompt dialogs are involved.
	await hostPage.goto(
		`/games/split-signal?room=${sessionCode}&player=${hostJoin.playerId}`,
	);
	await p2Page.goto(
		`/games/split-signal?room=${sessionCode}&player=${p2Join.playerId}`,
	);

	// Wait for the Phaser scene to boot and publish the seam (read-only use).
	await expect
		.poll(() => hostPage.evaluate(() => Boolean(window.__splitSignal)))
		.toBe(true);
	await expect
		.poll(() => p2Page.evaluate(() => Boolean(window.__splitSignal)))
		.toBe(true);
	await expect
		.poll(() => p2Page.evaluate(() => window.__splitSignal!.getCameraView()))
		.toEqual({ x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height });

	// --- Drive: host clicks the real "Start the shared repair" button ---
	await hostPage.mouse.click(START_CLICK.x, START_CLICK.y);
	await expect
		.poll(() =>
			hostPage.evaluate(() => window.__splitSignal!.getState()?.phase),
		)
		.toBe('active');

	// --- Drive: p2 clicks the real "Ping" button, asserted via the seam ---
	// p2Page's own canvas won't show the Repair/Ping action panel until its
	// own 700ms poll picks up the phase change host just caused — clicking
	// before that lands on the stale "waiting for host" screen instead.
	await expect
		.poll(() => p2Page.evaluate(() => window.__splitSignal!.getState()?.phase))
		.toBe('active');
	const screenshotPath = testInfo.outputPath('player-2-active.png');
	await p2Page.screenshot({ path: screenshotPath });
	await testInfo.attach('player-2-active', {
		path: screenshotPath,
		contentType: 'image/png',
	});
	await p2Page.mouse.click(PING_CLICK.x, PING_CLICK.y);
	await expect
		.poll(() =>
			hostPage.evaluate(
				() =>
					window
						.__splitSignal!.getState()
						?.events.filter((event) => event.kind === 'ping').length,
			),
		)
		.toBe(1);

	// The repair order is deliberately hidden per-player (that's the game's
	// mechanic), so the spike doesn't try to solve it — it round-robins real
	// clicks on the Repair button on both pages. Wrong clicks spend stability,
	// but two Players can still complete a round before the three-charge reset.
	const repairRound = async (expectedPhase: 'round-reveal' | 'complete') => {
		for (let attempt = 0; attempt < 6; attempt += 1) {
			await hostPage.mouse.click(REPAIR_CLICK.x, REPAIR_CLICK.y);
			await p2Page.mouse.click(REPAIR_CLICK.x, REPAIR_CLICK.y);
			const phase = await hostPage.evaluate(
				() => window.__splitSignal!.getState()?.phase,
			);
			if (phase === expectedPhase) break;
		}

		// hostPage updates immediately after its own click, but p2Page observes
		// the shared phase on its 700ms poll cycle.
		await expect
			.poll(
				() => hostPage.evaluate(() => window.__splitSignal!.getState()?.phase),
				{ timeout: 5_000 },
			)
			.toBe(expectedPhase);
		await expect
			.poll(
				() => p2Page.evaluate(() => window.__splitSignal!.getState()?.phase),
				{ timeout: 5_000 },
			)
			.toBe(expectedPhase);
	};

	await repairRound('round-reveal');
	await hostPage.mouse.click(START_CLICK.x, START_CLICK.y);
	await expect
		.poll(() => p2Page.evaluate(() => window.__splitSignal!.getState()?.phase))
		.toBe('active');

	await repairRound('round-reveal');
	await hostPage.mouse.click(START_CLICK.x, START_CLICK.y);
	await expect
		.poll(() => p2Page.evaluate(() => window.__splitSignal!.getState()?.phase))
		.toBe('active');

	await repairRound('complete');

	// Hold the finished state on screen for a moment when run headed —
	// otherwise the windows close before you can see the "SYSTEM STABLE"
	// panel. No-op cost when run headless in CI.
	if (!process.env.CI) {
		await hostPage.waitForTimeout(3_000);
	}
});
