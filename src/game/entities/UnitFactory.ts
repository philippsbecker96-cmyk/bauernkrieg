import type { UnitGroupSpawn } from '../data/testScenario';
import { UNIT_TYPES } from '../data/units';
import { computeFormationSlots } from '../systems/formation';
import { nearestWalkableTile, tileCenter, type WalkGrid } from '../systems/pathfinding';
import { createUnit, type Unit } from './Unit';

/** Creates all units of a scenario, each group arranged in a compact block on walkable ground. */
export function spawnUnits(
  grid: WalkGrid,
  tileSize: number,
  spawns: readonly UnitGroupSpawn[],
  spacing: number,
): Unit[] {
  const units: Unit[] = [];
  let nextId = 1;
  for (const spawn of spawns) {
    const tile = nearestWalkableTile(grid, { x: spawn.tileX, y: spawn.tileY });
    if (!tile) continue;
    const centre = tileCenter(tile, tileSize);
    const radius = UNIT_TYPES[spawn.typeId].radius;
    const slots = computeFormationSlots(grid, tileSize, centre, spawn.count, Math.max(spacing, radius * 2));
    for (const slot of slots) {
      units.push(createUnit(nextId++, spawn.typeId, slot.x, slot.y));
    }
  }
  return units;
}
