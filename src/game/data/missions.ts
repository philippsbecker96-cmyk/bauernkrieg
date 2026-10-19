import type { MapConfig } from './maps';
import type { UnitGroupSpawn } from './testScenario';

/**
 * Mission definitions (milestone 3a: the mini mission). Positions are in tiles.
 * Each later milestone builds its system into this mission (IMPLEMENTATION_PLAN.md, principle 8).
 */

/** A place on the map; the ground within `clearRadius` tiles is cleared of forest. */
export interface SiteDefinition {
  id: string;
  name: string;
  tileX: number;
  tileY: number;
  /** Radius (tiles) around the site turned into open ground when the map is built. */
  clearRadius: number;
}

/**
 * Village with placeholder recruitment: when a player unit stands within
 * `recruitRadius` and the player clicks the village, `recruits` join once.
 * Replaced by the real recruitment (support, supply) in milestone 5.
 */
export interface VillageDefinition extends SiteDefinition {
  /** Radius (px) around the village centre a player unit must be in to recruit. */
  recruitRadius: number;
  recruits: Omit<UnitGroupSpawn, 'tileX' | 'tileY'>;
}

/**
 * Enemy post: captured once player units hold the zone (`captureRadius` px)
 * without any enemy inside it for `captureTime` seconds in total.
 */
export interface PostDefinition extends SiteDefinition {
  captureRadius: number;
  /** Seconds of uncontested presence needed to take the post. */
  captureTime: number;
  /** Progress lost per second while no player unit is in the zone (seconds of progress per second). */
  captureDecay: number;
  garrison: readonly UnitGroupSpawn[];
}

export interface MissionDefinition {
  id: string;
  name: string;
  /** Short task description shown in the UI. */
  briefing: string;
  map: MapConfig;
  startArmy: readonly UnitGroupSpawn[];
  /** Initial rally point for the retreat order (tiles). */
  rallyPoint: { tileX: number; tileY: number };
  villages: readonly VillageDefinition[];
  post: PostDefinition;
}

export const MINI_MISSION_MAP: MapConfig = {
  id: 'mini-mission',
  name: 'Am Mühlbach',
  width: 40,
  height: 30,
  tileSize: 32,
  seed: 1524,
  forestDensity: 0.15,
};

export const MINI_MISSION: MissionDefinition = {
  id: 'mini-mission',
  name: 'Der erste Haufen (Mini-Mission)',
  briefing: 'Nimm den Posten der Wachen östlich des Bachs ein.',
  map: MINI_MISSION_MAP,
  // A small band of peasants on the road at the west edge.
  startArmy: [{ typeId: 'peasant', count: 6, tileX: 4, tileY: 15 }],
  rallyPoint: { tileX: 2, tileY: 15 },
  villages: [
    {
      id: 'dorf-sued',
      name: 'Dorf Hohenweiler',
      // South-west of the start, off the road and away from the UI panels in the top-left corner.
      tileX: 14,
      tileY: 25,
      clearRadius: 2,
      recruitRadius: 80,
      recruits: { typeId: 'peasant', count: 6 },
    },
  ],
  post: {
    id: 'posten',
    name: 'Wachposten',
    tileX: 32,
    tileY: 20,
    clearRadius: 3,
    captureRadius: 80,
    captureTime: 5,
    captureDecay: 1,
    garrison: [
      { typeId: 'guard', count: 4, tileX: 32, tileY: 20 },
      { typeId: 'guardCrossbowman', count: 1, tileX: 34, tileY: 20 },
    ],
  },
};
