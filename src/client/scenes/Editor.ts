import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import {
  DEFAULT_LEVEL,
  getTileColor,
  LEVEL_COLS,
  LEVEL_ROWS,
  LEVEL_TILE_COUNT,
  LevelTileType,
} from '../../shared/level';

const BUTTON_Y_OFFSET = 80;

export class Editor extends Scene {
  tileSprites: Phaser.GameObjects.Image[] = [];
  tileOverlays: Phaser.GameObjects.Rectangle[] = [];
  tileData = [...DEFAULT_LEVEL.tiles] as LevelTileType[];
  selectedType: LevelTileType = 1;
  levelId: string | null = null;
  statusText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('Editor');
  }

  create() {
    this.cameras.main.setBackgroundColor(0xe0c492);

    const { width, height } = this.scale;
    const tileWidth = width / LEVEL_COLS;
    const tileHeight = (height - 180) / LEVEL_ROWS;

    this.add
      .text(width / 2, 40, 'Edit Level', {
        fontFamily: 'Arial Black',
        fontSize: '48px',
        color: '#2f2f2f',
        stroke: '#000000',
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    for (let row = 0; row < LEVEL_ROWS; row++) {
      for (let col = 0; col < LEVEL_COLS; col++) {
        const index = row * LEVEL_COLS + col;
        const x = col * tileWidth + tileWidth / 2;
        const y = row * tileHeight + tileHeight / 2 + 80;

        const tile = this.add
          .image(x, y, 'tile')
          .setDisplaySize(tileWidth - 2, tileHeight - 2)
          .setDepth(0)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.setTile(index));

        const overlay = this.add
          .rectangle(x, y, tileWidth - 10, tileHeight - 10, 0x000000, 0)
          .setDepth(1)
          .setOrigin(0.5);

        this.tileSprites.push(tile);
        this.tileOverlays.push(overlay);
      }
    }

    this.statusText = this.add
      .text(width / 2, height - 30, 'Selected: Rock', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#2f2f2f',
      })
      .setOrigin(0.5);

    this.createControlButton(
      20,
      height - BUTTON_Y_OFFSET,
      'Add Rock',
      0x4a4a4a,
      () => {
        this.selectedType = 1;
        this.updateStatus();
      }
    );

    this.createControlButton(
      180,
      height - BUTTON_Y_OFFSET,
      'Add Hole',
      0x4a4a4a,
      () => {
        this.selectedType = 2;
        this.updateStatus();
      }
    );

    this.createControlButton(
      width - 180,
      height - BUTTON_Y_OFFSET,
      'Save Level',
      0x2f7f3f,
      () => {
        this.saveLevel();
      }
    );

    this.renderGrid();
  }

  private createControlButton(
    x: number,
    y: number,
    label: string,
    backgroundColor: number,
    onClick: () => void
  ) {
    const cssColor = `#${backgroundColor.toString(16).padStart(6, '0')}`;
    this.add
      .text(x, y, label, {
        fontFamily: 'Arial Black',
        fontSize: '24px',
        color: '#ffffff',
        backgroundColor: cssColor,
        padding: { x: 12, y: 8 },
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onClick);
  }

  private updateStatus() {
    if (this.statusText) {
      this.statusText.setText(
        `Selected: ${this.selectedType === 1 ? 'Rock' : 'Hole'}`
      );
    }
  }

  private setTile(index: number) {
    this.tileData[index] = this.selectedType;
    this.renderGrid();
  }

  private renderGrid() {
    for (let i = 0; i < LEVEL_TILE_COUNT; i++) {
      const overlay = this.tileOverlays[i];
      const type = this.tileData[i];

      if (type === 0) {
        overlay.setVisible(false);
      } else {
        overlay.setFillStyle(getTileColor(type), 1);
        overlay.setVisible(true);
      }
    }
  }

  private async saveLevel() {
    const response = await fetch('/api/level', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiles: this.tileData, levelId: this.levelId }),
    });

    const result = await response.json();
    if (result?.levelId) {
      this.levelId = result.levelId;
      localStorage.setItem('lastLevelId', this.levelId);
      if (this.statusText) {
        this.statusText.setText(`Saved level ${this.levelId}`);
      }
    }
  }
}
