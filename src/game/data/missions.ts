import type { MissionHunting } from './hunting';
import type { MapConfig } from './maps';
import type { FoodOffer, Supplies } from '../systems/supply';
import type { UnitGroupSpawn } from './testScenario';
import type { UnitTypeId } from './units';

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

/** `village`: houses, volunteers and food; `tavern`: a gathering place where mercenaries wait (GDD 10). */
export type PlaceKind = 'village' | 'tavern';

/**
 * Interactive place of a mission (milestone 5): villages and gathering places such as taverns.
 * A player unit within `recruitRadius` lets the player recruit volunteers (free), hire
 * Landsknechte (gold) or buy food, depending on what the place offers.
 */
export interface VillageDefinition extends SiteDefinition {
  /** Defaults to `village`; only changes the drawing and the texts. */
  kind?: PlaceKind;
  /** Radius (px) around the centre a player unit must be in to recruit, hire or buy. */
  recruitRadius: number;
  /**
   * Local support 0–100 (milestone 5: fixed per mission; it changes from milestone 6 on).
   * Decides how many of `volunteers.max` are offered (see `volunteersOffered`).
   */
  support?: number;
  /** Free volunteers: at most `max` (at full support); as many join as the food can sustain. */
  volunteers?: { typeId: UnitTypeId; max: number };
  /** Landsknechte for hire in this mission: `count` in total, `fee` gold each (GDD 7.4). */
  mercenaries?: { typeId: UnitTypeId; count: number; fee: number };
  /**
   * Food the place sells (milestone 4): one lot per purchase while a player unit
   * stands within `recruitRadius`; `stock` is the total food it can sell in this mission.
   */
  foodMarket?: FoodOffer & { stock: number };
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
  /**
   * Loot credited once when the post is taken. The gold is split with the
   * Landsknechte (milestone 5, see `settleLoot`); the food goes to the player in full.
   */
  loot: Supplies;
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
  /** Villages and gathering places (taverns). */
  villages: readonly VillageDefinition[];
  post: PostDefinition;
  /** Gold and food at mission start (milestone 4). */
  startSupplies: Supplies;
  /** Hunting changes for this mission (milestone 4a); defaults in `hunting.ts`. */
  hunting?: MissionHunting;
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
  // A small band of peasants on the road at the west edge, with one crossbowman who can hunt well.
  startArmy: [
    { typeId: 'peasant', count: 6, tileX: 4, tileY: 15 },
    { typeId: 'crossbowman', count: 1, tileX: 3, tileY: 15 },
  ],
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
      // 60 % of at most 10 volunteers: 6 peasants are willing to join.
      support: 60,
      volunteers: { typeId: 'peasant', max: 10 },
      foodMarket: { amount: 10, price: 10, stock: 30 },
    },
    {
      id: 'wirtshaus',
      name: 'Wirtshaus „Zum Krug“',
      kind: 'tavern',
      // North of the road, on the way from the start to the ford.
      tileX: 16,
      tileY: 12,
      clearRadius: 2,
      recruitRadius: 70,
      // 40 gold at the start: hiring two leaves almost nothing for food.
      mercenaries: { typeId: 'landsknecht', count: 3, fee: 15 },
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
    loot: { gold: 60, food: 20 },
  },
  // 21 food last the 7 starting units 3 days, but not 13 units for 2 days:
  // recruiting all of the village's volunteers requires buying or hunting food first.
  startSupplies: { gold: 40, food: 21 },
  hunting: {
    forests: [
      // Small wood north of the start: safe, but soon hunted out.
      { tileX: 9, tileY: 13, name: 'Krähenholz' },
      // The lord's wood next to the guard post: rich in game, but within reach of the guards.
      { tileX: 33, tileY: 14, name: 'Herrenwald', stock: 16, owner: 'Junker vom Mühlbach' },
    ],
  },
};
