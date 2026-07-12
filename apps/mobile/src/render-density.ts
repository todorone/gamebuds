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
