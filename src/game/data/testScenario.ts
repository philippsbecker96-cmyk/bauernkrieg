import type { UnitTypeId } from './units';

/**
 * Starting units for the test map (milestone 1). Positions are in tiles;
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
  // Player: 16 peasants west of the river, near the road.
  { typeId: 'peasant', count: 16, tileX: 10, tileY: 22 },
  // Enemy guards east of the river (only displayed in milestone 1; no AI or combat yet).
  { typeId: 'guard', count: 5, tileX: 52, tileY: 26 },
];
