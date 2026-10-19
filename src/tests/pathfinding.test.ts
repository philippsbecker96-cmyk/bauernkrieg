import { describe, expect, it } from 'vitest';
import {
  findPath,
  hasLineOfSight,
  nearestWalkableTile,
  smoothPath,
  type WalkGrid,
} from '../game/systems/pathfinding';

/** Builds a cost grid from ASCII rows: `.` normal ground, `f` forest (cost 2), `#` blocked. */
function grid(...rows: string[]): WalkGrid {
  return rows.map((row) => [...row].map((c) => (c === '.' ? 1 : c === 'f' ? 2 : Infinity)));
}

describe('findPath', () => {
  it('findet einen geraden Weg auf freier Fläche', () => {
    const path = findPath(grid('.....', '.....'), { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path).toHaveLength(5);
    expect(path?.[0]).toEqual({ x: 0, y: 0 });
    expect(path?.at(-1)).toEqual({ x: 4, y: 0 });
  });

  it('läuft um eine Wand herum durch die einzige Lücke', () => {
    const g = grid(
      '..#..', //
      '..#..',
      '.....',
    );
    const path = findPath(g, { x: 0, y: 0 }, { x: 4, y: 0 })!;
    expect(path).not.toBeNull();
    for (const p of path) expect(g[p.y]![p.x]).toBe(1);
    expect(path.some((p) => p.x === 2 && p.y === 2)).toBe(true);
  });

  it('schneidet keine Ecken diagonal ab', () => {
    const g = grid(
      '.#', //
      '..',
    );
    const path = findPath(g, { x: 0, y: 0 }, { x: 1, y: 1 })!;
    // Must go via (0,1); a direct diagonal would squeeze past the blocked corner.
    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
  });

  it('liefert null, wenn das Ziel unerreichbar ist', () => {
    expect(findPath(grid('.#.'), { x: 0, y: 0 }, { x: 2, y: 0 })).toBeNull();
    expect(findPath(grid('.#.'), { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });

  it('umgeht Wald, wenn der Umweg schneller ist', () => {
    const g = grid(
      '.....', //
      '.fff.',
      '.....',
    );
    const path = findPath(g, { x: 0, y: 1 }, { x: 4, y: 1 })!;
    expect(path.every((p) => g[p.y]![p.x] === 1)).toBe(true);
  });

  it('durchquert Wald, wenn es keinen schnelleren Weg gibt', () => {
    const g = grid(
      '#####', //
      '.fff.',
      '#####',
    );
    const path = findPath(g, { x: 0, y: 1 }, { x: 4, y: 1 })!;
    expect(path).toHaveLength(5);
  });

  it('findet einen kürzesten Weg (Diagonalen kosten √2)', () => {
    const path = findPath(grid('....', '....', '....', '....'), { x: 0, y: 0 }, { x: 3, y: 3 })!;
    expect(path).toHaveLength(4); // pure diagonal
  });
});

describe('nearestWalkableTile', () => {
  it('gibt das Feld selbst zurück, wenn es begehbar ist', () => {
    expect(nearestWalkableTile(grid('..'), { x: 1, y: 0 })).toEqual({ x: 1, y: 0 });
  });

  it('weicht von Wasser auf das nächste begehbare Feld aus', () => {
    expect(nearestWalkableTile(grid('###.'), { x: 2, y: 0 })).toEqual({ x: 3, y: 0 });
  });

  it('klemmt Koordinaten außerhalb der Karte an den Rand', () => {
    expect(nearestWalkableTile(grid('..'), { x: 9, y: -3 })).toEqual({ x: 1, y: 0 });
  });

  it('liefert null ohne begehbares Feld', () => {
    expect(nearestWalkableTile(grid('##'), { x: 0, y: 0 })).toBeNull();
  });
});

describe('hasLineOfSight / smoothPath', () => {
  const size = 10;
  const g = grid(
    '.....', //
    '..#..',
    '.....',
  );

  it('erkennt blockierte und freie Sichtlinien', () => {
    expect(hasLineOfSight(g, size, 5, 5, 45, 5)).toBe(true);
    expect(hasLineOfSight(g, size, 5, 15, 45, 15)).toBe(false);
  });

  it('berücksichtigt einen seitlichen Sicherheitsabstand', () => {
    // Line along y=9 passes 1px above the blocked tile; with a 3px margin it collides.
    expect(hasLineOfSight(g, size, 5, 9, 45, 9)).toBe(true);
    expect(hasLineOfSight(g, size, 5, 9, 45, 9, 3)).toBe(false);
  });

  it('entfernt überflüssige Zwischenpunkte, behält aber nötige', () => {
    const straight = [0, 1, 2, 3, 4].map((x) => ({ x: x * size + 5, y: 5 }));
    expect(smoothPath(g, size, straight)).toEqual([straight[0], straight[4]]);

    const around = [
      { x: 15, y: 15 },
      { x: 25, y: 25 },
      { x: 35, y: 15 },
    ];
    expect(smoothPath(g, size, around)).toHaveLength(3);
  });

  it('kürzt einen Umweg um den Wald nicht quer durch den Wald ab', () => {
    const forest = grid(
      '.....', //
      '.fff.',
      '.....',
    );
    // Detour along the top row around the forest band.
    const detour = [
      { x: 5, y: 15 },
      { x: 5, y: 5 },
      { x: 45, y: 5 },
      { x: 45, y: 15 },
    ];
    const smoothed = smoothPath(forest, size, detour);
    expect(smoothed.length).toBeGreaterThan(2);
    for (let i = 1; i < smoothed.length; i++) {
      const a = smoothed[i - 1]!;
      const b = smoothed[i]!;
      expect(hasLineOfSight(forest, size, a.x, a.y, b.x, b.y, 0, 1)).toBe(true);
    }
  });

  it('erlaubt Abkürzungen durch Wald, wenn der Weg ohnehin durch Wald führt', () => {
    const forest = grid('fffff');
    const straight = [0, 1, 2, 3, 4].map((x) => ({ x: x * size + 5, y: 5 }));
    expect(smoothPath(forest, size, straight)).toHaveLength(2);
  });
});
