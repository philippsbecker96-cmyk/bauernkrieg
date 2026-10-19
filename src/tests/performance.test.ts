import { describe, expect, it } from 'vitest';
import { COMBAT } from '../game/data/combat';
import { TEST_MAP } from '../game/data/maps';
import { MOVEMENT } from '../game/data/movement';
import { STRESS_SCENARIO } from '../game/data/testScenario';
import { spawnUnits } from '../game/entities/UnitFactory';
import { generateMap } from '../game/map/mapGenerator';
import { createRandom } from '../game/map/random';
import { buildCoverGrid, orderGeneralAttack, stepCombat, type CombatConfig } from '../game/systems/combat';
import { stepMovement, type MovementConfig } from '../game/systems/movement';
import { buildWalkGrid } from '../game/systems/pathfinding';

/**
 * Performance test (milestone 3): 100 units move and fight at the same time.
 * Measures the simulation only (rendering is checked manually in the browser, key B).
 * One frame at 60 fps has 16.7 ms; the simulation should use only a small part of it.
 */
describe('Performance-Test mit 100 Einheiten', () => {
  it('100 Einheiten bewegen sich und kämpfen gleichzeitig, ein Simulationsschritt bleibt weit unter einem Frame', () => {
    const tiles = generateMap(TEST_MAP);
    const grid = buildWalkGrid(tiles);
    const tileSize = TEST_MAP.tileSize;
    const combatConfig: CombatConfig = {
      tileSize,
      ...COMBAT,
      lineOfSightMargin: MOVEMENT.lineOfSightMargin,
      coverGrid: buildCoverGrid(tiles),
      random: createRandom(1),
    };
    const movementConfig: MovementConfig = {
      tileSize,
      waypointReachDistance: MOVEMENT.waypointReachDistance,
      separationStrength: MOVEMENT.separationStrength,
      stuckTimeout: MOVEMENT.stuckTimeout,
      stuckArriveDistance: MOVEMENT.stuckArriveSpacings * MOVEMENT.formationSpacing,
      giveUpTimeout: MOVEMENT.giveUpTimeout,
      lineOfSightMargin: MOVEMENT.lineOfSightMargin,
    };

    const units = spawnUnits(grid, tileSize, STRESS_SCENARIO, MOVEMENT.formationSpacing);
    expect(units).toHaveLength(100);
    const start = new Map(units.map((u) => [u.id, { x: u.x, y: u.y }]));
    orderGeneralAttack(units);

    const dt = 1 / 60; // one step per frame at 60 fps, like the mission scene
    const steps = 60 * 30; // 30 s of battle
    const times: number[] = [];
    let hits = 0;
    let deaths = 0;
    for (let i = 0; i < steps; i++) {
      const t0 = performance.now();
      const events = stepCombat(units, grid, dt, combatConfig);
      stepMovement(units, grid, dt, movementConfig);
      times.push(performance.now() - t0);
      for (const e of events) {
        if (e.kind === 'hit') hits++;
        else if (e.kind === 'death') deaths++;
      }
    }

    // Everyone moved and the armies really fought.
    const moved = [...start].filter(([id, p]) => {
      const u = units.find((v) => v.id === id);
      return !u || Math.hypot(u.x - p.x, u.y - p.y) > 32;
    });
    expect(moved.length).toBeGreaterThanOrEqual(90);
    expect(hits).toBeGreaterThan(100);
    expect(deaths).toBeGreaterThan(10);

    const sorted = [...times].sort((a, b) => a - b);
    const average = times.reduce((a, b) => a + b, 0) / times.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)]!;
    const report = `Schritt Ø ${average.toFixed(3)} ms, 95 % ≤ ${p95.toFixed(3)} ms, max ${sorted.at(-1)!.toFixed(3)} ms`;
    // Generous limits so slower CI machines pass; locally the values are far lower.
    expect(average, report).toBeLessThan(4);
    expect(p95, report).toBeLessThan(8);
  });
});
