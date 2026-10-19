import { getArmor, type ArmorDefinition } from '../data/armor';
import { DAMAGE } from '../data/combat';
import { getUnitType, type Faction } from '../data/units';
import { getWeapon, type UnitTag, type WeaponDefinition } from '../data/weapons';
import { isMoving, setUnitRoute, stopUnit, type Point, type Unit } from '../entities/Unit';
import type { TileGrid } from '../map/mapGenerator';
import { getTileDefinition } from '../map/tiles';
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
  /** Ranged cover per tile (`grid[y][x]`, share of shots that miss); no cover if omitted. */
  coverGrid?: CoverGrid;
  /** Random source in [0, 1) for hit rolls; `Math.random` if omitted. Pass a seeded one in tests. */
  random?: () => number;
}

/** Share of ranged shots that miss, per tile, indexed as `grid[y][x]`. */
export type CoverGrid = number[][];

export function buildCoverGrid(tiles: TileGrid): CoverGrid {
  return tiles.map((row) => row.map((type) => getTileDefinition(type).rangedCover));
}

/** Chance (0..1) that a ranged shot hits a unit standing at world point (x, y). */
export function rangedHitChance(cover: CoverGrid | undefined, tileSize: number, x: number, y: number): number {
  const value = cover?.[Math.floor(y / tileSize)]?.[Math.floor(x / tileSize)] ?? 0;
  return 1 - value;
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
  | {
      kind: 'miss';
      attackerId: number;
      targetId: number;
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

export interface DamageInput {
  weapon: WeaponDefinition;
  /** Attacker's training multiplier (`UnitTypeDefinition.attack`). */
  attack: number;
  armor: ArmorDefinition;
  /** Target's close-combat defence (`UnitTypeDefinition.defense`); ignored for ranged weapons. */
  defense: number;
  targetTags?: readonly UnitTag[];
}

/**
 * Hit points a single hit removes (formula documented at `DAMAGE` in data/combat.ts):
 * armour absorbs a share of the damage, armour-piercing weapons ignore part of that
 * protection, trained units parry part of close-combat damage. At least `minDamage`.
 */
export function computeDamage({ weapon, attack, armor, defense, targetTags = [] }: DamageInput): number {
  const armorFactor = 1 - armor.protection * (1 - weapon.armorPiercing);
  const defenseFactor = weapon.kind === 'melee' ? 1 - defense : 1;
  let bonus = 1;
  for (const tag of targetTags) bonus *= weapon.bonusAgainst[tag] ?? 1;
  return Math.max(DAMAGE.minDamage, weapon.damage * attack * armorFactor * defenseFactor * bonus);
}

/** Damage `attacker` deals to `target` with `weapon`, using both units' type values and the target's armour. */
export function damageAgainst(attacker: Unit, weapon: WeaponDefinition, target: Unit): number {
  const targetType = getUnitType(target.typeId);
  return computeDamage({
    weapon,
    attack: getUnitType(attacker.typeId).attack,
    armor: getArmor(target.equipment.armor),
    defense: targetType.defense,
    targetTags: targetType.tags,
  });
}

/** The unit's main weapon. */
export function mainWeapon(unit: Unit): WeaponDefinition {
  return getWeapon(unit.equipment.weapon);
}

/** Weapon used against an adjacent enemy: the sidearm of ranged units (bare-handed knife if none). */
function closeCombatWeapon(unit: Unit): WeaponDefinition {
  const main = mainWeapon(unit);
  if (main.kind === 'melee') return main;
  return getWeapon(unit.equipment.sidearm ?? 'knife');
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
  const weapon = mainWeapon(unit);
  return Math.max(config.acquisitionRadius, weapon.kind === 'ranged' ? weapon.range + unit.radius * 2 : 0);
}

/** Largest gap (px) at which the unit can hit anything without moving. */
export function maxReach(unit: Unit): number {
  return mainWeapon(unit).range;
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

function attack(
  unit: Unit,
  target: Unit,
  weapon: WeaponDefinition,
  config: CombatConfig,
  events: CombatEvent[],
): void {
  const ranged = weapon.kind === 'ranged';
  unit.attackCooldown = weapon.cooldown;
  target.lastAttackerId = unit.id;
  if (ranged) {
    const chance = rangedHitChance(config.coverGrid, config.tileSize, target.x, target.y);
    if (chance < 1 && (config.random ?? Math.random)() >= chance) {
      events.push({
        kind: 'miss',
        attackerId: unit.id,
        targetId: target.id,
        fromX: unit.x,
        fromY: unit.y,
        toX: target.x,
        toY: target.y,
      });
      return;
    }
  }
  const damage = damageAgainst(unit, weapon, target);
  target.hp -= damage;
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
  const main = mainWeapon(unit);
  let foe = target;
  if (main.kind === 'ranged' && edgeDistance(unit, target) > config.meleeReach) {
    const adjacent = nearestEnemy(unit, units, (e) => edgeDistance(unit, e) <= config.meleeReach);
    if (adjacent) foe = adjacent;
  }
  const gap = edgeDistance(unit, foe);
  const weapon = main.kind === 'ranged' && gap <= config.meleeReach ? closeCombatWeapon(unit) : main;

  if (gap <= weapon.range) {
    if (isMoving(unit)) stopUnit(unit);
    if (unit.attackCooldown <= 0) attack(unit, foe, weapon, config, events);
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
      if (!isAlive(target) || edgeDistance(unit, target) > maxReach(unit)) {
        const reach = maxReach(unit);
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

/** Every unit attacks the nearest enemy, wherever it is (used by the 100-unit performance test). */
export function orderGeneralAttack(units: readonly Unit[]): void {
  for (const unit of units) {
    const target = nearestEnemy(unit, units, () => true);
    if (target) orderAttack([unit], target);
  }
}
