/**
 * Armour as a property of equipment, not of the unit type (few protection
 * levels, see GAME_DESIGN.md 8.3).
 */
export interface ArmorDefinition {
  id: string;
  name: string;
  /** Share of incoming damage the armour absorbs (0..1), reduced by the weapon's armour piercing. */
  protection: number;
  /** Movement speed multiplier (heavy armour slows the wearer down). */
  speedFactor: number;
}

export const ARMORS = {
  none: { id: 'none', name: 'Kein Schutz', protection: 0, speedFactor: 1 },
  light: { id: 'light', name: 'Leichter Schutz (Wams)', protection: 0.25, speedFactor: 1 },
  heavy: { id: 'heavy', name: 'Schwerer Schutz (Helm, Brustpanzer)', protection: 0.55, speedFactor: 0.85 },
} as const satisfies Record<string, ArmorDefinition>;

export type ArmorId = keyof typeof ARMORS;

export function getArmor(id: ArmorId): ArmorDefinition {
  return ARMORS[id];
}
