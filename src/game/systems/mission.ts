import type { SupplyConfig } from '../data/balance';
import type { MissionDefinition, PostDefinition, SiteDefinition, VillageDefinition } from '../data/missions';
import type { Point, Unit } from '../entities/Unit';
import { spawnUnits } from '../entities/UnitFactory';
import { clearGround, generateMap, type TileGrid } from '../map/mapGenerator';
import type { BattleOutcome } from './combat';
import { tileCenter, type WalkGrid } from './pathfinding';
import { addSupplies, buyFood, createSupplyState, feedableNewcomers, type SupplyState } from './supply';

/**
 * Mission rules of the mini mission (milestone 3a): placeholder recruitment
 * at villages, capturing the enemy post, victory and defeat; since milestone 4
 * also gold, food, buying food at villages and the victory reward. Pure logic
 * without Phaser, so it can be tested with Vitest.
 */
export interface MissionState {
  /** Volunteers each village still offers, by village id. */
  volunteers: Map<string, number>;
  /** Seconds of uncontested presence in the post zone collected so far. */
  captureProgress: number;
  outcome: BattleOutcome;
  /** Gold, food and day clock of the mission. */
  supply: SupplyState;
  /** Food each village can still sell, by village id. */
  foodStock: Map<string, number>;
  /** Whether the victory reward has been credited. */
  rewardClaimed: boolean;
}

export function createMissionState(mission: MissionDefinition): MissionState {
  const foodStock = new Map<string, number>();
  const volunteers = new Map<string, number>();
  for (const village of mission.villages) {
    volunteers.set(village.id, village.recruits.count);
    if (village.foodMarket) foodStock.set(village.id, village.foodMarket.stock);
  }
  return {
    volunteers,
    captureProgress: 0,
    outcome: 'running',
    supply: createSupplyState(mission.startSupplies),
    foodStock,
    rewardClaimed: false,
  };
}

/** Living player units, i.e. the army that has to be fed. */
export function armySize(units: readonly Unit[]): number {
  return units.filter((u) => u.faction === 'player' && u.hp > 0).length;
}

/** Map of the mission: the generated terrain with forest cleared around villages and the post. */
export function buildMissionTiles(mission: MissionDefinition): TileGrid {
  const tiles = generateMap(mission.map);
  for (const site of [...mission.villages, mission.post]) {
    clearGround(tiles, site.tileX, site.tileY, site.clearRadius);
  }
  return tiles;
}

/** Centre of a site in world pixels. */
export function siteCenter(site: SiteDefinition, tileSize: number): Point {
  return tileCenter({ x: site.tileX, y: site.tileY }, tileSize);
}

function within(unit: Unit, centre: Point, radius: number): boolean {
  return unit.hp > 0 && Math.hypot(unit.x - centre.x, unit.y - centre.y) <= radius;
}

function playerAtVillage(village: VillageDefinition, units: readonly Unit[], tileSize: number): boolean {
  const centre = siteCenter(village, tileSize);
  return units.some((u) => u.faction === 'player' && within(u, centre, village.recruitRadius));
}

/**
 * Why recruiting at a village works or not. `notEnoughFood`: the stores would not
 * last `lowSupplyDays` even with one more person (or the army is already going hungry).
 */
export type RecruitCheck = 'ok' | 'noVolunteersLeft' | 'noUnitNearby' | 'notEnoughFood';

/** Volunteers the village still offers. */
export function volunteersLeft(state: MissionState, village: VillageDefinition): number {
  return state.volunteers.get(village.id) ?? 0;
}

/** How many of the village's remaining volunteers the food can sustain right now. */
export function recruitableNow(
  state: MissionState,
  village: VillageDefinition,
  units: readonly Unit[],
  supplyConfig: SupplyConfig,
): number {
  return Math.min(volunteersLeft(state, village), feedableNewcomers(state.supply, armySize(units), supplyConfig));
}

export function checkRecruit(
  state: MissionState,
  village: VillageDefinition,
  units: readonly Unit[],
  tileSize: number,
  supplyConfig: SupplyConfig,
): RecruitCheck {
  if (volunteersLeft(state, village) <= 0) return 'noVolunteersLeft';
  if (!playerAtVillage(village, units, tileSize)) return 'noUnitNearby';
  if (recruitableNow(state, village, units, supplyConfig) < 1) return 'notEnoughFood';
  return 'ok';
}

/**
 * Placeholder recruitment: if allowed, as many of the village's remaining volunteers
 * join as the food can sustain (at most `maxCount`), standing next to the village.
 * The others stay available for later. Returns the new units (empty if refused).
 * New ids continue after the highest id in `units`, so they never collide.
 */
export function recruitAtVillage(
  state: MissionState,
  village: VillageDefinition,
  units: readonly Unit[],
  grid: WalkGrid,
  tileSize: number,
  spacing: number,
  supplyConfig: SupplyConfig,
  maxCount = Infinity,
): Unit[] {
  if (state.outcome !== 'running' || checkRecruit(state, village, units, tileSize, supplyConfig) !== 'ok') return [];
  const count = Math.min(recruitableNow(state, village, units, supplyConfig), maxCount);
  if (count < 1) return [];
  state.volunteers.set(village.id, volunteersLeft(state, village) - count);
  const firstId = units.reduce((max, u) => Math.max(max, u.id), 0) + 1;
  const spawn = { typeId: village.recruits.typeId, count, tileX: village.tileX, tileY: village.tileY };
  return spawnUnits(grid, tileSize, [spawn], spacing, firstId);
}

/** Why buying food at a village works or not. */
export type FoodPurchaseCheck = 'ok' | 'noMarket' | 'noUnitNearby' | 'soldOut' | 'notEnoughGold';

export function checkFoodPurchase(
  state: MissionState,
  village: VillageDefinition,
  units: readonly Unit[],
  tileSize: number,
): FoodPurchaseCheck {
  const market = village.foodMarket;
  if (!market) return 'noMarket';
  if (!playerAtVillage(village, units, tileSize)) return 'noUnitNearby';
  if ((state.foodStock.get(village.id) ?? 0) <= 0) return 'soldOut';
  if (state.supply.gold < market.price) return 'notEnoughGold';
  return 'ok';
}

/**
 * Buys one lot of food at the village (at most what is left in stock, at the full price).
 * Returns the food bought (0 if refused).
 */
export function buyFoodAtVillage(
  state: MissionState,
  village: VillageDefinition,
  units: readonly Unit[],
  tileSize: number,
): number {
  const market = village.foodMarket;
  if (!market || state.outcome !== 'running' || checkFoodPurchase(state, village, units, tileSize) !== 'ok') return 0;
  const stock = state.foodStock.get(village.id) ?? 0;
  const amount = Math.min(market.amount, stock);
  if (buyFood(state.supply, { amount, price: market.price }) !== 'ok') return 0;
  state.foodStock.set(village.id, stock - amount);
  return amount;
}

/** Credits the mission reward once after victory. Returns whether it was credited now. */
export function claimVictoryReward(state: MissionState, mission: MissionDefinition): boolean {
  if (state.outcome !== 'victory' || state.rewardClaimed) return false;
  state.rewardClaimed = true;
  addSupplies(state.supply, mission.reward);
  return true;
}

/** Who stands in the capture zone of the post. */
export function postPresence(
  post: PostDefinition,
  units: readonly Unit[],
  tileSize: number,
): { player: number; enemy: number } {
  const centre = siteCenter(post, tileSize);
  let player = 0;
  let enemy = 0;
  for (const unit of units) {
    if (!within(unit, centre, post.captureRadius)) continue;
    if (unit.faction === 'player') player++;
    else enemy++;
  }
  return { player, enemy };
}

/**
 * Advances the capture of the post by `dt` seconds and updates the outcome:
 * - player units in the zone and no enemy: progress grows,
 * - enemies in the zone (contested): progress pauses,
 * - no player unit in the zone: progress decays by `captureDecay` per second.
 * Defeat when no player unit is left (checked first), victory once progress reaches `captureTime`.
 */
export function stepMission(
  state: MissionState,
  post: PostDefinition,
  units: readonly Unit[],
  dt: number,
  tileSize: number,
): void {
  if (state.outcome !== 'running') return;
  if (!units.some((u) => u.faction === 'player' && u.hp > 0)) {
    state.outcome = 'defeat';
    return;
  }
  const { player, enemy } = postPresence(post, units, tileSize);
  if (player > 0 && enemy === 0) state.captureProgress += dt;
  else if (player === 0) state.captureProgress -= post.captureDecay * dt;
  state.captureProgress = Math.min(post.captureTime, Math.max(0, state.captureProgress));
  if (state.captureProgress >= post.captureTime) state.outcome = 'victory';
}
