import { describe, expect, it } from 'vitest';
import { COMBAT } from '../game/data/combat';
import { MINI_MISSION, type PostDefinition, type VillageDefinition } from '../game/data/missions';
import { MOVEMENT } from '../game/data/movement';
import { createUnit, isMoving, type Unit } from '../game/entities/Unit';
import { spawnUnits } from '../game/entities/UnitFactory';
import { createRandom } from '../game/map/random';
import { TileType } from '../game/map/tiles';
import { buildCoverGrid, markMarching, orderAttack, stepCombat, type CombatConfig } from '../game/systems/combat';
import { orderGroupMove } from '../game/systems/formation';
import {
  buildMissionTiles,
  checkRecruit,
  createMissionState,
  postPresence,
  recruitAtVillage,
  siteCenter,
  stepMission,
} from '../game/systems/mission';
import { stepMovement, type MovementConfig } from '../game/systems/movement';
import { buildWalkGrid, findPath, isWalkable, nearestWalkableTile, type WalkGrid } from '../game/systems/pathfinding';

const mission = MINI_MISSION;
const tileSize = mission.map.tileSize;
const village: VillageDefinition = mission.villages[0]!;
const post: PostDefinition = mission.post;
const spacing = MOVEMENT.formationSpacing;

const movementConfig: MovementConfig = {
  tileSize,
  waypointReachDistance: MOVEMENT.waypointReachDistance,
  separationStrength: MOVEMENT.separationStrength,
  stuckTimeout: MOVEMENT.stuckTimeout,
  stuckArriveDistance: MOVEMENT.stuckArriveSpacings * MOVEMENT.formationSpacing,
  giveUpTimeout: MOVEMENT.giveUpTimeout,
  lineOfSightMargin: MOVEMENT.lineOfSightMargin,
};

function setup(seed = 7) {
  const tiles = buildMissionTiles(mission);
  const grid = buildWalkGrid(tiles);
  const combatConfig: CombatConfig = {
    tileSize,
    ...COMBAT,
    lineOfSightMargin: MOVEMENT.lineOfSightMargin,
    coverGrid: buildCoverGrid(tiles),
    random: createRandom(seed),
  };
  const units = spawnUnits(grid, tileSize, [...mission.startArmy, ...post.garrison], spacing);
  return { tiles, grid, combatConfig, units, state: createMissionState() };
}

function at(id: number, faction: 'player' | 'enemy', x: number, y: number): Unit {
  return createUnit(id, faction === 'player' ? 'peasant' : 'guard', x, y);
}

const players = (units: readonly Unit[]) => units.filter((u) => u.faction === 'player');
const enemies = (units: readonly Unit[]) => units.filter((u) => u.faction === 'enemy');

describe('Karte der Mini-Mission', () => {
  it('ist klein und deterministisch', () => {
    expect(mission.map.width * mission.map.height).toBeLessThanOrEqual(40 * 30);
    expect(buildMissionTiles(mission)).toEqual(buildMissionTiles(mission));
  });

  it('Dorf und Posten stehen auf freiem Gelände ohne Wald', () => {
    const tiles = buildMissionTiles(mission);
    for (const site of [village, post]) {
      expect(tiles[site.tileY]![site.tileX]).not.toBe(TileType.Water);
      expect(tiles[site.tileY]![site.tileX]).not.toBe(TileType.Forest);
    }
  });

  it('Startgruppe, Dorf und Posten sind über Land miteinander verbunden', () => {
    const grid = buildWalkGrid(buildMissionTiles(mission));
    const start = mission.startArmy[0]!;
    const from = nearestWalkableTile(grid, { x: start.tileX, y: start.tileY })!;
    for (const site of [village, post]) {
      expect(isWalkable(grid, site.tileX, site.tileY)).toBe(true);
      expect(findPath(grid, from, { x: site.tileX, y: site.tileY })).not.toBeNull();
    }
  });

  it('Startgruppe besteht aus einfachen Bauern, der Posten aus einigen Wachen', () => {
    const { units } = setup();
    expect(players(units).every((u) => u.typeId === 'peasant')).toBe(true);
    expect(players(units).length).toBeGreaterThan(0);
    expect(enemies(units).length).toBeGreaterThanOrEqual(3);
    // The whole garrison stands inside the capture zone at the start.
    expect(postPresence(post, units, tileSize).enemy).toBe(enemies(units).length);
  });
});

describe('Platzhalter-Rekrutierung im Dorf', () => {
  const centre = siteCenter(village, tileSize);

  it('verlangt einen eigenen Kämpfer in der Nähe des Dorfes', () => {
    const state = createMissionState();
    const far = [at(1, 'player', centre.x + village.recruitRadius + 20, centre.y)];
    expect(checkRecruit(state, village, far, tileSize)).toBe('noUnitNearby');
    // Enemies next to the village do not count.
    expect(checkRecruit(state, village, [at(2, 'enemy', centre.x, centre.y)], tileSize)).toBe('noUnitNearby');
    expect(checkRecruit(state, village, [at(3, 'player', centre.x + 10, centre.y)], tileSize)).toBe('ok');
  });

  it('eine feste Zahl Bauern schließt sich genau einmal an, mit neuen eindeutigen Ids', () => {
    const { grid } = setup();
    const state = createMissionState();
    const units = [at(5, 'player', centre.x, centre.y), at(9, 'enemy', 0, 0)];
    const recruits = recruitAtVillage(state, village, units, grid, tileSize, spacing);
    expect(recruits).toHaveLength(village.recruits.count);
    expect(recruits.every((u) => u.typeId === village.recruits.typeId && u.faction === 'player')).toBe(true);
    expect(recruits.map((u) => u.id)).toEqual([10, 11, 12, 13, 14, 15]);
    for (const u of recruits) {
      expect(Math.hypot(u.x - centre.x, u.y - centre.y)).toBeLessThan(village.recruitRadius);
    }
    units.push(...recruits);
    expect(checkRecruit(state, village, units, tileSize)).toBe('alreadyRecruited');
    expect(recruitAtVillage(state, village, units, grid, tileSize, spacing)).toEqual([]);
  });

  it('ohne Kämpfer am Dorf schließt sich niemand an', () => {
    const { grid } = setup();
    const state = createMissionState();
    const units = [at(1, 'player', 0, 0)];
    expect(recruitAtVillage(state, village, units, grid, tileSize, spacing)).toEqual([]);
    expect(state.recruitedVillages.size).toBe(0);
  });
});

describe('Einnahme des Postens, Sieg und Niederlage', () => {
  const centre = siteCenter(post, tileSize);

  it('Fortschritt wächst nur, solange eigene Einheiten ohne Gegner im Posten stehen', () => {
    const state = createMissionState();
    const units = [at(1, 'player', centre.x, centre.y)];
    stepMission(state, post, units, 1, tileSize);
    expect(state.captureProgress).toBeCloseTo(1);
    expect(state.outcome).toBe('running');

    // Contested: an enemy in the zone pauses the capture.
    units.push(at(2, 'enemy', centre.x + 10, centre.y));
    stepMission(state, post, units, 2, tileSize);
    expect(state.captureProgress).toBeCloseTo(1);

    // Nobody of the player inside: progress decays, but never below zero.
    units[0]!.x = centre.x + post.captureRadius + 50;
    units.pop();
    stepMission(state, post, units, 0.5, tileSize);
    expect(state.captureProgress).toBeCloseTo(1 - 0.5 * post.captureDecay);
    stepMission(state, post, units, 10, tileSize);
    expect(state.captureProgress).toBe(0);
  });

  it('Sieg, sobald der Posten lange genug gehalten wurde', () => {
    const state = createMissionState();
    const units = [at(1, 'player', centre.x, centre.y)];
    stepMission(state, post, units, post.captureTime - 0.1, tileSize);
    expect(state.outcome).toBe('running');
    stepMission(state, post, units, 0.2, tileSize);
    expect(state.outcome).toBe('victory');
    // The result is final.
    stepMission(state, post, [], 1, tileSize);
    expect(state.outcome).toBe('victory');
  });

  it('Niederlage, wenn alle eigenen Einheiten gefallen sind – auch wenn keine Gegner mehr leben', () => {
    const state = createMissionState();
    stepMission(state, post, [at(2, 'enemy', centre.x, centre.y)], 0.1, tileSize);
    expect(state.outcome).toBe('defeat');
    const empty = createMissionState();
    stepMission(empty, post, [], 0.1, tileSize);
    expect(empty.outcome).toBe('defeat');
  });

  it('alle Gegner tot reicht nicht: der Posten muss betreten werden', () => {
    const state = createMissionState();
    stepMission(state, post, [at(1, 'player', centre.x + 500, centre.y)], 30, tileSize);
    expect(state.outcome).toBe('running');
  });
});

/** Runs the simulation like the mission scene does, until `done` or `seconds` have passed. */
function simulate(
  ctx: ReturnType<typeof setup>,
  seconds: number,
  done: () => boolean,
  each?: (time: number) => void,
): number {
  const dt = 1 / 30;
  for (let time = 0; time < seconds; time += dt) {
    if (ctx.state.outcome === 'running') stepCombat(ctx.units, ctx.grid, dt, ctx.combatConfig);
    stepMovement(ctx.units, ctx.grid, dt, movementConfig);
    stepMission(ctx.state, post, ctx.units, dt, tileSize);
    each?.(time);
    if (done()) return time;
  }
  return seconds;
}

/** Player units attack the nearest guard (right click on an enemy); with `idleOnly` only idle ones. */
function attackNearest(units: readonly Unit[], idleOnly = false): void {
  for (const unit of players(units)) {
    if (idleOnly && unit.order !== 'idle') continue;
    let best: Unit | undefined;
    for (const e of enemies(units)) {
      if (!best || Math.hypot(e.x - unit.x, e.y - unit.y) < Math.hypot(best.x - unit.x, best.y - unit.y)) best = e;
    }
    if (best) orderAttack([unit], best);
  }
}

function marchTo(ctx: ReturnType<typeof setup>, target: { x: number; y: number }): void {
  const group = players(ctx.units);
  orderGroupMove(group, ctx.grid as WalkGrid, tileSize, target, spacing, MOVEMENT.lineOfSightMargin);
  markMarching(group, 'move');
}

describe('Mini-Mission von Start bis Ende (ohne Grafik)', () => {
  it('Dorf aufsuchen, Bauern rekrutieren, Posten stürmen und einnehmen → Sieg', () => {
    const ctx = setup();
    const startCount = players(ctx.units).length;

    // 1. March to the village and recruit.
    marchTo(ctx, siteCenter(village, tileSize));
    simulate(ctx, 90, () => players(ctx.units).every((u) => !isMoving(u)));
    const recruits = recruitAtVillage(ctx.state, village, ctx.units, ctx.grid, tileSize, spacing);
    expect(recruits).toHaveLength(village.recruits.count);
    ctx.units.push(...recruits);
    expect(players(ctx.units)).toHaveLength(startCount + village.recruits.count);

    // 2. Attack the post: every peasant attacks the nearest guard (right click on enemies).
    attackNearest(ctx.units);
    simulate(ctx, 180, () => enemies(ctx.units).length === 0 || ctx.state.outcome !== 'running');
    expect(ctx.state.outcome).toBe('running');
    expect(enemies(ctx.units)).toHaveLength(0);
    // Peasants paid a price but are not wiped out.
    expect(players(ctx.units).length).toBeGreaterThan(0);
    expect(players(ctx.units).length).toBeLessThan(startCount + village.recruits.count);

    // 3. Occupy the post until it is taken.
    marchTo(ctx, siteCenter(post, tileSize));
    simulate(ctx, 120, () => ctx.state.outcome !== 'running');
    expect(ctx.state.outcome).toBe('victory');
    expect(ctx.state.captureProgress).toBe(post.captureTime);
  });

  it('greift die Startgruppe ohne Verstärkung aus dem Dorf an, verliert sie → Niederlage', () => {
    const ctx = setup();
    attackNearest(ctx.units);
    // Like a player clicking again: idle peasants attack the nearest guard.
    simulate(ctx, 240, () => ctx.state.outcome !== 'running', () => attackNearest(ctx.units, true));
    expect(ctx.state.outcome).toBe('defeat');
    expect(players(ctx.units)).toHaveLength(0);
  });
});
