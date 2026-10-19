/**
 * Placeholder unit types for milestone 1 (display and movement only).
 * Combat values, weapons and armour follow in milestones 2 and 3.
 */
export type Faction = 'player' | 'enemy';

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
}

export const UNIT_TYPES = {
  peasant: {
    id: 'peasant',
    name: 'Bauer',
    faction: 'player',
    speed: 70,
    radius: 7,
    color: 0xc9a46a,
  },
  guard: {
    id: 'guard',
    name: 'Wache',
    faction: 'enemy',
    speed: 65,
    radius: 7,
    color: 0xb03a2e,
  },
} as const satisfies Record<string, UnitTypeDefinition>;

export type UnitTypeId = keyof typeof UNIT_TYPES;
