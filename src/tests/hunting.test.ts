import { describe, expect, it } from 'vitest';
import { COMBAT } from '../game/data/combat';
import { HUNTING, type HuntingConfig } from '../game/data/hunting';
import { MINI_MISSION } from '../game/data/missions';
import { MOVEMENT } from '../game/data/movement';
import { createUnit, isMoving, type Unit } from '../game/entities/Unit';
import type { TileGrid } from '../game/map/mapGenerator';
import { createRandom } from '../game/map/random';
import { TileType } from '../game/map/tiles';
import { orderAttack, stepCombat, type CombatConfig } from '../game/systems/combat';
import {
  attemptCatch,
  createHuntingState,
  findForestRegions,
  forestAt,
  initialStock,
  orderHunt,
  pickSpecies,
  recallHunters,
  stepHunting,
  stockLevel,
  type ForestRegion,
  type HuntEvent,
  type HuntingContext,
  type HuntingState,
} from '../game/systems/hunting';
import { buildMissionTiles } from '../game/systems/mission';
import { stepMovement, type MovementConfig } from '../game/systems/movement';
import { buildWalkGrid, tileCenter } from '../game/systems/pathfinding';
import { createSupplyState } from '../game/systems/supply';

const tileSize = 32;
const G = TileType.Grass;
const F = TileType.Forest;

/** 24×10 grass map with a 4×3 forest (x 14–17, y 2–4) and a lone 2-tile copse at the bottom left. */
function testTiles(): TileGrid {
  const tiles: TileGrid = Array.from({ length: 10 }, () => Array.from({ length: 24 }, (): TileType => G));
  for (let y = 2; y <= 4; y++) for (let x = 14; x <= 17; x++) tiles[y]![x] = F;
  tiles[8]![1] = F;
  tiles[8]![2] = F;
  return tiles;
}

/** Deterministic config: fixed stock, no randomness in the stock, no regrowth. */
const config: HuntingConfig = {
  ...HUNTING,
  stockRule: { mode: 'fixed', value: 10, spread: 0 },
  regrowthPerDay: 0,
  minForestTiles: 4,
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

function setup(cfg: HuntingConfig = config, seed = 3) {
  const tiles = testTiles();
  const grid = buildWalkGrid(tiles);
  const state = createHuntingState(tiles, cfg, seed);
  const supply = createSupplyState({ gold: 0, food: 0 });
  const ctx: HuntingContext = {
    grid,
    tileSize,
    spacing: MOVEMENT.formationSpacing,
    margin: MOVEMENT.lineOfSightMargin,
    fallback: tileCenter({ x: 1, y: 1 }, tileSize),
    supply,
    secondsPerDay: 60,
    day: 1,
  };
  const forest = state.forests[0]!;
  const forestPoint = tileCenter({ x: 15, y: 3 }, tileSize);
  return { tiles, grid, state, supply, ctx, forest, forestPoint };
}

/** Band unit standing at tile (3, 3), far from the forest. */
const bandAt = (id: number) => createUnit(id, 'peasant', ...pos(3, 3));
function pos(tx: number, ty: number): [number, number] {
  const c = tileCenter({ x: tx, y: ty }, tileSize);
  return [c.x, c.y];
}

/** Runs movement and hunting like the scene (1/30 s steps); returns all hunting events. */
function run(
  s: { state: HuntingState; grid: ReturnType<typeof buildWalkGrid>; ctx: HuntingContext },
  units: Unit[],
  seconds: number,
  cfg: HuntingConfig = config,
): HuntEvent[] {
  const events: HuntEvent[] = [];
  const dt = 1 / 30;
  for (let t = 0; t < seconds; t += dt) {
    stepMovement(units, s.grid, dt, movementConfig);
    events.push(...stepHunting(s.state, units, dt, cfg, s.ctx));
  }
  return events;
}

describe('Waldgebiete', () => {
  it('zusammenhängende Waldkacheln bilden ein Gebiet, zu kleine Wäldchen zählen nicht', () => {
    const regions = findForestRegions(testTiles(), 4);
    expect(regions).toHaveLength(1);
    expect(regions[0]).toHaveLength(12);
    expect(findForestRegions(testTiles(), 2)).toHaveLength(2);
  });

  it('jede Waldkachel gehört zu ihrem Gebiet, Wiese zu keinem', () => {
    const { state, forest } = setup();
    expect(forestAt(state, 15, 3)).toBe(forest);
    expect(forestAt(state, 17, 4)).toBe(forest);
    expect(forestAt(state, 5, 5)).toBeUndefined();
    expect(forestAt(state, 1, 8)).toBeUndefined();
  });

  it('die Mini-Mission hat benannte Waldgebiete; der Herrenwald gehört einem Herrn', () => {
    const tiles = buildMissionTiles(MINI_MISSION);
    const state = createHuntingState(tiles, HUNTING, MINI_MISSION.map.seed, MINI_MISSION.hunting);
    expect(state.forests.length).toBeGreaterThanOrEqual(3);
    const herrenwald = forestAt(state, 33, 14)!;
    expect(herrenwald.name).toBe('Herrenwald');
    expect(herrenwald.stock).toBe(16);
    expect(herrenwald.owner).toBeDefined();
    expect(forestAt(state, 9, 13)?.name).toBe('Krähenholz');
  });
});

describe('Wildbestand (Bestandsregel, Zufall, Überschreiben)', () => {
  const random = createRandom(1);

  it('fester Wert oder Tiere pro Waldkachel', () => {
    expect(initialStock({ mode: 'fixed', value: 7, spread: 0 }, 50, random)).toBe(7);
    expect(initialStock({ mode: 'perTile', value: 1.5, spread: 0 }, 12, random)).toBe(18);
  });

  it('Zufallsstreuung bleibt in ±spread und ist über den Seed reproduzierbar', () => {
    const rule = { mode: 'perTile' as const, value: 1, spread: 0.5 };
    const a = Array.from({ length: 50 }, ((r) => () => initialStock(rule, 20, r))(createRandom(9)));
    const b = Array.from({ length: 50 }, ((r) => () => initialStock(rule, 20, r))(createRandom(9)));
    expect(a).toEqual(b);
    for (const v of a) {
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(30);
    }
    expect(new Set(a).size).toBeGreaterThan(1);
  });

  it('Missionsdaten überschreiben Regel und einzelne Waldgebiete', () => {
    const tiles = testTiles();
    const state = createHuntingState(tiles, config, 1, {
      stockRule: { mode: 'perTile', value: 2, spread: 0 },
      regrowthPerDay: 3,
    });
    expect(state.forests[0]!.stock).toBe(24);
    expect(state.forests[0]!.regrowthPerDay).toBe(3);
    const named = createHuntingState(tiles, config, 1, {
      forests: [{ tileX: 16, tileY: 2, name: 'Bannwald', stock: 4, regrowthPerDay: 0, owner: 'Graf' }],
    });
    expect(named.forests[0]).toMatchObject({ name: 'Bannwald', stock: 4, maxStock: 4, owner: 'Graf' });
  });

  it('neue Wildarten wirken allein über die Daten', () => {
    const species = [
      { id: 'a', name: 'A', food: 1, weight: 1, difficulty: 0 },
      { id: 'b', name: 'B', food: 1, weight: 3, difficulty: 0 },
    ];
    expect(pickSpecies(species, 0.2)?.id).toBe('a');
    expect(pickSpecies(species, 0.3)?.id).toBe('b');
    const { forest } = setup();
    const hunter = createUnit(1, 'crossbowman', 0, 0);
    const only = { ...config, species: [{ id: 'bear', name: 'Bär', food: 30, weight: 1, difficulty: 0 }] };
    expect(attemptCatch(hunter, forest, only, () => 0)?.name).toBe('Bär');
  });
});

describe('Ertrag nach Waffe und Erschöpfung', () => {
  /** Food from `attempts` catch attempts with an unlimited forest. */
  function yieldOf(typeId: 'crossbowman' | 'peasant', attempts: number): number {
    const hunter = createUnit(1, typeId, 0, 0);
    const forest: ForestRegion = {
      id: 0, name: 'x', tiles: [], centre: { x: 0, y: 0 }, maxStock: 1e9, stock: 1e9, regrowthPerDay: 0,
    };
    const random = createRandom(42);
    let food = 0;
    for (let i = 0; i < attempts; i++) food += attemptCatch(hunter, forest, config, random)?.food ?? 0;
    return food;
  }

  it('Armbrustschützen bringen spürbar mehr Nahrung als Bauern mit improvisierten Waffen', () => {
    const crossbow = yieldOf('crossbowman', 2000);
    const peasant = yieldOf('peasant', 2000);
    expect(crossbow).toBeGreaterThan(peasant * 4);
  });

  it('jeder Fang senkt den Bestand; ein erschöpfter Wald liefert nichts mehr', () => {
    const { forest } = setup();
    const hunter = createUnit(1, 'crossbowman', 0, 0);
    let caught = 0;
    for (let i = 0; i < 500; i++) if (attemptCatch(hunter, forest, config, createRandom(i))) caught++;
    expect(caught).toBe(10);
    expect(forest.stock).toBe(0);
    expect(stockLevel(forest, config)).toBe('exhausted');
    expect(attemptCatch(hunter, forest, config, () => 0)).toBeUndefined();
  });

  it('grober Bestand: reich, mäßig, erschöpft', () => {
    const { forest } = setup();
    expect(stockLevel(forest, config)).toBe('rich');
    forest.stock = 3;
    expect(stockLevel(forest, config)).toBe('moderate');
    forest.stock = 0.5;
    expect(stockLevel(forest, config)).toBe('exhausted');
  });
});

describe('Nachwachsen', () => {
  it('Bestand wächst pro Spieltag nach, aber nie über den Startbestand', () => {
    const cfg = { ...config, regrowthPerDay: 2 };
    const s = setup(cfg);
    s.forest.stock = 5;
    run(s, [], 60, cfg);
    expect(s.forest.stock).toBeCloseTo(7, 1);
    run(s, [], 600, cfg);
    expect(s.forest.stock).toBe(10);
  });

  it('Nachwachsen 0: ein erschöpfter Wald bleibt erschöpft', () => {
    const s = setup();
    s.forest.stock = 0;
    run(s, [], 600);
    expect(s.forest.stock).toBe(0);
  });
});

describe('Jagdgruppe: losschicken, jagen, zurückkehren, gutschreiben', () => {
  it('Jäger laufen hin, jagen, kehren selbst zum Haufen zurück; Nahrung erst bei Rückkehr', () => {
    const s = setup();
    const band = bandAt(1);
    const hunter = createUnit(2, 'crossbowman', ...pos(4, 3));
    const units = [band, hunter];
    orderHunt(s.state, [hunter], s.forest, s.forestPoint, s.grid, tileSize, 18, 6, config, 1);
    expect(hunter.order).toBe('hunt');
    expect(isMoving(hunter)).toBe(true);

    // Until the hunters are back, nothing is credited, even if they already carry food.
    let carriedSeen = 0;
    const events: HuntEvent[] = [];
    for (let t = 0; t < 120 && s.state.hunts.size > 0; t += 1 / 30) {
      stepMovement(units, s.grid, 1 / 30, movementConfig);
      events.push(...stepHunting(s.state, units, 1 / 30, config, s.ctx));
      const task = s.state.hunts.get(hunter.id);
      if (task) {
        carriedSeen = Math.max(carriedSeen, task.carried);
        expect(s.supply.food).toBe(0);
      }
    }
    expect(s.state.hunts.size).toBe(0);
    const credited = events.find((e) => e.kind === 'credited');
    expect(credited).toBeDefined();
    expect(credited && credited.kind === 'credited' && credited.food).toBe(carriedSeen);
    expect(s.supply.food).toBe(carriedSeen);
    expect(carriedSeen).toBeGreaterThan(0);
    expect(hunter.order).toBe('idle');
    expect(Math.hypot(hunter.x - band.x, hunter.y - band.y)).toBeLessThanOrEqual(config.returnRadius);
    expect(s.state.log).toEqual([
      { forestId: 0, owner: undefined, startDay: 1, animals: expect.any(Number), food: carriedSeen, outcome: 'credited' },
    ]);
  });

  it('Jäger folgen dem Haufen, wenn er weitergezogen ist', () => {
    const s = setup();
    const band = bandAt(1);
    const hunter = createUnit(2, 'crossbowman', ...pos(15, 3));
    orderHunt(s.state, [hunter], s.forest, s.forestPoint, s.grid, tileSize, 18, 6, config, 1);
    recallHunters(s.state, [hunter]);
    [band.x, band.y] = pos(10, 8);
    run(s, [band, hunter], 30);
    expect(s.state.hunts.size).toBe(0);
    expect(Math.hypot(hunter.x - band.x, hunter.y - band.y)).toBeLessThanOrEqual(config.returnRadius);
  });

  it('Zurückrufen: Jäger bringen nur das bis dahin Erlegte mit', () => {
    const s = setup();
    const band = bandAt(1);
    const hunter = createUnit(2, 'crossbowman', ...pos(15, 3));
    orderHunt(s.state, [hunter], s.forest, s.forestPoint, s.grid, tileSize, 18, 6, config, 1);
    // Recalled before the first catch attempt: nothing to bring.
    run(s, [band, hunter], config.attemptInterval / 2);
    expect(recallHunters(s.state, [hunter])).toBe(1);
    const events = run(s, [band, hunter], 30);
    expect(events.filter((e) => e.kind === 'catch')).toHaveLength(0);
    expect(events.find((e) => e.kind === 'credited')).toMatchObject({ food: 0 });
    expect(s.supply.food).toBe(0);
  });

  it('ein gefallener Jäger bringt nichts, sein Anteil ist verloren', () => {
    const s = setup();
    const band = bandAt(1);
    const hunter = createUnit(2, 'crossbowman', ...pos(15, 3));
    const units = [band, hunter];
    orderHunt(s.state, [hunter], s.forest, s.forestPoint, s.grid, tileSize, 18, 6, config, 1);
    run(s, units, 20);
    const carried = s.state.hunts.get(hunter.id)!.carried;
    expect(carried).toBeGreaterThan(0);
    units.splice(units.indexOf(hunter), 1); // fallen: removed by combat
    const events = run(s, units, 1);
    expect(events).toContainEqual({ kind: 'lost', unitId: 2, forestId: 0, food: carried });
    expect(s.supply.food).toBe(0);
    expect(s.state.log[0]).toMatchObject({ outcome: 'lost', food: carried });
  });

  it('ohne verbliebenen Haufen kehren Jäger zum Sammelpunkt zurück', () => {
    const s = setup();
    const hunter = createUnit(2, 'crossbowman', ...pos(15, 3));
    orderHunt(s.state, [hunter], s.forest, s.forestPoint, s.grid, tileSize, 18, 6, config, 1);
    run(s, [hunter], 90);
    expect(s.state.hunts.size).toBe(0);
    expect(Math.hypot(hunter.x - s.ctx.fallback.x, hunter.y - s.ctx.fallback.y)).toBeLessThanOrEqual(
      config.returnRadius,
    );
  });

  it('volle Traglast oder erschöpfter Wald beenden die Jagd vorzeitig', () => {
    const s = setup({ ...config, carryCapacity: 2 });
    const hunter = createUnit(2, 'crossbowman', ...pos(15, 3));
    orderHunt(s.state, [hunter], s.forest, s.forestPoint, s.grid, tileSize, 18, 6, config, 1);
    const events = run(s, [bandAt(1), hunter], config.huntDuration, { ...config, carryCapacity: 2 });
    expect(events.find((e) => e.kind === 'done')).toMatchObject({ reason: 'full' });

    const t = setup();
    t.forest.stock = 0;
    const other = createUnit(3, 'crossbowman', ...pos(15, 3));
    orderHunt(t.state, [other], t.forest, t.forestPoint, t.grid, tileSize, 18, 6, config, 1);
    expect(run(t, [bandAt(1), other], 2).find((e) => e.kind === 'done')).toMatchObject({ reason: 'exhausted' });
  });
});

describe('Jäger im Kampf', () => {
  const combatConfig: CombatConfig = {
    tileSize,
    ...COMBAT,
    lineOfSightMargin: MOVEMENT.lineOfSightMargin,
    hunterDamageTaken: config.damageTakenFactor,
    random: () => 0,
  };

  it('Jäger nehmen keine Angriffsbefehle an', () => {
    const s = setup();
    const hunter = createUnit(2, 'peasant', ...pos(15, 3));
    const other = createUnit(3, 'peasant', ...pos(14, 6));
    const enemy = createUnit(9, 'guard', ...pos(20, 6));
    orderHunt(s.state, [hunter], s.forest, s.forestPoint, s.grid, tileSize, 18, 6, config, 1);
    orderAttack([hunter, other], enemy);
    expect(hunter.order).toBe('hunt');
    expect(hunter.targetId).toBeNull();
    expect(other.order).toBe('attack');
  });

  it('Jäger sind angreifbar und erleiden mehr Schaden; sie wehren sich nur auf der Stelle', () => {
    const s = setup();
    const [x, y] = pos(15, 3);
    const hunter = createUnit(2, 'peasant', x, y);
    const normal = createUnit(3, 'peasant', x, y + 200);
    const guardA = createUnit(8, 'guard', x + 20, y);
    const guardB = createUnit(9, 'guard', x + 20, y + 200);
    orderHunt(s.state, [hunter], s.forest, { x, y }, s.grid, tileSize, 18, 6, config, 1);
    run(s, [hunter], 0.5); // arrives and starts hunting
    expect(s.state.hunts.get(hunter.id)?.phase).toBe('hunting');
    const units = [hunter, normal, guardA, guardB];
    orderAttack([guardA], hunter);
    orderAttack([guardB], normal);
    const grid = buildWalkGrid(s.tiles);
    for (let i = 0; i < 2; i++) stepCombat(units, grid, 1 / 30, combatConfig);
    const lostHunter = hunter.maxHp - hunter.hp;
    const lostNormal = normal.maxHp - normal.hp;
    expect(lostNormal).toBeGreaterThan(0);
    expect(lostHunter).toBeCloseTo(lostNormal * config.damageTakenFactor, 5);
    // The hunter stays on its hunting order and does not chase the guard.
    expect(hunter.order).toBe('hunt');
    expect(isMoving(hunter)).toBe(false);
  });
});
