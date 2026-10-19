import Phaser from 'phaser';
import { nextZoom, scrollForZoomAtPointer } from '../game/camera/cameraMath';
import { COMBAT } from '../game/data/combat';
import { CAMERA_CONTROLS } from '../game/data/controls';
import { TEST_MAP, type MapConfig } from '../game/data/maps';
import { MINI_MISSION, type VillageDefinition } from '../game/data/missions';
import { MOVEMENT, SELECTION } from '../game/data/movement';
import { getArmor } from '../game/data/armor';
import { LANDSKNECHT, SUPPLY } from '../game/data/balance';
import { HUNTING } from '../game/data/hunting';
import { STRESS_SCENARIO, TEST_RALLY_POINT, TEST_SCENARIO } from '../game/data/testScenario';
import { getUnitType, type UnitTypeId } from '../game/data/units';
import { getWeapon, type WeaponDefinition } from '../game/data/weapons';
import { finalWaypoint, isMoving, type Point, type Unit } from '../game/entities/Unit';
import { spawnUnits } from '../game/entities/UnitFactory';
import { generateMap } from '../game/map/mapGenerator';
import { getTileDefinition, type TileType } from '../game/map/tiles';
import {
  buildCoverGrid,
  damageAgainst,
  evaluateOutcome,
  mainWeapon,
  markMarching,
  orderAttack,
  orderGeneralAttack,
  orderHold,
  stepCombat,
  type BattleOutcome,
  type CombatConfig,
  type CombatEvent,
} from '../game/systems/combat';
import { orderGroupMove } from '../game/systems/formation';
import {
  carriedFood,
  createHuntingState,
  forestAt,
  forestCentre,
  isHunting,
  orderHunt,
  recallHunters,
  stepHunting,
  stockLevel,
  STOCK_LEVEL_NAMES,
  type HuntEvent,
  type HuntingState,
  type HuntPhase,
} from '../game/systems/hunting';
import {
  armySize,
  buildMissionTiles,
  buyFoodAtVillage,
  checkFoodPurchase,
  checkHire,
  checkRecruit,
  createMissionState,
  hireMercenary,
  landsknechtCount,
  mercenariesLeft,
  postPresence,
  previewPostLoot,
  recruitableNow,
  recruitAtVillage,
  settlePostLoot,
  siteCenter,
  stepMission,
  volunteersLeft,
  type MissionState,
} from '../game/systems/mission';
import type { LootSettlement } from '../game/systems/loot';
import {
  dailyConsumption,
  secondsUntilNextDay,
  stepSupply,
  supplyDays,
  supplyLevel,
  type DayReport,
  type SupplyLevel,
} from '../game/systems/supply';
import { stepMovement, type MovementConfig } from '../game/systems/movement';
import {
  buildWalkGrid,
  nearestWalkableTile,
  tileCenter,
  worldToTile,
  type WalkGrid,
} from '../game/systems/pathfinding';
import { rectFromCorners, unitAtPoint, unitsInRect, updateSelection } from '../game/systems/selection';
import { TILESET_KEY, unitTextureKey } from './BootScene';
import {
  GameEvents,
  SceneKeys,
  type BattleStatusEvent,
  type MissionStatusEvent,
  type NoticeEvent,
  type SelectionChangedEvent,
  type SupplyStatusEvent,
  type TileHoverEvent,
  type UnitInfoEvent,
} from './sceneKeys';

/**
 * What the scene plays: the mini mission (default), the free test battle of
 * milestones 1–3 (key T) or the 100-unit performance test (key B).
 */
type ScenarioKind = 'mission' | 'test' | 'stress';

const SCENARIO_NAMES: Record<ScenarioKind, string> = {
  mission: MINI_MISSION.name,
  test: 'Testgefecht',
  stress: 'Belastungstest (100 Einheiten)',
};

/** Speed of the visual crossbow bolt (px/s); damage itself is applied on release. */
const BOLT_SPEED = 900;

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

/** Placeholder village: house offsets (px) from the village centre. */
const VILLAGE_HOUSES: readonly (readonly [number, number])[] = [
  [-18, -14],
  [16, -10],
  [-6, 14],
  [24, 18],
];
/** Half edge (px) of the square around the village centre that counts as a click on the village. */
const VILLAGE_CLICK_HALF_SIZE = 40;

const HUNT_PHASE_NAMES: Record<HuntPhase, string> = {
  toForest: 'unterwegs zum Wald',
  hunting: 'jagt',
  returning: 'kehrt zurück',
};

/**
 * Shows the map, the units and handles input: camera (keyboard panning,
 * mouse-wheel zoom, middle-mouse drag), unit selection (click, Shift-click,
 * selection rectangle), move and attack orders (right click), hold (H),
 * retreat to the rally point (R), moving the rally point (P) and restart (N).
 * In the mini mission it also shows the village (click: recruit volunteers), the tavern
 * (click: hire a Landsknecht) and the enemy post (capture, loot settlement).
 */
export class MissionScene extends Phaser.Scene {
  private tiles: TileType[][] = [];
  private mapConfig: MapConfig = MINI_MISSION.map;
  /** Mission rules state; only used in the mini mission. */
  private mission: MissionState = createMissionState(MINI_MISSION);
  /** Forest regions and hunting trips; only filled in the mini mission. */
  private hunting: HuntingState = createHuntingState([], HUNTING, 0);
  private forestLabels: Phaser.GameObjects.Text[] = [];
  private siteGraphics?: Phaser.GameObjects.Graphics;
  private lastMissionText: string | null = null;
  private lastSupplyText: string | null = null;
  private lastSupplyLevel: SupplyLevel = 'ok';
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
  private movementConfig: MovementConfig = {
    tileSize: this.mapConfig.tileSize,
    waypointReachDistance: MOVEMENT.waypointReachDistance,
    separationStrength: MOVEMENT.separationStrength,
    stuckTimeout: MOVEMENT.stuckTimeout,
    stuckArriveDistance: MOVEMENT.stuckArriveSpacings * MOVEMENT.formationSpacing,
    giveUpTimeout: MOVEMENT.giveUpTimeout,
    lineOfSightMargin: MOVEMENT.lineOfSightMargin,
  };
  private combatConfig: CombatConfig = {
    tileSize: this.mapConfig.tileSize,
    ...COMBAT,
    lineOfSightMargin: MOVEMENT.lineOfSightMargin,
    hunterDamageTaken: HUNTING.damageTakenFactor,
  };
  private scenario: ScenarioKind = 'mission';
  private lastUnitInfo: string | null = null;
  private rallyPoint: Point = { x: 0, y: 0 };
  private outcome: BattleOutcome = 'running';

  constructor() {
    super(SceneKeys.Mission);
  }

  create(data?: { scenario?: ScenarioKind }): void {
    // The scene instance is reused on restart (N, B, T): reset all per-battle state.
    this.scenario = data?.scenario ?? 'mission';
    this.lastUnitInfo = null;
    this.lastMissionText = null;
    this.lastSupplyText = null;
    this.lastSupplyLevel = 'ok';
    this.mission = createMissionState(MINI_MISSION);
    this.units = [];
    this.sprites = new Map();
    this.selected = new Set();
    this.drag = undefined;
    this.lastHover = undefined;
    this.outcome = 'running';

    const isMission = this.scenario === 'mission';
    const config = isMission ? MINI_MISSION.map : TEST_MAP;
    this.mapConfig = config;
    this.tiles = isMission ? buildMissionTiles(MINI_MISSION) : generateMap(config);
    this.walkGrid = buildWalkGrid(this.tiles);
    this.hunting = isMission
      ? createHuntingState(this.tiles, HUNTING, config.seed, MINI_MISSION.hunting)
      : createHuntingState([], HUNTING, 0);
    this.movementConfig = { ...this.movementConfig, tileSize: config.tileSize };
    this.combatConfig = { ...this.combatConfig, tileSize: config.tileSize, coverGrid: buildCoverGrid(this.tiles) };

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

    this.siteGraphics = this.add.graphics().setDepth(1.5);
    this.forestLabels = this.hunting.forests.map((forest) => {
      const c = forestCentre(forest, config.tileSize);
      return this.add
        .text(c.x, c.y, '', {
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: '11px',
          color: '#f3e9d2',
          backgroundColor: 'rgba(27, 26, 23, 0.55)',
          padding: { x: 3, y: 1 },
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(1.6);
    });
    this.overlay = this.add.graphics().setDepth(2);
    this.selectionBox = this.add.graphics().setDepth(4);

    const spawns = isMission
      ? [...MINI_MISSION.startArmy, ...MINI_MISSION.post.garrison]
      : this.scenario === 'stress'
        ? STRESS_SCENARIO
        : TEST_SCENARIO;
    this.units = spawnUnits(this.walkGrid, config.tileSize, spawns, MOVEMENT.formationSpacing);
    // Performance test: both armies attack at once, so all 100 units move and fight.
    if (this.scenario === 'stress') orderGeneralAttack(this.units);
    const rally = isMission ? MINI_MISSION.rallyPoint : TEST_RALLY_POINT;
    const rallyTile = nearestWalkableTile(this.walkGrid, { x: rally.tileX, y: rally.tileY });
    this.rallyPoint = rallyTile ? tileCenter(rallyTile, config.tileSize) : { x: 0, y: 0 };
    for (const unit of this.units) this.addSprite(unit);
    const firstPlayer = this.units.find((u) => u.faction === 'player');
    if (firstPlayer) camera.centerOn(firstPlayer.x + 200, firstPlayer.y);
    else camera.centerOn(map.widthInPixels / 2, map.heightInPixels / 2);

    this.setupInput();
    this.scene.launch(SceneKeys.Ui);
    // The UI scene registers its listeners in its own create(); report the initial state afterwards.
    this.time.delayedCall(0, () => {
      this.emitSelection();
      this.emitBattleStatus();
      this.emitMissionStatus();
      this.emitSupplyStatus();
      if (isMission) this.notify(MINI_MISSION.briefing);
    });
  }

  private addSprite(unit: Unit): void {
    const sprite = this.add.image(unit.x, unit.y, unitTextureKey(unit.typeId)).setDepth(3);
    this.sprites.set(unit.id, sprite);
  }

  private notify(text: string): void {
    const event: NoticeEvent = { text };
    this.game.events.emit(GameEvents.Notice, event);
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
      keyboard.on('keydown-H', () => this.issueHoldOrder());
      keyboard.on('keydown-R', () => this.issueRetreatOrder());
      keyboard.on('keydown-P', () => this.setRallyPointAtPointer());
      keyboard.on('keydown-F', () => this.tryBuyFood());
      keyboard.on('keydown-J', () => this.issueHuntOrder());
      keyboard.on('keydown-Z', () => this.issueRecall());
      keyboard.on('keydown-N', () => this.scene.restart({ scenario: this.scenario }));
      keyboard.on('keydown-B', () =>
        this.scene.restart({ scenario: this.scenario === 'stress' ? 'mission' : 'stress' }),
      );
      keyboard.on('keydown-T', () =>
        this.scene.restart({ scenario: this.scenario === 'test' ? 'mission' : 'test' }),
      );
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
        const enemy = unitAtPoint(this.units, world.x, world.y, SELECTION.clickTolerance, 'enemy');
        if (enemy) this.issueAttackOrder(enemy);
        else this.issueMoveOrder(world.x, world.y);
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
      // A click on a place (not on a unit) asks for volunteers or hires a Landsknecht and keeps the selection.
      const village = unit ? undefined : this.villageAt(world.x, world.y);
      if (village) {
        if (village.volunteers && volunteersLeft(this.mission, village) > 0) this.tryRecruit(village, additive);
        else if (village.mercenaries) this.tryHire(village);
        else this.tryRecruit(village, additive);
        return;
      }
      picked = unit ? [unit] : [];
    }
    this.setSelection(updateSelection(this.selected, picked, additive, !drag.active));
  }

  /** Village whose clickable area (houses) contains the world point, in the mini mission only. */
  private villageAt(x: number, y: number): VillageDefinition | undefined {
    if (this.scenario !== 'mission') return undefined;
    const size = this.mapConfig.tileSize;
    return MINI_MISSION.villages.find((v) => {
      const c = siteCenter(v, size);
      return Math.abs(x - c.x) <= VILLAGE_CLICK_HALF_SIZE && Math.abs(y - c.y) <= VILLAGE_CLICK_HALF_SIZE;
    });
  }

  /** Click on a village: as many volunteers join (free of charge) as the food sustains; with Shift only one. */
  private tryRecruit(village: VillageDefinition, onlyOne: boolean): void {
    const size = this.mapConfig.tileSize;
    const check = checkRecruit(this.mission, village, this.units, size, SUPPLY);
    if (check === 'notEnoughFood') {
      const needed = (armySize(this.units) + 1) * SUPPLY.foodPerUnitPerDay * SUPPLY.lowSupplyDays;
      this.notify(
        this.mission.supply.shortageDays > 0
          ? `${village.name}: Der Haufen hungert – niemand schließt sich an. Erst Nahrung beschaffen.`
          : `${village.name}: Zu wenig Nahrung für auch nur eine weitere Person ` +
              `(nötig: ${needed} für ${SUPPLY.lowSupplyDays} Tage). Erst Nahrung kaufen (F).`,
      );
      return;
    }
    if (check === 'noVolunteersLeft') {
      this.notify(
        village.volunteers
          ? `${village.name}: Alle Freiwilligen haben sich bereits angeschlossen.`
          : `${village.name}: Hier schließt sich niemand freiwillig an.`,
      );
      return;
    }
    if (check === 'noUnitNearby') {
      this.notify(`${village.name}: Schicke zuerst eigene Leute ins Dorf (blauer Kreis).`);
      return;
    }
    const recruits = recruitAtVillage(
      this.mission,
      village,
      this.units,
      this.walkGrid,
      size,
      MOVEMENT.formationSpacing,
      SUPPLY,
      onlyOne ? 1 : Infinity,
    );
    if (recruits.length === 0) return;
    this.units.push(...recruits);
    for (const unit of recruits) this.addSprite(unit);
    const name = getUnitType(recruits[0]!.typeId).name;
    const left = volunteersLeft(this.mission, village);
    const rest =
      left === 0
        ? ''
        : onlyOne
          ? ` Noch ${left} bereit.`
          : ` Noch ${left} bereit – die Nahrung reicht nicht für mehr.`;
    this.notify(`${village.name}: ${recruits.length} × ${name} schließen sich dem Haufen an!${rest}`);
    this.emitSelection();
    this.emitBattleStatus();
  }

  /** Click on a place with mercenaries: hires one Landsknecht for its fee in gold. */
  private tryHire(village: VillageDefinition): void {
    const offer = village.mercenaries;
    if (!offer) return;
    const size = this.mapConfig.tileSize;
    const check = checkHire(this.mission, village, this.units, size, SUPPLY);
    const name = getUnitType(offer.typeId).name;
    if (check === 'noMercenariesLeft') {
      this.notify(`${village.name}: Hier sind keine ${name}e mehr anzuwerben.`);
      return;
    }
    if (check === 'noUnitNearby') {
      this.notify(`${village.name}: Schicke zuerst eigene Leute hin (blauer Kreis).`);
      return;
    }
    if (check === 'notEnoughFood') {
      this.notify(
        `${village.name}: Zu wenig Nahrung für einen weiteren Mann ` +
          `(Vorrat muss danach noch ${SUPPLY.lowSupplyDays} Tage reichen). Erst Nahrung beschaffen.`,
      );
      return;
    }
    if (check === 'notEnoughGold') {
      this.notify(`${village.name}: Zu wenig Gold – ein ${name} verlangt ${offer.fee} Gold Anwerbegebühr.`);
      return;
    }
    const unit = hireMercenary(this.mission, village, this.units, this.walkGrid, size, MOVEMENT.formationSpacing, SUPPLY);
    if (!unit) return;
    this.units.push(unit);
    this.addSprite(unit);
    const count = landsknechtCount(this.units, LANDSKNECHT);
    const share = Math.round(previewPostLoot(this.mission, MINI_MISSION.post, this.units, LANDSKNECHT).shareRate * 100);
    this.notify(
      `${village.name}: Ein ${name} lässt sich für ${offer.fee} Gold anwerben. ` +
        `${count} ${name}e beanspruchen nun ${share} % der Gold-Beute.`,
    );
    this.emitSelection();
    this.emitBattleStatus();
    this.emitSupplyStatus();
  }

  /** Key F: buys one lot of food at a village where own units stand (mini mission only). */
  private tryBuyFood(): void {
    if (this.scenario !== 'mission' || this.mission.outcome !== 'running') return;
    const size = this.mapConfig.tileSize;
    const markets = MINI_MISSION.villages.filter((v) => v.foodMarket);
    const checks = markets.map((village) => ({ village, check: checkFoodPurchase(this.mission, village, this.units, size) }));
    const ready = checks.find((c) => c.check === 'ok');
    if (ready) {
      const amount = buyFoodAtVillage(this.mission, ready.village, this.units, size);
      const left = this.mission.foodStock.get(ready.village.id) ?? 0;
      this.notify(
        `${ready.village.name}: ${amount} Nahrung für ${ready.village.foodMarket!.price} Gold gekauft ` +
          `(noch ${left} zu kaufen).`,
      );
      this.emitSupplyStatus();
      return;
    }
    const present = checks.find((c) => c.check !== 'noUnitNearby');
    if (!present) {
      this.notify('Nahrung kaufen: Schicke zuerst eigene Leute in ein Dorf (blauer Kreis).');
    } else if (present.check === 'soldOut') {
      this.notify(`${present.village.name}: Das Dorf hat keine Nahrung mehr zu verkaufen.`);
    } else if (present.check === 'notEnoughGold') {
      this.notify(`${present.village.name}: Zu wenig Gold (${present.village.foodMarket!.price} nötig).`);
    }
  }

  /** Key J: selected units go hunting in the forest under the mouse pointer (mini mission only). */
  private issueHuntOrder(): void {
    if (this.scenario !== 'mission' || this.mission.outcome !== 'running') return;
    const group = this.selectedUnits().filter((u) => !isHunting(u));
    if (group.length === 0) {
      this.notify('Jagd: Wähle zuerst eigene Leute aus, die nicht schon jagen.');
      return;
    }
    const pointer = this.input.activePointer;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const size = this.mapConfig.tileSize;
    const tile = worldToTile(world.x, world.y, size);
    const forest = forestAt(this.hunting, tile.x, tile.y);
    if (!forest) {
      this.notify('Jagd: Zeige mit dem Mauszeiger auf ein Waldstück und drücke dann J.');
      return;
    }
    const hunters = orderHunt(
      this.hunting,
      group,
      forest,
      { x: world.x, y: world.y },
      this.walkGrid,
      size,
      MOVEMENT.formationSpacing,
      MOVEMENT.lineOfSightMargin,
      HUNTING,
      this.mission.supply.day,
    );
    this.showTargetMarker(world.x, world.y, 0xd9a441);
    const level = stockLevel(forest, HUNTING);
    this.notify(
      `${hunters.length} Jäger ziehen ins ${forest.name} (${STOCK_LEVEL_NAMES[level]}). ` +
        'Sie kehren selbst zurück; Z ruft sie früher zurück.' +
        (level === 'exhausted' ? ' Dort gibt es nichts mehr zu holen!' : ''),
    );
  }

  /** Key Z: recalls the selected hunters, or all hunters if none is selected. */
  private issueRecall(): void {
    if (this.scenario !== 'mission') return;
    const selectedHunters = this.selectedUnits().filter(isHunting);
    const hunters = selectedHunters.length > 0 ? selectedHunters : this.units.filter(isHunting);
    const count = recallHunters(this.hunting, hunters);
    this.notify(
      count > 0
        ? `${count} Jäger brechen die Jagd ab und kehren mit ihrer Beute zurück.`
        : 'Zurückrufen: Keine Jäger unterwegs zum oder im Wald.',
    );
  }

  /**
   * Selected units that take orders: hunters only listen to the recall (Z).
   * Tells the player once if hunters were left out.
   */
  private commandableUnits(): Unit[] {
    const selected = this.selectedUnits();
    const group = selected.filter((u) => !isHunting(u));
    if (group.length < selected.length) {
      this.notify('Jäger nehmen erst wieder Befehle an, wenn sie zurück sind (Z: zurückrufen).');
    }
    return group;
  }

  private issueMoveOrder(worldX: number, worldY: number): void {
    const group = this.commandableUnits();
    if (group.length === 0) return;
    const result = orderGroupMove(
      group,
      this.walkGrid,
      this.mapConfig.tileSize,
      { x: worldX, y: worldY },
      MOVEMENT.formationSpacing,
      MOVEMENT.lineOfSightMargin,
    );
    markMarching(group, 'move');
    if (result && result.movedCount > 0) this.showTargetMarker(result.destination.x, result.destination.y);
  }

  private selectedUnits(): Unit[] {
    return this.units.filter((u) => this.selected.has(u.id));
  }

  private issueAttackOrder(target: Unit): void {
    const group = this.commandableUnits();
    if (group.length === 0) return;
    orderAttack(group, target);
    this.showTargetMarker(target.x, target.y, 0xe0563f);
  }

  private issueHoldOrder(): void {
    const group = this.commandableUnits();
    if (group.length === 0) return;
    orderHold(group);
    for (const unit of group) this.showTargetMarker(unit.x, unit.y, 0x9be37a);
  }

  /** Selected units break off any fight and march to the rally point, ignoring enemies on the way. */
  private issueRetreatOrder(): void {
    const group = this.commandableUnits();
    if (group.length === 0) return;
    orderGroupMove(
      group,
      this.walkGrid,
      this.mapConfig.tileSize,
      this.rallyPoint,
      MOVEMENT.formationSpacing,
      MOVEMENT.lineOfSightMargin,
    );
    markMarching(group, 'retreat');
    this.showTargetMarker(this.rallyPoint.x, this.rallyPoint.y, 0x6fb7e8);
  }

  private setRallyPointAtPointer(): void {
    const pointer = this.input.activePointer;
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tile = nearestWalkableTile(this.walkGrid, worldToTile(world.x, world.y, this.mapConfig.tileSize));
    if (!tile) return;
    const clicked = worldToTile(world.x, world.y, this.mapConfig.tileSize);
    this.rallyPoint =
      tile.x === clicked.x && tile.y === clicked.y ? { x: world.x, y: world.y } : tileCenter(tile, this.mapConfig.tileSize);
    this.showTargetMarker(this.rallyPoint.x, this.rallyPoint.y, 0x6fb7e8);
  }

  /** Short-lived ring at the destination of an order. */
  private showTargetMarker(x: number, y: number, color = 0xf3e9d2): void {
    const marker = this.add.graphics({ x, y }).setDepth(2);
    marker.lineStyle(2, color, 1);
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
    const counts = new Map<string, number>();
    for (const unit of this.selectedUnits()) {
      const name = getUnitType(unit.typeId).name;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const event: SelectionChangedEvent = {
      selected: this.selected.size,
      total: this.units.filter((u) => u.faction === 'player').length,
      composition: [...counts].map(([name, count]) => `${count} ${name}`).join(', '),
    };
    this.game.events.emit(GameEvents.SelectionChanged, event);
  }

  private emitBattleStatus(): void {
    const isMission = this.scenario === 'mission';
    const event: BattleStatusEvent = {
      player: this.units.filter((u) => u.faction === 'player').length,
      enemy: this.units.filter((u) => u.faction === 'enemy').length,
      outcome: this.outcome,
      scenario: SCENARIO_NAMES[this.scenario],
      outcomeDetail:
        this.outcome === 'defeat'
          ? 'Alle eigenen Einheiten sind gefallen.'
          : isMission
            ? `Der ${MINI_MISSION.post.name} ist eingenommen.` +
              (this.mission.lootSettlement ? `\n${lootSettlementText(this.mission.lootSettlement)}` : '')
            : 'Alle Gegner sind gefallen.',
    };
    this.game.events.emit(GameEvents.BattleStatus, event);
  }

  /** Objective and village state of the mini mission for the UI (`null` hides the panel in other scenarios). */
  private emitMissionStatus(): void {
    let text: string | null = null;
    if (this.scenario === 'mission') {
      const post = MINI_MISSION.post;
      const presence = postPresence(post, this.units, this.mapConfig.tileSize);
      const percent = Math.floor((this.mission.captureProgress / post.captureTime) * 100);
      const state =
        this.mission.outcome === 'victory'
          ? 'in eigener Hand'
          : presence.player > 0 && presence.enemy > 0
          ? 'umkämpft'
          : presence.player > 0
            ? 'wird eingenommen'
            : presence.enemy > 0
              ? `${presence.enemy} Wachen halten ihn`
              : 'unbesetzt';
      const lines = [`Ziel: ${MINI_MISSION.briefing}`, `${post.name}: ${percent} % eingenommen (${state})`];
      for (const village of MINI_MISSION.villages) {
        if (village.volunteers) {
          const name = getUnitType(village.volunteers.typeId).name;
          const left = volunteersLeft(this.mission, village);
          const feedable = recruitableNow(this.mission, village, this.units, SUPPLY);
          const support = `Unterstützung ${village.support ?? 0} %`;
          lines.push(
            left === 0
              ? `${village.name} (${support}): Keine Freiwilligen (mehr)`
              : `${village.name} (${support}): ${left} × ${name} bereit (ohne Gold), Nahrung reicht für ${feedable} – ` +
                  'Dorf anklicken (Umschalt+Klick: nur einer)',
          );
        }
        const offer = village.mercenaries;
        if (offer) {
          const name = getUnitType(offer.typeId).name;
          const left = mercenariesLeft(this.mission, village);
          lines.push(
            left === 0
              ? `${village.name}: Keine ${name}e mehr anzuwerben`
              : `${village.name}: ${left} × ${name} anzuwerben, je ${offer.fee} Gold – anklicken (einer pro Klick)`,
            `  ${unitComparisonText(offer.typeId)}`,
          );
        }
        const market = village.foodMarket;
        if (market) {
          const stock = this.mission.foodStock.get(village.id) ?? 0;
          lines.push(
            stock > 0
              ? `  Nahrung kaufen (F, eigene Leute im Dorf): ${market.amount} für ${market.price} Gold, noch ${stock} vorrätig`
              : '  Nahrung: ausverkauft',
          );
        }
      }
      lines.push(...this.lootStatusLines());
      lines.push(...this.huntingStatusLines());
      text = lines.join('\n');
    }
    if (text === this.lastMissionText) return;
    this.lastMissionText = text;
    const event: MissionStatusEvent = { text };
    this.game.events.emit(GameEvents.MissionStatus, event);
  }

  /**
   * Expected loot of the post and the Landsknecht share now and with one more Landsknecht,
   * so the player can weigh their fighting power against their share (GDD 7.4, 12).
   */
  private lootStatusLines(): string[] {
    const post = MINI_MISSION.post;
    if (this.mission.lootSettlement) return [];
    const now = previewPostLoot(this.mission, post, this.units, LANDSKNECHT);
    const more = previewPostLoot(this.mission, post, this.units, LANDSKNECHT, 1);
    return [
      `Beute ${post.name}: ${now.totalGold} Gold, ${now.food} Nahrung`,
      `  Landsknecht-Anteil: ${now.landsknechte} Landsknecht(e) → ${now.claim} Gold, dir bleiben ${now.playerShare}` +
        ` · mit einem mehr: ${more.claim} Gold, dir bleiben ${more.playerShare}`,
    ];
  }

  /** Hunting party summary for the mission panel: who is where and how much food they carry. */
  private huntingStatusLines(): string[] {
    const hunts = [...this.hunting.hunts.values()];
    if (hunts.length === 0) return ['Jagd: niemand unterwegs (Leute auswählen, Maus auf Wald, J)'];
    const lines = [`Jagd: ${hunts.length} Jäger tragen ${carriedFood(this.hunting)} Nahrung (Z: zurückrufen)`];
    for (const forest of this.hunting.forests) {
      const here = hunts.filter((h) => h.forestId === forest.id);
      if (here.length === 0) continue;
      const phases = (Object.keys(HUNT_PHASE_NAMES) as HuntPhase[])
        .map((phase) => {
          const inPhase = here.filter((h) => h.phase === phase);
          if (inPhase.length === 0) return null;
          const time =
            phase === 'hunting' ? `, noch ${Math.ceil(Math.max(...inPhase.map((h) => h.timeLeft)))} s` : '';
          return `${inPhase.length} ${HUNT_PHASE_NAMES[phase]}${time}`;
        })
        .filter((p) => p !== null);
      lines.push(`  ${forest.name} (${STOCK_LEVEL_NAMES[stockLevel(forest, HUNTING)]}): ${phases.join(', ')}`);
    }
    return lines;
  }

  /** Notices and floating texts for what happened while hunting. */
  private handleHuntEvents(events: readonly HuntEvent[]): void {
    let creditedFood = 0;
    let creditedHunters = 0;
    for (const event of events) {
      const forest = this.hunting.forests[event.forestId];
      const unit = this.units.find((u) => u.id === event.unitId);
      if (event.kind === 'catch') {
        if (unit) this.showFloatingText(unit.x, unit.y - 10, `${event.species} +${event.food}`, '#f6d98b');
      } else if (event.kind === 'credited') {
        creditedFood += event.food;
        creditedHunters++;
        if (unit && event.food > 0) this.showFloatingText(unit.x, unit.y - 10, `+${event.food} Nahrung`, '#9be37a');
      } else if (event.kind === 'lost') {
        this.notify(
          event.food > 0
            ? `Ein Jäger ist gefallen – ${event.food} getragene Nahrung sind verloren.`
            : 'Ein Jäger ist gefallen.',
        );
      } else if (event.reason === 'exhausted' && forest) {
        this.notify(`${forest.name}: Das Wild ist erschöpft – die Jäger kehren zurück.`);
      }
    }
    if (creditedHunters > 0) {
      this.notify(
        creditedFood > 0
          ? `${creditedHunters} Jäger zurück beim Haufen: +${creditedFood} Nahrung.`
          : `${creditedHunters} Jäger zurück beim Haufen – ohne Beute.`,
      );
      this.emitSupplyStatus();
      this.emitSelection();
    }
  }

  private showFloatingText(x: number, y: number, text: string, color: string): void {
    const label = this.add
      .text(x, y, text, { fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '12px', color })
      .setOrigin(0.5, 1)
      .setDepth(6);
    this.tweens.add({ targets: label, y: y - 24, alpha: 0, duration: 1600, onComplete: () => label.destroy() });
  }

  /** Map labels of the forest regions: name and rough game stock. */
  private updateForestLabels(): void {
    this.hunting.forests.forEach((forest, i) => {
      const text = `${forest.name}\n${STOCK_LEVEL_NAMES[stockLevel(forest, HUNTING)]}`;
      const label = this.forestLabels[i];
      if (label && label.text !== text) label.setText(text);
    });
  }

  /** Gold, food, consumption and supply days of the mini mission (`null` hides the panel in other scenarios). */
  private emitSupplyStatus(): void {
    let text: string | null = null;
    let level: SupplyLevel = 'ok';
    if (this.scenario === 'mission') {
      const supply = this.mission.supply;
      const army = armySize(this.units);
      level = supplyLevel(supply, army, SUPPLY);
      const days = supplyDays(supply.food, army, SUPPLY);
      const daysText = Number.isFinite(days) ? days.toFixed(1).replace('.', ',') : '–';
      const clock =
        this.mission.outcome === 'running'
          ? `nächster Nahrungsabzug in ${Math.ceil(secondsUntilNextDay(supply, SUPPLY))} s`
          : 'Mission beendet';
      const lines = [
        `Tag ${supply.day} · ${clock}`,
        `Gold: ${supply.gold} · Nahrung: ${supply.food}`,
        `Landsknechte: ${landsknechtCount(this.units, LANDSKNECHT)}` +
          (this.mission.landsknechtArrears > 0 ? ` · Rückstand: ${this.mission.landsknechtArrears} Gold` : ''),
        `Verbrauch: ${dailyConsumption(army, SUPPLY)} Nahrung/Tag (${army} × ${SUPPLY.foodPerUnitPerDay})`,
        `Nahrung reicht für ca. ${daysText} Tage`,
      ];
      if (level === 'low') {
        lines.push(`Warnung: Vorräte knapp (unter ${SUPPLY.lowSupplyDays} Tagen) – Nahrung kaufen!`);
      } else if (level === 'shortage') {
        lines.push(`Warnung: Der Haufen hungert seit ${supply.shortageDays} Tag(en)!`, 'Keine neuen Freiwilligen, bis wieder Nahrung da ist.');
      }
      if (this.mission.landsknechtArrears > 0) {
        lines.push(`Warnung: Die Landsknechte warten auf ${this.mission.landsknechtArrears} Gold!`);
      }
      text = lines.join('\n');
    }
    if (this.scenario === 'mission' && this.mission.outcome === 'running' && level !== this.lastSupplyLevel) {
      if (level === 'low') this.notify('Die Vorräte werden knapp – neue Freiwillige schließen sich erst mit mehr Nahrung an.');
      if (level === 'shortage') this.notify('Hunger! Die Nahrung reicht nicht mehr für den ganzen Haufen.');
    }
    this.lastSupplyLevel = level;
    if (text === this.lastSupplyText) return;
    this.lastSupplyText = text;
    const event: SupplyStatusEvent = { text, level };
    this.game.events.emit(GameEvents.SupplyStatus, event);
  }

  /** Short notice at the end of each game day about what the army has eaten. */
  private reportDays(reports: readonly DayReport[]): void {
    const last = reports[reports.length - 1];
    if (!last) return;
    this.notify(
      last.eaten < last.needed
        ? `Tag ${last.day} vorbei: Nur ${last.eaten} von ${last.needed} Nahrung vorhanden – der Haufen hungert!`
        : `Tag ${last.day} vorbei: ${last.eaten} Nahrung verbraucht, ${last.food} übrig.`,
    );
  }

  update(_time: number, delta: number): void {
    this.updateKeyboardPan(delta);
    this.updateUnits(delta / 1000);
    this.drawSites();
    this.drawOverlay();
    this.drawSelectionBox();
    this.updateHover();
    this.updateUnitInfo();
  }

  private updateUnits(dt: number): void {
    let remaining = Math.min(dt, 0.25);
    const events: CombatEvent[] = [];
    const days: DayReport[] = [];
    const huntEvents: HuntEvent[] = [];
    while (remaining > 1e-6) {
      const step = Math.min(remaining, MAX_STEP);
      // After victory or defeat the fight is over; units only finish their walk.
      if (this.outcome === 'running') events.push(...stepCombat(this.units, this.walkGrid, step, this.combatConfig));
      stepMovement(this.units, this.walkGrid, step, this.movementConfig);
      if (this.scenario === 'mission') {
        // The day clock (and with it the food consumption) only runs while the mission does.
        if (this.mission.outcome === 'running') {
          days.push(...stepSupply(this.mission.supply, armySize(this.units), step, SUPPLY));
        }
        huntEvents.push(
          ...stepHunting(this.hunting, this.units, step, HUNTING, {
            grid: this.walkGrid,
            tileSize: this.mapConfig.tileSize,
            spacing: MOVEMENT.formationSpacing,
            margin: MOVEMENT.lineOfSightMargin,
            fallback: this.rallyPoint,
            supply: this.mission.supply,
            secondsPerDay: SUPPLY.secondsPerDay,
            day: this.mission.supply.day,
          }),
        );
        stepMission(this.mission, MINI_MISSION.post, this.units, step, this.mapConfig.tileSize);
      }
      remaining -= step;
    }
    if (events.length > 0) this.handleCombatEvents(events);
    if (this.scenario === 'mission') {
      if (this.mission.outcome !== this.outcome) {
        this.outcome = this.mission.outcome;
        const settlement = settlePostLoot(this.mission, MINI_MISSION.post, this.units, LANDSKNECHT);
        if (settlement?.arrears) {
          this.notify(`Warnung: Den Landsknechten fehlen ${settlement.arrears} Gold – der Rückstand bleibt offen!`);
        }
        this.emitBattleStatus();
      }
      this.reportDays(days);
      if (huntEvents.length > 0) this.handleHuntEvents(huntEvents);
      this.updateForestLabels();
      this.emitMissionStatus();
      this.emitSupplyStatus();
    }
    for (const unit of this.units) {
      this.sprites.get(unit.id)?.setPosition(unit.x, unit.y);
    }
  }

  private handleCombatEvents(events: readonly CombatEvent[]): void {
    let anyDeath = false;
    for (const event of events) {
      if (event.kind === 'hit') {
        this.showHit(event.fromX, event.fromY, event.toX, event.toY, event.ranged);
        continue;
      }
      if (event.kind === 'miss') {
        this.showMiss(event.attackerId, event.fromX, event.fromY, event.toX, event.toY);
        continue;
      }
      anyDeath = true;
      this.selected.delete(event.unitId);
      const sprite = this.sprites.get(event.unitId);
      this.sprites.delete(event.unitId);
      if (sprite) {
        this.tweens.add({
          targets: sprite,
          alpha: 0,
          angle: 90,
          duration: 500,
          onComplete: () => sprite.destroy(),
        });
      }
    }
    if (!anyDeath) return;
    // In the mission, `stepMission` decides (the post must be taken, not only the guards beaten).
    if (this.scenario !== 'mission') this.outcome = evaluateOutcome(this.units);
    this.emitSelection();
    this.emitBattleStatus();
  }

  /** Flying bolt for ranged hits, a short flash at the target for melee hits. */
  private showHit(fromX: number, fromY: number, toX: number, toY: number, ranged: boolean): void {
    if (ranged) {
      this.showBolt(fromX, fromY, toX, toY, () => this.showImpact(toX, toY, 0xf3e9d2));
      return;
    }
    this.showImpact(toX, toY, 0xffffff);
  }

  /** A missed bolt (target in cover) flies past the target and drops into the undergrowth. */
  private showMiss(attackerId: number, fromX: number, fromY: number, toX: number, toY: number): void {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.hypot(dx, dy) || 1;
    // Deterministic sideways offset per shooter so misses do not all look the same.
    const side = (attackerId % 2 === 0 ? 1 : -1) * 10;
    const endX = toX + (dx / length) * 18 - (dy / length) * side;
    const endY = toY + (dy / length) * 18 + (dx / length) * side;
    this.showBolt(fromX, fromY, endX, endY);
  }

  private showBolt(fromX: number, fromY: number, toX: number, toY: number, onArrive?: () => void): void {
    const bolt = this.add.graphics({ x: fromX, y: fromY }).setDepth(5);
    bolt.lineStyle(1.5, 0xf3e9d2, 1);
    bolt.lineBetween(-4, 0, 4, 0);
    bolt.setRotation(Math.atan2(toY - fromY, toX - fromX));
    this.tweens.add({
      targets: bolt,
      x: toX,
      y: toY,
      duration: (Math.hypot(toX - fromX, toY - fromY) / BOLT_SPEED) * 1000,
      onComplete: () => {
        bolt.destroy();
        onArrive?.();
      },
    });
  }

  private showImpact(x: number, y: number, color: number): void {
    const g = this.add.graphics().setDepth(5);
    g.fillStyle(color, 0.8);
    g.fillCircle(x, y, 3);
    this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  /**
   * Mini mission sites: village houses with the recruiting circle, the enemy post
   * (palisade) with its capture zone, a progress ring and a flag in the colour of
   * whoever holds it.
   */
  private drawSites(): void {
    const g = this.siteGraphics;
    if (!g) return;
    g.clear();
    if (this.scenario !== 'mission') return;
    const size = this.mapConfig.tileSize;

    for (const village of MINI_MISSION.villages) {
      const c = siteCenter(village, size);
      // The circle marks where own units must stand to recruit or buy food.
      const active =
        volunteersLeft(this.mission, village) > 0 ||
        mercenariesLeft(this.mission, village) > 0 ||
        (this.mission.foodStock.get(village.id) ?? 0) > 0;
      if (active) {
        g.lineStyle(2, 0x6fb7e8, 0.6);
        g.strokeCircle(c.x, c.y, village.recruitRadius);
      }
      if (village.kind === 'tavern') {
        this.drawTavern(g, c);
        continue;
      }
      for (const [dx, dy] of VILLAGE_HOUSES) {
        const x = c.x + dx;
        const y = c.y + dy;
        g.fillStyle(0x1b1a17, 0.35);
        g.fillRect(x - 9, y - 4, 20, 14);
        g.fillStyle(0xd8c7a0, 1);
        g.fillRect(x - 10, y - 6, 20, 14);
        g.fillStyle(0x8e3b2a, 1);
        g.fillTriangle(x - 12, y - 6, x + 12, y - 6, x, y - 16);
        g.fillStyle(0x4a3726, 1);
        g.fillRect(x - 2, y + 2, 4, 6);
      }
    }

    const post = MINI_MISSION.post;
    const c = siteCenter(post, size);
    const r = post.captureRadius;
    g.lineStyle(1, 0xf3e9d2, 0.35);
    g.strokeCircle(c.x, c.y, r);
    // Palisade: a ring of stakes inside the capture zone.
    g.fillStyle(0x5a4128, 1);
    const stakes = 28;
    for (let i = 0; i < stakes; i++) {
      if (i === stakes / 2) continue; // gate facing west
      const a = (i / stakes) * Math.PI * 2;
      g.fillCircle(c.x + Math.cos(a) * r * 0.7, c.y + Math.sin(a) * r * 0.7, 2.5);
    }
    // Capture progress ring.
    const share = this.mission.captureProgress / post.captureTime;
    if (share > 0) {
      g.lineStyle(4, 0x9be37a, 0.9);
      g.beginPath();
      g.arc(c.x, c.y, r, -Math.PI / 2, -Math.PI / 2 + share * Math.PI * 2);
      g.strokePath();
    }
    // Flag: red while the guards hold the post, the player's colour once taken.
    const flag = this.mission.outcome === 'victory' ? 0xf3e9d2 : 0xb03a2e;
    g.lineStyle(2, 0x1b1a17, 1);
    g.lineBetween(c.x, c.y, c.x, c.y - 28);
    g.fillStyle(flag, 1);
    g.fillTriangle(c.x, c.y - 28, c.x + 16, c.y - 23, c.x, c.y - 18);
  }

  /** Tavern: one large house with a hanging sign (jug) in the Landsknecht colour. */
  private drawTavern(g: Phaser.GameObjects.Graphics, c: Point): void {
    g.fillStyle(0x1b1a17, 0.35);
    g.fillRect(c.x - 19, c.y - 6, 40, 22);
    g.fillStyle(0xcdb58a, 1);
    g.fillRect(c.x - 20, c.y - 8, 40, 22);
    g.fillStyle(0x6b2f22, 1);
    g.fillTriangle(c.x - 24, c.y - 8, c.x + 24, c.y - 8, c.x, c.y - 26);
    g.fillStyle(0x4a3726, 1);
    g.fillRect(c.x - 3, c.y + 4, 7, 10);
    // Sign on a bracket to the right of the door.
    g.lineStyle(2, 0x4a3726, 1);
    g.lineBetween(c.x + 20, c.y - 2, c.x + 30, c.y - 2);
    g.fillStyle(0xe0a030, 1);
    g.fillRect(c.x + 24, c.y, 10, 9);
  }

  /**
   * Rally point, health bars (damaged or selected units), selection rings and,
   * for selected units, a faint line to their destination or attack target.
   */
  private drawOverlay(): void {
    const g = this.overlay;
    if (!g) return;
    g.clear();

    // Rally point: small flag.
    const rp = this.rallyPoint;
    g.lineStyle(2, 0x1b1a17, 1);
    g.lineBetween(rp.x, rp.y, rp.x, rp.y - 16);
    g.fillStyle(0x6fb7e8, 1);
    g.fillTriangle(rp.x, rp.y - 16, rp.x + 10, rp.y - 12, rp.x, rp.y - 8);

    for (const unit of this.units) {
      const selected = this.selected.has(unit.id);
      // Hunters: an ochre ring, filled further the more food they carry.
      const task = this.hunting.hunts.get(unit.id);
      if (task) {
        g.lineStyle(1.5, 0xd9a441, 0.9);
        g.strokeCircle(unit.x, unit.y, unit.radius + 5);
        if (task.carried > 0) {
          g.lineStyle(3, 0xd9a441, 1);
          g.beginPath();
          const share = Math.min(1, task.carried / HUNTING.carryCapacity);
          g.arc(unit.x, unit.y, unit.radius + 5, -Math.PI / 2, -Math.PI / 2 + share * Math.PI * 2);
          g.strokePath();
        }
      }
      if (selected || unit.hp < unit.maxHp) {
        const width = unit.radius * 2 + 4;
        const x = unit.x - width / 2;
        const y = unit.y - unit.radius - 6;
        const share = Math.max(0, unit.hp / unit.maxHp);
        g.fillStyle(0x1b1a17, 0.85);
        g.fillRect(x - 1, y - 1, width + 2, 4);
        g.fillStyle(share > 0.5 ? 0x9be37a : share > 0.25 ? 0xe8c547 : 0xe0563f, 1);
        g.fillRect(x, y, width * share, 2);
      }
      if (!selected) continue;
      // Reload bar of ranged units (fills up until the next shot is ready).
      const weapon = mainWeapon(unit);
      if (weapon.kind === 'ranged' && unit.attackCooldown > 0) {
        const width = unit.radius * 2 + 4;
        const x = unit.x - width / 2;
        const y = unit.y + unit.radius + 4;
        g.fillStyle(0x1b1a17, 0.85);
        g.fillRect(x - 1, y - 1, width + 2, 4);
        g.fillStyle(0x6fb7e8, 1);
        g.fillRect(x, y, width * (1 - unit.attackCooldown / weapon.cooldown), 2);
      }
      const target = unit.targetId !== null ? this.units.find((u) => u.id === unit.targetId) : undefined;
      if (target && (unit.order === 'attack' || unit.order === 'engage' || unit.order === 'hold')) {
        g.lineStyle(1, 0xe0563f, 0.45);
        g.lineBetween(unit.x, unit.y, target.x, target.y);
      }
      if (unit.order === 'hold') {
        g.lineStyle(1, 0x9be37a, 0.9);
        g.strokeRect(unit.x - unit.radius - 5, unit.y - unit.radius - 5, unit.radius * 2 + 10, unit.radius * 2 + 10);
      }
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

  /** Reports the unit under the pointer (or else the single selected unit) with its equipment to the UI. */
  private updateUnitInfo(): void {
    let unit: Unit | undefined;
    if (this.pointerInGame) {
      const pointer = this.input.activePointer;
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const tolerance = SELECTION.clickTolerance;
      unit =
        unitAtPoint(this.units, world.x, world.y, tolerance, 'player') ??
        unitAtPoint(this.units, world.x, world.y, tolerance, 'enemy');
    }
    if (!unit && this.selected.size === 1) unit = this.units.find((u) => this.selected.has(u.id));
    const text = unit ? this.describeUnit(unit) : null;
    if (text === this.lastUnitInfo) return;
    this.lastUnitInfo = text;
    const event: UnitInfoEvent = { text };
    this.game.events.emit(GameEvents.UnitInfo, event);
  }

  private describeUnit(unit: Unit): string {
    const type = getUnitType(unit.typeId);
    const armor = getArmor(unit.equipment.armor);
    // Damage per hit against an unarmoured, untrained target, i.e. weapon value × training.
    const unarmored = { ...unit, typeId: 'peasant' as const, equipment: { ...unit.equipment, armor: 'none' as const } };
    const weaponLine = (w: WeaponDefinition) =>
      `${w.name}: Schaden ${damageAgainst(unit, w, unarmored).toFixed(1)}, ` +
      `Reichweite ${w.range} px, ${w.kind === 'ranged' ? 'Nachladen' : 'Takt'} ${w.cooldown} s`;
    const lines = [
      `${type.name} (${unit.faction === 'player' ? 'eigene' : 'Gegner'}) · LP ${Math.ceil(unit.hp)}/${unit.maxHp}`,
      weaponLine(getWeapon(unit.equipment.weapon)),
    ];
    if (unit.equipment.sidearm) lines.push(`Nahkampf: ${weaponLine(getWeapon(unit.equipment.sidearm))}`);
    lines.push(
      `${armor.name}: −${Math.round(armor.protection * 100)} % Schaden` +
        (armor.speedFactor < 1 ? `, Tempo ${Math.round(armor.speedFactor * 100)} %` : '') +
        ` · Training ×${type.attack}, Parade ${Math.round(type.defense * 100)} %`,
    );
    const task = this.hunting.hunts.get(unit.id);
    if (task) {
      const forest = this.hunting.forests[task.forestId];
      lines.push(
        `Jäger (${forest?.name ?? 'Wald'}): ${HUNT_PHASE_NAMES[task.phase]}, trägt ${task.carried} Nahrung` +
          ` · erleidet ${Math.round((HUNTING.damageTakenFactor - 1) * 100)} % mehr Schaden`,
      );
    } else if (unit.faction === 'player' && this.scenario === 'mission') {
      lines.push(`Jagdglück: ${Math.round(HUNTING.catchChance[getWeapon(unit.equipment.weapon).weaponClass] * 100)} % je Versuch`);
    }
    return lines.join('\n');
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
    const size = this.mapConfig.tileSize;
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
    const forest = forestAt(this.hunting, tileX, tileY);
    const tileName = forest
      ? `${getTileDefinition(type).name} – ${forest.name}, ${STOCK_LEVEL_NAMES[stockLevel(forest, HUNTING)]} (J: jagen)`
      : getTileDefinition(type).name;
    const event: TileHoverEvent = { tileX, tileY, tileName };
    this.game.events.emit(GameEvents.TileHover, event);
  }
}

/** Gold of a loot settlement as shown to the player: total, Landsknecht share, player share (GDD 12). */
function lootSettlementText(s: LootSettlement): string {
  const lines = [
    `Beute: ${s.totalGold} Gold · an die Landsknechte: ${s.claim - s.arrears} · dir bleiben: ${s.playerShare}` +
      (s.paidFromTreasury > 0 ? ` (dazu ${s.paidFromTreasury} aus der Kasse)` : ''),
  ];
  if (s.food > 0) lines.push(`+${s.food} Nahrung`);
  if (s.arrears > 0) lines.push(`Rückstand bei den Landsknechten: ${s.arrears} Gold`);
  return lines.join('\n');
}

/** Base values of a hireable unit next to a plain peasant, so its fighting power can be weighed. */
function unitComparisonText(typeId: UnitTypeId): string {
  const describe = (id: UnitTypeId) => {
    const type = getUnitType(id);
    const armor = getArmor(type.equipment.armor);
    return (
      `${type.maxHp} LP, ${getWeapon(type.equipment.weapon).name.split(' (')[0]}, Schutz ${Math.round(armor.protection * 100)} %, ` +
      `Training ×${String(type.attack).replace('.', ',')}, Parade ${Math.round(type.defense * 100)} %`
    );
  };
  return `${getUnitType(typeId).name}: ${describe(typeId)} – Bauer zum Vergleich: ${describe('peasant')}`;
}
