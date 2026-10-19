import { setUnitRoute, type Point, type Unit } from '../entities/Unit';
import {
  costAt,
  findPath,
  hasLineOfSight,
  nearestWalkableTile,
  smoothPath,
  tileCenter,
  worldToTile,
  type WalkGrid,
} from './pathfinding';

/**
 * Destination slots for a group order: a compact block of points around
 * `target`, spaced `spacing` px apart. Only points on walkable tiles with a
 * clear straight line from the target are used, so slots never end up on the
 * other side of a river or inside water. Sorted from the centre outwards.
 */
export function computeFormationSlots(
  grid: WalkGrid,
  tileSize: number,
  target: Point,
  count: number,
  spacing: number,
): Point[] {
  if (count <= 0) return [];
  const slots: Point[] = [];
  // Grow the search ring until enough slots are found (bounded to avoid endless loops).
  const maxRing = Math.ceil(Math.sqrt(count)) * 4 + 8;
  for (let ring = 0; ring <= maxRing && slots.length < count; ring++) {
    const ringPoints: Point[] = [];
    for (let j = -ring; j <= ring; j++) {
      for (let i = -ring; i <= ring; i++) {
        if (Math.max(Math.abs(i), Math.abs(j)) !== ring) continue;
        ringPoints.push({ x: target.x + i * spacing, y: target.y + j * spacing });
      }
    }
    ringPoints.sort(
      (a, b) =>
        Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y) ||
        a.y - b.y ||
        a.x - b.x,
    );
    for (const p of ringPoints) {
      if (slots.length >= count) break;
      if (hasLineOfSight(grid, tileSize, target.x, target.y, p.x, p.y)) slots.push(p);
    }
  }
  return slots;
}

/**
 * Assigns each unit to one slot (greedy, shortest unit–slot distance first).
 * Deterministic for equal inputs. Returns slot index per unit id.
 */
export function assignSlots(units: readonly Point[], slots: readonly Point[]): number[] {
  const pairs: { u: number; s: number; d: number }[] = [];
  units.forEach((u, ui) => {
    slots.forEach((s, si) => pairs.push({ u: ui, s: si, d: Math.hypot(u.x - s.x, u.y - s.y) }));
  });
  pairs.sort((a, b) => a.d - b.d || a.u - b.u || a.s - b.s);
  const result = new Array<number>(units.length).fill(-1);
  const usedSlots = new Set<number>();
  let assigned = 0;
  for (const { u, s } of pairs) {
    if (assigned === units.length) break;
    if (result[u] !== -1 || usedSlots.has(s)) continue;
    result[u] = s;
    usedSlots.add(s);
    assigned++;
  }
  return result;
}

export interface GroupMoveResult {
  /** Snapped destination actually used (nearest walkable tile if the click was on water). */
  destination: Point;
  /** Number of units that received a route. */
  movedCount: number;
}

/**
 * Issues a move order to a group: one A* path is computed for the group
 * (from the unit nearest to the group's centre) and all units follow it,
 * each heading for its own formation slot at the destination. Units that
 * cannot reach the start of the shared path in a straight line get their
 * own path instead.
 */
export function orderGroupMove(
  units: readonly Unit[],
  grid: WalkGrid,
  tileSize: number,
  target: Point,
  spacing: number,
  margin: number,
): GroupMoveResult | null {
  if (units.length === 0) return null;
  const targetTile = nearestWalkableTile(grid, worldToTile(target.x, target.y, tileSize));
  if (!targetTile) return null;
  const clickedTile = worldToTile(target.x, target.y, tileSize);
  const destination =
    targetTile.x === clickedTile.x && targetTile.y === clickedTile.y
      ? { x: target.x, y: target.y }
      : tileCenter(targetTile, tileSize);

  const cx = units.reduce((sum, u) => sum + u.x, 0) / units.length;
  const cy = units.reduce((sum, u) => sum + u.y, 0) / units.length;
  const leader = units.reduce((best, u) =>
    Math.hypot(u.x - cx, u.y - cy) < Math.hypot(best.x - cx, best.y - cy) ? u : best,
  );

  const sharedPath = worldPath(grid, tileSize, leader, targetTile, destination, margin);
  const slots = computeFormationSlots(grid, tileSize, destination, units.length, spacing);
  const assignment = assignSlots(units, slots);

  let movedCount = 0;
  units.forEach((unit, index) => {
    const slot = slots[assignment[index] ?? -1] ?? destination;
    // Intermediate waypoints of the shared path (without the leader's start and the common end point).
    const via = sharedPath ? sharedPath.slice(1, -1) : [];
    const first = via[0] ?? slot;
    let route: Point[] | null;
    const hereCost = costAt(grid, tileSize, unit.x, unit.y);
    if (sharedPath && hasLineOfSight(grid, tileSize, unit.x, unit.y, first.x, first.y, margin, hereCost)) {
      route = [...via, slot];
    } else {
      const own = worldPath(grid, tileSize, unit, targetTile, destination, margin);
      route = own ? [...own.slice(1, -1), slot] : null;
    }
    if (route) {
      setUnitRoute(unit, route);
      movedCount++;
    }
  });
  return { destination, movedCount };
}

/** Smoothed world-space path from a unit position to `destination`, or `null` if unreachable. */
function worldPath(
  grid: WalkGrid,
  tileSize: number,
  from: Point,
  targetTile: { x: number; y: number },
  destination: Point,
  margin: number,
): Point[] | null {
  const startTile = nearestWalkableTile(grid, worldToTile(from.x, from.y, tileSize));
  if (!startTile) return null;
  const tiles = findPath(grid, startTile, targetTile);
  if (!tiles) return null;
  const points = [{ x: from.x, y: from.y }, ...tiles.slice(1, -1).map((t) => tileCenter(t, tileSize)), destination];
  return smoothPath(grid, tileSize, points, margin);
}
