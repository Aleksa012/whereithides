import { Scene } from 'phaser';

export class Preloader extends Scene {
  constructor() {
    super('Preloader');
  }

  init() {
    this.add.image(512, 384, 'background');

    this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);
  }

  preload() {
    this.load.setPath('../assets');

    this.load.spritesheet('knight', '../sprites/knight.png', {
      frameWidth: 64,
      frameHeight: 64,
    });

    this.load.image('logo', 'logo.png');

    //Road
    this.load.image('tile', 'roads/FieldsTile_01.png');

    //Decor
    this.load.image('rock', 'decor/Rock2_1.png');
    this.load.image('tree', 'decor/Palm_tree2_1.png');

    //Tools
    this.load.image('pickaxe', 'tools/Icon31_01.png');
    this.load.image('shovel', 'tools/Icon31_05.png');
  }

  create() {
    this.anims.create({
      key: 'run',
      frames: this.anims.generateFrameNumbers('knight', {
        start: 0,
        end: 7,
      }),
      frameRate: 12,
      repeat: -1,
    });

    this.scene.start('MainMenu');
  }
}
