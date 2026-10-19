/**
 * Placeholder unit types. Milestone 2 adds basic combat values directly on
 * the type; milestone 3 separates them into weapons and armour.
 */
export type Faction = 'player' | 'enemy';

export interface MeleeAttack {
  /** Hit points removed per hit. */
  damage: number;
  /** Seconds between two hits. */
  cooldown: number;
}

export interface RangedAttack {
  /** Hit points removed per shot. */
  damage: number;
  /** Maximum gap (px, edge to edge) to the target. */
  range: number;
  /** Seconds between two shots (reload time). */
  cooldown: number;
}

export interface UnitTypeDefinition {
  id: string;
  name: string;
  faction: Faction;
  /** Movement speed in world pixels per second. */
  speed: number;
  /** Collision radius in world pixels (used for separation). */
  radius: number;
  /** Placeholder body colour (0xRRGGBB). */
  color: number;
  maxHp: number;
  /** Close combat; every unit has one, ranged units only a weak one. */
  melee: MeleeAttack;
  /** Ranged attack; units with one shoot from a distance and only fight in melee when an enemy is next to them. */
  ranged?: RangedAttack;
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
    melee: { damage: 6, cooldown: 1 },
  },
  crossbowman: {
    id: 'crossbowman',
    name: 'Armbrustschütze',
    faction: 'player',
    speed: 65,
    radius: 7,
    color: 0x8f9a5a,
    maxHp: 30,
    melee: { damage: 3, cooldown: 1.2 },
    ranged: { damage: 14, range: 150, cooldown: 3 },
  },
  guard: {
    id: 'guard',
    name: 'Wache',
    faction: 'enemy',
    speed: 65,
    radius: 7,
    color: 0xb03a2e,
    maxHp: 70,
    melee: { damage: 9, cooldown: 1.1 },
  },
  guardCrossbowman: {
    id: 'guardCrossbowman',
    name: 'Armbrustschütze der Wache',
    faction: 'enemy',
    speed: 60,
    radius: 7,
    color: 0x7a2e4a,
    maxHp: 35,
    melee: { damage: 3, cooldown: 1.2 },
    ranged: { damage: 14, range: 150, cooldown: 3 },
  },
} as const satisfies Record<string, UnitTypeDefinition>;

export type UnitTypeId = keyof typeof UNIT_TYPES;

/** Type definition of a unit type, widened so optional fields (e.g. `ranged`) can be read. */
export function getUnitType(typeId: UnitTypeId): UnitTypeDefinition {
  return UNIT_TYPES[typeId];
}
