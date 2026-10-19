export const SceneKeys = {
  Boot: 'BootScene',
  Mission: 'MissionScene',
  Ui: 'UiScene',
} as const;

/** Events sent from the mission scene to the UI scene via the global game event bus. */
export const GameEvents = {
  TileHover: 'tile-hover',
  SelectionChanged: 'selection-changed',
  BattleStatus: 'battle-status',
  UnitInfo: 'unit-info',
} as const;

/** Description of the unit under the mouse pointer (or the single selected unit); `null` hides it. */
export interface UnitInfoEvent {
  text: string | null;
}

export interface BattleStatusEvent {
  player: number;
  enemy: number;
  outcome: 'running' | 'victory' | 'defeat';
  /** Name of the running scenario (test battle or 100-unit performance test). */
  scenario: string;
}

export interface SelectionChangedEvent {
  selected: number;
  total: number;
  /** Selected units by type, e.g. "3 Bauer, 2 Speerträger". */
  composition: string;
}

export interface TileHoverEvent {
  tileX: number;
  tileY: number;
  tileName: string;
}
