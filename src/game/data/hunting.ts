import type { WeaponClass } from './weapons';

/**
 * Hunting in forests (milestone 4a, GAME_DESIGN.md 5.4). All values are starting
 * points for balancing; new game species or another stock rule only need data changes here
 * (or per mission in `missions.ts`), never changes to the hunting system.
 */

/** A kind of game that can be caught in a forest. */
export interface GameSpecies {
  id: string;
  name: string;
  /** Food one animal brings. */
  food: number;
  /** Relative frequency among catches (weight, not a share). */
  weight: number;
  /** How hard the animal is to catch (0..1): the catch chance is multiplied by `1 − difficulty`. */
  difficulty: number;
}

/**
 * How many animals a forest region holds at mission start:
 * - `fixed`: `value` animals, whatever the size,
 * - `perTile`: `value` animals per forest tile.
 * `spread` (0..1) scatters the result randomly by up to ± that share (0 = no randomness);
 * the randomness comes from a seed, so missions and tests stay reproducible.
 */
export interface StockRule {
  mode: 'fixed' | 'perTile';
  value: number;
  spread: number;
}

/** Rough stock shown to the player instead of exact numbers. */
export type StockLevel = 'rich' | 'moderate' | 'exhausted';

export interface HuntingConfig {
  species: readonly GameSpecies[];
  stockRule: StockRule;
  /** Animals each forest region regains per game day (0 = no regrowth), never above its starting stock. */
  regrowthPerDay: number;
  /** Connected forest areas with fewer tiles are not hunting grounds. */
  minForestTiles: number;
  /** Seconds the hunters spend hunting once they reach the forest. */
  huntDuration: number;
  /** Seconds between two catch attempts of one hunter. */
  attemptInterval: number;
  /** Chance per attempt to catch something, by the class of the hunter's main weapon. */
  catchChance: Record<WeaponClass, number>;
  /** Most food one hunter can carry; hunters with a full load return early. */
  carryCapacity: number;
  /** Damage hunters take is multiplied by this (they defend themselves worse). */
  damageTakenFactor: number;
  /** Carried food is credited once a hunter is within this distance (px) of an own unit that is not hunting. */
  returnRadius: number;
  /** Seconds between route updates of returning hunters (the band may be moving). */
  returnRepathInterval: number;
  /** Stock share (of the starting stock) from which a forest counts as `rich`; below it `moderate`, under one animal `exhausted`. */
  richShare: number;
}

export const HUNTING: HuntingConfig = {
  species: [
    { id: 'boar', name: 'Wildschwein', food: 12, weight: 1, difficulty: 0.5 },
    { id: 'deer', name: 'Reh', food: 8, weight: 2, difficulty: 0.3 },
    { id: 'hare', name: 'Hase', food: 2, weight: 4, difficulty: 0 },
  ],
  stockRule: { mode: 'perTile', value: 1, spread: 0.25 },
  regrowthPerDay: 0.5,
  minForestTiles: 4,
  huntDuration: 30,
  attemptInterval: 5,
  catchChance: {
    crossbow: 0.6,
    spear: 0.25,
    polearm: 0.15,
    sword: 0.12,
    improvised: 0.1,
  },
  carryCapacity: 16,
  damageTakenFactor: 1.5,
  returnRadius: 60,
  returnRepathInterval: 1,
  richShare: 0.5,
};

/** Per-mission changes to hunting (all optional). */
export interface MissionHunting {
  /** Replaces the default stock rule for every forest region of the mission. */
  stockRule?: StockRule;
  /** Replaces the default regrowth for every forest region of the mission. */
  regrowthPerDay?: number;
  /** Values for single forest regions, each identified by one of its tiles. */
  forests?: readonly ForestOverride[];
}

export interface ForestOverride {
  /** Any forest tile of the region. */
  tileX: number;
  tileY: number;
  name?: string;
  /** Starting stock (animals), replacing the stock rule for this region. */
  stock?: number;
  regrowthPerDay?: number;
  /** Lord whose hunting ground this is (poaching consequences follow in milestone 6). */
  owner?: string;
}
