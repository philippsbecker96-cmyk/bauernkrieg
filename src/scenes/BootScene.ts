import Phaser from 'phaser';
import { TEST_MAP } from '../game/data/maps';
import { createRandom } from '../game/map/random';
import { TILE_DEFINITIONS, TileType } from '../game/map/tiles';
import { SceneKeys } from './sceneKeys';

export const TILESET_KEY = 'tileset';

/**
 * Creates placeholder graphics at runtime (no external assets needed yet)
 * and then starts the mission scene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    this.createTilesetTexture(TEST_MAP.tileSize);
    this.scene.start(SceneKeys.Mission);
  }

  /** Draws one tile per `TileType` side by side into a canvas texture. */
  private createTilesetTexture(size: number): void {
    const texture = this.textures.createCanvas(TILESET_KEY, size * TILE_DEFINITIONS.length, size);
    if (!texture) {
      throw new Error('Tileset-Textur konnte nicht erzeugt werden.');
    }
    const ctx = texture.getContext();
    const random = createRandom(42);

    for (const def of TILE_DEFINITIONS) {
      const ox = def.type * size;
      ctx.fillStyle = toCss(def.color);
      ctx.fillRect(ox, 0, size, size);

      switch (def.type) {
        case TileType.Grass:
          ctx.fillStyle = toCss(shade(def.color, -0.15));
          for (let i = 0; i < 10; i++) {
            ctx.fillRect(ox + Math.floor(random() * size), Math.floor(random() * size), 2, 2);
          }
          break;
        case TileType.Forest:
          ctx.fillStyle = toCss(shade(def.color, 0.25));
          for (const [tx, ty, r] of [
            [0.3, 0.35, 0.22],
            [0.7, 0.4, 0.2],
            [0.5, 0.72, 0.24],
          ] as const) {
            ctx.beginPath();
            ctx.arc(ox + tx * size, ty * size, r * size, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        case TileType.Water:
          ctx.strokeStyle = toCss(shade(def.color, 0.3));
          ctx.lineWidth = 1;
          for (const wy of [0.3, 0.7]) {
            ctx.beginPath();
            ctx.moveTo(ox + size * 0.15, wy * size);
            ctx.quadraticCurveTo(ox + size * 0.35, wy * size - 3, ox + size * 0.5, wy * size);
            ctx.quadraticCurveTo(ox + size * 0.65, wy * size + 3, ox + size * 0.85, wy * size);
            ctx.stroke();
          }
          break;
        case TileType.Road:
          ctx.fillStyle = toCss(shade(def.color, -0.2));
          ctx.fillRect(ox, Math.floor(size * 0.3), size, 2);
          ctx.fillRect(ox, Math.floor(size * 0.65), size, 2);
          break;
      }
    }
    texture.refresh();
  }
}

function toCss(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Lightens (amount > 0) or darkens (amount < 0) a 0xRRGGBB colour. */
function shade(color: number, amount: number): number {
  const channel = (shift: number) => {
    const c = (color >> shift) & 0xff;
    const target = amount > 0 ? 255 : 0;
    return Math.round(c + (target - c) * Math.abs(amount));
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
