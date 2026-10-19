import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MissionScene } from './scenes/MissionScene';
import { UiScene } from './scenes/UiScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1b1a17',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  scene: [BootScene, MissionScene, UiScene],
});

// Exposed for manual debugging in the browser console during development only.
if (import.meta.env.DEV) {
  (window as unknown as { game: Phaser.Game }).game = game;
}
