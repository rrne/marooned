class HUD {
  constructor(scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(100);
    this.panels = {};
    this.selectedSurvivor = null;

    this.buildTopBar();
    this.buildSurvivorPanel();
    this.buildDayCounter();
  }

  buildTopBar() {
    const { width } = this.scene.scale;
    const bg = this.scene.add.rectangle(width / 2, 20, width, 40, 0x000000, 0.7);
    this.resourceText = this.scene.add.text(10, 10, '', {
      fontSize: '13px', color: '#ffffff', fontFamily: 'monospace',
    });
    this.container.add([bg, this.resourceText]);
  }

  buildDayCounter() {
    const { width } = this.scene.scale;
    this.dayText = this.scene.add.text(width - 10, 10, 'Day 1', {
      fontSize: '14px', color: '#f0e68c', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this.container.add(this.dayText);
  }

  buildSurvivorPanel() {
    const { height } = this.scene.scale;
    const panelH = 130;
    const panelY = height - panelH;

    const bg = this.scene.add.rectangle(180, panelY + panelH / 2, 360, panelH, 0x000000, 0.8);
    bg.setStrokeStyle(1, 0x445544);

    this.survivorPanelBg = bg;

    this.survivorName = this.scene.add.text(14, panelY + 8, '', {
      fontSize: '14px', color: '#f0e68c', fontFamily: 'monospace',
    });
    this.survivorInfo = this.scene.add.text(14, panelY + 28, '', {
      fontSize: '11px', color: '#aaaaaa', fontFamily: 'monospace',
    });
    this.survivorStats = this.scene.add.text(14, panelY + 48, '', {
      fontSize: '11px', color: '#ffffff', fontFamily: 'monospace', lineSpacing: 4,
    });

    this.container.add([bg, this.survivorName, this.survivorInfo, this.survivorStats]);
    this.hideSurvivorPanel();
  }

  showSurvivorPanel(survivor) {
    this.selectedSurvivor = survivor;
    this.survivorPanelBg.setVisible(true);
    this.survivorName.setVisible(true);
    this.survivorInfo.setVisible(true);
    this.survivorStats.setVisible(true);
  }

  hideSurvivorPanel() {
    this.selectedSurvivor = null;
    this.survivorPanelBg.setVisible(false);
    this.survivorName.setVisible(false);
    this.survivorInfo.setVisible(false);
    this.survivorStats.setVisible(false);
  }

  update(resources, day) {
    this.resourceText.setText(
      `  🪵 ${resources.wood}   🪨 ${resources.stone}   🍖 ${resources.food}   💧 ${resources.water}`
    );
    this.dayText.setText(`Day ${day}`);

    if (this.selectedSurvivor) {
      const s = this.selectedSurvivor;
      this.survivorName.setText(s.name);
      this.survivorInfo.setText(`[${s.job}] ${s.trait}`);
      this.survivorStats.setText(
        `HP:    ${this.bar(s.hp, s.maxHp)}\n` +
        `배고픔: ${this.bar(s.hunger, 100)}\n` +
        `갈증:  ${this.bar(s.thirst, 100)}\n` +
        `체력:  ${this.bar(s.energy, 100)}`
      );
    }
  }

  bar(val, max) {
    const pct = Math.floor((val / max) * 10);
    const filled = '█'.repeat(pct);
    const empty = '░'.repeat(10 - pct);
    return `${filled}${empty} ${Math.floor(val)}`;
  }
}
