import Phaser from 'phaser';
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
 * Screen-space overlay with its own camera, so it is unaffected by
 * map scrolling and zoom.
 */
export class UiScene extends Phaser.Scene {
  private hoverText?: Phaser.GameObjects.Text;
  private selectionText?: Phaser.GameObjects.Text;
  private battleText?: Phaser.GameObjects.Text;
  private outcomeText?: Phaser.GameObjects.Text;
  private unitInfoText?: Phaser.GameObjects.Text;
  private fpsText?: Phaser.GameObjects.Text;
  private missionText?: Phaser.GameObjects.Text;
  private noticeText?: Phaser.GameObjects.Text;
  private supplyText?: Phaser.GameObjects.Text;
  private noticeTimer?: Phaser.Time.TimerEvent;
  private fpsTimer = 0;

  constructor() {
    super(SceneKeys.Ui);
  }

  create(): void {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Georgia, "Times New Roman", serif',
      fontSize: '16px',
      color: '#f3e9d2',
      backgroundColor: 'rgba(27, 26, 23, 0.75)',
      padding: { x: 10, y: 6 },
    };

    const title = this.add.text(12, 12, 'Bauernkrieg', { ...style, fontSize: '20px' });
    this.fpsText = this.add.text(title.x + title.width + 8, 12, 'FPS –', { ...style, fontSize: '20px' });
    const help = this.add.text(
      12,
      52,
      [
        'Auswählen: Linksklick / Rahmen ziehen · Umschalt: hinzufügen · Esc: abwählen',
        'Bewegen: Rechtsklick · Angreifen: Rechtsklick auf Gegner',
        'Halten: H · Rückzug zum Sammelpunkt: R · Sammelpunkt an Mauszeiger setzen: P',
        'Rekrutieren: eigene Leute ins Dorf schicken, dann Linksklick auf das Dorf (Umschalt: nur einer) · Nahrung kaufen dort: F',
        'Kamera: WASD / Pfeiltasten · Zoom: Mausrad · Ziehen: mittlere Maustaste · Neustart: N',
        'Testgefecht ein/aus: T · Belastungstest (100 Einheiten) ein/aus: B · Einheitenwerte: Maus über Einheit',
      ].join('\n'),
      style,
    );
    let y = help.y + help.height + 6;
    this.missionText = this.add.text(12, y, '', { ...style, color: '#f6d98b' }).setVisible(false);
    y += this.missionText.height + 6;
    const missionY = this.missionText.y;
    this.battleText = this.add.text(12, y, 'Eigene: – · Gegner: –', style);
    y += this.battleText.height + 6;
    this.selectionText = this.add.text(12, y, 'Ausgewählt: –', style);
    y += this.selectionText.height + 6;
    this.hoverText = this.add.text(12, y, 'Kachel: –', style);
    y += this.hoverText.height + 6;
    this.unitInfoText = this.add.text(12, y, '', { ...style, fontSize: '14px' }).setVisible(false);

    this.outcomeText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, '', {
        ...style,
        fontSize: '36px',
        align: 'center',
        padding: { x: 24, y: 16 },
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Supplies in the top-right corner, away from the help and status lines.
    this.supplyText = this.add
      .text(this.scale.width - 12, 12, '', { ...style, align: 'right' })
      .setOrigin(1, 0)
      .setVisible(false);

    this.noticeText = this.add
      .text(this.scale.width / 2, this.scale.height - 40, '', { ...style, fontSize: '18px', align: 'center' })
      .setOrigin(0.5, 1)
      .setVisible(false);

    const onHover = (event: TileHoverEvent) => {
      this.hoverText?.setText(`Kachel ${event.tileX}, ${event.tileY}: ${event.tileName}`);
    };
    const onSelection = (event: SelectionChangedEvent) => {
      const detail = event.composition ? ` (${event.composition})` : '';
      this.selectionText?.setText(`Ausgewählt: ${event.selected} von ${event.total} eigenen Einheiten${detail}`);
    };
    const onBattle = (event: BattleStatusEvent) => {
      this.battleText?.setText(`${event.scenario} · Eigene: ${event.player} · Gegner: ${event.enemy}`);
      if (event.outcome === 'running') {
        this.outcomeText?.setVisible(false);
        return;
      }
      const title = event.outcome === 'victory' ? 'Sieg!' : 'Niederlage';
      this.outcomeText
        ?.setText(`${title}\n${event.outcomeDetail}\nN: Neustart`)
        .setColor(event.outcome === 'victory' ? '#9be37a' : '#e0563f')
        .setPosition(this.scale.width / 2, this.scale.height / 2)
        .setVisible(true);
    };
    const onUnitInfo = (event: UnitInfoEvent) => {
      this.unitInfoText?.setText(event.text ?? '').setVisible(event.text !== null);
    };
    // The mission panel has a variable height: push the status lines below it down.
    const onMission = (event: MissionStatusEvent) => {
      const text = this.missionText;
      if (!text) return;
      text.setText(event.text ?? '').setVisible(event.text !== null);
      let next = event.text === null ? missionY : missionY + text.height + 6;
      for (const line of [this.battleText, this.selectionText, this.hoverText, this.unitInfoText]) {
        line?.setY(next);
        next += (line?.height ?? 0) + 6;
      }
    };
    const onNotice = (event: NoticeEvent) => {
      this.noticeText
        ?.setText(event.text)
        .setPosition(this.scale.width / 2, this.scale.height - 40)
        .setVisible(true);
      this.noticeTimer?.remove();
      this.noticeTimer = this.time.delayedCall(4000, () => this.noticeText?.setVisible(false));
    };
    const supplyColors: Record<SupplyStatusEvent['level'], string> = {
      ok: '#f3e9d2',
      low: '#f0b44c',
      shortage: '#ff7a5c',
    };
    const onSupply = (event: SupplyStatusEvent) => {
      this.supplyText
        ?.setText(event.text ?? '')
        .setColor(supplyColors[event.level])
        .setPosition(this.scale.width - 12, 12)
        .setVisible(event.text !== null);
    };
    this.game.events.on(GameEvents.TileHover, onHover);
    this.game.events.on(GameEvents.SupplyStatus, onSupply);
    this.game.events.on(GameEvents.UnitInfo, onUnitInfo);
    this.game.events.on(GameEvents.SelectionChanged, onSelection);
    this.game.events.on(GameEvents.BattleStatus, onBattle);
    this.game.events.on(GameEvents.MissionStatus, onMission);
    this.game.events.on(GameEvents.Notice, onNotice);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GameEvents.TileHover, onHover);
      this.game.events.off(GameEvents.SelectionChanged, onSelection);
      this.game.events.off(GameEvents.BattleStatus, onBattle);
      this.game.events.off(GameEvents.UnitInfo, onUnitInfo);
      this.game.events.off(GameEvents.MissionStatus, onMission);
      this.game.events.off(GameEvents.Notice, onNotice);
      this.game.events.off(GameEvents.SupplyStatus, onSupply);
    });
  }

  /** Frame rate display (updated twice per second) for the performance test. */
  update(_time: number, delta: number): void {
    this.fpsTimer -= delta;
    if (this.fpsTimer > 0) return;
    this.fpsTimer = 500;
    this.fpsText?.setText(`FPS ${Math.round(this.game.loop.actualFps)}`);
  }
}
