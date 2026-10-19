import type { MissionDefinition, PostDefinition, SiteDefinition, VillageDefinition } from '../data/missions';
import type { Point, Unit } from '../entities/Unit';
import { spawnUnits } from '../entities/UnitFactory';
import { clearGround, generateMap, type TileGrid } from '../map/mapGenerator';
import type { BattleOutcome } from './combat';
import { tileCenter, type WalkGrid } from './pathfinding';

/**
 * Mission rules of the mini mission (milestone 3a): placeholder recruitment
 * at villages, capturing the enemy post, victory and defeat. Pure logic
 * without Phaser, so it can be tested with Vitest.
 */
export interface MissionState {
  /** Ids of villages whose volunteers have already joined. */
  recruitedVillages: Set<string>;
  /** Seconds of uncontested presence in the post zone collected so far. */
  captureProgress: number;
  outcome: BattleOutcome;
}

export function createMissionState(): MissionState {
  return { recruitedVillages: new Set(), captureProgress: 0, outcome: 'running' };
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

/** Why recruiting at a village works or not. */
export type RecruitCheck = 'ok' | 'alreadyRecruited' | 'noUnitNearby';

export function checkRecruit(
  state: MissionState,
  village: VillageDefinition,
  units: readonly Unit[],
  tileSize: number,
): RecruitCheck {
  if (state.recruitedVillages.has(village.id)) return 'alreadyRecruited';
  const centre = siteCenter(village, tileSize);
  const present = units.some((u) => u.faction === 'player' && within(u, centre, village.recruitRadius));
  return present ? 'ok' : 'noUnitNearby';
}

/**
 * Placeholder recruitment: if allowed, the village's fixed number of volunteers
 * join once, standing next to the village. Returns the new units (empty if refused).
 * New ids continue after the highest id in `units`, so they never collide.
 */
export function recruitAtVillage(
  state: MissionState,
  village: VillageDefinition,
  units: readonly Unit[],
  grid: WalkGrid,
  tileSize: number,
  spacing: number,
): Unit[] {
  if (state.outcome !== 'running' || checkRecruit(state, village, units, tileSize) !== 'ok') return [];
  state.recruitedVillages.add(village.id);
  const firstId = units.reduce((max, u) => Math.max(max, u.id), 0) + 1;
  const spawn = { ...village.recruits, tileX: village.tileX, tileY: village.tileY };
  return spawnUnits(grid, tileSize, [spawn], spacing, firstId);
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
