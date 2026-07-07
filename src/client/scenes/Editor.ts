import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import {
  DEFAULT_LEVEL,
  LEVEL_COLS,
  LEVEL_ROWS,
  LEVEL_TILE_COUNT,
  TileData,
} from '../../shared/level';
import { isLevelBeatable } from '../../shared/levelTest';

const BUTTON_Y_OFFSET = 80;
const BUTTON_GRAY = 0x4a4a4a;
const BUTTON_SELECTED = 0x41d900;

export class Editor extends Scene {
  tileSprites: Phaser.GameObjects.Image[] = [];
  tileOverlays: Phaser.GameObjects.Image[] = [];
  // Small dot indicators for the map tile — one per tile slot, mostly hidden
  mapIndicators: Phaser.GameObjects.Image[] = [];
  startIndicators: Phaser.GameObjects.Image[] = [];
  winningIndicators: Phaser.GameObjects.Image[] = [];
  overlayBaseYs: number[] = [];
  tileData = [...DEFAULT_LEVEL.tiles] as TileData[];
  underlyingItems: Map<number, TileData> = new Map();

  // Only one tile can hold the hidden map — null means none placed yet
  mapTileIndex: number | null = null;
  startTileIndex: number | null = null;
  winningTileIndex: number | null = null;

  selectedType: TileData | 'map' | 'start' | 'winning' = TileData.ROCK;
  levelId: string | null = null;
  levelIsNotBeatableReason: Phaser.GameObjects.Text | null = null;

  toolButtonEntries: {
    graphics: Phaser.GameObjects.Graphics;
    type: TileData | 'map' | 'start' | 'winning';
    size: number;
  }[] = [];

  constructor() {
    super('Editor');
  }

  create() {
    this.cameras.main.setBackgroundColor(0xe0c492);

    const { width, height } = this.scale;
    const tileWidth = width / LEVEL_COLS;
    const tileHeight = tileWidth;

    const tileTop = 80;

    for (let row = 0; row < LEVEL_ROWS; row++) {
      for (let col = 0; col < LEVEL_COLS; col++) {
        const index = row * LEVEL_COLS + col;
        const x = col * tileWidth + tileWidth / 2;
        const y = row * tileHeight + tileHeight / 2 + tileTop;

        const tile = this.add
          .image(x, y, 'tile')
          .setDisplaySize(tileWidth - 2, tileHeight - 2)
          .setDepth(0)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.setTile(index));

        const overlay = this.add
          .image(x, y, 'tile')
          .setDisplaySize(tileWidth - 10, tileHeight - 10)
          .setDepth(2)
          .setOrigin(0.5)
          .setVisible(false);

        // Small corner dot — shown when this tile holds the hidden map
        const indicator = this.add
          .image(x, y, 'map')
          .setDepth(3)
          .setVisible(false);

        const startIndicator = this.add
          .image(x, y, 'knight')
          .setDisplaySize(tileWidth, tileHeight)
          .setOrigin(0.5)
          .setDepth(1)
          .setVisible(false);

        const winningIndicator = this.add
          .image(x + 8, y - 12, 'win')
          .setDisplaySize(tileWidth, tileHeight)
          .setOrigin(0.5)
          .setDepth(2)
          .setVisible(false);

        this.tileSprites.push(tile);
        this.tileOverlays.push(overlay);
        this.mapIndicators.push(indicator);
        this.startIndicators.push(startIndicator);
        this.winningIndicators.push(winningIndicator);
        this.overlayBaseYs.push(y);
      }
    }

    // ── Tool buttons ────────────────────────────────────────────────────────
    const btnSize = 40;
    const btnGap = 50;
    const buttonRowY1 = height - BUTTON_Y_OFFSET - btnGap + 6;
    const buttonRowY2 = height - BUTTON_Y_OFFSET + 10;

    this.createToolButton(
      20 + btnGap * 0,
      buttonRowY1,
      btnSize,
      'rock',
      TileData.ROCK,
      () => {
        this.selectedType = TileData.ROCK;
        this.updateStatus();
      }
    );
    this.createToolButton(
      20 + btnGap * 1,
      buttonRowY1,
      btnSize,
      'tree',
      TileData.TREE,
      () => {
        this.selectedType = TileData.TREE;
        this.updateStatus();
      }
    );
    this.createToolButton(
      20 + btnGap * 2,
      buttonRowY1,
      btnSize,
      'pickaxe',
      TileData.PICKAXE,
      () => {
        this.selectedType = TileData.PICKAXE;
        this.updateStatus();
      }
    );
    this.createToolButton(
      20 + btnGap * 3,
      buttonRowY1,
      btnSize,
      'shovel',
      TileData.SHOVEL,
      () => {
        this.selectedType = TileData.SHOVEL;
        this.updateStatus();
      }
    );

    this.createToolButton(
      20 + btnGap * 0,
      buttonRowY2,
      btnSize,
      'tile',
      TileData.BASE_TILE,
      () => {
        this.selectedType = TileData.BASE_TILE;
        this.updateStatus();
      }
    );
    this.createToolButton(
      20 + btnGap * 1,
      buttonRowY2,
      btnSize,
      'map',
      'map',
      () => {
        this.selectedType = 'map';
        this.updateStatus();
      }
    );
    this.createToolButton(
      20 + btnGap * 2,
      buttonRowY2,
      btnSize,
      'knight',
      'start',
      () => {
        this.selectedType = 'start';
        this.updateStatus();
      }
    );
    this.createToolButton(
      20 + btnGap * 3,
      buttonRowY2,
      btnSize,
      'win',
      'winning',
      () => {
        this.selectedType = 'winning';
        this.updateStatus();
      }
    );

    this.createActionButton(
      20 + btnGap * 4,
      buttonRowY2,
      100,
      btnSize,
      'Save',
      0x3a5a31,
      () => {
        const tilesToSave = [...this.tileData];
        if (
          this.startTileIndex !== null &&
          tilesToSave[this.startTileIndex] !== TileData.BASE_TILE
        ) {
          tilesToSave[this.startTileIndex] = TileData.BASE_TILE;
        }
        if (
          this.winningTileIndex !== null &&
          tilesToSave[this.winningTileIndex] !== TileData.BASE_TILE
        ) {
          tilesToSave[this.winningTileIndex] = TileData.BASE_TILE;
        }

        const { beatable, reason } = isLevelBeatable({
          tiles: tilesToSave,
          startTileIndex: this.startTileIndex,
          winningTileIndex: this.winningTileIndex,
          cols: 8,
          rows: 8,
        });

        if (beatable) {
          this.openPublishModal();
        } else {
          if (!this.levelIsNotBeatableReason) {
            this.levelIsNotBeatableReason = this.add.text(10, 10, `${reason}`, {
              fontFamily: 'Pixelify Sans',
              fontSize: '16px',
              color: '#2f2f2f',
            });
          } else {
            this.levelIsNotBeatableReason.setText(`${reason}`);
          }
        }
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
    buttonType: TileData | 'map' | 'start' | 'winning',
    callback: () => void
  ): Phaser.GameObjects.Container {
    const radius = 8;
    const graphics = this.add.graphics();
    this.paintToolButton(graphics, size, radius, buttonType);

    const icon = this.add.image(size / 2, size / 2, img).setOrigin(0.5);
    const iconScale =
      (size * (img === 'knight' ? 1.2 : 0.6)) /
      Math.max(icon.width, icon.height);
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

    this.toolButtonEntries.push({ graphics, type: buttonType, size });

    return container;
  }

  // Redraws a single button's background: gray by default, green when
  // its type is the currently selected tool.
  private paintToolButton(
    graphics: Phaser.GameObjects.Graphics,
    size: number,
    radius: number,
    buttonType: TileData | 'map' | 'start' | 'winning'
  ) {
    const isSelected = this.selectedType === buttonType;
    const fillColor = isSelected ? BUTTON_SELECTED : BUTTON_GRAY;

    graphics.clear();
    graphics.fillStyle(fillColor, 1);
    graphics.fillRoundedRect(0, 0, size, size, radius);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.strokeRoundedRect(0, 0, size, size, radius);
  }

  // Call whenever selectedType changes to keep button backgrounds in sync.
  private refreshToolButtonColors() {
    const radius = 8;
    for (const entry of this.toolButtonEntries) {
      this.paintToolButton(entry.graphics, entry.size, radius, entry.type);
    }
  }

  private createActionButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    fillColor: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const radius = 10;
    const graphics = this.add.graphics();
    graphics.fillStyle(fillColor, 1);
    graphics.fillRoundedRect(0, 0, width, height, radius);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.strokeRoundedRect(0, 0, width, height, radius);

    const text = this.add
      .text(width / 2, height / 2, label, {
        fontFamily: 'Pixelify Sans',
        fontSize: 18,
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const container = this.add.container(x, y, [graphics, text]);
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

  // ─── Status ────────────────────────────────────────────────────────────────

  private updateStatus() {
    this.refreshToolButtonColors();
  }

  // ─── Tile placement ────────────────────────────────────────────────────────

  private setTile(index: number) {
    if (
      (this.startTileIndex === index || this.winningTileIndex === index) &&
      this.selectedType !== TileData.BASE_TILE &&
      this.selectedType !== 'start' &&
      this.selectedType !== 'winning' &&
      this.selectedType !== 'map'
    ) {
      return;
    }

    if (this.selectedType === 'map') {
      // Move the map to this tile (clears previous location automatically)
      this.mapTileIndex = index;
      this.renderGrid();
      return;
    }

    if (this.selectedType === 'start') {
      if (!this.isValidStartIndex(index)) {
        return;
      }
      this.startTileIndex = index;
      if (this.winningTileIndex === index) {
        this.winningTileIndex = null;
      }
      this.tileData[index] = TileData.BASE_TILE;
      this.underlyingItems.delete(index);
      this.renderGrid();
      return;
    }

    if (this.selectedType === 'winning') {
      if (this.isValidWinningIndex(index)) {
        this.winningTileIndex = index;
        this.renderGrid();
      }
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

  private isValidStartIndex(index: number) {
    return this.tileData[index] === TileData.BASE_TILE;
  }

  private isValidWinningIndex(index: number) {
    const type = this.tileData[index];
    return type === TileData.BASE_TILE && index !== this.startTileIndex;
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
            .setY(baseY - 12);
          break;
        case TileData.TREE:
          overlay
            ?.setTexture('tree')
            .setVisible(true)
            .setY(baseY - 12);
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

      indicator?.setVisible(i === this.mapTileIndex);
      this.startIndicators[i]?.setVisible(i === this.startTileIndex);
      this.winningIndicators[i]?.setVisible(i === this.winningTileIndex);
    }
  }

  private async publishLevel(
    title: string
  ): Promise<{ success: true } | { success: false; message: string }> {
    try {
      const levelId = crypto.randomUUID();

      const tilesToSave = [...this.tileData];
      if (
        this.startTileIndex !== null &&
        tilesToSave[this.startTileIndex] !== TileData.BASE_TILE
      ) {
        tilesToSave[this.startTileIndex] = TileData.BASE_TILE;
      }
      if (
        this.winningTileIndex !== null &&
        tilesToSave[this.winningTileIndex] !== TileData.BASE_TILE
      ) {
        tilesToSave[this.winningTileIndex] = TileData.BASE_TILE;
      }

      const underlyingItemsPayload = Array.from(
        this.underlyingItems.entries()
      ).map(([index, item]) => ({ index, item }));

      const response = await fetch('/api/level/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          levelId,
          tiles: tilesToSave,
          underlyingItems: underlyingItemsPayload,
          mapTileIndex: this.mapTileIndex,
          startTileIndex: this.startTileIndex,
          winningTileIndex: this.winningTileIndex,
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
      fontFamily: 'Pixelify Sans, sans-serif',
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
