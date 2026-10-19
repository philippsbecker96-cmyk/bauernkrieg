import type { GameSpecies, HuntingConfig, MissionHunting, StockLevel, StockRule } from '../data/hunting';
import { isMoving, stopUnit, type Point, type Unit } from '../entities/Unit';
import type { TileGrid } from '../map/mapGenerator';
import { createRandom } from '../map/random';
import { TileType } from '../map/tiles';
import { mainWeapon } from './combat';
import { orderGroupMove } from './formation';
import { tileCenter, type TilePoint, type WalkGrid } from './pathfinding';
import { addSupplies, type SupplyState } from './supply';

/**
 * Hunting (milestone 4a): connected forest tiles form forest regions, each with its own
 * game stock. Hunters walk to a region, hunt for a while, carry what they catch and
 * return to the band on their own; the food is only credited once they are back.
 * Pure logic without Phaser, so it can be tested with Vitest.
 *
 * Hunters have the order `hunt`: combat lets them defend themselves only where they
 * stand (and with a malus), and the player cannot give them other orders until they
 * are recalled or back.
 */
export interface ForestRegion {
  id: number;
  name: string;
  tiles: readonly TilePoint[];
  /** Middle of the region (tile coordinates, may be fractional). */
  centre: Point;
  /** Animals at mission start; regrowth never exceeds it. */
  maxStock: number;
  /** Animals left (fractional because of regrowth; whole animals can be caught). */
  stock: number;
  regrowthPerDay: number;
  /** Lord whose hunting ground this is, if any (poaching, milestone 6). */
  owner?: string;
}

export type HuntPhase = 'toForest' | 'hunting' | 'returning';

/** One hunter's trip. */
export interface HuntTask {
  unitId: number;
  forestId: number;
  phase: HuntPhase;
  /** Seconds of hunting left (counts down in the `hunting` phase). */
  timeLeft: number;
  /** Seconds collected towards the next catch attempt. */
  attemptTimer: number;
  /** Food the hunter carries. */
  carried: number;
  /** Animals caught, by species name. */
  caught: Map<string, number>;
  /** Seconds until the return route may be recomputed. */
  repathTimer: number;
  /** Game day the trip started (poaching record). */
  startDay: number;
}

/** A finished hunting trip, kept for the poaching consequences of milestone 6. */
export interface HuntRecord {
  forestId: number;
  owner?: string;
  startDay: number;
  /** Animals caught on the trip. */
  animals: number;
  /** Food caught on the trip. */
  food: number;
  /** `credited`: brought back to the band; `lost`: the hunter fell. */
  outcome: 'credited' | 'lost';
}

export interface HuntingState {
  forests: ForestRegion[];
  /** Forest region id per tile (`regionAt[y][x]`), -1 outside any hunting ground. */
  regionAt: number[][];
  /** Active trips by unit id. */
  hunts: Map<number, HuntTask>;
  log: HuntRecord[];
  /** Random source for catch attempts. */
  random: () => number;
}

/** Something that happened while hunting, for notices in the scene. */
export type HuntEvent =
  | { kind: 'catch'; unitId: number; forestId: number; species: string; food: number }
  | { kind: 'done'; unitId: number; forestId: number; reason: 'time' | 'full' | 'exhausted' }
  | { kind: 'credited'; unitId: number; forestId: number; food: number; animals: number }
  | { kind: 'lost'; unitId: number; forestId: number; food: number };

/**
 * Groups connected (4-neighbourhood) forest tiles into regions. Regions smaller than
 * `minTiles` are dropped. Order and tile order are deterministic (row by row).
 */
export function findForestRegions(tiles: TileGrid, minTiles: number): TilePoint[][] {
  const seen = tiles.map((row) => row.map(() => false));
  const regions: TilePoint[][] = [];
  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[y]!.length; x++) {
      if (seen[y]![x] || tiles[y]![x] !== TileType.Forest) continue;
      const region: TilePoint[] = [];
      const queue: TilePoint[] = [{ x, y }];
      seen[y]![x] = true;
      while (queue.length > 0) {
        const tile = queue.shift()!;
        region.push(tile);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = tile.x + dx;
          const ny = tile.y + dy;
          if (tiles[ny]?.[nx] !== TileType.Forest || seen[ny]![nx]) continue;
          seen[ny]![nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
      if (region.length >= minTiles) {
        region.sort((a, b) => a.y - b.y || a.x - b.x);
        regions.push(region);
      }
    }
  }
  return regions;
}

/** Starting stock of a region with `tileCount` tiles under `rule` (whole animals, at least 0). */
export function initialStock(rule: StockRule, tileCount: number, random: () => number): number {
  const base = rule.mode === 'fixed' ? rule.value : rule.value * tileCount;
  const scatter = rule.spread > 0 ? 1 + rule.spread * (random() * 2 - 1) : 1;
  return Math.max(0, Math.round(base * scatter));
}

/**
 * Builds the forest regions of a map with their stock. Mission overrides can rename
 * regions, set their stock, regrowth and owner; `seed` drives the stock spread.
 */
export function createHuntingState(
  tiles: TileGrid,
  config: HuntingConfig,
  seed: number,
  mission: MissionHunting = {},
): HuntingState {
  const random = createRandom(seed);
  const rule = mission.stockRule ?? config.stockRule;
  const regionAt = tiles.map((row) => row.map(() => -1));
  const forests = findForestRegions(tiles, config.minForestTiles).map((regionTiles, id): ForestRegion => {
    for (const t of regionTiles) regionAt[t.y]![t.x] = id;
    const stock = initialStock(rule, regionTiles.length, random);
    return {
      id,
      name: `Waldstück ${id + 1}`,
      tiles: regionTiles,
      centre: {
        x: regionTiles.reduce((s, t) => s + t.x, 0) / regionTiles.length,
        y: regionTiles.reduce((s, t) => s + t.y, 0) / regionTiles.length,
      },
      maxStock: stock,
      stock,
      regrowthPerDay: mission.regrowthPerDay ?? config.regrowthPerDay,
    };
  });
  for (const override of mission.forests ?? []) {
    const forest = forests[regionAt[override.tileY]?.[override.tileX] ?? -1];
    if (!forest) continue;
    if (override.name !== undefined) forest.name = override.name;
    if (override.stock !== undefined) forest.maxStock = forest.stock = override.stock;
    if (override.regrowthPerDay !== undefined) forest.regrowthPerDay = override.regrowthPerDay;
    if (override.owner !== undefined) forest.owner = override.owner;
  }
  return { forests, regionAt, hunts: new Map(), log: [], random: createRandom(seed ^ 0x5eed) };
}

/** Hunting ground at a tile, if any. */
export function forestAt(state: HuntingState, tileX: number, tileY: number): ForestRegion | undefined {
  return state.forests[state.regionAt[tileY]?.[tileX] ?? -1];
}

export function stockLevel(forest: ForestRegion, config: HuntingConfig): StockLevel {
  if (forest.stock < 1) return 'exhausted';
  return forest.stock >= forest.maxStock * config.richShare ? 'rich' : 'moderate';
}

export const STOCK_LEVEL_NAMES: Record<StockLevel, string> = {
  rich: 'reich an Wild',
  moderate: 'mäßig Wild',
  exhausted: 'erschöpft',
};

/** Picks a species by weight; `roll` in [0, 1). */
export function pickSpecies(species: readonly GameSpecies[], roll: number): GameSpecies | undefined {
  const total = species.reduce((s, sp) => s + sp.weight, 0);
  let left = roll * total;
  for (const sp of species) {
    left -= sp.weight;
    if (left < 0) return sp;
  }
  return species[species.length - 1];
}

/**
 * One catch attempt of `hunter` in `forest`: picks a species by weight, then the
 * hunter's weapon decides whether it is caught. A catch removes one animal from the
 * stock. Returns the species caught, or `undefined`.
 */
export function attemptCatch(
  hunter: Unit,
  forest: ForestRegion,
  config: HuntingConfig,
  random: () => number,
): GameSpecies | undefined {
  if (forest.stock < 1) return undefined;
  const species = pickSpecies(config.species, random());
  if (!species) return undefined;
  const chance = config.catchChance[mainWeapon(hunter).weaponClass] * (1 - species.difficulty);
  if (random() >= chance) return undefined;
  forest.stock -= 1;
  return species;
}

/** Units that are on a hunting trip. */
export function isHunting(unit: Unit): boolean {
  return unit.order === 'hunt';
}

/**
 * Sends `units` (living player units not already hunting) to hunt in `forest`; they
 * walk to `target` as a group. Returns the units that set off.
 */
export function orderHunt(
  state: HuntingState,
  units: readonly Unit[],
  forest: ForestRegion,
  target: Point,
  grid: WalkGrid,
  tileSize: number,
  spacing: number,
  margin: number,
  config: HuntingConfig,
  day: number,
): Unit[] {
  const hunters = units.filter((u) => u.faction === 'player' && u.hp > 0 && !isHunting(u));
  if (hunters.length === 0) return [];
  orderGroupMove(hunters, grid, tileSize, target, spacing, margin);
  for (const unit of hunters) {
    unit.order = 'hunt';
    unit.targetId = null;
    unit.lastAttackerId = null;
    state.hunts.set(unit.id, {
      unitId: unit.id,
      forestId: forest.id,
      phase: 'toForest',
      timeLeft: config.huntDuration,
      attemptTimer: 0,
      carried: 0,
      caught: new Map(),
      repathTimer: 0,
      startDay: day,
    });
  }
  return hunters;
}

/** Hunters among `units` break off and return with what they carry. Returns how many were recalled. */
export function recallHunters(state: HuntingState, units: readonly Unit[]): number {
  let count = 0;
  for (const unit of units) {
    const task = state.hunts.get(unit.id);
    if (!task || task.phase === 'returning') continue;
    startReturn(unit, task);
    count++;
  }
  return count;
}

function startReturn(unit: Unit, task: HuntTask): void {
  task.phase = 'returning';
  task.repathTimer = 0;
  stopUnit(unit);
}

/** Living player units that are not hunting: the band the hunters return to. */
function band(units: readonly Unit[]): Unit[] {
  return units.filter((u) => u.faction === 'player' && u.hp > 0 && !isHunting(u));
}

function nearest(from: Point, points: readonly Point[]): Point | undefined {
  let best: Point | undefined;
  let bestDistance = Infinity;
  for (const p of points) {
    const d = Math.hypot(p.x - from.x, p.y - from.y);
    if (d < bestDistance) {
      best = p;
      bestDistance = d;
    }
  }
  return best;
}

function animalCount(task: HuntTask): number {
  let n = 0;
  for (const count of task.caught.values()) n += count;
  return n;
}

export interface HuntingContext {
  grid: WalkGrid;
  tileSize: number;
  spacing: number;
  margin: number;
  /** Where hunters return to if no unit of the band is left (the rally point). */
  fallback: Point;
  /** Gold and food the carried food is credited to. */
  supply: SupplyState;
  secondsPerDay: number;
  day: number;
}

/**
 * Advances hunting by `dt` seconds: regrowth, arrival in the forest, catch attempts,
 * the return to the band and crediting the food. Run after `stepCombat` and
 * `stepMovement`; hunters whose unit is gone (fallen) lose what they carried.
 */
export function stepHunting(
  state: HuntingState,
  units: readonly Unit[],
  dt: number,
  config: HuntingConfig,
  ctx: HuntingContext,
): HuntEvent[] {
  const events: HuntEvent[] = [];
  for (const forest of state.forests) {
    forest.stock = Math.min(forest.maxStock, forest.stock + (forest.regrowthPerDay * dt) / ctx.secondsPerDay);
  }
  const byId = new Map(units.map((u) => [u.id, u]));
  const finish = (task: HuntTask, outcome: HuntRecord['outcome']) => {
    state.hunts.delete(task.unitId);
    const forest = state.forests[task.forestId];
    state.log.push({
      forestId: task.forestId,
      owner: forest?.owner,
      startDay: task.startDay,
      animals: animalCount(task),
      food: task.carried,
      outcome,
    });
  };

  for (const task of [...state.hunts.values()]) {
    const unit = byId.get(task.unitId);
    if (!unit || unit.hp <= 0) {
      finish(task, 'lost');
      events.push({ kind: 'lost', unitId: task.unitId, forestId: task.forestId, food: task.carried });
      continue;
    }
    const forest = state.forests[task.forestId]!;

    if (task.phase === 'toForest') {
      if (!isMoving(unit)) task.phase = 'hunting';
      else continue;
    }

    if (task.phase === 'hunting') {
      task.timeLeft -= dt;
      task.attemptTimer += dt;
      while (task.attemptTimer >= config.attemptInterval && task.carried < config.carryCapacity) {
        task.attemptTimer -= config.attemptInterval;
        const species = attemptCatch(unit, forest, config, state.random);
        if (!species) continue;
        task.carried = Math.min(config.carryCapacity, task.carried + species.food);
        task.caught.set(species.name, (task.caught.get(species.name) ?? 0) + 1);
        events.push({ kind: 'catch', unitId: unit.id, forestId: forest.id, species: species.name, food: species.food });
      }
      const reason =
        task.carried >= config.carryCapacity ? 'full' : forest.stock < 1 ? 'exhausted' : task.timeLeft <= 0 ? 'time' : null;
      if (!reason) continue;
      events.push({ kind: 'done', unitId: unit.id, forestId: forest.id, reason });
      startReturn(unit, task);
    }

    // Returning: credit once near the band, otherwise keep walking towards its nearest unit.
    const others = band(units);
    const home = nearest(unit, others) ?? ctx.fallback;
    if (Math.hypot(home.x - unit.x, home.y - unit.y) <= config.returnRadius) {
      addSupplies(ctx.supply, { gold: 0, food: task.carried });
      events.push({ kind: 'credited', unitId: unit.id, forestId: forest.id, food: task.carried, animals: animalCount(task) });
      finish(task, 'credited');
      stopUnit(unit);
      unit.order = 'idle';
      unit.home = { x: unit.x, y: unit.y };
      continue;
    }
    task.repathTimer -= dt;
    if (task.repathTimer <= 0) {
      task.repathTimer = config.returnRepathInterval;
      orderGroupMove([unit], ctx.grid, ctx.tileSize, home, ctx.spacing, ctx.margin);
    }
  }
  return events;
}

/** Food all hunters carry right now. */
export function carriedFood(state: HuntingState): number {
  let food = 0;
  for (const task of state.hunts.values()) food += task.carried;
  return food;
}

/** World centre of a forest region (for labels). */
export function forestCentre(forest: ForestRegion, tileSize: number): Point {
  return tileCenter({ x: forest.centre.x, y: forest.centre.y }, tileSize);
}
