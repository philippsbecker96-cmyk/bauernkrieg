import type { MapConfig } from '../data/maps';
import { createRandom } from './random';
import { TileType } from './tiles';

/** Map grid indexed as `tiles[y][x]`. */
export type TileGrid = TileType[][];

/**
 * Generates a deterministic placeholder map: grassland with forest patches,
 * a river running north to south and an east–west road that crosses it at a ford.
 * Pure function without Phaser dependency, so it can be unit-tested.
 */
export function generateMap(config: MapConfig): TileGrid {
  const { width, height, seed, forestDensity } = config;
  if (width < 8 || height < 8) {
    throw new Error('Karte muss mindestens 8×8 Kacheln groß sein.');
  }
  const random = createRandom(seed);
  const tiles: TileGrid = Array.from({ length: height }, () =>
    Array.from({ length: width }, (): TileType => TileType.Grass),
  );

  // Forest: seed patches and grow them a little to get clumps instead of noise.
  const patchCount = Math.round((width * height * forestDensity) / 12);
  for (let i = 0; i < patchCount; i++) {
    const cx = Math.floor(random() * width);
    const cy = Math.floor(random() * height);
    const radius = 1 + random() * 2;
    for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y++) {
      for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x++) {
        const row = tiles[y];
        if (row === undefined || x < 0 || x >= width) continue;
        if (Math.hypot(x - cx, y - cy) <= radius && random() < 0.85) {
          row[x] = TileType.Forest;
        }
      }
    }
  }

  // River: meanders from top to bottom, two tiles wide, in the middle third of the map.
  const minRiverX = Math.floor(width / 3);
  const maxRiverX = Math.floor((width * 2) / 3) - 2;
  let riverX = minRiverX + Math.floor(random() * (maxRiverX - minRiverX + 1));
  for (let y = 0; y < height; y++) {
    const row = tiles[y]!;
    row[riverX] = TileType.Water;
    row[riverX + 1] = TileType.Water;
    const step = Math.floor(random() * 3) - 1;
    riverX = Math.min(maxRiverX, Math.max(minRiverX, riverX + step));
  }

  // Road: straight east–west line at mid height; road tiles over the river act as a ford.
  const roadRow = tiles[Math.floor(height / 2)]!;
  for (let x = 0; x < width; x++) {
    roadRow[x] = TileType.Road;
  }

  return tiles;
}

/**
 * Turns forest within `radius` tiles of (`tileX`, `tileY`) into grass, so mission
 * sites (villages, posts) stand on open ground. Water and road are left as they are.
 */
export function clearGround(tiles: TileGrid, tileX: number, tileY: number, radius: number): void {
  for (let y = Math.floor(tileY - radius); y <= Math.ceil(tileY + radius); y++) {
    const row = tiles[y];
    if (row === undefined) continue;
    for (let x = Math.floor(tileX - radius); x <= Math.ceil(tileX + radius); x++) {
      if (x < 0 || x >= row.length || Math.hypot(x - tileX, y - tileY) > radius) continue;
      if (row[x] === TileType.Forest) row[x] = TileType.Grass;
    }
  }
}
