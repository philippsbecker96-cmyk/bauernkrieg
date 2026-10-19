import { describe, expect, it } from 'vitest';
import { TEST_MAP } from '../game/data/maps';
import { MOVEMENT } from '../game/data/movement';
import { TEST_SCENARIO } from '../game/data/testScenario';
import { createUnit, isMoving, type Unit } from '../game/entities/Unit';
import { spawnUnits } from '../game/entities/UnitFactory';
import { generateMap } from '../game/map/mapGenerator';
import { TileType, getTileDefinition } from '../game/map/tiles';
import { assignSlots, computeFormationSlots, orderGroupMove } from '../game/systems/formation';
import { stepMovement, type MovementConfig } from '../game/systems/movement';
import { buildWalkGrid, isWalkable, type WalkGrid } from '../game/systems/pathfinding';

const tileSize = TEST_MAP.tileSize;
const config: MovementConfig = {
  tileSize,
  waypointReachDistance: MOVEMENT.waypointReachDistance,
  separationStrength: MOVEMENT.separationStrength,
  stuckTimeout: MOVEMENT.stuckTimeout,
  stuckArriveDistance: MOVEMENT.stuckArriveSpacings * MOVEMENT.formationSpacing,
  giveUpTimeout: MOVEMENT.giveUpTimeout,
  lineOfSightMargin: MOVEMENT.lineOfSightMargin,
};

function openGrid(width: number, height: number): WalkGrid {
  return Array.from({ length: height }, () => new Array<number>(width).fill(1));
}

/** Runs the simulation until all units are idle or `maxSeconds` elapsed. Returns elapsed seconds. */
function simulate(units: Unit[], grid: WalkGrid, maxSeconds: number): number {
  const dt = 1 / 30;
  let t = 0;
  while (t < maxSeconds && units.some(isMoving)) {
    stepMovement(units, grid, dt, config);
    t += dt;
  }
  return t;
}

function onWalkableGround(grid: WalkGrid, u: Unit): boolean {
  return isWalkable(grid, Math.floor(u.x / tileSize), Math.floor(u.y / tileSize));
}

function minPairDistance(units: readonly Unit[]): number {
  let min = Infinity;
  for (let i = 0; i < units.length; i++) {
    for (let j = i + 1; j < units.length; j++) {
      min = Math.min(min, Math.hypot(units[i]!.x - units[j]!.x, units[i]!.y - units[j]!.y));
    }
  }
  return min;
}

describe('computeFormationSlots', () => {
  it('liefert die gewünschte Anzahl unterschiedlicher Plätze mit Mindestabstand', () => {
    const slots = computeFormationSlots(openGrid(20, 20), tileSize, { x: 320, y: 320 }, 16, 18);
    expect(slots).toHaveLength(16);
    expect(slots[0]).toEqual({ x: 320, y: 320 });
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        expect(Math.hypot(slots[i]!.x - slots[j]!.x, slots[i]!.y - slots[j]!.y)).toBeGreaterThanOrEqual(18);
      }
    }
  });

  it('legt keine Plätze ins Wasser oder hinter ein Hindernis', () => {
    const grid = openGrid(20, 20);
    for (let y = 0; y < 20; y++) grid[y]![11] = Infinity; // wall right of the target
    const slots = computeFormationSlots(grid, tileSize, { x: 10 * tileSize + 16, y: 320 }, 30, 18);
    for (const s of slots) expect(Math.floor(s.x / tileSize)).toBeLessThan(11);
  });
});

describe('assignSlots', () => {
  it('ordnet jeder Einheit einen eigenen, nahen Platz zu', () => {
    const units = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ];
    const slots = [
      { x: 95, y: 0 },
      { x: 5, y: 0 },
    ];
    expect(assignSlots(units, slots)).toEqual([1, 0]);
  });
});

describe('stepMovement', () => {
  it('bewegt eine Einheit mit ihrer Geschwindigkeit und hält am Ziel an', () => {
    const grid = openGrid(20, 20);
    const unit = createUnit(1, 'peasant', 48, 48);
    orderGroupMove([unit], grid, tileSize, { x: 248, y: 48 }, 18, 6);
    stepMovement([unit], grid, 1, config);
    expect(unit.x).toBeCloseTo(48 + unit.speed, 5);
    simulate([unit], grid, 10);
    expect(isMoving(unit)).toBe(false);
    expect(unit.x).toBeCloseTo(248, 5);
    expect(unit.y).toBeCloseTo(48, 5);
  });

  it('bewegt Einheiten im Wald langsamer (Faktor aus den Kacheldaten)', () => {
    const forestCost = 1 / getTileDefinition(TileType.Forest).speedFactor;
    const grid = openGrid(20, 20);
    for (const row of grid) row.fill(forestCost);
    const unit = createUnit(1, 'peasant', 48, 48);
    orderGroupMove([unit], grid, tileSize, { x: 448, y: 48 }, 18, 6);
    stepMovement([unit], grid, 1, config);
    expect(unit.x - 48).toBeCloseTo(unit.speed * getTileDefinition(TileType.Forest).speedFactor, 5);
  });

  it('schiebt übereinanderstehende Einheiten auseinander', () => {
    const grid = openGrid(10, 10);
    const units = [createUnit(1, 'peasant', 100, 100), createUnit(2, 'peasant', 100, 100)];
    for (let i = 0; i < 30; i++) stepMovement(units, grid, 1 / 30, config);
    expect(minPairDistance(units)).toBeGreaterThan(units[0]!.radius * 2 - 0.5);
  });

  it('schiebt Einheiten nie auf unbegehbare Felder', () => {
    const grid = openGrid(10, 10);
    for (let y = 0; y < 10; y++) grid[y]![4] = Infinity;
    const units = [createUnit(1, 'peasant', 3 * tileSize + 30, 100), createUnit(2, 'peasant', 3 * tileSize + 29, 100)];
    for (let i = 0; i < 60; i++) stepMovement(units, grid, 1 / 30, config);
    for (const u of units) expect(onWalkableGround(grid, u)).toBe(true);
  });
});

describe('Gruppenbefehl auf der Testkarte', () => {
  const grid = buildWalkGrid(generateMap(TEST_MAP));
  const spawn = () => spawnUnits(grid, tileSize, TEST_SCENARIO, MOVEMENT.formationSpacing);

  it('stellt alle Startgruppen vollständig auf begehbarem Boden auf', () => {
    const units = spawn();
    const expected = TEST_SCENARIO.reduce((sum, s) => sum + s.count, 0);
    expect(units).toHaveLength(expected);
    for (const u of units) expect(onWalkableGround(grid, u)).toBe(true);
    expect(new Set(units.map((u) => u.id)).size).toBe(units.length);
  });

  it('führt 16 Bauern über die Furt auf die andere Flussseite, ohne zu verklumpen', () => {
    const peasants = spawn().filter((u) => u.faction === 'player');
    const target = { x: 50 * tileSize, y: 18 * tileSize };
    const result = orderGroupMove(peasants, grid, tileSize, target, MOVEMENT.formationSpacing, MOVEMENT.lineOfSightMargin);
    expect(result?.movedCount).toBe(peasants.length);

    const elapsed = simulate(peasants, grid, 60);
    expect(elapsed).toBeLessThan(60); // everybody stopped, nobody hangs forever
    for (const u of peasants) {
      expect(onWalkableGround(grid, u)).toBe(true);
      expect(Math.hypot(u.x - target.x, u.y - target.y)).toBeLessThan(5 * MOVEMENT.formationSpacing);
    }
    expect(minPairDistance(peasants)).toBeGreaterThan(peasants[0]!.radius);
  });

  it('weicht bei einem Klick ins Wasser auf das nächste Ufer aus', () => {
    const peasants = spawn().filter((u) => u.faction === 'player');
    // Find a water tile in the road-free part of the map.
    const row = grid[10]!;
    const waterX = row.findIndex((cost) => !Number.isFinite(cost));
    expect(waterX).toBeGreaterThan(0);
    const result = orderGroupMove(
      peasants,
      grid,
      tileSize,
      { x: waterX * tileSize + 16, y: 10 * tileSize + 16 },
      MOVEMENT.formationSpacing,
      MOVEMENT.lineOfSightMargin,
    );
    expect(result).not.toBeNull();
    const d = result!.destination;
    expect(isWalkable(grid, Math.floor(d.x / tileSize), Math.floor(d.y / tileSize))).toBe(true);
  });
});
