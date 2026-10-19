import { finalWaypoint, isMoving, stopUnit, type Unit } from '../entities/Unit';
import { costAt, hasLineOfSight, isWalkable, type WalkGrid } from './pathfinding';

export interface MovementConfig {
  tileSize: number;
  waypointReachDistance: number;
  separationStrength: number;
  stuckTimeout: number;
  /** Distance (px) to the final slot within which a stuck unit counts as arrived. */
  stuckArriveDistance: number;
  /** Seconds without any progress after which a unit gives up its order wherever it is. */
  giveUpTimeout: number;
  lineOfSightMargin: number;
}

/**
 * Advances all units by `dt` seconds: follow waypoints, then resolve overlaps
 * (simple pairwise separation). Units never get pushed onto unwalkable tiles.
 */
export function stepMovement(units: Unit[], grid: WalkGrid, dt: number, config: MovementConfig): void {
  for (const unit of units) {
    if (isMoving(unit)) followRoute(unit, grid, dt, config);
  }
  separate(units, grid, config);
}

function followRoute(unit: Unit, grid: WalkGrid, dt: number, config: MovementConfig): void {
  // Terrain slows units down: speed is divided by the cost of the tile they stand on.
  const hereCost = costAt(grid, config.tileSize, unit.x, unit.y);
  const terrainCost = Number.isFinite(hereCost) ? hereCost : 1;

  // Shortcut: skip the current waypoint if the next one is already in a clear straight line
  // that does not lead through slower terrain than the unit is standing on.
  const next = unit.waypoints[unit.waypointIndex + 1];
  if (
    next &&
    hasLineOfSight(grid, config.tileSize, unit.x, unit.y, next.x, next.y, config.lineOfSightMargin, terrainCost)
  ) {
    unit.waypointIndex++;
  }

  let budget = (unit.speed * dt) / terrainCost;
  while (budget > 0 && isMoving(unit)) {
    const target = unit.waypoints[unit.waypointIndex]!;
    const dx = target.x - unit.x;
    const dy = target.y - unit.y;
    const distance = Math.hypot(dx, dy);
    const isFinal = unit.waypointIndex === unit.waypoints.length - 1;
    if (distance <= budget || (!isFinal && distance <= config.waypointReachDistance)) {
      moveTo(unit, grid, config.tileSize, target.x, target.y);
      budget -= distance;
      unit.waypointIndex++;
      continue;
    }
    moveTo(unit, grid, config.tileSize, unit.x + (dx / distance) * budget, unit.y + (dy / distance) * budget);
    budget = 0;
  }

  if (!isMoving(unit)) {
    stopUnit(unit);
    return;
  }

  // Stuck detection: crowded slots must not make units jostle forever.
  const end = finalWaypoint(unit)!;
  const remaining = Math.hypot(end.x - unit.x, end.y - unit.y);
  if (remaining < unit.bestDistance - 0.5) {
    unit.bestDistance = remaining;
    unit.stuckTime = 0;
  } else {
    unit.stuckTime += dt;
    const arrived = unit.stuckTime >= config.stuckTimeout && remaining <= config.stuckArriveDistance;
    if (arrived || unit.stuckTime >= config.giveUpTimeout) {
      stopUnit(unit);
    }
  }
}

function separate(units: Unit[], grid: WalkGrid, config: MovementConfig): void {
  const n = units.length;
  for (let i = 0; i < n; i++) {
    const a = units[i]!;
    for (let j = i + 1; j < n; j++) {
      const b = units[j]!;
      const minDistance = a.radius + b.radius;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      if (Math.abs(dx) >= minDistance || Math.abs(dy) >= minDistance) continue;
      let distance = Math.hypot(dx, dy);
      if (distance >= minDistance) continue;
      if (distance < 1e-6) {
        // Exactly on top of each other: push apart in a deterministic direction.
        const angle = ((a.id * 73 + b.id * 37) % 360) * (Math.PI / 180);
        dx = Math.cos(angle);
        dy = Math.sin(angle);
        distance = 1;
      }
      const overlap = (minDistance - distance) * config.separationStrength;
      const ux = dx / distance;
      const uy = dy / distance;
      // A moving unit pushes idle units aside more than it is pushed itself.
      const aMoving = isMoving(a);
      const bMoving = isMoving(b);
      const shareA = aMoving === bMoving ? 0.5 : aMoving ? 0.25 : 0.75;
      const shareB = 1 - shareA;
      moveTo(a, grid, config.tileSize, a.x - ux * overlap * shareA, a.y - uy * overlap * shareA);
      moveTo(b, grid, config.tileSize, b.x + ux * overlap * shareB, b.y + uy * overlap * shareB);
    }
  }
}

/** Moves a unit if the target tile is walkable; otherwise tries sliding along one axis. */
function moveTo(unit: Unit, grid: WalkGrid, size: number, x: number, y: number): void {
  const ok = (px: number, py: number) => isWalkable(grid, Math.floor(px / size), Math.floor(py / size));
  if (ok(x, y)) {
    unit.x = x;
    unit.y = y;
  } else if (ok(x, unit.y)) {
    unit.x = x;
  } else if (ok(unit.x, y)) {
    unit.y = y;
  }
}
