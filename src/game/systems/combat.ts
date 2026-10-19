import { getUnitType, type Faction, type MeleeAttack, type RangedAttack } from '../data/units';
import { isMoving, setUnitRoute, stopUnit, type Point, type Unit } from '../entities/Unit';
import { worldPath } from './formation';
import { hasLineOfSight, nearestWalkableTile, worldToTile, type WalkGrid } from './pathfinding';

export interface CombatConfig {
  tileSize: number;
  meleeReach: number;
  acquisitionRadius: number;
  leashRadius: number;
  alertRadius: number;
  repathInterval: number;
  lineOfSightMargin: number;
}

/** Something that happened during a combat step, for visual feedback in the scene. */
export type CombatEvent =
  | {
      kind: 'hit';
      attackerId: number;
      targetId: number;
      ranged: boolean;
      damage: number;
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
    }
  | { kind: 'death'; unitId: number; faction: Faction; x: number; y: number };

export type BattleOutcome = 'running' | 'victory' | 'defeat';

/** Victory when no enemy is left, defeat when no player unit is left (defeat wins a tie). */
export function evaluateOutcome(units: readonly Unit[]): BattleOutcome {
  const alive = units.filter((u) => u.hp > 0);
  if (!alive.some((u) => u.faction === 'player')) return 'defeat';
  if (!alive.some((u) => u.faction === 'enemy')) return 'victory';
  return 'running';
}

/** Hit points a single attack removes. Armour and weapon bonuses follow in milestone 3. */
export function computeDamage(attack: MeleeAttack | RangedAttack): number {
  return Math.max(0, attack.damage);
}

/** Gap between two unit circles (px); 0 or less when they touch. */
export function edgeDistance(a: Unit, b: Unit): number {
  return Math.hypot(a.x - b.x, a.y - b.y) - a.radius - b.radius;
}

function isAlive(unit: Unit | undefined): unit is Unit {
  return unit !== undefined && unit.hp > 0;
}

/** Distance (px, centre to centre) within which an idle unit notices enemies. */
export function acquisitionRange(unit: Unit, config: CombatConfig): number {
  const ranged = getUnitType(unit.typeId).ranged;
  return Math.max(config.acquisitionRadius, ranged ? ranged.range + unit.radius * 2 : 0);
}

/** Largest gap (px) at which the unit can hit anything without moving. */
export function maxReach(unit: Unit, config: CombatConfig): number {
  return getUnitType(unit.typeId).ranged?.range ?? config.meleeReach;
}

/** Nearest living enemy of `unit` that satisfies `within` (ties broken by lower id). */
function nearestEnemy(
  unit: Unit,
  units: readonly Unit[],
  within: (enemy: Unit) => boolean,
): Unit | undefined {
  let best: Unit | undefined;
  let bestDistance = Infinity;
  for (const other of units) {
    if (other.faction === unit.faction || !isAlive(other) || !within(other)) continue;
    const distance = Math.hypot(other.x - unit.x, other.y - unit.y);
    if (distance < bestDistance || (distance === bestDistance && best && other.id < best.id)) {
      best = other;
      bestDistance = distance;
    }
  }
  return best;
}

/** Nearest enemy an idle unit would notice. */
export function findTarget(unit: Unit, units: readonly Unit[], config: CombatConfig): Unit | undefined {
  const range = acquisitionRange(unit, config);
  return nearestEnemy(unit, units, (e) => Math.hypot(e.x - unit.x, e.y - unit.y) <= range);
}

/** Becomes idle where it stands; this spot is the new post. */
function becomeIdle(unit: Unit): void {
  stopUnit(unit);
  unit.order = 'idle';
  unit.targetId = null;
  unit.home = { x: unit.x, y: unit.y };
}

/** Routes a unit to a world point: straight if the way is clear, otherwise via A*. */
function routeTowards(unit: Unit, grid: WalkGrid, dest: Point, config: CombatConfig): boolean {
  const { tileSize, lineOfSightMargin } = config;
  if (hasLineOfSight(grid, tileSize, unit.x, unit.y, dest.x, dest.y, lineOfSightMargin)) {
    setUnitRoute(unit, [{ x: dest.x, y: dest.y }]);
    return true;
  }
  const tile = nearestWalkableTile(grid, worldToTile(dest.x, dest.y, tileSize));
  if (!tile) return false;
  const path = worldPath(grid, tileSize, unit, tile, dest, lineOfSightMargin);
  if (!path) return false;
  setUnitRoute(unit, path.slice(1));
  return true;
}

/** Gives up the fight and walks back to the post; enemies are ignored on the way. */
function returnHome(unit: Unit, grid: WalkGrid, config: CombatConfig): void {
  unit.targetId = null;
  unit.lastAttackerId = null;
  unit.order = 'return';
  if (!routeTowards(unit, grid, unit.home, config)) becomeIdle(unit);
}

function attack(unit: Unit, target: Unit, ranged: boolean, events: CombatEvent[]): void {
  const type = getUnitType(unit.typeId);
  const attackDef = ranged && type.ranged ? type.ranged : type.melee;
  const damage = computeDamage(attackDef);
  target.hp -= damage;
  target.lastAttackerId = unit.id;
  unit.attackCooldown = attackDef.cooldown;
  events.push({
    kind: 'hit',
    attackerId: unit.id,
    targetId: target.id,
    ranged,
    damage,
    fromX: unit.x,
    fromY: unit.y,
    toX: target.x,
    toY: target.y,
  });
}

/**
 * Fights `target`: attacks if it is within reach, otherwise moves towards it
 * (unless `canMove` is false). Ranged units switch to close combat against an
 * enemy standing right next to them — they are vulnerable there.
 * Returns the enemy actually fought, or `undefined` if none is within reach and the unit may not move.
 */
function fight(
  unit: Unit,
  target: Unit,
  units: readonly Unit[],
  grid: WalkGrid,
  config: CombatConfig,
  events: CombatEvent[],
  canMove: boolean,
): Unit | undefined {
  const type = getUnitType(unit.typeId);
  let foe = target;
  if (type.ranged && edgeDistance(unit, target) > config.meleeReach) {
    const adjacent = nearestEnemy(unit, units, (e) => edgeDistance(unit, e) <= config.meleeReach);
    if (adjacent) foe = adjacent;
  }
  const gap = edgeDistance(unit, foe);
  const useRanged = type.ranged !== undefined && gap > config.meleeReach;
  const reach = useRanged ? type.ranged!.range : config.meleeReach;

  if (gap <= reach) {
    if (isMoving(unit)) stopUnit(unit);
    if (unit.attackCooldown <= 0) attack(unit, foe, useRanged, events);
    return foe;
  }
  if (!canMove) return undefined;
  if (unit.repathTimer <= 0 || !isMoving(unit)) {
    unit.repathTimer = config.repathInterval;
    if (!routeTowards(unit, grid, foe, config)) return undefined;
  }
  return foe;
}

/** Idle allies close to `unit` join its fight against `target`. */
function alertAllies(unit: Unit, target: Unit, units: readonly Unit[], config: CombatConfig): void {
  for (const ally of units) {
    if (ally === unit || ally.faction !== unit.faction || ally.order !== 'idle' || !isAlive(ally)) continue;
    if (Math.hypot(ally.x - unit.x, ally.y - unit.y) > config.alertRadius) continue;
    ally.order = 'engage';
    ally.targetId = target.id;
    ally.repathTimer = 0;
  }
}

function updateUnit(
  unit: Unit,
  units: readonly Unit[],
  byId: ReadonlyMap<number, Unit>,
  grid: WalkGrid,
  config: CombatConfig,
  events: CombatEvent[],
): void {
  switch (unit.order) {
    case 'move':
    case 'retreat':
    case 'return':
      if (!isMoving(unit)) becomeIdle(unit);
      return;

    case 'hold': {
      let target = byId.get(unit.targetId ?? -1);
      if (!isAlive(target) || edgeDistance(unit, target) > maxReach(unit, config)) {
        const reach = maxReach(unit, config);
        target = nearestEnemy(unit, units, (e) => edgeDistance(unit, e) <= reach);
      }
      unit.targetId = target?.id ?? null;
      if (target) fight(unit, target, units, grid, config, events, false);
      return;
    }

    case 'attack': {
      const target = byId.get(unit.targetId ?? -1);
      if (isAlive(target)) {
        if (!fight(unit, target, units, grid, config, events, true)) becomeIdle(unit);
        return;
      }
      // Target fallen: guard this spot and take on the next enemy nearby.
      becomeIdle(unit);
      break;
    }

    case 'engage': {
      if (Math.hypot(unit.x - unit.home.x, unit.y - unit.home.y) > config.leashRadius) {
        returnHome(unit, grid, config);
        return;
      }
      let target = byId.get(unit.targetId ?? -1);
      if (!isAlive(target)) target = findTarget(unit, units, config);
      if (!target) {
        returnHome(unit, grid, config);
        return;
      }
      unit.targetId = target.id;
      if (!fight(unit, target, units, grid, config, events, true)) returnHome(unit, grid, config);
      return;
    }

    case 'idle':
      break;
  }

  // Idle: fight back against an attacker near the post, otherwise take on the nearest enemy in sight.
  const attacker = byId.get(unit.lastAttackerId ?? -1);
  const target =
    isAlive(attacker) &&
    Math.hypot(attacker.x - unit.home.x, attacker.y - unit.home.y) <= config.leashRadius
      ? attacker
      : findTarget(unit, units, config);
  unit.lastAttackerId = null;
  if (!target) return;
  unit.order = 'engage';
  unit.targetId = target.id;
  unit.repathTimer = 0;
  alertAllies(unit, target, units, config);
  fight(unit, target, units, grid, config, events, true);
}

/**
 * Advances combat by `dt` seconds: target selection, chasing, attacks, enemy
 * reactions (guard, notice, attack, chase, return) and removal of fallen
 * units from `units`. Run before `stepMovement` each step.
 */
export function stepCombat(units: Unit[], grid: WalkGrid, dt: number, config: CombatConfig): CombatEvent[] {
  const events: CombatEvent[] = [];
  const byId = new Map(units.map((u) => [u.id, u]));
  for (const unit of units) {
    if (!isAlive(unit)) continue;
    unit.attackCooldown = Math.max(0, unit.attackCooldown - dt);
    unit.repathTimer = Math.max(0, unit.repathTimer - dt);
    updateUnit(unit, units, byId, grid, config, events);
  }
  for (let i = units.length - 1; i >= 0; i--) {
    const unit = units[i]!;
    if (unit.hp > 0) continue;
    events.push({ kind: 'death', unitId: unit.id, faction: unit.faction, x: unit.x, y: unit.y });
    units.splice(i, 1);
  }
  return events;
}

/** Explicit attack order for a group of units. */
export function orderAttack(units: readonly Unit[], target: Unit): void {
  for (const unit of units) {
    if (unit.faction === target.faction) continue;
    unit.order = 'attack';
    unit.targetId = target.id;
    unit.repathTimer = 0;
  }
}

/** Units stop and hold their position; they only fight enemies within their own reach. */
export function orderHold(units: readonly Unit[]): void {
  for (const unit of units) {
    stopUnit(unit);
    unit.order = 'hold';
    unit.targetId = null;
  }
}

/**
 * Marks units as marching (`move` or `retreat`) after they received a route,
 * so they leave any fight and ignore enemies until they arrive.
 */
export function markMarching(units: readonly Unit[], order: 'move' | 'retreat'): void {
  for (const unit of units) {
    unit.order = order;
    unit.targetId = null;
    unit.lastAttackerId = null;
  }
}
