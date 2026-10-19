import { describe, expect, it } from 'vitest';
import { clampZoom, nextZoom, scrollForZoomAtPointer } from '../game/camera/cameraMath';

describe('clampZoom', () => {
  it('begrenzt den Zoom auf den erlaubten Bereich', () => {
    expect(clampZoom(0.1, 0.5, 2)).toBe(0.5);
    expect(clampZoom(3, 0.5, 2)).toBe(2);
    expect(clampZoom(1.2, 0.5, 2)).toBe(1.2);
  });
});

describe('nextZoom', () => {
  it('zoomt beim Mausrad nach oben hinein und nach unten heraus', () => {
    expect(nextZoom(1, -100, 0.1, 0.5, 2)).toBe(1.1);
    expect(nextZoom(1, 100, 0.1, 0.5, 2)).toBe(0.9);
  });

  it('bleibt an den Grenzen stehen', () => {
    expect(nextZoom(2, -100, 0.1, 0.5, 2)).toBe(2);
    expect(nextZoom(0.5, 100, 0.1, 0.5, 2)).toBe(0.5);
  });

  it('driftet über viele Schritte nicht durch Rundungsfehler', () => {
    let zoom = 1;
    for (let i = 0; i < 7; i++) zoom = nextZoom(zoom, -1, 0.1, 0.5, 2);
    expect(zoom).toBe(1.7);
  });
});

describe('scrollForZoomAtPointer', () => {
  /** World coordinate under a screen position, using Phaser's centred zoom model. */
  const worldAt = (scroll: number, view: number, pointer: number, zoom: number) =>
    scroll + view / 2 + (pointer - view / 2) / zoom;

  it('hält den Weltpunkt unter dem Mauszeiger beim Zoomen fest', () => {
    const view = 800;
    const pointer = 650;
    const scroll = 300;
    const before = worldAt(scroll, view, pointer, 1);
    const newScroll = scrollForZoomAtPointer(scroll, view, pointer, 1, 1.5);
    expect(worldAt(newScroll, view, pointer, 1.5)).toBeCloseTo(before, 6);
  });

  it('ändert den Scroll nicht, wenn der Zeiger in der Mitte steht', () => {
    expect(scrollForZoomAtPointer(120, 800, 400, 1, 2)).toBe(120);
  });
});
