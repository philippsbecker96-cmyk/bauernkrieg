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
  MissionStatus: 'mission-status',
  Notice: 'notice',
  SupplyStatus: 'supply-status',
} as const;

/** Gold, food and supply days of the mini mission; `null` hides the panel (test scenarios). */
export interface SupplyStatusEvent {
  text: string | null;
  /** Colours the panel: `low` and `shortage` are warnings. */
  level: 'ok' | 'low' | 'shortage';
}

/** Objective and village state of the mini mission; `null` hides the panel (test scenarios). */
export interface MissionStatusEvent {
  text: string | null;
}

/** Short message shown for a few seconds (e.g. result of a recruiting attempt). */
export interface NoticeEvent {
  text: string;
}

/** Description of the unit under the mouse pointer (or the single selected unit); `null` hides it. */
export interface UnitInfoEvent {
  text: string | null;
}

export interface BattleStatusEvent {
  player: number;
  enemy: number;
  outcome: 'running' | 'victory' | 'defeat';
  /** Name of the running scenario (mini mission, test battle or 100-unit performance test). */
  scenario: string;
  /** Why the battle ended, shown under "Sieg!" / "Niederlage". */
  outcomeDetail: string;
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
