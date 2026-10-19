import { describe, expect, it } from 'vitest';
import { COMBAT } from '../game/data/combat';
import { TEST_MAP } from '../game/data/maps';
import { MOVEMENT } from '../game/data/movement';
import { TEST_SCENARIO } from '../game/data/testScenario';
import { UNIT_TYPES, type UnitTypeId } from '../game/data/units';
import { WEAPONS } from '../game/data/weapons';
import { createUnit, isMoving, type Unit } from '../game/entities/Unit';
import { spawnUnits } from '../game/entities/UnitFactory';
import { generateMap } from '../game/map/mapGenerator';
import {
  damageAgainst,
  evaluateOutcome,
  findTarget,
  markMarching,
  orderAttack,
  orderHold,
  stepCombat,
  type BattleOutcome,
  type CombatConfig,
  type CombatEvent,
} from '../game/systems/combat';
import { orderGroupMove } from '../game/systems/formation';
import { stepMovement, type MovementConfig } from '../game/systems/movement';
import { buildWalkGrid, type WalkGrid } from '../game/systems/pathfinding';

const tileSize = TEST_MAP.tileSize;
const movementConfig: MovementConfig = {
  tileSize,
  waypointReachDistance: MOVEMENT.waypointReachDistance,
  separationStrength: MOVEMENT.separationStrength,
  stuckTimeout: MOVEMENT.stuckTimeout,
  stuckArriveDistance: MOVEMENT.stuckArriveSpacings * MOVEMENT.formationSpacing,
  giveUpTimeout: MOVEMENT.giveUpTimeout,
  lineOfSightMargin: MOVEMENT.lineOfSightMargin,
};
const config: CombatConfig = { tileSize, ...COMBAT, lineOfSightMargin: MOVEMENT.lineOfSightMargin };
const dt = 1 / 30;

function openGrid(width = 40, height = 30): WalkGrid {
  return Array.from({ length: height }, () => new Array<number>(width).fill(1));
}

let nextId = 1;
function unit(typeId: UnitTypeId, x: number, y: number): Unit {
  return createUnit(nextId++, typeId, x, y);
}

/** Runs combat + movement like the mission scene. Stops early when `until` returns true. */
function run(
  units: Unit[],
  grid: WalkGrid,
  seconds: number,
  until?: () => boolean,
): { events: CombatEvent[]; elapsed: number } {
  const events: CombatEvent[] = [];
  let t = 0;
  while (t < seconds) {
    events.push(...stepCombat(units, grid, dt, config));
    stepMovement(units, grid, dt, movementConfig);
    t += dt;
    if (until?.()) break;
  }
  return { events, elapsed: t };
}

describe('Schaden und Lebenspunkte', () => {
  it('Einheiten starten mit vollen Lebenspunkten ihres Typs', () => {
    const u = unit('guard', 0, 0);
    expect(u.hp).toBe(UNIT_TYPES.guard.maxHp);
    expect(u.maxHp).toBe(UNIT_TYPES.guard.maxHp);
  });

  it('ein Treffer zieht genau den Schaden des Angriffs ab', () => {
    const grid = openGrid();
    const a = unit('peasant', 100, 100);
    const b = unit('guard', 100 + 14 + 2, 100); // touching (radii 7 + 7) plus 2 px
    orderAttack([a], b);
    stepCombat([a, b], grid, dt, config);
    expect(b.hp).toBeCloseTo(UNIT_TYPES.guard.maxHp - damageAgainst(a, WEAPONS.improvised, b), 6);
  });

  it('respektiert den Angriffstakt', () => {
    const grid = openGrid();
    const a = unit('peasant', 100, 100);
    const b = unit('guard', 116, 100);
    b.order = 'hold'; // keeps the guard from hitting back and moving
    b.hp = 1000;
    orderAttack([a], b);
    const hits = () => events.filter((e) => e.kind === 'hit' && e.attackerId === a.id).length;
    const events: CombatEvent[] = [];
    let t = 0;
    while (t < 2.95) {
      events.push(...stepCombat([a, b], grid, dt, config).filter((e) => e.kind === 'hit' && e.attackerId === a.id));
      t += dt;
    }
    // Cooldown 1 s: hits at t≈0, 1, 2.
    expect(hits()).toBe(3);
  });

  it('gefallene Einheiten werden entfernt und als Todesereignis gemeldet', () => {
    const grid = openGrid();
    const a = unit('peasant', 100, 100);
    const b = unit('guard', 116, 100);
    b.hp = 3;
    const units = [a, b];
    orderAttack([a], b);
    const events = stepCombat(units, grid, dt, config);
    expect(units).toEqual([a]);
    expect(events).toContainEqual(expect.objectContaining({ kind: 'death', unitId: b.id, faction: 'enemy' }));
  });

  it('nach dem Tod des Ziels sucht die Einheit das nächste Ziel in der Nähe', () => {
    const grid = openGrid();
    const a = unit('peasant', 100, 100);
    const b = unit('guard', 116, 100);
    const c = unit('guard', 160, 100);
    b.hp = 1;
    c.order = 'hold';
    const units = [a, b, c];
    orderAttack([a], b);
    run(units, grid, 0.2);
    expect(units).not.toContain(b);
    expect(a.targetId).toBe(c.id);
  });
});

describe('Zielwahl', () => {
  it('wählt den nächsten Gegner, nie eine eigene Einheit', () => {
    const a = unit('peasant', 100, 100);
    const friend = unit('peasant', 105, 100);
    const far = unit('guard', 200, 100);
    const near = unit('guard', 150, 100);
    expect(findTarget(a, [a, friend, far, near], config)).toBe(near);
  });

  it('bemerkt Gegner außerhalb der Wahrnehmung nicht', () => {
    const a = unit('peasant', 100, 100);
    const far = unit('guard', 100 + COMBAT.acquisitionRadius + 50, 100);
    expect(findTarget(a, [a, far], config)).toBeUndefined();
  });

  it('Fernkämpfer bemerken Gegner bis zu ihrer Reichweite', () => {
    const range = WEAPONS.crossbow.range;
    const a = unit('crossbowman', 100, 100);
    const e = unit('guard', 100 + range + 10, 100);
    expect(findTarget(a, [a, e], config)).toBe(e);
  });
});

describe('Nahkampf und Fernkampf', () => {
  it('Fernkämpfer schießen aus der Distanz, ohne heranzulaufen', () => {
    const grid = openGrid();
    const archer = unit('crossbowman', 100, 300);
    const target = unit('guard', 100 + 120, 300);
    target.order = 'hold';
    const units = [archer, target];
    orderAttack([archer], target);
    const { events } = run(units, grid, 0.1);
    expect(events).toContainEqual(expect.objectContaining({ kind: 'hit', attackerId: archer.id, ranged: true }));
    expect(archer.x).toBeCloseTo(100, 0);
    expect(target.hp).toBeCloseTo(UNIT_TYPES.guard.maxHp - damageAgainst(archer, WEAPONS.crossbow, target), 6);
  });

  it('Nahkämpfer laufen zum Ziel und schlagen erst in Kontakt zu', () => {
    const grid = openGrid();
    const peasant = unit('peasant', 100, 300);
    const target = unit('guard', 220, 300);
    target.order = 'hold';
    const units = [peasant, target];
    orderAttack([peasant], target);
    const first = run(units, grid, 0.1);
    expect(first.events.filter((e) => e.kind === 'hit' && e.attackerId === peasant.id)).toHaveLength(0);
    const later = run(units, grid, 3);
    expect(later.events).toContainEqual(expect.objectContaining({ kind: 'hit', attackerId: peasant.id, ranged: false }));
  });

  it('Fernkämpfer im Nahkampf wechseln auf ihre schwache Nahkampfwaffe', () => {
    const grid = openGrid();
    const archer = unit('crossbowman', 300, 300);
    const distant = unit('guard', 420, 300);
    const adjacent = unit('guard', 316, 300);
    distant.order = 'hold';
    adjacent.order = 'hold';
    adjacent.hp = 1000;
    const units = [archer, distant, adjacent];
    orderAttack([archer], distant);
    const events = stepCombat(units, grid, dt, config);
    expect(events).toContainEqual(
      expect.objectContaining({ kind: 'hit', attackerId: archer.id, targetId: adjacent.id, ranged: false }),
    );
    expect(adjacent.hp).toBeCloseTo(1000 - damageAgainst(archer, WEAPONS.knife, adjacent), 6);
  });
});

describe('Befehle', () => {
  it('Halten: Einheit bewegt sich nicht, greift aber Gegner in Reichweite an', () => {
    const grid = openGrid();
    const holder = unit('peasant', 300, 300);
    const enemy = unit('guard', 380, 300);
    enemy.order = 'hold';
    orderHold([holder]);
    const units = [holder, enemy];
    run(units, grid, 2);
    expect(holder.x).toBeCloseTo(300, 0);
    expect(enemy.hp).toBe(UNIT_TYPES.guard.maxHp);

    // Enemy steps into reach → attacked.
    enemy.x = 316;
    const { events } = run(units, grid, 0.1);
    expect(events).toContainEqual(expect.objectContaining({ kind: 'hit', attackerId: holder.id }));
  });

  it('Rückzug löst Einheiten aus dem Kampf und führt sie zum Sammelpunkt', () => {
    const grid = openGrid();
    const peasants = [unit('peasant', 600, 300), unit('peasant', 600, 320)];
    const guard = unit('guard', 616, 300);
    guard.home = { x: 616, y: 300 };
    const units = [...peasants, guard];
    orderAttack(peasants, guard);
    run(units, grid, 1);
    expect(peasants.every((p) => p.order === 'attack')).toBe(true);

    const rally = { x: 100, y: 300 };
    orderGroupMove(peasants, grid, tileSize, rally, MOVEMENT.formationSpacing, MOVEMENT.lineOfSightMargin);
    markMarching(peasants, 'retreat');
    run(units, grid, 15, () => peasants.every((p) => p.order === 'idle'));

    for (const p of peasants) {
      expect(p.hp).toBeGreaterThan(0);
      expect(Math.hypot(p.x - rally.x, p.y - rally.y)).toBeLessThan(MOVEMENT.formationSpacing * 3);
      expect(p.order).toBe('idle');
    }
    // The guard gave up the chase and went back to its post.
    run(units, grid, 15, () => guard.order === 'idle');
    expect(Math.hypot(guard.x - 616, guard.y - 300)).toBeLessThan(10);
  });
});

describe('Gegner-KI', () => {
  it('bewacht ihren Posten, solange niemand in Sicht ist', () => {
    const grid = openGrid();
    const guard = unit('guard', 600, 300);
    const peasant = unit('peasant', 100, 300);
    run([guard, peasant], grid, 2);
    expect(guard.order).toBe('idle');
    expect(guard.x).toBeCloseTo(600, 0);
  });

  it('entdeckt, verfolgt und greift an; Nachbarn werden alarmiert', () => {
    const grid = openGrid();
    const guards = [unit('guard', 600, 300), unit('guard', 600, 380)];
    const peasant = unit('peasant', 600 - COMBAT.acquisitionRadius + 20, 300);
    peasant.order = 'hold';
    peasant.hp = 1000;
    const units = [...guards, peasant];
    const { events } = run(units, grid, 4);
    for (const g of guards) {
      expect(g.order).toBe('engage');
      expect(events).toContainEqual(expect.objectContaining({ kind: 'hit', attackerId: g.id }));
    }
  });

  it('gibt die Verfolgung jenseits der Leine auf und kehrt zurück', () => {
    const grid = openGrid(60, 20);
    const guard = unit('guard', 600, 300);
    const peasant = unit('peasant', 600 - 100, 300);
    const units = [guard, peasant];
    // The peasant flees west; the guard follows until the leash runs out.
    orderGroupMove([peasant], grid, tileSize, { x: 40, y: 300 }, MOVEMENT.formationSpacing, MOVEMENT.lineOfSightMargin);
    markMarching([peasant], 'move');
    peasant.speed = 200;
    let maxAway = 0;
    let t = 0;
    while (t < 20) {
      stepCombat(units, grid, dt, config);
      stepMovement(units, grid, dt, movementConfig);
      maxAway = Math.max(maxAway, Math.hypot(guard.x - 600, guard.y - 300));
      t += dt;
    }
    expect(maxAway).toBeGreaterThan(50);
    expect(maxAway).toBeLessThan(COMBAT.leashRadius + 20);
    expect(guard.order).toBe('idle');
    expect(Math.hypot(guard.x - 600, guard.y - 300)).toBeLessThan(10);
  });

  it('wehrt sich gegen Beschuss von außerhalb der Wahrnehmung', () => {
    const grid = openGrid();
    const guard = unit('guard', 600, 300);
    const archer = unit('crossbowman', 600 - 160, 300);
    const units = [guard, archer];
    orderAttack([archer], guard);
    run(units, grid, 0.5);
    expect(guard.order).toBe('engage');
    expect(guard.targetId).toBe(archer.id);
  });
});

describe('Sieg und Niederlage', () => {
  it('erkennt laufend, Sieg und Niederlage', () => {
    const p = unit('peasant', 0, 0);
    const e = unit('guard', 0, 0);
    expect(evaluateOutcome([p, e])).toBe('running');
    expect(evaluateOutcome([p])).toBe('victory');
    expect(evaluateOutcome([e])).toBe('defeat');
    expect(evaluateOutcome([])).toBe('defeat');
  });

  function battle(playerSpawns: Unit[], enemySpawns: Unit[], grid: WalkGrid): BattleOutcome {
    const units = [...playerSpawns, ...enemySpawns];
    const target = enemySpawns[0]!;
    orderAttack(playerSpawns, target);
    let outcome: BattleOutcome = 'running';
    run(units, grid, 120, () => (outcome = evaluateOutcome(units)) !== 'running');
    return outcome;
  }

  it('ein Kampf zweier kleiner Gruppen endet mit Sieg oder Niederlage', () => {
    const grid = openGrid();
    const many = Array.from({ length: 8 }, (_, i) => unit('peasant', 200, 200 + i * 18));
    const few = [unit('guard', 400, 260), unit('guard', 400, 280)];
    expect(battle(many, few, grid)).toBe('victory');

    const lone = [unit('peasant', 200, 300)];
    const guards = [unit('guard', 400, 290), unit('guard', 400, 310)];
    expect(battle(lone, guards, grid)).toBe('defeat');
  });

  it('Testszenario: geschlossener Angriff gewinnt, ein einzelner Bauer verliert', () => {
    const grid = buildWalkGrid(generateMap(TEST_MAP));
    const all = spawnUnits(grid, tileSize, TEST_SCENARIO, MOVEMENT.formationSpacing);
    const players = all.filter((u) => u.faction === 'player');
    const enemies = all.filter((u) => u.faction === 'enemy');
    // Whole group attacks one enemy after another, like a player clicking each enemy.
    let outcome: BattleOutcome = 'running';
    for (let round = 0; round < 40 && outcome === 'running'; round++) {
      const target = enemies.find((e) => all.includes(e));
      if (!target) break;
      orderAttack(players.filter((p) => all.includes(p) && p.order !== 'attack'), target);
      run(all, grid, 30, () => !all.includes(target) || (outcome = evaluateOutcome(all)) !== 'running');
      outcome = evaluateOutcome(all);
    }
    expect(outcome).toBe('victory');

    const all2 = spawnUnits(grid, tileSize, TEST_SCENARIO, MOVEMENT.formationSpacing);
    const lone = all2.find((u) => u.typeId === 'peasant')!;
    for (const p of all2) if (p.faction === 'player' && p !== lone) p.hp = 0;
    stepCombat(all2, grid, dt, config); // removes the zeroed units
    orderAttack([lone], all2.find((u) => u.faction === 'enemy')!);
    let outcome2: BattleOutcome = 'running';
    run(all2, grid, 120, () => (outcome2 = evaluateOutcome(all2)) !== 'running');
    expect(outcome2).toBe('defeat');
  });

  it('isMoving bleibt nach Kampfende konsistent (keine hängenden Routen bei Haltenden)', () => {
    const grid = openGrid();
    const a = unit('peasant', 100, 100);
    orderHold([a]);
    run([a], grid, 1);
    expect(isMoving(a)).toBe(false);
  });
});
