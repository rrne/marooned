class WinScene extends Phaser.Scene {
  constructor() {
    super({ key: 'WinScene' });
  }

  init(data) {
    this.days = data.days || 1;
    this.survivorCount = data.survivorCount || 0;
    this.survivorNames = data.survivorNames || [];
  }

  create() {
    const { width, height } = this.scale;

    // 배경
    this.add.rectangle(width / 2, height / 2, width, height, 0x001122);

    // 바다 파도 효과
    for (let i = 0; i < 12; i++) {
      const wave = this.add.rectangle(
        Phaser.Math.Between(0, width),
        height - Phaser.Math.Between(20, 100),
        Phaser.Math.Between(80, 250),
        6,
        0x1a5a9a,
        0.4
      );
      this.tweens.add({
        targets: wave,
        x: wave.x + Phaser.Math.Between(-120, 120),
        duration: Phaser.Math.Between(2500, 5000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // 뗏목 실루엣
    this.add.rectangle(width / 2, height - 80, 100, 20, 0xd4a017);
    this.add.rectangle(width / 2 - 30, height - 100, 8, 50, 0x8b5e3c);
    this.add.triangle(
      width / 2 - 30, height - 148,
      width / 2 - 30, height - 100,
      width / 2 + 10, height - 120,
      0xffffff
    );

    this.tweens.add({
      targets: this.add.container(0, 0),
      x: 20,
      duration: 4000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 타이틀
    this.add.text(width / 2, 130, '탈출 성공!', {
      fontSize: '64px',
      color: '#f0e68c',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(width / 2, 210, '무인도에서 살아남아 탈출했다', {
      fontSize: '20px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // 통계
    this.add.text(width / 2, 290, `생존 기간: ${this.days}일`, {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(width / 2, 330, `탈출 인원: ${this.survivorCount}명`, {
      fontSize: '24px',
      color: '#88ff88',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    if (this.survivorNames.length > 0) {
      this.add.text(width / 2, 370, this.survivorNames.join('  '), {
        fontSize: '14px',
        color: '#888888',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    }

    // 다시 하기 버튼
    const btn = this.add.rectangle(width / 2, 460, 220, 50, 0x1a4a2a)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, 460, '다시 하기', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x2a6a3a));
    btn.on('pointerout', () => btn.setFillStyle(0x1a4a2a));
    btn.on('pointerdown', () => this.scene.start('MenuScene'));
  }
}
