import type { UnitTypeId } from './units';

/**
 * Starting units for the test map (milestones 1–2). Positions are in tiles;
 * spawns on unwalkable tiles are moved to the nearest walkable tile.
 * Replaced by real mission data from milestone 3a on.
 */
export interface UnitGroupSpawn {
  typeId: UnitTypeId;
  count: number;
  /** Centre of the group in tile coordinates. */
  tileX: number;
  tileY: number;
}

export const TEST_SCENARIO: readonly UnitGroupSpawn[] = [
  // Player: peasants and a few crossbowmen west of the river, near the road.
  { typeId: 'peasant', count: 12, tileX: 10, tileY: 22 },
  { typeId: 'crossbowman', count: 4, tileX: 7, tileY: 22 },
  // Enemy vanguard at the east end of the bridge.
  { typeId: 'guard', count: 3, tileX: 40, tileY: 21 },
  // Enemy post further east.
  { typeId: 'guard', count: 4, tileX: 52, tileY: 26 },
  { typeId: 'guardCrossbowman', count: 2, tileX: 54, tileY: 26 },
];

/** Initial rally point for the retreat order (tile coordinates); the player can move it. */
export const TEST_RALLY_POINT = { tileX: 3, tileY: 22 } as const;
