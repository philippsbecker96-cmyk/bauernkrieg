import Phaser from 'phaser';
import { TEST_MAP } from '../game/data/maps';
import { GameEvents, SceneKeys, type SelectionChangedEvent, type TileHoverEvent } from './sceneKeys';

/**
 * Screen-space overlay with its own camera, so it is unaffected by
 * map scrolling and zoom.
 */
export class UiScene extends Phaser.Scene {
  private hoverText?: Phaser.GameObjects.Text;
  private selectionText?: Phaser.GameObjects.Text;

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
    this.add.text(
      12,
      52,
      [
        'Auswählen: Linksklick / Rahmen ziehen · Umschalt: hinzufügen · Esc: abwählen',
        'Bewegen: Rechtsklick',
        'Kamera: WASD / Pfeiltasten · Zoom: Mausrad · Ziehen: mittlere Maustaste',
      ].join('\n'),
      style,
    );
    this.selectionText = this.add.text(12, 134, 'Ausgewählt: –', style);
    this.hoverText = this.add.text(12, 170, 'Kachel: –', style);

    const onHover = (event: TileHoverEvent) => {
      this.hoverText?.setText(`Kachel ${event.tileX}, ${event.tileY}: ${event.tileName}`);
    };
    const onSelection = (event: SelectionChangedEvent) => {
      this.selectionText?.setText(`Ausgewählt: ${event.selected} von ${event.total} Bauern`);
    };
    this.game.events.on(GameEvents.TileHover, onHover);
    this.game.events.on(GameEvents.SelectionChanged, onSelection);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(GameEvents.TileHover, onHover);
      this.game.events.off(GameEvents.SelectionChanged, onSelection);
    });
  }
}
