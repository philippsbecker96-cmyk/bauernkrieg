import { UNIT_TYPES, type Faction, type UnitTypeId } from '../data/units';

export interface Point {
  x: number;
  y: number;
}

/**
 * What a unit is currently doing:
 * - `idle`: standing at its post (`home`), engages enemies that come close or attack it.
 * - `move` / `retreat`: explicit march order; enemies are ignored until arrival.
 * - `attack`: explicit order to attack `targetId`, chased without limit.
 * - `engage`: fighting on its own initiative, at most `leashRadius` away from its post.
 * - `return`: walking back to its post after giving up a chase; enemies are ignored.
 * - `hold`: never moves, attacks only enemies within its own reach.
 */
export type UnitOrder = 'idle' | 'move' | 'retreat' | 'attack' | 'engage' | 'return' | 'hold';

/** Simulation state of one unit. Pure data, no Phaser dependency. */
export interface Unit {
  id: number;
  typeId: UnitTypeId;
  faction: Faction;
  x: number;
  y: number;
  radius: number;
  speed: number;
  /** World-space waypoints of the current move order; empty when idle. */
  waypoints: Point[];
  /** Index of the waypoint the unit is currently heading for. */
  waypointIndex: number;
  /** Best distance to the final waypoint so far, for stuck detection. */
  bestDistance: number;
  /** Seconds without progress towards the final waypoint. */
  stuckTime: number;
  hp: number;
  maxHp: number;
  order: UnitOrder;
  /** Enemy being attacked (`attack`, `engage`, `hold`), if any. */
  targetId: number | null;
  /** Seconds until the next attack is possible. */
  attackCooldown: number;
  /** Seconds until the chase path may be recomputed. */
  repathTimer: number;
  /** Post the unit guards and returns to; updated whenever it becomes idle. */
  home: Point;
  /** Last enemy that hit this unit; idle units fight back. */
  lastAttackerId: number | null;
}

export function createUnit(id: number, typeId: UnitTypeId, x: number, y: number): Unit {
  const type = UNIT_TYPES[typeId];
  return {
    id,
    typeId,
    faction: type.faction,
    x,
    y,
    radius: type.radius,
    speed: type.speed,
    waypoints: [],
    waypointIndex: 0,
    bestDistance: Infinity,
    stuckTime: 0,
    hp: type.maxHp,
    maxHp: type.maxHp,
    order: 'idle',
    targetId: null,
    attackCooldown: 0,
    repathTimer: 0,
    home: { x, y },
    lastAttackerId: null,
  };
}

export function isMoving(unit: Unit): boolean {
  return unit.waypointIndex < unit.waypoints.length;
}

export function stopUnit(unit: Unit): void {
  unit.waypoints = [];
  unit.waypointIndex = 0;
  unit.bestDistance = Infinity;
  unit.stuckTime = 0;
}

export function setUnitRoute(unit: Unit, waypoints: Point[]): void {
  unit.waypoints = waypoints;
  unit.waypointIndex = 0;
  unit.bestDistance = Infinity;
  unit.stuckTime = 0;
}

/** Final destination of the current order, if any. */
export function finalWaypoint(unit: Unit): Point | undefined {
  return unit.waypoints[unit.waypoints.length - 1];
}
