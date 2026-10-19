export const SceneKeys = {
  Boot: 'BootScene',
  Mission: 'MissionScene',
  Ui: 'UiScene',
} as const;

/** Events sent from the mission scene to the UI scene via the global game event bus. */
export const GameEvents = {
  TileHover: 'tile-hover',
} as const;

export interface TileHoverEvent {
  tileX: number;
  tileY: number;
  tileName: string;
}
