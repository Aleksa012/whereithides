import { Scene } from 'phaser';

export class Boot extends Scene {
  entry: 'game' | 'leaderboard' = 'game';

  constructor(entry: 'game' | 'leaderboard') {
    super('Boot');
    this.entry = entry;
  }

  create() {
    const fontLinkId = 'pixelify-font';
    if (!document.getElementById(fontLinkId)) {
      const link = document.createElement('link');
      link.id = fontLinkId;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;700&display=swap';
      document.head.appendChild(link);
    }

    const waitForFont = async () => {
      try {
        if ((document as any).fonts && (document as any).fonts.load) {
          await (document as any).fonts.load("1em 'Pixelify Sans'");
          await (document as any).fonts.ready;
        } else {
          await new Promise((r) => setTimeout(r, 500));
        }
      } catch (e) {}
      this.scene.start(
        this.entry === 'leaderboard' ? 'Leaderboard' : 'Preloader'
      );
    };

    waitForFont();
  }
}
