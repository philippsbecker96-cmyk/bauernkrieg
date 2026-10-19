import Phaser from 'phaser';
import { TEST_MAP } from '../game/data/maps';
import {
  GameEvents,
  SceneKeys,
  type BattleStatusEvent,
  type SelectionChangedEvent,
  type TileHoverEvent,
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

    this.add.text(12, 12, `Bauernkrieg – ${TEST_MAP.name}`, { ...style, fontSize: '20px' });
    const help = this.add.text(
      12,
      52,
      [
        'Auswählen: Linksklick / Rahmen ziehen · Umschalt: hinzufügen · Esc: abwählen',
        'Bewegen: Rechtsklick · Angreifen: Rechtsklick auf Gegner',
        'Halten: H · Rückzug zum Sammelpunkt: R · Sammelpunkt an Mauszeiger setzen: P',
        'Kamera: WASD / Pfeiltasten · Zoom: Mausrad · Ziehen: mittlere Maustaste · Neustart: N',
      ].join('\n'),
      style,
    );
    let y = help.y + help.height + 6;
    this.battleText = this.add.text(12, y, 'Eigene: – · Gegner: –', style);
    y += this.battleText.height + 6;
    this.selectionText = this.add.text(12, y, 'Ausgewählt: –', style);
    y += this.selectionText.height + 6;
    this.hoverText = this.add.text(12, y, 'Kachel: –', style);

    this.outcomeText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, '', {
        ...style,
        fontSize: '36px',
        align: 'center',
        padding: { x: 24, y: 16 },
      })
      .setOrigin(0.5)
      .setVisible(false);

    const onHover = (event: TileHoverEvent) => {
      this.hoverText?.setText(`Kachel ${event.tileX}, ${event.tileY}: ${event.tileName}`);
    };
    const onSelection = (event: SelectionChangedEvent) => {
      this.selectionText?.setText(`Ausgewählt: ${event.selected} von ${event.total} eigenen Einheiten`);
    };
    const onBattle = (event: BattleStatusEvent) => {
      this.battleText?.setText(`Eigene: ${event.player} · Gegner: ${event.enemy}`);
      if (event.outcome === 'running') {
        this.outcomeText?.setVisible(false);
        return;
      }
      const title = event.outcome === 'victory' ? 'Sieg!' : 'Niederlage';
      const detail =
        event.outcome === 'victory' ? 'Alle Gegner sind gefallen.' : 'Alle eigenen Einheiten sind gefallen.';
      this.outcomeText
        ?.setText(`${title}\n${detail}\nN: Neustart`)
        .setColor(event.outcome === 'victory' ? '#9be37a' : '#e0563f')
        .setPosition(this.scale.width / 2, this.scale.height / 2)
        .setVisible(true);
    };
    this.game.events.on(GameEvents.TileHover, onHover);
    this.game.events.on(GameEvents.SelectionChanged, onSelection);
    this.game.events.on(GameEvents.BattleStatus, onBattle);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GameEvents.TileHover, onHover);
      this.game.events.off(GameEvents.SelectionChanged, onSelection);
      this.game.events.off(GameEvents.BattleStatus, onBattle);
    });
  }
}
