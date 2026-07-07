import { Boot } from './scenes/Boot';
import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { Leaderboard } from './scenes/Leaderboard';

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#028af8',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1024,
    height: 768,
  },
  scene: [new Boot('leaderboard'), Leaderboard],
};

const StartLeaderboards = (parent: string) => {
  return new Game({ ...config, parent });
};

document.addEventListener('DOMContentLoaded', () => {
  StartLeaderboards('leaderboard-container');
});
