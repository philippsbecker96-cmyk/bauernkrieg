export const SceneKeys = {
  Boot: 'BootScene',
  Mission: 'MissionScene',
  Ui: 'UiScene',
} as const;

/** Events sent from the mission scene to the UI scene via the global game event bus. */
export const GameEvents = {
  TileHover: 'tile-hover',
  SelectionChanged: 'selection-changed',
} as const;

export interface SelectionChangedEvent {
  selected: number;
  total: number;
}

export interface TileHoverEvent {
  tileX: number;
  tileY: number;
  tileName: string;
}
