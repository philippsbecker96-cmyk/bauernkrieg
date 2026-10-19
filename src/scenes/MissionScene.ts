import Phaser from 'phaser';
import { nextZoom, scrollForZoomAtPointer } from '../game/camera/cameraMath';
import { CAMERA_CONTROLS } from '../game/data/controls';
import { TEST_MAP } from '../game/data/maps';
import { MOVEMENT, SELECTION } from '../game/data/movement';
import { TEST_SCENARIO } from '../game/data/testScenario';
import { finalWaypoint, isMoving, type Unit } from '../game/entities/Unit';
import { spawnUnits } from '../game/entities/UnitFactory';
import { generateMap } from '../game/map/mapGenerator';
import { getTileDefinition, type TileType } from '../game/map/tiles';
import { orderGroupMove } from '../game/systems/formation';
import { stepMovement, type MovementConfig } from '../game/systems/movement';
import { buildWalkGrid, type WalkGrid } from '../game/systems/pathfinding';
import { rectFromCorners, unitAtPoint, unitsInRect, updateSelection } from '../game/systems/selection';
import { TILESET_KEY, unitTextureKey } from './BootScene';
import {
  GameEvents,
  SceneKeys,
  type SelectionChangedEvent,
  type TileHoverEvent,
} from './sceneKeys';

interface PanKeys {
  up: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
}

/** Left-button press that may become a selection rectangle. */
interface DragState {
  screenX: number;
  screenY: number;
  worldX: number;
  worldY: number;
  active: boolean;
}

/** Longest simulation step (s); larger frame gaps (tab switch) are split up. */
const MAX_STEP = 1 / 30;

/**
 * Shows the map, the units and handles input: camera (keyboard panning,
 * mouse-wheel zoom, middle-mouse drag), unit selection (click, Shift-click,
 * selection rectangle) and move orders (right click).
 */
export class MissionScene extends Phaser.Scene {
  private tiles: TileType[][] = [];
  private walkGrid: WalkGrid = [];
  private panKeys?: PanKeys;
  private hoverMarker?: Phaser.GameObjects.Graphics;
  private lastHover?: { x: number; y: number };
  private pointerInGame = false;

  private units: Unit[] = [];
  private sprites = new Map<number, Phaser.GameObjects.Image>();
  private selected = new Set<number>();
  private drag?: DragState;
  private overlay?: Phaser.GameObjects.Graphics;
  private selectionBox?: Phaser.GameObjects.Graphics;
  private readonly movementConfig: MovementConfig = {
    tileSize: TEST_MAP.tileSize,
    waypointReachDistance: MOVEMENT.waypointReachDistance,
    separationStrength: MOVEMENT.separationStrength,
    stuckTimeout: MOVEMENT.stuckTimeout,
    stuckArriveDistance: MOVEMENT.stuckArriveSpacings * MOVEMENT.formationSpacing,
    giveUpTimeout: MOVEMENT.giveUpTimeout,
    lineOfSightMargin: MOVEMENT.lineOfSightMargin,
  };

  constructor() {
    super(SceneKeys.Mission);
  }

  create(): void {
    const config = TEST_MAP;
    this.tiles = generateMap(config);
    this.walkGrid = buildWalkGrid(this.tiles);

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
    camera.setBackgroundColor('#1b1a17');

    this.hoverMarker = this.add.graphics().setDepth(1);
    this.hoverMarker.lineStyle(2, 0xffffff, 0.8);
    this.hoverMarker.strokeRect(0, 0, config.tileSize, config.tileSize);
    this.hoverMarker.setVisible(false);

    this.overlay = this.add.graphics().setDepth(2);
    this.selectionBox = this.add.graphics().setDepth(4);

    this.units = spawnUnits(this.walkGrid, config.tileSize, TEST_SCENARIO, MOVEMENT.formationSpacing);
    for (const unit of this.units) {
      const sprite = this.add.image(unit.x, unit.y, unitTextureKey(unit.typeId)).setDepth(3);
      this.sprites.set(unit.id, sprite);
    }
    const firstPlayer = this.units.find((u) => u.faction === 'player');
    if (firstPlayer) camera.centerOn(firstPlayer.x + 200, firstPlayer.y);
    else camera.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);

    this.setupInput();
    this.scene.launch(SceneKeys.Ui);
    // The UI scene registers its listeners in its own create(); report the initial state afterwards.
    this.time.delayedCall(0, () => this.emitSelection());
  }

  private setupInput(): void {
    // Right click is used for move orders; never show the browser menu.
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
      keyboard.on('keydown-ESC', () => this.setSelection(new Set()));
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

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      if (pointer.leftButtonDown()) {
        this.drag = { screenX: pointer.x, screenY: pointer.y, worldX: world.x, worldY: world.y, active: false };
      } else if (pointer.rightButtonDown()) {
        this.issueMoveOrder(world.x, world.y);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonReleased() || !this.drag) return;
      this.finishSelection(pointer);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.pointerInGame = true;
      if (pointer.middleButtonDown()) {
        const camera = this.cameras.main;
        camera.scrollX -= (pointer.x - pointer.prevPosition.x) / camera.zoom;
        camera.scrollY -= (pointer.y - pointer.prevPosition.y) / camera.zoom;
      }
      if (this.drag && pointer.leftButtonDown()) {
        const travelled = Math.hypot(pointer.x - this.drag.screenX, pointer.y - this.drag.screenY);
        if (travelled >= SELECTION.dragThreshold) this.drag.active = true;
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

  private finishSelection(pointer: Phaser.Input.Pointer): void {
    const drag = this.drag!;
    this.drag = undefined;
    this.selectionBox?.clear();
    const additive = (pointer.event as MouseEvent | undefined)?.shiftKey === true;
    // Recompute the world point: the camera may have moved while dragging.
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    let picked: Unit[];
    if (drag.active) {
      const rect = rectFromCorners(drag.worldX, drag.worldY, world.x, world.y);
      picked = unitsInRect(this.units, rect, 'player');
    } else {
      const unit = unitAtPoint(this.units, world.x, world.y, SELECTION.clickTolerance, 'player');
      picked = unit ? [unit] : [];
    }
    this.setSelection(updateSelection(this.selected, picked, additive, !drag.active));
  }

  private issueMoveOrder(worldX: number, worldY: number): void {
    const group = this.units.filter((u) => this.selected.has(u.id));
    if (group.length === 0) return;
    const result = orderGroupMove(
      group,
      this.walkGrid,
      TEST_MAP.tileSize,
      { x: worldX, y: worldY },
      MOVEMENT.formationSpacing,
      MOVEMENT.lineOfSightMargin,
    );
    if (result && result.movedCount > 0) this.showTargetMarker(result.destination.x, result.destination.y);
  }

  /** Short-lived ring at the destination of a move order. */
  private showTargetMarker(x: number, y: number): void {
    const marker = this.add.graphics({ x, y }).setDepth(2);
    marker.lineStyle(2, 0xf3e9d2, 1);
    marker.strokeCircle(0, 0, 10);
    marker.lineBetween(-5, 0, 5, 0);
    marker.lineBetween(0, -5, 0, 5);
    this.tweens.add({
      targets: marker,
      alpha: 0,
      scale: 0.4,
      duration: 700,
      ease: 'Quad.easeIn',
      onComplete: () => marker.destroy(),
    });
  }

  private setSelection(next: Set<number>): void {
    this.selected = next;
    this.emitSelection();
  }

  private emitSelection(): void {
    const event: SelectionChangedEvent = {
      selected: this.selected.size,
      total: this.units.filter((u) => u.faction === 'player').length,
    };
    this.game.events.emit(GameEvents.SelectionChanged, event);
  }

  update(_time: number, delta: number): void {
    this.updateKeyboardPan(delta);
    this.updateUnits(delta / 1000);
    this.drawOverlay();
    this.drawSelectionBox();
    this.updateHover();
  }

  private updateUnits(dt: number): void {
    let remaining = Math.min(dt, 0.25);
    while (remaining > 1e-6) {
      const step = Math.min(remaining, MAX_STEP);
      stepMovement(this.units, this.walkGrid, step, this.movementConfig);
      remaining -= step;
    }
    for (const unit of this.units) {
      this.sprites.get(unit.id)?.setPosition(unit.x, unit.y);
    }
  }

  /** Selection rings and, for moving selected units, a faint line to their destination. */
  private drawOverlay(): void {
    const g = this.overlay;
    if (!g) return;
    g.clear();
    for (const unit of this.units) {
      if (!this.selected.has(unit.id)) continue;
      if (isMoving(unit)) {
        const end = finalWaypoint(unit)!;
        g.lineStyle(1, 0xf3e9d2, 0.25);
        g.lineBetween(unit.x, unit.y, end.x, end.y);
        g.fillStyle(0xf3e9d2, 0.5);
        g.fillCircle(end.x, end.y, 2);
      }
      g.lineStyle(2, 0x9be37a, 1);
      g.strokeCircle(unit.x, unit.y, unit.radius + 3);
    }
  }

  private drawSelectionBox(): void {
    const g = this.selectionBox;
    if (!g) return;
    g.clear();
    if (!this.drag?.active) return;
    const pointer = this.input.activePointer;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const rect = rectFromCorners(this.drag.worldX, this.drag.worldY, world.x, world.y);
    const lineWidth = 1 / this.cameras.main.zoom;
    g.fillStyle(0x9be37a, 0.12);
    g.fillRect(rect.x, rect.y, rect.width, rect.height);
    g.lineStyle(lineWidth, 0x9be37a, 0.9);
    g.strokeRect(rect.x, rect.y, rect.width, rect.height);
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
