class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // 로딩 바
    const bar = this.add.rectangle(640, 380, 0, 20, 0x00ff88);
    const bg = this.add.rectangle(640, 380, 400, 20, 0x333333);
    bg.setDepth(0);
    bar.setDepth(1);

    this.add.text(640, 340, 'MAROONED', {
      fontSize: '48px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.load.on('progress', (value) => {
      bar.width = 400 * value;
      bar.x = 640 - 200 + (400 * value) / 2;
    });
  }

  create() {
    this.scene.start('MenuScene');
  }
}
