import { Scene } from 'phaser';
import * as Phaser from 'phaser';

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  character: Phaser.GameObjects.Sprite;
  blocks: Phaser.GameObjects.Rectangle[];
  isMoving: boolean = false;
  hasWon: boolean = false;
  winText: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create() {
    // Configure camera & background
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x222222);

    // Optional: semi-transparent background image if one has been loaded elsewhere
    this.background = this.add.image(512, 384, 'background').setAlpha(0.25);

    /* -------------------------------------------
     *  UI Elements
     * ------------------------------------------- */

    // Display the current count

    // Fetch the initial counter value from server and update UI

    this.character = this.add
      .sprite(64, 64, 'knight', 0)
      .setScale(40)
      .setDepth(10);

    this.blocks = new Array();

    // Create win text (hidden initially)
    this.winText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'You Won!', {
        fontFamily: 'Arial Black',
        fontSize: 64,
        color: '#FFD700',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setVisible(false);

    // Fill screen with rectangles
    this.fillScreenWithBlocks(this.scale.width, this.scale.height);

    // Setup responsive layout
    this.updateLayout(this.scale.width, this.scale.height);
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize;
      this.updateLayout(width, height);
    });

    // Add update loop to check win state
    this.events.on('update', () => this.updateWinState());

    // No automatic navigation to GameOver – users can stay in this scene.
  }

  updateLayout(width: number, height: number) {
    // Resize camera viewport to avoid black bars
    this.cameras.resize(width, height);

    // Center and scale background image to cover screen
    if (this.background) {
      this.background.setPosition(width / 2, height / 2);
      if (this.background.width && this.background.height) {
        const scale = Math.max(
          width / this.background.width,
          height / this.background.height
        );
        this.background.setScale(scale);
      }
    }

    // Calculate a scale factor relative to a 1024 × 768 reference resolution.
    // We only shrink on smaller screens – never enlarge above 1×.
    const scaleFactor = Math.min(Math.min(width / 1024, height / 768), 1);

    if (this.character) {
      this.character.setPosition(width / 8, height * 0.25);
      this.character.setScale(scaleFactor * 4);
    }

    this.fillScreenWithBlocks(width, height);
  }

  moveCharacterTo(x: number, y: number, isWinningSquare: boolean) {
    if (!this.character || this.isMoving || this.hasWon) return;

    this.isMoving = true;

    const currentFlip = this.character.flipX; // false if looking left

    if (this.character.x > x && !currentFlip) {
      this.character.setFlipX(true);
    } else if (this.character.x <= x && currentFlip) {
      this.character.setFlipX(false);
    }

    const duration = 1000;

    this.tweens.add({
      targets: this.character,
      x: x,
      y: y,
      duration: duration,
      ease: 'Linear',
      onComplete: () => {
        this.character.anims.stop();
        if (isWinningSquare) {
          this.hasWon = true;
        }
        this.isMoving = false;
      },
      onStart: () => this.character.play('run'),
    });
  }

  fillScreenWithBlocks(width: number, height: number) {
    this.blocks.forEach((block) => block.destroy());
    this.blocks = [];

    const cols = Math.ceil(width / 8);
    const rows = Math.ceil(height / 8);

    const winningIndex = Math.ceil(Math.random() * 64);

    console.log(winningIndex);

    const winningCol = winningIndex % 8;
    const winningRow =
      winningIndex % 8 === 0
        ? winningIndex / 8
        : Math.floor(winningIndex / 8) + 1;

    const color = 0xff6b6b;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = col * cols + cols / 2;
        const y = row * rows + rows / 2;

        const isWinningSquare = row === winningRow && col === winningCol;

        const block = this.add
          .rectangle(x, y, cols - 2, rows - 2, color)
          .setStrokeStyle(2, 0x222222)
          .setDepth(0)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.moveCharacterTo(x, y, isWinningSquare));

        this.blocks.push(block);
      }
    }
  }

  updateWinState() {
    if (this.hasWon && this.winText) {
      this.winText.setVisible(true);
      // Center win text on screen in case of resize
      this.winText.setPosition(this.scale.width / 2, this.scale.height / 2);
    } else if (this.winText) {
      this.winText.setVisible(false);
    }
  }
}
