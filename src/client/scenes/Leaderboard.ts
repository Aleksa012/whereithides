import { Scene } from 'phaser';
import * as Phaser from 'phaser';
import type {
  LeaderboardEntry,
  LeaderboardResponse,
} from '../../shared/leaderboard';
import { context } from '@devvit/web/client';

export class Leaderboard extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  leaderboard: LeaderboardEntry[] = [];
  private uiRoot: HTMLDivElement | null = null;

  constructor() {
    super('Leaderboard');
  }

  async create() {
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0xe0c492);

    this.createDOMStructure();
    this.updateLayout(this.scale.width, this.scale.height);

    try {
      const response = await fetch('api/leaderboard');
      const data = (await response.json()) as LeaderboardResponse;
      this.leaderboard = !!data.me?.rank
        ? [
            data.me as LeaderboardEntry,
            ...data.top.filter((item) => item.userId !== data.me?.userId),
          ]
        : data.top;
      this.renderEntries();
    } catch (error) {
      this.renderError('Unable to load leaderboard.');
    }

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      const { width, height } = gameSize;
      this.updateLayout(width, height);
    });
  }

  private createDOMStructure(): void {
    const parent = document.getElementById('leaderboard-container');
    if (!parent) return;

    parent.style.position = 'relative';

    const root = document.createElement('div');
    root.id = 'leaderboard-ui-root';
    root.className = 'leaderboard-ui-root';
    root.innerHTML = `
      <div class="leaderboard-header">
        <h1>Leaderboard</h1>
      </div>
      <div id="leaderboard-list" class="leaderboard-list">
        <div class="leaderboard-empty">Loading leaderboard...</div>
      </div>
    `;

    parent.appendChild(root);
    this.uiRoot = root;
  }

  private renderEntries(): void {
    if (!this.uiRoot) return;
    const list = this.uiRoot.querySelector('#leaderboard-list');
    if (!list) return;

    list.innerHTML = '';

    if (this.leaderboard.length === 0) {
      list.innerHTML = `<div class="leaderboard-empty">No scores yet.</div>`;
      return;
    }

    this.leaderboard.forEach((entry) => {
      const item = document.createElement('div');
      item.className = 'leaderboard-entry';
      item.innerHTML = `
        <div class="leaderboard-entry-left">
          <span class="leaderboard-entry-rank"}>${entry.rank}</span>
          <span class="leaderboard-entry-name ${entry.userId === context.userId ? 'leaderboard-entry-name-highlight' : ''}">${entry.username}</span>
        </div>
        <span class="leaderboard-entry-score">${entry.score}</span>
      `;
      list.appendChild(item);
    });
  }

  private renderError(message: string): void {
    if (!this.uiRoot) return;
    const list = this.uiRoot.querySelector('#leaderboard-list');
    if (!list) return;
    list.innerHTML = `<div class="leaderboard-empty">${message}</div>`;
  }

  private updateLayout(width: number, height: number): void {
    this.cameras.resize(width, height);
    if (this.uiRoot) {
      this.uiRoot.style.width = `${width}px`;
      this.uiRoot.style.height = `${height}px`;
    }
  }
}
