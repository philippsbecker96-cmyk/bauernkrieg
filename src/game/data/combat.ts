/** Combat and enemy-AI tuning. Kept in data so it can be adjusted without touching systems. */
export const COMBAT = {
  /** Gap (px, edge to edge) within which two units can hit each other in close combat. */
  meleeReach: 6,
  /** Idle units notice enemies within this distance (px, centre to centre). Ranged units use at least their range. */
  acquisitionRadius: 140,
  /** Units that engaged on their own give up and return once they are this far (px) from their post. */
  leashRadius: 300,
  /** When a unit engages, idle allies within this distance (px) join in. */
  alertRadius: 120,
  /** Seconds between path updates while chasing a moving target. */
  repathInterval: 0.4,
} as const;
