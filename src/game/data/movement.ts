/** Movement and selection tuning. Kept in data so it can be adjusted without touching systems. */
export const MOVEMENT = {
  /** Distance (px) at which a unit counts as having reached a waypoint. */
  waypointReachDistance: 4,
  /** Spacing (px) between formation slots at the destination of a group order. */
  formationSpacing: 18,
  /** Strength of the separation push (0..1 of the overlap resolved per step). */
  separationStrength: 0.5,
  /**
   * If a unit makes no progress towards its final slot for this long (s)
   * and is already close to it, it stops instead of jostling forever.
   */
  stuckTimeout: 0.8,
  /** "Close enough" distance (in formation spacings) used together with `stuckTimeout`. */
  stuckArriveSpacings: 2.5,
  /** Seconds without any progress after which a unit gives up its order (safety net). */
  giveUpTimeout: 4,
  /** Sideways safety margin (px) for line-of-sight shortcuts past obstacles. */
  lineOfSightMargin: 6,
} as const;

export const SELECTION = {
  /** Pointer travel (screen px) below which a left-button press counts as a click, not a drag. */
  dragThreshold: 6,
  /** Extra pick tolerance (world px) around a unit's radius for single clicks. */
  clickTolerance: 4,
} as const;
