import { describe, expect, it } from 'vitest';
import { createUnit } from '../game/entities/Unit';
import { rectFromCorners, unitAtPoint, unitsInRect, updateSelection } from '../game/systems/selection';

const units = [
  createUnit(1, 'peasant', 10, 10),
  createUnit(2, 'peasant', 50, 10),
  createUnit(3, 'peasant', 100, 100),
  createUnit(4, 'guard', 20, 10),
];

describe('rectFromCorners', () => {
  it('normalisiert Rahmen in jede Ziehrichtung', () => {
    expect(rectFromCorners(30, 40, 10, 5)).toEqual({ x: 10, y: 5, width: 20, height: 35 });
  });
});

describe('unitsInRect', () => {
  it('wählt nur eigene Einheiten im Rahmen', () => {
    const picked = unitsInRect(units, rectFromCorners(0, 0, 60, 20), 'player');
    expect(picked.map((u) => u.id)).toEqual([1, 2]);
  });

  it('zählt Einheiten, deren Kreis den Rahmen berührt', () => {
    const picked = unitsInRect(units, rectFromCorners(55, 0, 80, 20), 'player');
    expect(picked.map((u) => u.id)).toEqual([2]); // centre 5px outside, radius 7
  });
});

describe('unitAtPoint', () => {
  it('trifft die nächste eigene Einheit innerhalb der Toleranz', () => {
    expect(unitAtPoint(units, 12, 12, 4, 'player')?.id).toBe(1);
    expect(unitAtPoint(units, 30, 30, 4, 'player')).toBeUndefined();
  });

  it('ignoriert gegnerische Einheiten', () => {
    expect(unitAtPoint(units, 16, 10, 0, 'player')?.id).toBe(1);
    expect(unitAtPoint(units, 16, 10, 0, 'enemy')?.id).toBe(4);
  });
});

describe('updateSelection', () => {
  const [a, b] = units as [ReturnType<typeof createUnit>, ReturnType<typeof createUnit>];

  it('ersetzt die Auswahl ohne Umschalttaste', () => {
    expect([...updateSelection(new Set([3]), [a], false, true)]).toEqual([1]);
  });

  it('Klick ins Leere ohne Umschalttaste hebt die Auswahl auf', () => {
    expect(updateSelection(new Set([1, 2]), [], false, true).size).toBe(0);
  });

  it('Umschalt-Klick schaltet einzelne Einheiten um', () => {
    expect([...updateSelection(new Set([1]), [b], true, true)].sort()).toEqual([1, 2]);
    expect([...updateSelection(new Set([1, 2]), [b], true, true)]).toEqual([1]);
  });

  it('Umschalt-Rahmen fügt hinzu, ohne abzuwählen', () => {
    expect([...updateSelection(new Set([1]), [a, b], true, false)].sort()).toEqual([1, 2]);
  });
});
