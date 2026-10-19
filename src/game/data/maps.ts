/**
 * Data definitions for maps. Milestone 0 only needs a single test map;
 * missions will reference maps by id later.
 */
export interface MapConfig {
  id: string;
  name: string;
  /** Width in tiles. */
  width: number;
  /** Height in tiles. */
  height: number;
  /** Edge length of one tile in pixels. */
  tileSize: number;
  /** Seed for the deterministic generator; same seed → same map. */
  seed: number;
  /** Share of land tiles covered by forest, 0..1. */
  forestDensity: number;
}

export const TEST_MAP: MapConfig = {
  id: 'testkarte',
  name: 'Testkarte',
  width: 64,
  height: 48,
  tileSize: 32,
  seed: 1525,
  forestDensity: 0.18,
};
