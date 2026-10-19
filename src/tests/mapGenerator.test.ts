import { describe, expect, it } from 'vitest';
import { TEST_MAP, type MapConfig } from '../game/data/maps';
import { generateMap } from '../game/map/mapGenerator';
import { TILE_DEFINITIONS, TileType, getTileDefinition } from '../game/map/tiles';

describe('generateMap', () => {
  it('erzeugt ein Raster in der konfigurierten Größe', () => {
    const tiles = generateMap(TEST_MAP);
    expect(tiles).toHaveLength(TEST_MAP.height);
    for (const row of tiles) {
      expect(row).toHaveLength(TEST_MAP.width);
    }
  });

  it('ist deterministisch: gleicher Seed ergibt dieselbe Karte', () => {
    expect(generateMap(TEST_MAP)).toEqual(generateMap(TEST_MAP));
  });

  it('erzeugt mit anderem Seed eine andere Karte', () => {
    const other: MapConfig = { ...TEST_MAP, seed: TEST_MAP.seed + 1 };
    expect(generateMap(other)).not.toEqual(generateMap(TEST_MAP));
  });

  it('verwendet nur bekannte Kacheltypen', () => {
    const known = new Set(TILE_DEFINITIONS.map((d) => d.type));
    for (const row of generateMap(TEST_MAP)) {
      for (const tile of row) {
        expect(known.has(tile)).toBe(true);
      }
    }
  });

  it('enthält einen Fluss, der die Karte von Nord nach Süd durchzieht', () => {
    const tiles = generateMap(TEST_MAP);
    const roadY = Math.floor(TEST_MAP.height / 2);
    tiles.forEach((row, y) => {
      if (y === roadY) return; // the road crosses the river here
      expect(row.filter((t) => t === TileType.Water).length).toBeGreaterThanOrEqual(2);
    });
  });

  it('hat einen durchgehend begehbaren Weg von West nach Ost', () => {
    const roadRow = generateMap(TEST_MAP)[Math.floor(TEST_MAP.height / 2)]!;
    expect(roadRow.every((t) => t === TileType.Road)).toBe(true);
    expect(getTileDefinition(TileType.Road).walkable).toBe(true);
  });

  it('lehnt zu kleine Karten ab', () => {
    expect(() => generateMap({ ...TEST_MAP, width: 4 })).toThrow();
  });
});
