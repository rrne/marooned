class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const { width, height } = this.scale;

    // 배경
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a1a2e);

    // 파도 효과 (간단한 사각형들)
    for (let i = 0; i < 8; i++) {
      const wave = this.add.rectangle(
        Phaser.Math.Between(0, width),
        height - Phaser.Math.Between(40, 120),
        Phaser.Math.Between(60, 200),
        8,
        0x1a4a7a,
        0.5
      );
      this.tweens.add({
        targets: wave,
        x: wave.x + Phaser.Math.Between(-100, 100),
        duration: Phaser.Math.Between(3000, 6000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // 섬 실루엣
    this.add.rectangle(width / 2, height - 60, 300, 80, 0x2d5a1b);
    this.add.triangle(
      width / 2, height - 180,
      width / 2 - 60, height - 100,
      width / 2 + 60, height - 100,
      0x1a3a0f
    );

    // 타이틀
    this.add.text(width / 2, 180, 'MAROONED', {
      fontSize: '72px',
      color: '#f0e68c',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(width / 2, 255, '무인도에서 살아남아 탈출하라', {
      fontSize: '18px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // 버튼
    const startBtn = this.createButton(width / 2, 380, '새 게임 시작');
    startBtn.on('pointerdown', () => this.scene.start('GameScene'));

    this.add.text(width / 2, height - 30, 'v0.1.0 - Early Development', {
      fontSize: '12px',
      color: '#444444',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  createButton(x, y, text) {
    const btn = this.add.rectangle(x, y, 220, 48, 0x1a4a2a)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(x, y, text, {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x2a6a3a));
    btn.on('pointerout', () => btn.setFillStyle(0x1a4a2a));

    return btn;
  }
}
