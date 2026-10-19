/** Camera and input constants. Kept in data so they can be tuned without touching scene code. */
export const CAMERA_CONTROLS = {
  /** Keyboard panning speed in screen pixels per second (independent of zoom). */
  panSpeed: 600,
  minZoom: 0.5,
  maxZoom: 2,
  /** Zoom change per mouse-wheel step. */
  zoomStep: 0.1,
} as const;
