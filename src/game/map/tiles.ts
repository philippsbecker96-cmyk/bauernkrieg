/**
 * Tile types of the map grid. The numeric value is the tile index in the
 * generated tileset texture, so the order must match `TILE_DEFINITIONS`.
 */
export const TileType = {
  Grass: 0,
  Forest: 1,
  Water: 2,
  Road: 3,
} as const;

export type TileType = (typeof TileType)[keyof typeof TileType];

export interface TileDefinition {
  type: TileType;
  name: string;
  /** Base fill colour of the placeholder tile graphic (0xRRGGBB). */
  color: number;
  /** Whether units can walk on this tile. */
  walkable: boolean;
  /** Movement speed multiplier on this tile (1 = normal). Ignored if not walkable. */
  speedFactor: number;
  /** Share of ranged shots that miss a unit standing on this tile (cover), 0..1. */
  rangedCover: number;
}

export const TILE_DEFINITIONS: readonly TileDefinition[] = [
  { type: TileType.Grass, name: 'Wiese', color: 0x6b8e3d, walkable: true, speedFactor: 1, rangedCover: 0 },
  { type: TileType.Forest, name: 'Wald', color: 0x2f5a2a, walkable: true, speedFactor: 0.7, rangedCover: 0.4 },
  { type: TileType.Water, name: 'Wasser', color: 0x3b6e9e, walkable: false, speedFactor: 0, rangedCover: 0 },
  { type: TileType.Road, name: 'Weg', color: 0xa88a5c, walkable: true, speedFactor: 1, rangedCover: 0 },
];

export function getTileDefinition(type: TileType): TileDefinition {
  const def = TILE_DEFINITIONS[type];
  if (!def) {
    throw new Error(`Unbekannter Kacheltyp: ${type}`);
  }
  return def;
}
