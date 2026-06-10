class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.days = data.days || 1;
    this.cause = data.cause || '전원 사망';
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0505);

    // 빗방울 효과
    for (let i = 0; i < 30; i++) {
      const rain = this.add.rectangle(
        Phaser.Math.Between(0, width),
        Phaser.Math.Between(0, height),
        1,
        Phaser.Math.Between(10, 25),
        0x334466,
        0.5
      );
      this.tweens.add({
        targets: rain,
        y: height + 30,
        duration: Phaser.Math.Between(800, 1600),
        repeat: -1,
        onRepeat: () => {
          rain.x = Phaser.Math.Between(0, width);
          rain.y = -30;
        },
      });
    }

    this.add.text(width / 2, 160, '전원 사망', {
      fontSize: '64px',
      color: '#cc3333',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(width / 2, 245, this.cause, {
      fontSize: '18px',
      color: '#888888',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(width / 2, 310, `${this.days}일을 버텼다`, {
      fontSize: '26px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(width / 2, 360, '무인도는 아무도 기억하지 못한다', {
      fontSize: '15px',
      color: '#555555',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const btn = this.add.rectangle(width / 2, 450, 220, 50, 0x3a1a1a)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, 450, '다시 하기', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x5a2a2a));
    btn.on('pointerout', () => btn.setFillStyle(0x3a1a1a));
    btn.on('pointerdown', () => this.scene.start('MenuScene'));
  }
}
