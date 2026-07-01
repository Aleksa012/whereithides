import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import {
  DEFAULT_LEVEL,
  LEVEL_COLS,
  LEVEL_ROWS,
  TileData,
} from '../../shared/level';

type TilePosition = {
  x: number;
  y: number;
};

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera | null = null;
  background: Phaser.GameObjects.Image | null = null;
  character: Phaser.GameObjects.Sprite | null = null;
  blocks: Phaser.GameObjects.Image[] = [];
  tileOverlays: Phaser.GameObjects.Image[] = [];
  tilePositions: TilePosition[] = [];
  levelIdText: Phaser.GameObjects.Text | null = null;
  tiles: TileData[] = [...DEFAULT_LEVEL.tiles] as TileData[];
  underlyingItems: Map<number, TileData> = new Map();

  // Independent layer — which single tile index hides the map (null if none)
  mapTileIndex: number | null = null;

  isMoving = false;
  hasWon = false;
  winText: Phaser.GameObjects.Text | null = null;
  winningIndex: number | null = null;
  levelId: string | null = null;
  hasPlacedCharacter = false;
  inventory: { pickaxe: boolean; shovel: boolean; map: boolean } = {
    pickaxe: false,
    shovel: false,
    map: false,
  };
  notificationText: Phaser.GameObjects.Text | null = null;
  notificationIcon: Phaser.GameObjects.Image | null = null;
  notificationTimer: Phaser.Time.TimerEvent | null = null;

  // Created once when map is found, destroyed on close, never reopened
  mapOverlay: Phaser.GameObjects.Container | null = null;
  mapOverlayClosed = false;

  constructor() {
    super('Game');
  }

  init(data?: {
    levelId?: string;
    tiles?: TileData[];
    underlyingItems?: { index: number; item: TileData }[];
    mapTileIndex?: number | null;
  }) {
    if (data?.levelId) {
      this.levelId = data.levelId;
    }

    this.tiles =
      data?.tiles && Array.isArray(data.tiles)
        ? [...data.tiles]
        : [...DEFAULT_LEVEL.tiles];

    this.underlyingItems.clear();
    if (data?.underlyingItems && Array.isArray(data.underlyingItems)) {
      data.underlyingItems.forEach(({ index, item }) => {
        this.underlyingItems.set(index, item);
      });
    }

    this.mapTileIndex = data?.mapTileIndex ?? null;

    // Reset session state
    this.isMoving = false;
    this.hasWon = false;
    this.hasPlacedCharacter = false;
    this.mapOverlay = null;
    this.mapOverlayClosed = false;
    this.inventory = { pickaxe: false, shovel: false, map: false };
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

    // if (this.levelId) {
    //   this.levelIdText?.setText(`Level: ${this.levelId}`);
    // } else {
    //   await this.loadSavedLevel();
    // }

    this.updateLayout(this.scale.width, this.scale.height);
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.updateLayout(gameSize.width, gameSize.height);
    });

    this.events.on('update', () => this.updateWinState());
  }

  // ─── Layout ────────────────────────────────────────────────────────────────

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
    this.character?.setScale(scaleFactor * 4);

    this.renderLevel(width, height);
  }

  // ─── Level Loading ─────────────────────────────────────────────────────────

  async loadSavedLevel() {
    const savedLevelId = window.localStorage.getItem('lastLevelId');
    if (!savedLevelId) {
      this.levelIdText?.setText('No saved level');
      return;
    }

    try {
      const response = await fetch(`/api/level`);
      const result = await response.json();

      if (result?.levelData?.tiles && Array.isArray(result.levelData.tiles)) {
        this.tiles = result.levelData.tiles as TileData[];
        this.levelId = savedLevelId;
        this.levelIdText?.setText(`Level: ${savedLevelId}`);

        this.underlyingItems.clear();
        if (Array.isArray(result.levelData.underlyingItems)) {
          result.levelData.underlyingItems.forEach(
            (entry: { index: number; item: TileData }) => {
              this.underlyingItems.set(entry.index, entry.item);
            }
          );
        }

        this.mapTileIndex = result.levelData.mapTileIndex ?? null;
      } else {
        this.levelIdText?.setText(`Level ${savedLevelId} not found`);
      }
    } catch (error) {
      this.levelIdText?.setText('Failed to load saved level');
      console.error('Failed to load saved level', error);
    }
  }

  // ─── Tile Helpers ──────────────────────────────────────────────────────────

  private isWalkable(index: number): boolean {
    const t = this.tiles[index];
    return (
      t === TileData.BASE_TILE ||
      t === TileData.PICKAXE ||
      t === TileData.SHOVEL ||
      t === TileData.DIRT
    );
  }

  private getNeighbours(index: number): number[] {
    const col = index % LEVEL_COLS;
    const row = Math.floor(index / LEVEL_COLS);
    const result: number[] = [];
    if (row > 0) result.push(index - LEVEL_COLS);
    if (row < LEVEL_ROWS - 1) result.push(index + LEVEL_COLS);
    if (col > 0) result.push(index - 1);
    if (col < LEVEL_COLS - 1) result.push(index + 1);
    return result;
  }

  private isAdjacentToCharacter(targetIndex: number): boolean {
    return this.getNeighbours(this.getCurrentTileIndex()).includes(targetIndex);
  }

  private clearOrRestoreTile(tileIndex: number) {
    if (this.underlyingItems.has(tileIndex)) {
      this.tiles[tileIndex] = this.underlyingItems.get(tileIndex)!;
      this.underlyingItems.delete(tileIndex);
    } else {
      this.tiles[tileIndex] = TileData.BASE_TILE;
    }
    this.renderOverlayForTile(tileIndex, this.tileOverlays[tileIndex]!);
  }

  private removeAllTilesOfType(type: TileData) {
    this.tiles.forEach((t, index) => {
      if (t !== type) return;
      if (this.underlyingItems.has(index)) {
        this.tiles[index] = this.underlyingItems.get(index)!;
        this.underlyingItems.delete(index);
      } else {
        this.tiles[index] = TileData.BASE_TILE;
      }
      this.renderOverlayForTile(index, this.tileOverlays[index]!);
    });
  }

  // ─── Pathfinding ───────────────────────────────────────────────────────────

  private dijkstra(startIndex: number, targetIndex: number): number[] {
    if (!this.isWalkable(startIndex) || !this.isWalkable(targetIndex))
      return [];

    const distances = new Map<number, number>();
    const previous = new Map<number, number | null>();
    const unvisited = new Set<number>();

    for (let i = 0; i < this.tiles.length; i++) {
      distances.set(i, Infinity);
      unvisited.add(i);
    }
    distances.set(startIndex, 0);

    while (unvisited.size > 0) {
      let current = -1;
      let minDist = Infinity;
      for (const node of unvisited) {
        const d = distances.get(node) ?? Infinity;
        if (d < minDist) {
          minDist = d;
          current = node;
        }
      }

      if (current === -1 || minDist === Infinity) break;
      unvisited.delete(current);

      if (current === targetIndex) {
        const path: number[] = [];
        let node: number | null = targetIndex;
        while (node !== null && node !== startIndex) {
          path.unshift(node);
          node = previous.get(node) ?? null;
        }
        path.unshift(startIndex);
        return path;
      }

      for (const neighbour of this.getNeighbours(current)) {
        if (!unvisited.has(neighbour) || !this.isWalkable(neighbour)) continue;
        const newDist = (distances.get(current) ?? 0) + 1;
        if (newDist < (distances.get(neighbour) ?? Infinity)) {
          distances.set(neighbour, newDist);
          previous.set(neighbour, current);
        }
      }
    }

    return [];
  }

  private findStandingTileForTarget(targetIndex: number): number {
    const currentIndex = this.getCurrentTileIndex();

    const candidates = this.getNeighbours(targetIndex)
      .filter((n) => this.isWalkable(n))
      .filter((n) => this.dijkstra(currentIndex, n).length > 0);

    if (candidates.length === 0) return -1;

    const tCol = targetIndex % LEVEL_COLS;
    const tRow = Math.floor(targetIndex / LEVEL_COLS);
    const cCol = currentIndex % LEVEL_COLS;
    const cRow = Math.floor(currentIndex / LEVEL_COLS);

    candidates.sort((a, b) => {
      const aCol = a % LEVEL_COLS,
        aRow = Math.floor(a / LEVEL_COLS);
      const bCol = b % LEVEL_COLS,
        bRow = Math.floor(b / LEVEL_COLS);
      const aDist = Math.abs(aRow - tRow) + Math.abs(aCol - tCol);
      const bDist = Math.abs(bRow - tRow) + Math.abs(bCol - tCol);
      if (aDist !== bDist) return aDist - bDist;
      const aCharDist = Math.abs(aRow - cRow) + Math.abs(aCol - cCol);
      const bCharDist = Math.abs(bRow - cRow) + Math.abs(bCol - cCol);
      return aCharDist - bCharDist;
    });

    return candidates[0]!;
  }

  // ─── Character Position ────────────────────────────────────────────────────

  private getCurrentTileIndex(): number {
    if (!this.character) return 0;
    let closest = 0;
    let closestDist = Infinity;
    for (let i = 0; i < this.tilePositions.length; i++) {
      const pos = this.tilePositions[i];
      if (!pos) continue;
      const dx = pos.x - this.character.x;
      const dy = pos.y - this.character.y;
      const dist = dx * dx + dy * dy;
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }
    return closest;
  }

  // ─── Movement ─────────────────────────────────────────────────────────────

  private moveAlongPath(
    path: number[],
    onArrive: (finalIndex: number) => void
  ) {
    if (path.length <= 1 || !this.character) {
      this.isMoving = false;
      return;
    }

    const nextIndex = path[1]!;
    const nextPos = this.tilePositions[nextIndex];
    if (!nextPos) {
      this.isMoving = false;
      return;
    }

    this.tweens.add({
      targets: this.character,
      x: nextPos.x,
      y: nextPos.y,
      duration: 300,
      ease: 'Linear',
      onStart: () => this.character?.play('run'),
      onComplete: () => {
        this.tryCollectItem(nextIndex);

        if (path.length === 2) {
          this.character?.anims.stop();
          this.isMoving = false;
          onArrive(nextIndex);
        } else {
          this.moveAlongPath(path.slice(1), onArrive);
        }
      },
    });
  }

  private walkTo(targetIndex: number, onArrive: (finalIndex: number) => void) {
    if (!this.character || this.isMoving || this.hasWon) return;

    const currentIndex = this.getCurrentTileIndex();
    if (currentIndex === targetIndex) {
      onArrive(targetIndex);
      return;
    }

    const path = this.dijkstra(currentIndex, targetIndex);
    if (path.length === 0) {
      this.shakeCharacter();
      return;
    }

    this.isMoving = true;
    const finalPos = this.tilePositions[targetIndex];
    if (finalPos) {
      this.character.setFlipX(this.character.x > finalPos.x);
    }

    this.moveAlongPath(path, onArrive);
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  private tryCollectItem(tileIndex: number): boolean {
    const t = this.tiles[tileIndex];

    if (t === TileData.PICKAXE && !this.inventory.pickaxe) {
      this.inventory.pickaxe = true;
      this.clearOrRestoreTile(tileIndex);
      this.removeAllTilesOfType(TileData.PICKAXE);
      this.showNotification(TileData.PICKAXE);
      return true;
    }

    if (t === TileData.SHOVEL && !this.inventory.shovel) {
      this.inventory.shovel = true;
      this.clearOrRestoreTile(tileIndex);
      this.removeAllTilesOfType(TileData.SHOVEL);
      this.showNotification(TileData.SHOVEL);
      return true;
    }

    return false;
  }

  private breakRock(rockIndex: number) {
    if (!this.inventory.pickaxe || this.tiles[rockIndex] !== TileData.ROCK)
      return;
    this.clearOrRestoreTile(rockIndex);
  }

  /**
   * Dig a BASE_TILE — always converts to DIRT.
   * Independently, if this tile index is the map tile, collect the map.
   */
  private digTile(tileIndex: number) {
    if (!this.inventory.shovel || this.tiles[tileIndex] !== TileData.BASE_TILE)
      return;

    this.tiles[tileIndex] = TileData.DIRT;
    this.renderOverlayForTile(tileIndex, this.tileOverlays[tileIndex]!);

    // Check the independent map layer — digging this tile reveals the map
    if (tileIndex === this.mapTileIndex && !this.inventory.map) {
      this.mapTileIndex = null; // consumed
      this.collectMap();
    }
  }

  // ─── Map Collection & Overlay ──────────────────────────────────────────────

  private collectMap() {
    this.inventory.map = true;
    this.showMapNotification();
  }

  private showMapNotification() {
    this.notificationTimer?.remove();
    this.notificationText?.destroy();
    this.notificationIcon?.destroy();

    this.notificationText = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 + 30,
        'You found a Map!',
        {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#FFD700',
          stroke: '#000000',
          strokeThickness: 2,
        }
      )
      .setOrigin(0.5)
      .setDepth(100);

    this.notificationIcon = this.add
      .image(this.scale.width / 2, this.scale.height / 2 - 20, 'map')
      .setScale(2)
      .setDepth(100);

    this.notificationTimer = this.time.delayedCall(2500, () => {
      this.notificationText?.destroy();
      this.notificationIcon?.destroy();
      this.notificationText = null;
      this.notificationIcon = null;
      this.notificationTimer = null;
      this.showMapOverlay();
    });
  }

  private showMapOverlay() {
    // Guard: never reopen after it has been closed once
    if (this.mapOverlayClosed) return;

    const { width, height } = this.scale;

    const backdrop = this.add
      .rectangle(0, 0, width, height, 0x000000, 0.75)
      .setOrigin(0)
      .setDepth(200)
      .setInteractive()
      .on('pointerdown', () => this.closeMapOverlay());

    const panelW = Math.min(width * 0.85, 480);
    const panelH = panelW + 80;
    const panelX = (width - panelW) / 2;
    const panelY = (height - panelH) / 2;

    const panel = this.add
      .rectangle(panelX, panelY, panelW, panelH, 0x1a1a2e)
      .setOrigin(0)
      .setDepth(201)
      .setStrokeStyle(3, 0xffd700);

    const title = this.add
      .text(panelX + panelW / 2, panelY + 28, 'MAP', {
        fontFamily: 'Arial Black',
        fontSize: '32px',
        color: '#FFD700',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(202);

    const gridPad = 16;
    const gridSize = panelW - gridPad * 2;
    const cellSize = gridSize / LEVEL_COLS;
    const gridX = panelX + gridPad;
    const gridY = panelY + 64;

    const gridItems: Phaser.GameObjects.GameObject[] = [];

    for (let row = 0; row < LEVEL_ROWS; row++) {
      for (let col = 0; col < LEVEL_COLS; col++) {
        const index = row * LEVEL_COLS + col;
        const cx = gridX + col * cellSize;
        const cy = gridY + row * cellSize;

        // Base cell
        const cellColor =
          this.tiles[index] === TileData.ROCK
            ? 0x555555
            : this.tiles[index] === TileData.TREE
              ? 0x2d5a1b
              : this.tiles[index] === TileData.DIRT
                ? 0x6b4226
                : 0x5a7a4a;

        gridItems.push(
          this.add
            .rectangle(cx, cy, cellSize - 1, cellSize - 1, cellColor)
            .setOrigin(0)
            .setDepth(202)
        );

        // X on the winning tile
        if (index === this.winningIndex) {
          gridItems.push(
            this.add
              .text(cx + cellSize / 2, cy + cellSize / 2, 'X', {
                fontFamily: 'Arial Black',
                fontSize: `${Math.round(cellSize * 0.55)}px`,
                color: '#ff2222',
                stroke: '#000000',
                strokeThickness: 2,
              })
              .setOrigin(0.5)
              .setDepth(203)
          );
        }
      }
    }

    const closeHint = this.add
      .text(
        panelX + panelW / 2,
        panelY + panelH - 20,
        'Tap anywhere to close',
        {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#aaaaaa',
        }
      )
      .setOrigin(0.5)
      .setDepth(202);

    this.mapOverlay = this.add.container(0, 0, [
      backdrop,
      panel,
      title,
      ...gridItems,
      closeHint,
    ]);
    this.mapOverlay.setDepth(200);
  }

  private closeMapOverlay() {
    if (!this.mapOverlay) return;
    this.mapOverlay.destroy(true);
    this.mapOverlay = null;
    this.mapOverlayClosed = true; // never reopen
  }

  // ─── Click Handling ────────────────────────────────────────────────────────

  private moveCharacterToTile(clickedIndex: number) {
    if (!this.character || this.isMoving || this.hasWon) return;
    if (this.mapOverlay) return; // backdrop handles close while overlay is open

    const tileType = this.tiles[clickedIndex];

    // ── Rock ──────────────────────────────────────────────────────────────
    if (tileType === TileData.ROCK) {
      if (!this.inventory.pickaxe) {
        this.shakeCharacter();
        return;
      }

      if (this.isAdjacentToCharacter(clickedIndex)) {
        this.breakRock(clickedIndex);
        return;
      }

      const standingTile = this.findStandingTileForTarget(clickedIndex);
      if (standingTile === -1) {
        this.shakeCharacter();
        return;
      }

      this.walkTo(standingTile, () => {
        if (this.isAdjacentToCharacter(clickedIndex))
          this.breakRock(clickedIndex);
      });
      return;
    }

    // ── Base tile ─────────────────────────────────────────────────────────
    if (tileType === TileData.BASE_TILE) {
      const currentIndex = this.getCurrentTileIndex();

      // Already standing here + has shovel = dig
      if (currentIndex === clickedIndex && this.inventory.shovel) {
        this.digTile(clickedIndex);
        if (clickedIndex === this.winningIndex) this.hasWon = true;
        return;
      }

      // Otherwise just walk there (dig requires a second click once standing)
      this.walkTo(clickedIndex, (arrivedAt) => {
        if (arrivedAt === this.winningIndex) this.hasWon = true;
      });
      return;
    }

    // ── Walkable (dirt, etc.) ─────────────────────────────────────────────
    if (this.isWalkable(clickedIndex)) {
      this.walkTo(clickedIndex, (arrivedAt) => {
        if (arrivedAt === this.winningIndex) this.hasWon = true;
      });
      return;
    }

    this.shakeCharacter();
  }
  // ─── Character Placement ───────────────────────────────────────────────────

  private placeCharacterOnBaseTile() {
    if (!this.character || this.hasPlacedCharacter) return;

    let tileIndex = this.tiles.findIndex(
      (t) =>
        t === TileData.BASE_TILE ||
        t === TileData.PICKAXE ||
        t === TileData.SHOVEL
    );
    if (tileIndex < 0) tileIndex = 0;

    const position = this.tilePositions[tileIndex];
    if (position) {
      this.character.setPosition(position.x, position.y);
      this.hasPlacedCharacter = true;
      this.tryCollectItem(tileIndex);
    }
  }

  // ─── Rendering ─────────────────────────────────────────────────────────────

  renderLevel(width: number, height: number) {
    this.blocks.forEach((b) => b.destroy());
    this.tileOverlays.forEach((o) => o.destroy());
    this.blocks = [];
    this.tileOverlays = [];
    this.tilePositions = [];

    const tileWidth = width / LEVEL_COLS;
    const tileHeight = height / LEVEL_ROWS;

    const baseTileIndices = this.tiles
      .map((t, i) => (t === TileData.BASE_TILE ? i : -1))
      .filter((i) => i >= 0);
    this.winningIndex =
      baseTileIndices.length > 0
        ? baseTileIndices[Math.floor(Math.random() * baseTileIndices.length)]!
        : null;

    for (let row = 0; row < LEVEL_ROWS; row++) {
      for (let col = 0; col < LEVEL_COLS; col++) {
        const index = row * LEVEL_COLS + col;
        const x = col * tileWidth + tileWidth / 2;
        const y = row * tileHeight + tileHeight / 2;

        const tile = this.add
          .image(x, y, 'tile')
          .setDisplaySize(tileWidth, tileHeight)
          .setDepth(0)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', () => this.moveCharacterToTile(index));

        this.blocks.push(tile);
        this.tilePositions[index] = { x, y };

        const overlay = this.add
          .image(x, y, 'tile')
          .setDisplaySize(tileWidth - 10, tileHeight - 10)
          .setDepth(1)
          .setOrigin(0.5)
          .setVisible(false);

        this.tileOverlays.push(overlay);
        this.renderOverlayForTile(index, overlay);
      }
    }

    this.placeCharacterOnBaseTile();
  }

  private renderOverlayForTile(
    index: number,
    overlay: Phaser.GameObjects.Image
  ) {
    if (!overlay) return;
    const type = this.tiles[index] ?? TileData.BASE_TILE;
    const baseY = this.tilePositions[index]?.y ?? 0;
    const baseTileHeight = this.scale.height / 8;
    const baseTileWidth = this.scale.width / 8;

    switch (type) {
      case TileData.ROCK:
        overlay
          .setTexture('rock')
          .setVisible(true)
          .setY(baseY - 18);

        break;
      case TileData.TREE:
        overlay
          .setTexture('tree')
          .setVisible(true)
          .setY(baseY - 18);

        break;
      case TileData.PICKAXE:
        overlay
          .setTexture('pickaxe')
          .setVisible(true)
          .setY(baseY)
          .setDisplaySize(baseTileWidth - 10, baseTileHeight - 10);
        break;
      case TileData.SHOVEL:
        overlay
          .setTexture('shovel')
          .setVisible(true)
          .setY(baseY)
          .setDisplaySize(baseTileWidth - 10, baseTileHeight - 10);
        break;
      case TileData.DIRT:
        overlay
          .setTexture('dirt')
          .setVisible(true)
          .setY(baseY)
          .setDisplaySize(baseTileWidth, baseTileHeight);
        break;
      default:
        overlay
          .setTexture('tile')
          .setVisible(false)
          .setY(baseY)
          .setDisplaySize(baseTileWidth - 10, baseTileHeight - 10);
        break;
    }
  }

  // ─── Win State ─────────────────────────────────────────────────────────────

  updateWinState() {
    if (!this.winText) return;
    if (this.hasWon) {
      this.winText
        .setVisible(true)
        .setPosition(this.scale.width / 2, this.scale.height / 2);
    } else {
      this.winText.setVisible(false);
    }
  }

  // ─── UI Helpers ────────────────────────────────────────────────────────────

  private showNotification(itemType: TileData) {
    this.notificationTimer?.remove();
    this.notificationText?.destroy();
    this.notificationIcon?.destroy();

    const itemName = itemType === TileData.PICKAXE ? 'Pickaxe' : 'Shovel';
    const iconTexture = itemType === TileData.PICKAXE ? 'pickaxe' : 'shovel';

    this.notificationText = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 + 30,
        `You picked up a ${itemName}!`,
        {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#FFD700',
          stroke: '#000000',
          strokeThickness: 2,
        }
      )
      .setOrigin(0.5)
      .setDepth(100);

    this.notificationIcon = this.add
      .image(this.scale.width / 2, this.scale.height / 2 - 20, iconTexture)
      .setScale(2)
      .setDepth(100);

    this.notificationTimer = this.time.delayedCall(3000, () => {
      this.notificationText?.destroy();
      this.notificationIcon?.destroy();
      this.notificationText = null;
      this.notificationIcon = null;
      this.notificationTimer = null;
    });
  }

  private shakeCharacter() {
    if (!this.character) return;
    const originalY = this.character.y;
    this.tweens.add({
      targets: this.character,
      y: originalY - 5,
      duration: 150,
      ease: 'Power1.easeInOut',
      yoyo: true,
      repeat: 1,
      onComplete: () => this.character?.setY(originalY),
    });
  }
}
