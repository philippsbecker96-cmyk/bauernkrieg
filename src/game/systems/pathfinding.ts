import type { TileGrid } from '../map/mapGenerator';
import { getTileDefinition } from '../map/tiles';

/** Tile coordinate on the map grid. */
export interface TilePoint {
  x: number;
  y: number;
}

/**
 * Movement cost per tile, indexed as `grid[y][x]`: 1 = normal ground,
 * higher = slower (cost = 1 / speed factor), `Infinity` = not walkable.
 */
export type WalkGrid = number[][];

export function buildWalkGrid(tiles: TileGrid): WalkGrid {
  return tiles.map((row) =>
    row.map((type) => {
      const def = getTileDefinition(type);
      return def.walkable && def.speedFactor > 0 ? 1 / def.speedFactor : Infinity;
    }),
  );
}

/** Movement cost of a tile; `Infinity` outside the map or on unwalkable tiles. */
export function tileCost(grid: WalkGrid, x: number, y: number): number {
  return grid[y]?.[x] ?? Infinity;
}

export function isWalkable(grid: WalkGrid, x: number, y: number): boolean {
  return Number.isFinite(tileCost(grid, x, y));
}

/** Cost of the tile under a world point. */
export function costAt(grid: WalkGrid, tileSize: number, x: number, y: number): number {
  return tileCost(grid, Math.floor(x / tileSize), Math.floor(y / tileSize));
}

const SQRT2 = Math.SQRT2;

const NEIGHBOURS: readonly (readonly [number, number, number])[] = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, SQRT2],
  [1, -1, SQRT2],
  [-1, 1, SQRT2],
  [-1, -1, SQRT2],
];

/** Octile distance: admissible heuristic for 8-directional movement. */
function octile(ax: number, ay: number, bx: number, by: number): number {
  const dx = Math.abs(ax - bx);
  const dy = Math.abs(ay - by);
  return dx + dy + (SQRT2 - 2) * Math.min(dx, dy);
}

/** Minimal binary heap keyed by f-score. */
class MinHeap {
  private items: number[] = [];
  constructor(private readonly score: Float64Array) {}

  get size(): number {
    return this.items.length;
  }

  push(node: number): void {
    const items = this.items;
    items.push(node);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.score[items[parent]!]! <= this.score[node]!) break;
      items[i] = items[parent]!;
      i = parent;
    }
    items[i] = node;
  }

  pop(): number {
    const items = this.items;
    const top = items[0]!;
    const last = items.pop()!;
    if (items.length > 0) {
      let i = 0;
      const n = items.length;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let smallest = i;
        const s = (k: number) => (k === i ? this.score[last]! : this.score[items[k]!]!);
        if (l < n && s(l) < s(smallest)) smallest = l;
        if (r < n && s(r) < s(smallest)) smallest = r;
        if (smallest === i) break;
        items[i] = items[smallest]!;
        i = smallest;
      }
      items[i] = last;
    }
    return top;
  }
}

/**
 * A* on the tile grid with 8-directional movement, weighted by terrain cost
 * (a step costs its length times the mean cost of both tiles), so slow
 * terrain such as forest is avoided when a detour is faster. Diagonal steps
 * are only allowed if both adjacent orthogonal tiles are walkable (no corner cutting).
 * Returns the tile path including start and goal, or `null` if unreachable.
 */
export function findPath(grid: WalkGrid, start: TilePoint, goal: TilePoint): TilePoint[] | null {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  if (!isWalkable(grid, start.x, start.y) || !isWalkable(grid, goal.x, goal.y)) return null;
  if (start.x === goal.x && start.y === goal.y) return [{ ...start }];

  // Heuristic scaled by the cheapest tile keeps it admissible for any cost data.
  let minCost = Infinity;
  for (const row of grid) for (const c of row) if (c < minCost) minCost = c;
  const h = (x: number, y: number) => octile(x, y, goal.x, goal.y) * minCost;

  const size = width * height;
  const g = new Float64Array(size).fill(Infinity);
  const f = new Float64Array(size).fill(Infinity);
  const cameFrom = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const open = new MinHeap(f);

  const startId = start.y * width + start.x;
  const goalId = goal.y * width + goal.x;
  g[startId] = 0;
  f[startId] = h(start.x, start.y);
  open.push(startId);

  while (open.size > 0) {
    const current = open.pop();
    if (current === goalId) return reconstruct(cameFrom, current, width);
    if (closed[current]) continue;
    closed[current] = 1;

    const cx = current % width;
    const cy = (current - cx) / width;
    for (const [dx, dy, cost] of NEIGHBOURS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!isWalkable(grid, nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (!isWalkable(grid, cx + dx, cy) || !isWalkable(grid, cx, cy + dy))) {
        continue;
      }
      const next = ny * width + nx;
      if (closed[next]) continue;
      const tentative = g[current]! + (cost * (grid[cy]![cx]! + grid[ny]![nx]!)) / 2;
      if (tentative < g[next]!) {
        g[next] = tentative;
        f[next] = tentative + h(nx, ny);
        cameFrom[next] = current;
        open.push(next); // duplicates are skipped via `closed`
      }
    }
  }
  return null;
}

function reconstruct(cameFrom: Int32Array, end: number, width: number): TilePoint[] {
  const path: TilePoint[] = [];
  for (let node = end; node !== -1; node = cameFrom[node]!) {
    path.push({ x: node % width, y: Math.floor(node / width) });
  }
  return path.reverse();
}

/**
 * Nearest walkable tile to `target` (breadth-first over the grid), so that a
 * click on water still leads to a sensible destination. `null` if none exists.
 */
export function nearestWalkableTile(grid: WalkGrid, target: TilePoint): TilePoint | null {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const tx = Math.min(width - 1, Math.max(0, target.x));
  const ty = Math.min(height - 1, Math.max(0, target.y));
  if (isWalkable(grid, tx, ty)) return { x: tx, y: ty };

  const seen = new Uint8Array(width * height);
  const queue: number[] = [ty * width + tx];
  seen[ty * width + tx] = 1;
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head]!;
    const x = id % width;
    const y = (id - x) / width;
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const nid = ny * width + nx;
      if (seen[nid]) continue;
      seen[nid] = 1;
      if (isWalkable(grid, nx, ny)) return { x: nx, y: ny };
      queue.push(nid);
    }
  }
  return null;
}

/**
 * Whether a straight segment between two world points only crosses walkable
 * tiles with a cost of at most `maxCost`. Samples the segment densely enough
 * (quarter tile) that it cannot skip a tile; also checks a small sideways
 * margin so units with a radius do not clip unwalkable corners.
 */
export function hasLineOfSight(
  grid: WalkGrid,
  tileSize: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  margin = 0,
  maxCost = Infinity,
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  const length = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(length / (tileSize / 4)));
  const nx = length > 0 ? -dy / length : 0;
  const ny = length > 0 ? dx / length : 0;
  const offsets = margin > 0 ? [0, margin, -margin] : [0];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    for (const o of offsets) {
      const px = ax + dx * t + nx * o;
      const py = ay + dy * t + ny * o;
      const cost = costAt(grid, tileSize, px, py);
      if (!Number.isFinite(cost) || cost > maxCost + 1e-9) return false;
    }
  }
  return true;
}

/**
 * Removes intermediate waypoints that can be skipped via a clear straight
 * line. A shortcut may not cross terrain more expensive than the most
 * expensive tile of the path section it replaces, so a path that detours
 * around a forest is not straightened through it again.
 */
export function smoothPath(
  grid: WalkGrid,
  tileSize: number,
  points: readonly { x: number; y: number }[],
  margin = 0,
): { x: number; y: number }[] {
  if (points.length <= 2) return points.map((p) => ({ ...p }));
  const result = [{ ...points[0]! }];
  let anchor = 0;
  while (anchor < points.length - 1) {
    let next = anchor + 1;
    for (let candidate = points.length - 1; candidate > anchor + 1; candidate--) {
      const a = points[anchor]!;
      const c = points[candidate]!;
      let sectionCost = 0;
      for (let k = anchor; k <= candidate; k++) {
        sectionCost = Math.max(sectionCost, costAt(grid, tileSize, points[k]!.x, points[k]!.y));
      }
      if (hasLineOfSight(grid, tileSize, a.x, a.y, c.x, c.y, margin, sectionCost)) {
        next = candidate;
        break;
      }
    }
    result.push({ ...points[next]! });
    anchor = next;
  }
  return result;
}

/** Centre of a tile in world pixels. */
export function tileCenter(tile: TilePoint, tileSize: number): { x: number; y: number } {
  return { x: (tile.x + 0.5) * tileSize, y: (tile.y + 0.5) * tileSize };
}

export function worldToTile(x: number, y: number, tileSize: number): TilePoint {
  return { x: Math.floor(x / tileSize), y: Math.floor(y / tileSize) };
}
