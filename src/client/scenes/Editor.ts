import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import {
  DEFAULT_LEVEL,
  LEVEL_COLS,
  LEVEL_ROWS,
  LEVEL_TILE_COUNT,
  TileData,
} from '../../shared/level';

const BUTTON_Y_OFFSET = 80;

export class Editor extends Scene {
  tileSprites: Phaser.GameObjects.Image[] = [];
  tileOverlays: Phaser.GameObjects.Image[] = [];
  // Small dot indicators for the map tile — one per tile slot, mostly hidden
  mapIndicators: Phaser.GameObjects.Image[] = [];
  overlayBaseYs: number[] = [];
  tileData = [...DEFAULT_LEVEL.tiles] as TileData[];
  underlyingItems: Map<number, TileData> = new Map();

  // Only one tile can hold the hidden map — null means none placed yet
  mapTileIndex: number | null = null;

  selectedType: TileData | 'map' = TileData.ROCK;
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

        // Small corner dot — shown when this tile holds the hidden map
        const indicator = this.add
          .image(x, y, 'map')
          .setDepth(3)
          .setVisible(false);

        this.tileSprites.push(tile);
        this.tileOverlays.push(overlay);
        this.mapIndicators.push(indicator);
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

    // ── Tool buttons ────────────────────────────────────────────────────────
    const buttonY = height - BUTTON_Y_OFFSET;
    const btnSize = 40;
    const btnGap = 50;

    this.createToolButton(
      20 + btnGap * 0,
      buttonY,
      btnSize,
      'rock',
      0x4a4a4a,
      () => {
        this.selectedType = TileData.ROCK;
        this.updateStatus();
      }
    );
    this.createToolButton(
      20 + btnGap * 1,
      buttonY,
      btnSize,
      'tree',
      0x4a4a4a,
      () => {
        this.selectedType = TileData.TREE;
        this.updateStatus();
      }
    );
    this.createToolButton(
      20 + btnGap * 2,
      buttonY,
      btnSize,
      'pickaxe',
      0x4a4a4a,
      () => {
        this.selectedType = TileData.PICKAXE;
        this.updateStatus();
      }
    );
    this.createToolButton(
      20 + btnGap * 3,
      buttonY,
      btnSize,
      'shovel',
      0x4a4a4a,
      () => {
        this.selectedType = TileData.SHOVEL;
        this.updateStatus();
      }
    );
    this.createToolButton(
      20 + btnGap * 4,
      buttonY,
      btnSize,
      'tile',
      0x4a4a4a,
      () => {
        this.selectedType = TileData.BASE_TILE;
        this.updateStatus();
      }
    );

    // MAP button — gold background to stand out
    this.createToolButton(
      20 + btnGap * 5,
      buttonY,
      btnSize,
      'map',
      0x8b6914,
      () => {
        this.selectedType = 'map';
        this.updateStatus();
      }
    );

    // Save button
    this.createToolButton(
      20 + btnGap * 6,
      buttonY,
      btnSize,
      'knight',
      0x3a5a31,
      () => {
        this.openPublishModal();
      }
    );

    this.renderGrid();
  }

  // ─── Tool buttons ──────────────────────────────────────────────────────────

  private createToolButton(
    x: number,
    y: number,
    size: number,
    img: string,
    fillColor: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const radius = 8;
    const graphics = this.add.graphics();
    graphics.fillStyle(fillColor, 1);
    graphics.fillRoundedRect(0, 0, size, size, radius);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.strokeRoundedRect(0, 0, size, size, radius);

    const icon = this.add.image(size / 2, size / 2, img).setOrigin(0.5);
    const iconScale = (size * 0.6) / Math.max(icon.width, icon.height);
    icon.setScale(iconScale);

    const container = this.add.container(x, y, [graphics, icon]);
    container.setSize(size, size);
    container.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(size / 2, size / 2, size, size),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    container.on('pointerdown', callback);
    container.setDepth(20);
    return container;
  }

  // ─── Status ────────────────────────────────────────────────────────────────

  private updateStatus() {
    if (!this.statusText) return;
    const labels: Record<string, string> = {
      [TileData.ROCK]: 'Rock',
      [TileData.TREE]: 'Tree',
      [TileData.PICKAXE]: 'Pickaxe',
      [TileData.SHOVEL]: 'Shovel',
      [TileData.BASE_TILE]: 'Base tile',
      map: 'Map',
    };
    const key = this.selectedType === 'map' ? 'map' : String(this.selectedType);
    this.statusText.setText(`Selected: ${labels[key] ?? '?'}`);
  }

  // ─── Tile placement ────────────────────────────────────────────────────────

  private setTile(index: number) {
    if (this.selectedType === 'map') {
      // Move the map to this tile (clears previous location automatically)
      this.mapTileIndex = index;
      this.renderGrid();
      return;
    }

    const currentTile = this.tileData[index];

    if (this.selectedType === TileData.BASE_TILE) {
      // Full reset: clear tile and any underlying item
      this.tileData[index] = TileData.BASE_TILE;
      this.underlyingItems.delete(index);
      // Also remove the map if it was here
      if (this.mapTileIndex === index) this.mapTileIndex = null;
    } else if (
      (this.selectedType === TileData.ROCK ||
        this.selectedType === TileData.TREE) &&
      (currentTile === TileData.SHOVEL || currentTile === TileData.PICKAXE)
    ) {
      // Layer obstacle on top of a tool
      this.underlyingItems.set(index, currentTile);
      this.tileData[index] = this.selectedType;
    } else {
      this.tileData[index] = this.selectedType;
      this.underlyingItems.delete(index);
    }

    this.renderGrid();
  }

  // ─── Grid render ───────────────────────────────────────────────────────────

  private renderGrid() {
    for (let i = 0; i < LEVEL_TILE_COUNT; i++) {
      const overlay = this.tileOverlays[i];
      const indicator = this.mapIndicators[i];
      const type = this.tileData[i];
      const baseY = this.overlayBaseYs[i] ?? 0;

      switch (type) {
        case TileData.ROCK:
          overlay
            ?.setTexture('rock')
            .setVisible(true)
            .setY(baseY - 18);
          break;
        case TileData.TREE:
          overlay
            ?.setTexture('tree')
            .setVisible(true)
            .setY(baseY - 18);
          break;
        case TileData.PICKAXE:
          overlay?.setTexture('pickaxe').setVisible(true).setY(baseY);
          break;
        case TileData.SHOVEL:
          overlay?.setTexture('shovel').setVisible(true).setY(baseY);
          break;
        default:
          overlay?.setTexture('tile').setVisible(false).setY(baseY);
          break;
      }

      // Gold dot in the corner marks the single map tile
      indicator?.setVisible(i === this.mapTileIndex);
    }
  }

  private async publishLevel(
    title: string
  ): Promise<{ success: true } | { success: false; message: string }> {
    try {
      const levelId = crypto.randomUUID();

      const underlyingItemsPayload = Array.from(
        this.underlyingItems.entries()
      ).map(([index, item]) => ({ index, item }));

      const response = await fetch('/api/level/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          levelId,
          tiles: this.tileData,
          underlyingItems: underlyingItemsPayload,
          mapTileIndex: this.mapTileIndex,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        return {
          success: false,
          message: result?.message ?? 'Failed to publish level.',
        };
      }

      if (result?.levelId) {
        this.levelId = result.levelId;
        localStorage.setItem('lastLevelId', this.levelId!);
        this.statusText?.setText(`Published as "${title}"`);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to publish level.',
      };
    }
  }

  private openPublishModal() {
    // Guard against opening twice
    if (document.getElementById('level-publish-modal')) return;

    const overlay = document.createElement('div');
    overlay.id = 'level-publish-modal';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '1000',
      fontFamily: 'Arial, sans-serif',
    });

    const panel = document.createElement('div');
    Object.assign(panel.style, {
      background: '#1a1a2e',
      border: '3px solid #ffd700',
      borderRadius: '12px',
      padding: '24px',
      width: 'min(90vw, 400px)',
      boxSizing: 'border-box',
      textAlign: 'center',
    });

    const heading = document.createElement('h2');
    heading.textContent = 'Publish this level';
    Object.assign(heading.style, {
      color: '#ffd700',
      margin: '0 0 16px 0',
      fontSize: '22px',
    });

    const label = document.createElement('label');
    label.textContent = 'Post title';
    Object.assign(label.style, {
      display: 'block',
      color: '#dddddd',
      fontSize: '13px',
      textAlign: 'left',
      marginBottom: '6px',
    });

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Find it yall';
    input.maxLength = 300;
    Object.assign(input.style, {
      width: '100%',
      boxSizing: 'border-box',
      padding: '10px 12px',
      fontSize: '16px',
      borderRadius: '6px',
      border: '1px solid #555',
      marginBottom: '20px',
      outline: 'none',
    });

    const buttonRow = document.createElement('div');
    Object.assign(buttonRow.style, {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
    });

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    Object.assign(cancelButton.style, {
      flex: '1',
      padding: '10px',
      borderRadius: '8px',
      border: 'none',
      background: '#555',
      color: '#fff',
      fontSize: '15px',
      cursor: 'pointer',
    });
    cancelButton.onclick = () => overlay.remove();

    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'Publish';
    Object.assign(confirmButton.style, {
      flex: '1',
      padding: '10px',
      borderRadius: '8px',
      border: 'none',
      background: '#3a5a31',
      color: '#fff',
      fontSize: '15px',
      cursor: 'pointer',
      fontWeight: 'bold',
    });

    confirmButton.onclick = async () => {
      const title = input.value.trim() || 'Find it yall';

      confirmButton.disabled = true;
      cancelButton.disabled = true;
      confirmButton.textContent = 'Publishing…';

      const result = await this.publishLevel(title);

      if (result.success) {
        heading.textContent = 'Published!';
        heading.style.color = '#7CFC00';
        label.remove();
        input.remove();
        buttonRow.remove();

        const closeBtn = document.createElement('button');
        closeBtn.textContent = 'Close';
        Object.assign(closeBtn.style, {
          padding: '10px 24px',
          borderRadius: '8px',
          border: 'none',
          background: '#3f5f8b',
          color: '#fff',
          fontSize: '15px',
          cursor: 'pointer',
        });
        closeBtn.onclick = () => overlay.remove();
        panel.appendChild(closeBtn);
      } else {
        confirmButton.disabled = false;
        cancelButton.disabled = false;
        confirmButton.textContent = 'Publish';

        let errorText = panel.querySelector(
          '.publish-error'
        ) as HTMLParagraphElement | null;
        if (!errorText) {
          errorText = document.createElement('p');
          errorText.className = 'publish-error';
          Object.assign(errorText.style, {
            color: '#ff6b6b',
            fontSize: '13px',
            margin: '0 0 12px 0',
          });
          panel.insertBefore(errorText, buttonRow);
        }
        errorText.textContent = result.message;
      }
    };

    buttonRow.appendChild(cancelButton);
    buttonRow.appendChild(confirmButton);

    panel.appendChild(heading);
    panel.appendChild(label);
    panel.appendChild(input);
    panel.appendChild(buttonRow);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    input.focus();
  }
}
