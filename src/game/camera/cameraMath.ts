/** Pure camera helpers, kept separate from Phaser so they can be unit-tested. */

export function clampZoom(zoom: number, minZoom: number, maxZoom: number): number {
  return Math.min(maxZoom, Math.max(minZoom, zoom));
}

/**
 * Next zoom level after one mouse-wheel step. `deltaY > 0` (wheel down) zooms out.
 * Rounded to two decimals to avoid floating-point drift over many steps.
 */
export function nextZoom(
  current: number,
  deltaY: number,
  step: number,
  minZoom: number,
  maxZoom: number,
): number {
  if (deltaY === 0) return clampZoom(current, minZoom, maxZoom);
  const direction = deltaY > 0 ? -1 : 1;
  const raw = Math.round((current + direction * step) * 100) / 100;
  return clampZoom(raw, minZoom, maxZoom);
}

/**
 * Camera scroll that keeps the world point under the pointer fixed while zooming.
 * Matches Phaser's camera model with origin 0.5: the view is zoomed around its centre.
 *
 * @param scroll       current scroll on this axis
 * @param viewSize     camera viewport size on this axis (screen pixels)
 * @param pointer      pointer position on this axis relative to the viewport
 */
export function scrollForZoomAtPointer(
  scroll: number,
  viewSize: number,
  pointer: number,
  oldZoom: number,
  newZoom: number,
): number {
  const half = viewSize / 2;
  const world = scroll + half + (pointer - half) / oldZoom;
  return world - half - (pointer - half) / newZoom;
}
