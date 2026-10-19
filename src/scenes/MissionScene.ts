import Phaser from 'phaser';
import { nextZoom, scrollForZoomAtPointer } from '../game/camera/cameraMath';
import { CAMERA_CONTROLS } from '../game/data/controls';
import { TEST_MAP } from '../game/data/maps';
import { generateMap } from '../game/map/mapGenerator';
import { getTileDefinition, type TileType } from '../game/map/tiles';
import { TILESET_KEY } from './BootScene';
import { GameEvents, SceneKeys, type TileHoverEvent } from './sceneKeys';

interface PanKeys {
  up: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
}

/**
 * Shows the map and handles camera input (keyboard panning, mouse-wheel zoom,
 * middle-mouse drag). Units and mission logic follow in later milestones.
 */
export class MissionScene extends Phaser.Scene {
  private tiles: TileType[][] = [];
  private panKeys?: PanKeys;
  private hoverMarker?: Phaser.GameObjects.Graphics;
  private lastHover?: { x: number; y: number };
  private pointerInGame = false;

  constructor() {
    super(SceneKeys.Mission);
  }

  create(): void {
    const config = TEST_MAP;
    this.tiles = generateMap(config);

    const map = this.make.tilemap({
      data: this.tiles.map((row) => [...row]),
      tileWidth: config.tileSize,
      tileHeight: config.tileSize,
    });
    const tileset = map.addTilesetImage(TILESET_KEY, TILESET_KEY, config.tileSize, config.tileSize, 0, 0);
    if (!tileset) {
      throw new Error('Tileset konnte nicht zur Karte hinzugefügt werden.');
    }
    map.createLayer(0, tileset, 0, 0);

    const camera = this.cameras.main;
    camera.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    camera.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);
    camera.setBackgroundColor('#1b1a17');

    this.hoverMarker = this.add.graphics();
    this.hoverMarker.lineStyle(2, 0xffffff, 0.8);
    this.hoverMarker.strokeRect(0, 0, config.tileSize, config.tileSize);
    this.hoverMarker.setVisible(false);

    this.setupInput();
    this.scene.launch(SceneKeys.Ui);
  }

  private setupInput(): void {
    // Right click is reserved for move orders (milestone 1); never show the browser menu.
    this.input.mouse?.disableContextMenu();

    const keyboard = this.input.keyboard;
    if (keyboard) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      const add = (...codes: number[]) => codes.map((code) => keyboard.addKey(code));
      this.panKeys = {
        up: add(K.W, K.UP),
        down: add(K.S, K.DOWN),
        left: add(K.A, K.LEFT),
        right: add(K.D, K.RIGHT),
      };
    }

    this.input.on(
      'wheel',
      (pointer: Phaser.Input.Pointer, _objects: unknown, _dx: number, deltaY: number) => {
        const camera = this.cameras.main;
        const oldZoom = camera.zoom;
        const newZoom = nextZoom(
          oldZoom,
          deltaY,
          CAMERA_CONTROLS.zoomStep,
          CAMERA_CONTROLS.minZoom,
          CAMERA_CONTROLS.maxZoom,
        );
        if (newZoom === oldZoom) return;
        const scrollX = scrollForZoomAtPointer(camera.scrollX, camera.width, pointer.x, oldZoom, newZoom);
        const scrollY = scrollForZoomAtPointer(camera.scrollY, camera.height, pointer.y, oldZoom, newZoom);
        camera.setZoom(newZoom);
        camera.setScroll(scrollX, scrollY);
      },
    );

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.pointerInGame = true;
      if (pointer.middleButtonDown()) {
        const camera = this.cameras.main;
        camera.scrollX -= (pointer.x - pointer.prevPosition.x) / camera.zoom;
        camera.scrollY -= (pointer.y - pointer.prevPosition.y) / camera.zoom;
      }
    });

    this.input.on('gameover', () => {
      this.pointerInGame = true;
    });
    this.input.on('gameout', () => {
      this.pointerInGame = false;
      this.hoverMarker?.setVisible(false);
      this.lastHover = undefined;
    });
  }

  update(_time: number, delta: number): void {
    this.updateKeyboardPan(delta);
    this.updateHover();
  }

  private updateKeyboardPan(delta: number): void {
    if (!this.panKeys) return;
    const isDown = (keys: Phaser.Input.Keyboard.Key[]) => keys.some((key) => key.isDown);
    const dx = (isDown(this.panKeys.right) ? 1 : 0) - (isDown(this.panKeys.left) ? 1 : 0);
    const dy = (isDown(this.panKeys.down) ? 1 : 0) - (isDown(this.panKeys.up) ? 1 : 0);
    if (dx === 0 && dy === 0) return;

    const camera = this.cameras.main;
    const distance = (CAMERA_CONTROLS.panSpeed * delta) / 1000 / camera.zoom;
    const length = Math.hypot(dx, dy);
    camera.scrollX += (dx / length) * distance;
    camera.scrollY += (dy / length) * distance;
  }

  /** Highlights the tile under the pointer and reports it to the UI. */
  private updateHover(): void {
    const pointer = this.input.activePointer;
    if (!this.hoverMarker || !this.pointerInGame) return;

    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const size = TEST_MAP.tileSize;
    const tileX = Math.floor(world.x / size);
    const tileY = Math.floor(world.y / size);
    const type = this.tiles[tileY]?.[tileX];
    if (type === undefined) {
      this.hoverMarker.setVisible(false);
      return;
    }

    this.hoverMarker.setPosition(tileX * size, tileY * size).setVisible(true);
    if (this.lastHover?.x === tileX && this.lastHover.y === tileY) return;
    this.lastHover = { x: tileX, y: tileY };
    const event: TileHoverEvent = { tileX, tileY, tileName: getTileDefinition(type).name };
    this.game.events.emit(GameEvents.TileHover, event);
  }
}
