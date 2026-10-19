import { UNIT_TYPES, type Faction, type UnitTypeId } from '../data/units';

export interface Point {
  x: number;
  y: number;
}

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
