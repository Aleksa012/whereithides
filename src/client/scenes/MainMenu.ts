import { Scene, GameObjects } from 'phaser';
import * as Phaser from 'phaser';
import { context } from '@devvit/web/client';

export class MainMenu extends Scene {
  tileBackground: Phaser.GameObjects.TileSprite | null = null;
  titleTile: GameObjects.Rectangle | null = null;
  title: GameObjects.Text | null = null;
  playButton: GameObjects.Container | null = null;
  editorButton: GameObjects.Container | null = null;
  loadButton: GameObjects.Container | null = null;
  levelIdText: GameObjects.Text | null = null;

  constructor() {
    super('MainMenu');
  }

  init(): void {
    this.tileBackground = null;
    this.titleTile = null;
    this.title = null;
    this.playButton = null;
    this.editorButton = null;
    this.loadButton = null;
    this.levelIdText = null;
  }

  create() {
    this.refreshLayout();

    this.scale.on('resize', () => this.refreshLayout());

    this.events.on('update', (_time: number, delta: number) => {
      this.scrollTileBackground(delta);
    });
  }

  private scrollTileBackground(delta: number): void {
    if (this.tileBackground) {
      this.tileBackground.tilePositionY += delta * 0.02;
    }
  }

  private refreshLayout(): void {
    const { width, height } = this.scale;

    this.cameras.resize(width, height);

    if (!this.tileBackground) {
      this.tileBackground = this.add
        .tileSprite(0, 0, width, height, 'tile')
        .setOrigin(0)
        .setScrollFactor(0);

      const tileImage = this.textures
        .get('tile')
        .getSourceImage() as HTMLImageElement;
      if (tileImage && tileImage.width && tileImage.height) {
        this.tileBackground.setTileScale(
          32 / tileImage.width,
          32 / tileImage.height
        );
      }
    } else {
      this.tileBackground.setSize(width, height);
    }

    const titleY = height * 0.22;

    if (!this.title) {
      this.title = this.add
        .text(width / 2, titleY, 'Where it hides', {
          fontFamily: 'Arial Black',
          fontSize: '40px',
          color: '#4f3812',
          stroke: '#ffffff',
          strokeThickness: 8,
          align: 'center',
        })
        .setOrigin(0.5);
    }

    const buttonY = height * 0.4;
    const buttonSpacing = 260;

    const buttonWidth = 260;
    const buttonHeight = 50;
    const buttonRadius = 18;

    console.log(context);

    if (!!context.postData) {
      if (!this.playButton) {
        this.playButton = this.createButton(
          width / 2 - buttonSpacing / 2,
          buttonY,
          buttonWidth,
          buttonHeight,
          buttonRadius,
          'Play',
          0x3a5a31,
          () => this.loadSavedLevel()
        );
      } else {
        this.playButton!.setPosition(width / 2 - buttonSpacing / 2, buttonY);
      }
    }

    if (!context.postData) {
      if (!this.editorButton) {
        this.editorButton = this.createButton(
          width / 2 - buttonSpacing / 2,
          buttonY + buttonHeight + 10,
          buttonWidth,
          buttonHeight,
          buttonRadius,
          'Create Level',
          0x5f3f1f,
          () => this.scene.start('Editor')
        );
      } else {
        this.editorButton!.setPosition(
          width / 2 - buttonSpacing / 2,
          buttonY + buttonHeight + 10
        );
      }
    }

    const currentLevelId = window.localStorage.getItem('lastLevelId') || 'none';
    if (!this.levelIdText) {
      this.levelIdText = this.add
        .text(
          width / 2,
          buttonY + buttonHeight * 3 + 30,
          `Loaded Level ID: ${currentLevelId}`,
          {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#4f3812',
          }
        )
        .setOrigin(0.5);
    } else {
      this.levelIdText!.setText(`Loaded Level ID: ${currentLevelId}`);
      this.levelIdText!.setPosition(width / 2, buttonY + buttonHeight * 3 + 30);
    }
  }

  private async loadSavedLevel(): Promise<void> {
    const savedLevelId = context.postId;

    try {
      const response = await fetch(`/api/level/${context.postId}`);
      const data = await response.json();

      if (!data?.levelData?.tiles) {
        this.levelIdText?.setText(`Level ${savedLevelId} not found`);
        return;
      }

      this.scene.start('Game', {
        levelId: data.levelId,
        tiles: data.levelData.tiles,
      });
    } catch {
      this.levelIdText?.setText('Failed to load saved level');
    }
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    label: string,
    fillColor: number,
    callback: () => void
  ): GameObjects.Container {
    const graphics = this.add.graphics();
    graphics.fillStyle(fillColor, 1);
    graphics.fillRoundedRect(0, 0, width, height, radius);
    graphics.lineStyle(2, 0x000000, 1);
    graphics.strokeRoundedRect(0, 0, width, height, radius);

    const text = this.add
      .text(width / 2, height / 2, label, {
        fontFamily: 'Arial Black',
        fontSize: `${Math.round(height * 0.4)}px`,
        color: '#ffffff',
        align: 'center',
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
}
