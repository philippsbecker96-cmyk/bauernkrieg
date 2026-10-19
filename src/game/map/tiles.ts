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
  /** Whether units will be able to walk on this tile (used from milestone 1). */
  walkable: boolean;
}

export const TILE_DEFINITIONS: readonly TileDefinition[] = [
  { type: TileType.Grass, name: 'Wiese', color: 0x6b8e3d, walkable: true },
  { type: TileType.Forest, name: 'Wald', color: 0x2f5a2a, walkable: true },
  { type: TileType.Water, name: 'Wasser', color: 0x3b6e9e, walkable: false },
  { type: TileType.Road, name: 'Weg', color: 0xa88a5c, walkable: true },
];

export function getTileDefinition(type: TileType): TileDefinition {
  const def = TILE_DEFINITIONS[type];
  if (!def) {
    throw new Error(`Unbekannter Kacheltyp: ${type}`);
  }
  return def;
}
