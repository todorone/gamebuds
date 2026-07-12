import type Phaser from 'phaser';

export const RENDER_DENSITY = Math.max(2, window.devicePixelRatio || 1);

export function logicalViewport(scale: { width: number; height: number }): {
	width: number;
	height: number;
} {
	return {
		width: scale.width / RENDER_DENSITY,
		height: scale.height / RENDER_DENSITY,
	};
}

export function configureCameraForRenderDensity(
	camera: Phaser.Cameras.Scene2D.Camera,
	scale: { width: number; height: number },
): void {
	const viewport = logicalViewport(scale);
	camera
		.setZoom(RENDER_DENSITY)
		.centerOn(viewport.width / 2, viewport.height / 2);
}
