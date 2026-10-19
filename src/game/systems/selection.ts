import type { Faction } from '../data/units';
import type { Unit } from '../entities/Unit';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Normalised rectangle from two corner points (drag start and current pointer). */
export function rectFromCorners(ax: number, ay: number, bx: number, by: number): Rect {
  return { x: Math.min(ax, bx), y: Math.min(ay, by), width: Math.abs(bx - ax), height: Math.abs(by - ay) };
}

/** Units of `faction` whose circle touches the rectangle. */
export function unitsInRect(units: readonly Unit[], rect: Rect, faction: Faction): Unit[] {
  return units.filter((u) => {
    if (u.faction !== faction) return false;
    const nearestX = Math.max(rect.x, Math.min(u.x, rect.x + rect.width));
    const nearestY = Math.max(rect.y, Math.min(u.y, rect.y + rect.height));
    return Math.hypot(u.x - nearestX, u.y - nearestY) <= u.radius;
  });
}

/** Closest unit of `faction` under a point (within radius + tolerance), or `undefined`. */
export function unitAtPoint(
  units: readonly Unit[],
  x: number,
  y: number,
  tolerance: number,
  faction: Faction,
): Unit | undefined {
  let best: Unit | undefined;
  let bestDistance = Infinity;
  for (const u of units) {
    if (u.faction !== faction) continue;
    const distance = Math.hypot(u.x - x, u.y - y);
    if (distance <= u.radius + tolerance && distance < bestDistance) {
      best = u;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * New selection after a click or drag. With `additive` (Shift held) the
 * picked units are toggled into/out of the existing selection for a click,
 * or added for a drag; otherwise they replace it.
 */
export function updateSelection(
  current: ReadonlySet<number>,
  picked: readonly Unit[],
  additive: boolean,
  isClick: boolean,
): Set<number> {
  if (!additive) return new Set(picked.map((u) => u.id));
  const next = new Set(current);
  for (const u of picked) {
    if (isClick && next.has(u.id)) next.delete(u.id);
    else next.add(u.id);
  }
  return next;
}
