import { Scene } from 'phaser';
import * as Phaser from 'phaser';

export class GameOver extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  gameover_text: Phaser.GameObjects.Text;

  constructor() {
    super('GameOver');
  }

  create() {
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0xff0000);

    this.background = this.add
      .image(0, 0, 'background')
      .setOrigin(0)
      .setAlpha(0.5);

    this.gameover_text = this.add
      .text(0, 0, 'Game Over', {
        fontFamily: 'Pixelify Sans',
        fontSize: '64px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center',
      })
      .setOrigin(0.5);

    this.updateLayout(this.scale.width, this.scale.height);

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize;
      this.updateLayout(width, height);
    });

    this.input.once('pointerdown', () => {
      this.scene.start('MainMenu');
    });
  }

  private updateLayout(width: number, height: number): void {
    this.cameras.resize(width, height);

    if (this.background) {
      this.background.setDisplaySize(width, height);
    }

    const scaleFactor = Math.min(Math.min(width / 1024, height / 768), 1);

    if (this.gameover_text) {
      this.gameover_text.setPosition(width / 2, height / 2);
      this.gameover_text.setScale(scaleFactor);
    }
  }
}
