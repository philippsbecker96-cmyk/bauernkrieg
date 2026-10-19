import Phaser from 'phaser';
import { TEST_MAP } from '../game/data/maps';
import { getUnitType, UNIT_TYPES, type UnitTypeDefinition } from '../game/data/units';
import { getWeapon } from '../game/data/weapons';
import { createRandom } from '../game/map/random';
import { TILE_DEFINITIONS, TileType } from '../game/map/tiles';
import { SceneKeys } from './sceneKeys';

export const TILESET_KEY = 'tileset';

/** Texture key of the placeholder graphic for a unit type. */
export function unitTextureKey(typeId: string): string {
  return `unit-${typeId}`;
}

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
    for (const type of Object.values(UNIT_TYPES)) {
      this.createUnitTexture(getUnitType(type.id));
    }
    this.scene.start(SceneKeys.Mission);
  }

  /**
   * Placeholder unit: filled circle with a small marker (light for the player,
   * a dark bar for enemies) to tell factions apart at a glance. The outline shows
   * the armour (dark: none, brown: light, steel: heavy), a glyph the main weapon:
   * crossbow = bow arc, spear = long shaft, halberd = shaft with blade, sword = short cross.
   */
  private createUnitTexture(type: UnitTypeDefinition): void {
    const r = type.radius;
    const pad = 4; // room for weapon glyphs reaching past the body
    const size = r * 2 + 2 + pad * 2;
    const c = size / 2;
    const g = this.make.graphics({}, false);
    const outline = { none: 0x1b1a17, light: 0x6e4b25, heavy: 0xd5d9de }[type.equipment.armor];
    g.fillStyle(outline, 1);
    g.fillCircle(c, c, type.equipment.armor === 'heavy' ? r + 1.5 : r + 1);
    g.fillStyle(type.color, 1);
    g.fillCircle(c, c, r - 0.5);
    if (type.faction === 'player') {
      g.fillStyle(0xf3e9d2, 1);
      g.fillCircle(c, c - r * 0.25, r * 0.35);
    } else {
      g.fillStyle(0x1b1a17, 1);
      g.fillRect(c - r * 0.55, c - 1, r * 1.1, 2);
    }
    const weaponColor = 0xf3e9d2;
    switch (getWeapon(type.equipment.weapon).weaponClass) {
      case 'crossbow':
        g.lineStyle(1.5, weaponColor, 1);
        g.beginPath();
        g.arc(c, c + r * 0.2, r * 0.6, 0.15 * Math.PI, 0.85 * Math.PI);
        g.strokePath();
        break;
      case 'spear':
        g.lineStyle(1.5, 0x1b1a17, 1);
        g.lineBetween(c - r * 0.6, c + r + 2, c + r + 3, c - r - 3);
        g.fillStyle(weaponColor, 1);
        g.fillCircle(c + r + 3, c - r - 3, 1.5);
        break;
      case 'polearm':
        g.lineStyle(1.5, 0x1b1a17, 1);
        g.lineBetween(c - r * 0.6, c + r + 2, c + r + 2, c - r - 2);
        g.fillStyle(weaponColor, 1);
        g.fillTriangle(c + r + 2, c - r - 2, c + r - 2, c - r - 3, c + r + 1, c - r + 2);
        break;
      case 'sword':
        g.lineStyle(1.5, weaponColor, 1);
        g.lineBetween(c - r * 0.5, c + r * 0.5, c + r * 0.5, c - r * 0.5);
        g.lineBetween(c - r * 0.45, c - r * 0.05, c - r * 0.05, c + r * 0.45);
        break;
      case 'improvised':
        break;
    }
    g.generateTexture(unitTextureKey(type.id), size, size);
    g.destroy();
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
