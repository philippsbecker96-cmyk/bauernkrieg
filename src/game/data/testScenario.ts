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
  // Player west of the river, near the road: peasants in front, crossbowmen behind,
  // spearmen and swordsmen on the flanks, a few hired Landsknechte.
  { typeId: 'peasant', count: 8, tileX: 10, tileY: 22 },
  { typeId: 'spearman', count: 4, tileX: 10, tileY: 19 },
  { typeId: 'swordsman', count: 2, tileX: 10, tileY: 25 },
  { typeId: 'crossbowman', count: 4, tileX: 7, tileY: 22 },
  { typeId: 'landsknecht', count: 3, tileX: 7, tileY: 25 },
  // Enemy vanguard at the east end of the bridge.
  { typeId: 'guard', count: 3, tileX: 40, tileY: 21 },
  // Enemy post further east, held by armoured foot soldiers.
  { typeId: 'guard', count: 3, tileX: 52, tileY: 26 },
  { typeId: 'armoredFootman', count: 2, tileX: 51, tileY: 24 },
  { typeId: 'guardCrossbowman', count: 2, tileX: 54, tileY: 26 },
];

/**
 * Performance test (milestone 3): 100 units of all roles in the open country
 * south-west of the road, two armies facing each other. The mission scene orders
 * both sides to attack at once, so all units move and fight at the same time.
 */
export const STRESS_SCENARIO: readonly UnitGroupSpawn[] = [
  { typeId: 'peasant', count: 20, tileX: 9, tileY: 33 },
  { typeId: 'spearman', count: 10, tileX: 9, tileY: 29 },
  { typeId: 'swordsman', count: 5, tileX: 9, tileY: 37 },
  { typeId: 'crossbowman', count: 10, tileX: 5, tileY: 33 },
  { typeId: 'landsknecht', count: 5, tileX: 5, tileY: 37 },
  { typeId: 'guard', count: 25, tileX: 24, tileY: 36 },
  { typeId: 'armoredFootman', count: 15, tileX: 24, tileY: 40 },
  { typeId: 'guardCrossbowman', count: 10, tileX: 27, tileY: 38 },
];

/** Initial rally point for the retreat order (tile coordinates); the player can move it. */
export const TEST_RALLY_POINT = { tileX: 3, tileY: 22 } as const;
