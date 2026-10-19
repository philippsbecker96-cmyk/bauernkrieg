import type { ArmorId } from './armor';
import type { UnitTag, WeaponId } from './weapons';

/**
 * Unit types hold base values (training) and a default loadout. Weapons and
 * armour live in `weapons.ts` / `armor.ts`; each unit carries its own copy of
 * the loadout, so equipment can later be exchanged per unit (milestone 7).
 */
export type Faction = 'player' | 'enemy';

export interface Equipment {
  /** Main weapon. */
  weapon: WeaponId;
  /** Close-combat backup for units whose main weapon is ranged. */
  sidearm?: WeaponId;
  armor: ArmorId;
}

export interface UnitTypeDefinition {
  id: string;
  name: string;
  faction: Faction;
  /** Base movement speed in world pixels per second (armour may reduce it). */
  speed: number;
  /** Collision radius in world pixels (used for separation). */
  radius: number;
  /** Placeholder body colour (0xRRGGBB). */
  color: number;
  maxHp: number;
  /** Training/experience: multiplier on the damage of every weapon the unit uses. */
  attack: number;
  /** Training/experience: share of close-combat damage the unit parries (0..1); no effect on bolts. */
  defense: number;
  tags: readonly UnitTag[];
  equipment: Equipment;
}

export const UNIT_TYPES = {
  peasant: {
    id: 'peasant',
    name: 'Bauer',
    faction: 'player',
    speed: 70,
    radius: 7,
    color: 0xc9a46a,
    maxHp: 40,
    attack: 1,
    defense: 0,
    tags: [],
    equipment: { weapon: 'improvised', armor: 'none' },
  },
  spearman: {
    id: 'spearman',
    name: 'Speerträger',
    faction: 'player',
    speed: 68,
    radius: 7,
    color: 0xb88f52,
    maxHp: 45,
    attack: 1,
    defense: 0.05,
    tags: [],
    equipment: { weapon: 'spear', armor: 'none' },
  },
  swordsman: {
    id: 'swordsman',
    name: 'Schwertkämpfer',
    faction: 'player',
    speed: 70,
    radius: 7,
    color: 0x9c7a4a,
    maxHp: 50,
    attack: 1.15,
    defense: 0.15,
    tags: [],
    equipment: { weapon: 'sword', armor: 'light' },
  },
  crossbowman: {
    id: 'crossbowman',
    name: 'Armbrustschütze',
    faction: 'player',
    speed: 65,
    radius: 7,
    color: 0x8f9a5a,
    maxHp: 30,
    attack: 1,
    defense: 0,
    tags: [],
    equipment: { weapon: 'crossbow', sidearm: 'knife', armor: 'none' },
  },
  landsknecht: {
    id: 'landsknecht',
    name: 'Landsknecht',
    faction: 'player',
    speed: 70,
    radius: 7,
    color: 0xe0a030,
    maxHp: 75,
    attack: 1.3,
    defense: 0.25,
    tags: [],
    equipment: { weapon: 'halberd', armor: 'light' },
  },
  guard: {
    id: 'guard',
    name: 'Wache',
    faction: 'enemy',
    speed: 65,
    radius: 7,
    color: 0xb03a2e,
    maxHp: 60,
    attack: 1.1,
    defense: 0.1,
    tags: [],
    equipment: { weapon: 'spear', armor: 'light' },
  },
  guardCrossbowman: {
    id: 'guardCrossbowman',
    name: 'Armbrustschütze der Wache',
    faction: 'enemy',
    speed: 60,
    radius: 7,
    color: 0x7a2e4a,
    maxHp: 35,
    attack: 1,
    defense: 0,
    tags: [],
    equipment: { weapon: 'crossbow', sidearm: 'knife', armor: 'none' },
  },
  armoredFootman: {
    id: 'armoredFootman',
    name: 'Gepanzerter Fußsoldat',
    faction: 'enemy',
    speed: 62,
    radius: 7,
    color: 0x8c2a22,
    maxHp: 70,
    attack: 1.2,
    defense: 0.2,
    tags: [],
    equipment: { weapon: 'sword', armor: 'heavy' },
  },
} as const satisfies Record<string, UnitTypeDefinition>;

export type UnitTypeId = keyof typeof UNIT_TYPES;

/** Type definition of a unit type, widened so optional fields (e.g. `sidearm`) can be read. */
export function getUnitType(typeId: UnitTypeId): UnitTypeDefinition {
  return UNIT_TYPES[typeId];
}
