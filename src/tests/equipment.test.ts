import { describe, expect, it } from 'vitest';
import { ARMORS } from '../game/data/armor';
import { COMBAT, DAMAGE } from '../game/data/combat';
import { TEST_MAP } from '../game/data/maps';
import { MOVEMENT } from '../game/data/movement';
import { UNIT_TYPES, getUnitType, type UnitTypeId } from '../game/data/units';
import { WEAPONS, type WeaponDefinition } from '../game/data/weapons';
import { createUnit, type Unit } from '../game/entities/Unit';
import { createRandom } from '../game/map/random';
import { TileType } from '../game/map/tiles';
import {
  buildCoverGrid,
  computeDamage,
  damageAgainst,
  evaluateOutcome,
  orderAttack,
  orderHold,
  rangedHitChance,
  stepCombat,
  type BattleOutcome,
  type CombatConfig,
  type CombatEvent,
} from '../game/systems/combat';
import { stepMovement, type MovementConfig } from '../game/systems/movement';
import { type WalkGrid } from '../game/systems/pathfinding';

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

function run(units: Unit[], grid: WalkGrid, seconds: number, cfg = config): CombatEvent[] {
  const events: CombatEvent[] = [];
  for (let t = 0; t < seconds; t += dt) {
    events.push(...stepCombat(units, grid, dt, cfg));
    stepMovement(units, grid, dt, movementConfig);
    if (evaluateOutcome(units) !== 'running') break;
  }
  return events;
}

/** Fight to the end in the open: `a` attacks `b`, `b` defends. Returns the outcome for side `a`. */
function duel(a: Unit[], b: Unit[]): BattleOutcome {
  const units = [...a, ...b];
  orderAttack(a, b[0]!);
  orderAttack(b, a[0]!);
  run(units, openGrid(), 120);
  return evaluateOutcome(units);
}

describe('Datenmodell: Einheitentypen, Waffen und Rüstung', () => {
  it('jeder Einheitentyp verweist auf vorhandene Waffen und Rüstungen', () => {
    for (const type of Object.values(UNIT_TYPES).map((t) => getUnitType(t.id))) {
      expect(WEAPONS).toHaveProperty(type.equipment.weapon);
      expect(ARMORS).toHaveProperty(type.equipment.armor);
      const main = WEAPONS[type.equipment.weapon];
      // Ranged units need a close-combat sidearm.
      if (main.kind === 'ranged') expect(WEAPONS[type.equipment.sidearm!].kind).toBe('melee');
    }
  });

  it('jede Einheit trägt ihre eigene Ausrüstung, getrennt vom Einheitentyp', () => {
    const a = unit('peasant', 0, 0);
    const b = unit('peasant', 0, 0);
    a.equipment.weapon = 'sword';
    expect(b.equipment.weapon).toBe('improvised');
    expect(UNIT_TYPES.peasant.equipment.weapon).toBe('improvised');
  });

  it('eine Einheit kann mit abweichender Ausrüstung erzeugt werden', () => {
    const veteran = createUnit(nextId++, 'peasant', 0, 0, { weapon: 'sword', armor: 'light' });
    const target = unit('guard', 0, 0);
    expect(damageAgainst(veteran, WEAPONS.sword, target)).toBeGreaterThan(
      damageAgainst(unit('peasant', 0, 0), WEAPONS.improvised, target),
    );
  });

  it('schwere Rüstung verlangsamt den Träger', () => {
    const armored = unit('armoredFootman', 0, 0);
    expect(armored.speed).toBeCloseTo(UNIT_TYPES.armoredFootman.speed * ARMORS.heavy.speedFactor, 6);
    expect(armored.speed).toBeLessThan(UNIT_TYPES.armoredFootman.speed);
    expect(unit('peasant', 0, 0).speed).toBe(UNIT_TYPES.peasant.speed);
  });
});

describe('Schadensberechnung', () => {
  const base = { attack: 1, armor: ARMORS.none, defense: 0 };

  it('ohne Rüstung und Training entspricht der Schaden dem Waffenwert', () => {
    expect(computeDamage({ ...base, weapon: WEAPONS.improvised })).toBe(WEAPONS.improvised.damage);
    expect(computeDamage({ ...base, weapon: WEAPONS.crossbow })).toBe(WEAPONS.crossbow.damage);
  });

  it('Rüstung zieht ihren Schutzanteil vom Schaden ab', () => {
    const w = WEAPONS.improvised; // no armour piercing
    expect(computeDamage({ ...base, weapon: w, armor: ARMORS.light })).toBeCloseTo(w.damage * 0.75, 6);
    expect(computeDamage({ ...base, weapon: w, armor: ARMORS.heavy })).toBeCloseTo(w.damage * 0.45, 6);
  });

  it('mehr Schutz bedeutet bei jeder Waffe weniger Schaden', () => {
    for (const weapon of Object.values(WEAPONS) as WeaponDefinition[]) {
      const none = computeDamage({ ...base, weapon });
      const light = computeDamage({ ...base, weapon, armor: ARMORS.light });
      const heavy = computeDamage({ ...base, weapon, armor: ARMORS.heavy });
      expect(light).toBeLessThan(none);
      expect(heavy).toBeLessThan(light);
    }
  });

  it('panzerbrechende Waffen ignorieren einen Teil der Rüstung', () => {
    const bolt = computeDamage({ ...base, weapon: WEAPONS.crossbow, armor: ARMORS.heavy });
    expect(bolt).toBeCloseTo(14 * (1 - 0.55 * (1 - 0.6)), 6);
    // Relative loss through heavy armour is smaller for the crossbow than for the improvised weapon.
    const improvised = computeDamage({ ...base, weapon: WEAPONS.improvised, armor: ARMORS.heavy });
    expect(bolt / WEAPONS.crossbow.damage).toBeGreaterThan(improvised / WEAPONS.improvised.damage);
  });

  it('Training erhöht den Schaden, Verteidigung wirkt nur im Nahkampf', () => {
    expect(computeDamage({ ...base, weapon: WEAPONS.sword, attack: 1.3 })).toBeCloseTo(13, 6);
    expect(computeDamage({ ...base, weapon: WEAPONS.sword, defense: 0.2 })).toBeCloseTo(8, 6);
    expect(computeDamage({ ...base, weapon: WEAPONS.crossbow, defense: 0.2 })).toBe(14);
  });

  it('jeder Treffer verursacht mindestens den Mindestschaden', () => {
    const weak: WeaponDefinition = { ...WEAPONS.knife, damage: 0.5 };
    expect(computeDamage({ ...base, weapon: weak, armor: ARMORS.heavy, defense: 0.9 })).toBe(DAMAGE.minDamage);
  });

  it('Boni gegen bestimmte Ziele werden aus den Waffendaten angewendet', () => {
    const antiRider: WeaponDefinition = { ...WEAPONS.spear, bonusAgainst: { cavalry: 2 } };
    const normal = computeDamage({ ...base, weapon: antiRider });
    expect(computeDamage({ ...base, weapon: antiRider, targetTags: ['cavalry'] })).toBeCloseTo(normal * 2, 6);
  });

  it('geänderte Waffenwerte wirken ohne Änderung am Kampfcode', () => {
    const buffed: WeaponDefinition = { ...WEAPONS.improvised, damage: 12 };
    expect(computeDamage({ ...base, weapon: buffed })).toBe(2 * computeDamage({ ...base, weapon: WEAPONS.improvised }));
  });

  it('im Kampf wird genau der berechnete Schaden abgezogen (Rüstung des Ziels inklusive)', () => {
    const grid = openGrid();
    const p = unit('peasant', 100, 100);
    const armored = unit('armoredFootman', 116, 100);
    armored.order = 'hold';
    armored.attackCooldown = 99;
    orderAttack([p], armored);
    stepCombat([p, armored], grid, dt, config);
    const expected = computeDamage({
      weapon: WEAPONS.improvised,
      attack: 1,
      armor: ARMORS.heavy,
      defense: UNIT_TYPES.armoredFootman.defense,
    });
    expect(armored.hp).toBeCloseTo(UNIT_TYPES.armoredFootman.maxHp - expected, 6);
  });
});

describe('Einheitenrollen', () => {
  it('Speerträger treffen anrückende Gegner zuerst (größere Reichweite)', () => {
    const grid = openGrid();
    const spearman = unit('spearman', 300, 300);
    const swordsman = unit('armoredFootman', 200, 300);
    orderHold([spearman]);
    orderAttack([swordsman], spearman);
    const hits = run([spearman, swordsman], grid, 3).filter((e) => e.kind === 'hit');
    expect(hits.length).toBeGreaterThan(1);
    expect(hits[0]).toMatchObject({ attackerId: spearman.id });
  });

  it('Schwertkämpfer sind im Nahkampf stärker als einfache Bauern', () => {
    const target = unit('guard', 0, 0);
    const swordsman = unit('swordsman', 0, 0);
    const peasant = unit('peasant', 0, 0);
    const dps = (u: Unit) => {
      const w = WEAPONS[u.equipment.weapon];
      return damageAgainst(u, w, target) / w.cooldown;
    };
    expect(dps(swordsman)).toBeGreaterThan(1.5 * dps(peasant));
    expect(duel([unit('swordsman', 100, 300)], [unit('peasant', 200, 300)])).toBe('victory');
  });

  it('Armbrustschützen schießen nur im Takt ihrer Nachladezeit', () => {
    const grid = openGrid();
    const archer = unit('crossbowman', 100, 300);
    const target = unit('guard', 200, 300);
    target.order = 'hold';
    target.hp = 1000;
    orderAttack([archer], target);
    const shots = run([archer, target], grid, 7).filter((e) => e.kind === 'hit' && e.attackerId === archer.id);
    // Reload 3 s: shots at t≈0, 3, 6.
    expect(shots).toHaveLength(3);
  });

  it('der gepanzerte Fußsoldat hält einfachen Bauern deutlich länger stand als eine Wache', () => {
    const p = unit('peasant', 0, 0);
    const hitsToKill = (typeId: UnitTypeId) => {
      const target = unit(typeId, 0, 0);
      return target.maxHp / damageAgainst(p, WEAPONS.improvised, target);
    };
    expect(hitsToKill('armoredFootman')).toBeGreaterThan(1.5 * hitsToKill('guard'));
  });

  it('gegen schwere Rüstung sind Armbrust und Hellebarde wirksamer als improvisierte Waffen', () => {
    const armored = unit('armoredFootman', 0, 0);
    const share = (typeId: UnitTypeId) => {
      const u = unit(typeId, 0, 0);
      const w = WEAPONS[u.equipment.weapon];
      return damageAgainst(u, w, armored) / (w.damage * getUnitType(typeId).attack);
    };
    expect(share('crossbowman')).toBeGreaterThan(share('peasant'));
    expect(share('landsknecht')).toBeGreaterThan(share('peasant'));
  });
});

describe('Landsknechte', () => {
  it('sind spürbar kampfstärker als einfache Bauern: ein Landsknecht besiegt zwei Bauern', () => {
    expect(duel([unit('landsknecht', 100, 300)], [unit('peasant', 200, 290), unit('peasant', 200, 310)])).toBe(
      'victory',
    );
  });

  it('sind nicht unbesiegbar: eine Überzahl Bauern besiegt einen Landsknecht', () => {
    const peasants = Array.from({ length: 6 }, (_, i) => unit('peasant', 200, 255 + i * 18));
    expect(duel(peasants, [unit('landsknecht', 300, 300)])).toBe('victory');
  });
});

describe('Deckung im Wald', () => {
  const tiles = [[TileType.Grass, TileType.Forest, TileType.Road]];
  const cover = buildCoverGrid(tiles);

  it('Fernkampf trifft im Wald seltener, auf offenem Gelände immer', () => {
    expect(rangedHitChance(cover, tileSize, 16, 16)).toBe(1);
    expect(rangedHitChance(cover, tileSize, 48, 16)).toBeCloseTo(0.6, 6);
    expect(rangedHitChance(cover, tileSize, 80, 16)).toBe(1);
    expect(rangedHitChance(undefined, tileSize, 48, 16)).toBe(1);
  });

  function shootAt(targetTile: TileType, random: () => number, shots: number) {
    const grid = openGrid(12, 3);
    const tileRow = new Array<TileType>(12).fill(TileType.Grass);
    tileRow[5] = targetTile;
    const cfg: CombatConfig = { ...config, coverGrid: buildCoverGrid([tileRow, tileRow, tileRow]), random };
    const archer = unit('crossbowman', 16, 48);
    const target = unit('guard', 5 * tileSize + 16, 48);
    target.order = 'hold';
    target.hp = 100000;
    orderAttack([archer], target);
    const events: CombatEvent[] = [];
    for (let i = 0; i < shots; i++) {
      archer.attackCooldown = 0;
      events.push(...stepCombat([archer, target], grid, dt, cfg));
    }
    return { archer, target, events: events.filter((e) => e.kind !== 'death' && e.attackerId === archer.id) };
  }

  it('ein Fehlschuss verursacht keinen Schaden, das Nachladen dauert trotzdem', () => {
    const inForest = shootAt(TileType.Forest, () => 0.9, 1);
    expect(inForest.events).toEqual([expect.objectContaining({ kind: 'miss' })]);
    expect(inForest.target.hp).toBe(100000);
    expect(inForest.archer.attackCooldown).toBeCloseTo(WEAPONS.crossbow.cooldown, 6);
    const onGrass = shootAt(TileType.Grass, () => 0.9, 1);
    expect(onGrass.events).toEqual([expect.objectContaining({ kind: 'hit', ranged: true })]);
    expect(onGrass.target.hp).toBeLessThan(100000);
  });

  it('der Anteil der Fehlschüsse im Wald entspricht dem Deckungswert', () => {
    const { events } = shootAt(TileType.Forest, createRandom(7), 1000);
    const misses = events.filter((e) => e.kind === 'miss').length;
    expect(events).toHaveLength(1000);
    expect(misses / 1000).toBeGreaterThan(0.35);
    expect(misses / 1000).toBeLessThan(0.45);
  });

  it('Nahkampf wird von Deckung nicht beeinflusst', () => {
    const grid = openGrid(12, 3);
    const forestRow = new Array<TileType>(12).fill(TileType.Forest);
    const cfg: CombatConfig = { ...config, coverGrid: buildCoverGrid([forestRow, forestRow, forestRow]), random: () => 0.99 };
    const p = unit('peasant', 100, 48);
    const g = unit('guard', 116, 48);
    g.order = 'hold';
    orderAttack([p], g);
    const events = stepCombat([p, g], grid, dt, cfg);
    expect(events).toContainEqual(expect.objectContaining({ kind: 'hit', attackerId: p.id }));
  });
});
