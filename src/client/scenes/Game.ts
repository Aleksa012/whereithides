import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import {
  DEFAULT_LEVEL,
  getTileColor,
  LEVEL_COLS,
  LEVEL_ROWS,
  LevelTileType,
} from '../../shared/level';

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  character: Phaser.GameObjects.Sprite;
  blocks: Phaser.GameObjects.Image[] = [];
  tileOverlays: Phaser.GameObjects.Rectangle[] = [];
  levelIdText: Phaser.GameObjects.Text | null = null;
  tiles: LevelTileType[] = [...DEFAULT_LEVEL.tiles] as LevelTileType[];
  isMoving: boolean = false;
  hasWon: boolean = false;
  winText: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  async create() {
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0x222222);

    this.background = this.add.image(512, 384, 'background').setAlpha(0.25);

    this.levelIdText = this.add
      .text(16, 16, 'Loading level…', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setDepth(50)
      .setScrollFactor(0);

    this.character = this.add
      .sprite(64, 64, 'knight', 0)
      .setScale(40)
      .setDepth(10);

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

    await this.loadSavedLevel();

    this.updateLayout(this.scale.width, this.scale.height);
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize;
      this.updateLayout(width, height);
    });

    this.events.on('update', () => this.updateWinState());
  }

  updateLayout(width: number, height: number) {
    this.cameras.resize(width, height);

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

    const scaleFactor = Math.min(Math.min(width / 1024, height / 768), 1);
    if (this.character) {
      this.character.setPosition(width / 8, height * 0.25);
      this.character.setScale(scaleFactor * 4);
    }

    this.renderLevel(width, height);
  }

  moveCharacterTo(x: number, y: number, isWinningSquare: boolean) {
    if (!this.character || this.isMoving || this.hasWon) return;

    this.isMoving = true;

    const currentFlip = this.character.flipX;
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
      duration,
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

  async loadSavedLevel() {
    const savedLevelId = window.localStorage.getItem('lastLevelId');
    if (!savedLevelId) {
      this.levelIdText?.setText('No saved level');
      return;
    }

    try {
      const response = await fetch(`/api/level/${savedLevelId}`);
      const result = await response.json();

      if (result?.levelData?.tiles && Array.isArray(result.levelData.tiles)) {
        this.tiles = result.levelData.tiles as LevelTileType[];
        this.levelIdText?.setText(`Level: ${savedLevelId}`);
      } else {
        this.levelIdText?.setText(`Level ${savedLevelId} not found`);
      }
    } catch (error) {
      this.levelIdText?.setText('Failed to load saved level');
      console.error('Failed to load saved level', error);
    }
  }

  renderLevel(width: number, height: number) {
    this.blocks.forEach((block) => block.destroy());
    this.tileOverlays.forEach((overlay) => overlay.destroy());
    this.blocks = [];
    this.tileOverlays = [];

    const tileWidth = width / LEVEL_COLS;
    const tileHeight = height / LEVEL_ROWS;
    const winningIndex = Math.floor(Math.random() * LEVEL_COLS * LEVEL_ROWS);
    const winningCol = winningIndex % LEVEL_COLS;
    const winningRow = Math.floor(winningIndex / LEVEL_COLS);

    for (let row = 0; row < LEVEL_ROWS; row++) {
      for (let col = 0; col < LEVEL_COLS; col++) {
        const x = col * tileWidth + tileWidth / 2;
        const y = row * tileHeight + tileHeight / 2;
        const index = row * LEVEL_COLS + col;
        const type = this.tiles[index] ?? 0;
        const isWinningSquare = row === winningRow && col === winningCol;

        const tile = this.add
          .image(x, y, 'tile')
          .setDisplaySize(tileWidth - 2, tileHeight - 2)
          .setDepth(0)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.moveCharacterTo(x, y, isWinningSquare));

        this.blocks.push(tile);

        const overlay = this.add
          .rectangle(
            x,
            y,
            tileWidth - 8,
            tileHeight - 8,
            getTileColor(type),
            type === 0 ? 0 : 1
          )
          .setDepth(1);

        if (type === 0) {
          overlay.setVisible(false);
        }

        this.tileOverlays.push(overlay);
      }
    }
  }

  updateWinState() {
    if (this.hasWon && this.winText) {
      this.winText.setVisible(true);
      this.winText.setPosition(this.scale.width / 2, this.scale.height / 2);
    } else if (this.winText) {
      this.winText.setVisible(false);
    }
  }
}
