/**
 * Weapon definitions. Units carry weapons (see `equipment` in `units.ts`);
 * combat reads all values from here, so balancing never touches system code.
 */
export type WeaponClass = 'improvised' | 'spear' | 'polearm' | 'sword' | 'crossbow';

/** Target categories a weapon can have a bonus or malus against. */
export type UnitTag = 'cavalry';

export interface WeaponDefinition {
  id: string;
  name: string;
  weaponClass: WeaponClass;
  /** Melee weapons hit adjacent enemies, ranged weapons shoot from a distance. */
  kind: 'melee' | 'ranged';
  /** Hit points removed per hit before training, armour and defence are applied. */
  damage: number;
  /** Maximum gap (px, edge to edge) to the target. Long melee weapons reach further. */
  range: number;
  /** Seconds between two hits; for ranged weapons this is the reload time. */
  cooldown: number;
  /** Share of the target's armour protection the weapon ignores (0..1). */
  armorPiercing: number;
  /** Damage multipliers against tagged targets (e.g. spears vs. cavalry, milestone 10). */
  bonusAgainst: Partial<Record<UnitTag, number>>;
  /** Ammunition the weapon needs. Not consumed yet; supply follows with loot/equipment. */
  ammo: 'none' | 'bolts';
}

export const WEAPONS = {
  improvised: {
    id: 'improvised',
    name: 'Improvisierte Waffe (Mistgabel, Dreschflegel, Axt)',
    weaponClass: 'improvised',
    kind: 'melee',
    damage: 6,
    range: 6,
    cooldown: 1,
    armorPiercing: 0,
    bonusAgainst: {},
    ammo: 'none',
  },
  knife: {
    id: 'knife',
    name: 'Messer',
    weaponClass: 'improvised',
    kind: 'melee',
    damage: 3,
    range: 6,
    cooldown: 1.2,
    armorPiercing: 0,
    bonusAgainst: {},
    ammo: 'none',
  },
  spear: {
    id: 'spear',
    name: 'Spieß',
    weaponClass: 'spear',
    kind: 'melee',
    damage: 7,
    range: 18,
    cooldown: 1.2,
    armorPiercing: 0.2,
    // Bonus against cavalry is activated in milestone 10, when riders exist.
    bonusAgainst: {},
    ammo: 'none',
  },
  halberd: {
    id: 'halberd',
    name: 'Hellebarde',
    weaponClass: 'polearm',
    kind: 'melee',
    damage: 11,
    range: 12,
    cooldown: 1.3,
    armorPiercing: 0.4,
    bonusAgainst: {},
    ammo: 'none',
  },
  sword: {
    id: 'sword',
    name: 'Schwert',
    weaponClass: 'sword',
    kind: 'melee',
    damage: 10,
    range: 6,
    cooldown: 0.9,
    armorPiercing: 0.1,
    bonusAgainst: {},
    ammo: 'none',
  },
  crossbow: {
    id: 'crossbow',
    name: 'Armbrust',
    weaponClass: 'crossbow',
    kind: 'ranged',
    damage: 14,
    range: 150,
    cooldown: 3,
    armorPiercing: 0.6,
    bonusAgainst: {},
    ammo: 'bolts',
  },
} as const satisfies Record<string, WeaponDefinition>;

export type WeaponId = keyof typeof WEAPONS;

/** Weapon definition, widened so it can be read without literal types. */
export function getWeapon(id: WeaponId): WeaponDefinition {
  return WEAPONS[id];
}
