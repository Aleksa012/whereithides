import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import {
  DEFAULT_LEVEL,
  getTileColor,
  LEVEL_COLS,
  LEVEL_ROWS,
  LEVEL_TILE_COUNT,
  TileData,
} from '../../shared/level';

const BUTTON_Y_OFFSET = 80;

export class Editor extends Scene {
  tileSprites: Phaser.GameObjects.Image[] = [];
  tileOverlays: Phaser.GameObjects.Image[] = [];
  overlayBaseYs: number[] = [];
  tileData = [...DEFAULT_LEVEL.tiles] as TileData[];
  selectedType: TileData = TileData.ROCK;
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
          .image(x, y, 'tile')
          .setDisplaySize(tileWidth - 10, tileHeight - 10)
          .setDepth(1)
          .setOrigin(0.5)
          .setVisible(false);

        this.tileSprites.push(tile);
        this.tileOverlays.push(overlay);
        this.overlayBaseYs.push(y);
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
      40,
      40,
      8,
      'rock',
      0x4a4a4a,
      () => {
        this.selectedType = TileData.ROCK;
        this.updateStatus();
      }
    );
    this.createControlButton(
      70,
      height - BUTTON_Y_OFFSET,
      40,
      40,
      8,
      'tree',
      0x4a4a4a,
      () => {
        this.selectedType = TileData.TREE;
        this.updateStatus();
      }
    );

    this.createControlButton(
      120,
      height - BUTTON_Y_OFFSET,
      40,
      40,
      8,
      'pickaxe',
      0x4a4a4a,
      () => {
        this.selectedType = TileData.PICKAXE;
        this.updateStatus();
      }
    );

    this.createControlButton(
      170,
      height - BUTTON_Y_OFFSET,
      40,
      40,
      8,
      'shovel',
      0x4a4a4a,
      () => {
        this.selectedType = TileData.SHOVEL;
        this.updateStatus();
      }
    );

    this.createControlButton(
      220,
      height - BUTTON_Y_OFFSET,
      40,
      40,
      8,
      'tile',
      0x4a4a4a,
      () => {
        this.selectedType = TileData.BASE_TILE;
        this.updateStatus();
      }
    );

    this.createControlButton(
      270,
      height - BUTTON_Y_OFFSET,
      40,
      40,
      8,
      'knight',
      0x4a4a4a,
      () => {
        this.saveLevel();
        this.updateStatus();
      }
    );

    this.renderGrid();
  }

  private createControlButton(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    img: string,
    fillColor: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const graphics = this.add.graphics();
    graphics.fillStyle(fillColor, 1);
    graphics.fillRoundedRect(0, 0, width, height, radius);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.strokeRoundedRect(0, 0, width, height, radius);

    const icon = this.add.image(width / 2, height / 2, img).setOrigin(0.5);

    const baseSize = Math.min(width, height) * 0.6;
    const iconScale = baseSize / Math.max(icon.width, icon.height);
    icon.setScale(iconScale);

    const container = this.add.container(x, y, [graphics, icon]);
    container.setSize(width, height);

    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(width / 2, height / 2, width, height),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    container.on('pointerdown', callback);
    container.setDepth(20);

    return container;
  }

  private updateStatus() {
    if (this.statusText) {
      if (this.selectedType === TileData.ROCK) {
        this.statusText.setText(`Selected: Rock`);
      } else if (this.selectedType === TileData.TREE) {
        this.statusText.setText(`Selected: Tree`);
      } else if (this.selectedType === TileData.PICKAXE) {
        this.statusText.setText(`Selected: Pickaxe`);
      } else if (this.selectedType === TileData.SHOVEL) {
        this.statusText.setText(`Selected: Shovel`);
      } else if (this.selectedType === TileData.BASE_TILE) {
        this.statusText.setText(`Selected: Base tile`);
      }
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
      const baseY = this.overlayBaseYs[i] ?? 0;

      if (type === TileData.ROCK) {
        overlay?.setTexture('rock').setVisible(true);
        overlay?.setY(baseY - 18);
      } else if (type === TileData.TREE) {
        overlay?.setTexture('tree').setVisible(true);
        overlay?.setY(baseY - 18);
      } else if (type === TileData.PICKAXE) {
        overlay?.setTexture('pickaxe').setVisible(true);
        overlay?.setY(baseY);
      } else if (type === TileData.SHOVEL) {
        overlay?.setTexture('shovel').setVisible(true);
        overlay?.setY(baseY);
      } else if (type === TileData.BASE_TILE) {
        overlay?.setTexture('tile').setVisible(false);
        overlay?.setY(baseY);
      }
    }
  }

  private async saveLevel() {
    try {
      const response = await fetch('/api/level', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tiles: this.tileData, levelId: this.levelId }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const message = result?.message ?? 'Failed to save level';
        if (this.statusText) {
          this.statusText.setText(message);
        }
        return;
      }

      if (result?.levelId) {
        this.levelId = result.levelId;
        localStorage.setItem('lastLevelId', this.levelId);
        if (this.statusText) {
          this.statusText.setText(`Saved level ${this.levelId}`);
        }
      }
    } catch (error) {
      if (this.statusText) {
        this.statusText.setText(
          error instanceof Error ? error.message : 'Failed to save level'
        );
      }
    }
  }
}
