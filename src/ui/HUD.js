class HUD {
  constructor(scene, buildingSystem) {
    this.scene = scene;
    this.buildingSystem = buildingSystem;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(100);
    this.selectedSurvivor = null;
    this.buildMenuOpen = false;
    this.buildMenuItems = [];

    this.buildTopBar();
    this.buildSurvivorPanel();
    this.buildDayCounter();
    this.buildBuildButton();
    this.buildBuildMenu();
    this.buildEscapeButton();
    this.buildEventLog();
  }

  buildTopBar() {
    const { width } = this.scene.scale;
    const bg = this.scene.add.rectangle(width / 2, 20, width, 40, 0x000000, 0.75);
    this.resourceText = this.scene.add.text(12, 9, '', {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace',
    });
    this.container.add([bg, this.resourceText]);
  }

  buildDayCounter() {
    const { width } = this.scene.scale;
    this.dayText = this.scene.add.text(width - 12, 9, 'Day 1', {
      fontSize: '14px', color: '#f0e68c', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this.timeText = this.scene.add.text(width - 12, 26, '낮', {
      fontSize: '11px', color: '#ffcc66', fontFamily: 'monospace',
    }).setOrigin(1, 0);
    this.container.add([this.dayText, this.timeText]);
  }

  buildSurvivorPanel() {
    const { height } = this.scene.scale;
    const panelH = 126;
    const panelY = height - panelH;

    const bg = this.scene.add.rectangle(185, panelY + panelH / 2, 370, panelH, 0x000000, 0.82);
    bg.setStrokeStyle(1, 0x445544);

    this.survivorPanelBg = bg;
    this.survivorName = this.scene.add.text(14, panelY + 8, '', {
      fontSize: '14px', color: '#f0e68c', fontFamily: 'monospace',
    });
    this.survivorInfo = this.scene.add.text(14, panelY + 27, '', {
      fontSize: '11px', color: '#aaaaaa', fontFamily: 'monospace',
    });
    this.survivorStats = this.scene.add.text(14, panelY + 46, '', {
      fontSize: '11px', color: '#ffffff', fontFamily: 'monospace', lineSpacing: 5,
    });

    this.container.add([bg, this.survivorName, this.survivorInfo, this.survivorStats]);
    this.hideSurvivorPanel();
  }

  buildBuildButton() {
    const { width, height } = this.scene.scale;
    const bx = width - 80;
    const by = height - 30;

    this.buildBtnBg = this.scene.add.rectangle(bx, by, 140, 36, 0x1a3a1a)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x44aa44);
    this.buildBtnText = this.scene.add.text(bx, by, '🔨 건설', {
      fontSize: '15px', color: '#88ff88', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.buildBtnBg.on('pointerover', () => this.buildBtnBg.setFillStyle(0x2a5a2a));
    this.buildBtnBg.on('pointerout', () => this.buildBtnBg.setFillStyle(this.buildMenuOpen ? 0x2a5a2a : 0x1a3a1a));
    this.buildBtnBg.on('pointerdown', () => this.toggleBuildMenu());

    this.container.add([this.buildBtnBg, this.buildBtnText]);
  }

  buildBuildMenu() {
    const { width, height } = this.scene.scale;
    const panelW = 300;
    const panelX = width - panelW / 2 - 10;
    const defs = this.buildingSystem.getAllDefs();
    const keys = Object.keys(defs);
    const itemH = 46;
    const panelH = keys.length * itemH + 16;
    const panelY = height - 50 - panelH / 2;

    this.buildMenuPanel = this.scene.add.rectangle(panelX, panelY, panelW, panelH, 0x0a1a0a, 0.95)
      .setStrokeStyle(1, 0x44aa44);

    this.buildMenuItems = [];

    keys.forEach((key, i) => {
      const def = defs[key];
      const iy = panelY - panelH / 2 + 12 + i * itemH;

      const itemBg = this.scene.add.rectangle(panelX, iy + itemH / 2, panelW - 4, itemH - 2, 0x112211, 0.9)
        .setInteractive({ useHandCursor: true });

      const nameText = this.scene.add.text(panelX - panelW / 2 + 12, iy + 4, `${def.icon} ${def.name}`, {
        fontSize: '13px', color: '#ccffcc', fontFamily: 'monospace',
      });
      const costText = this.scene.add.text(panelX - panelW / 2 + 12, iy + 22, this.costStr(def.cost), {
        fontSize: '11px', color: '#aaaaaa', fontFamily: 'monospace',
      });

      itemBg.on('pointerover', () => itemBg.setFillStyle(0x1a3a1a));
      itemBg.on('pointerout', () => itemBg.setFillStyle(0x112211));
      itemBg.on('pointerdown', () => {
        this.buildingSystem.startPlacing(key);
        this.closeBuildMenu();
      });

      this.buildMenuItems.push({ bg: itemBg, nameText, costText, key });
      this.container.add([itemBg, nameText, costText]);
    });

    this.container.add(this.buildMenuPanel);
    this.buildMenuPanel.setDepth(-1);
    this.hideBuildMenu();
  }

  costStr(cost) {
    return Object.entries(cost).map(([k, v]) => {
      const icons = { wood: '🪵', stone: '🪨', food: '🍖', water: '💧' };
      return `${icons[k] || k}${v}`;
    }).join(' ');
  }

  buildEscapeButton() {
    const { width, height } = this.scene.scale;
    this.escapeBtnBg = this.scene.add.rectangle(width / 2, height - 30, 200, 36, 0x3a3a00)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xffd700);
    this.escapeBtnText = this.scene.add.text(width / 2, height - 30, '⛵ 탈출하기!', {
      fontSize: '16px', color: '#ffd700', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.escapeBtnBg.on('pointerover', () => this.escapeBtnBg.setFillStyle(0x5a5a00));
    this.escapeBtnBg.on('pointerout', () => this.escapeBtnBg.setFillStyle(0x3a3a00));

    this.container.add([this.escapeBtnBg, this.escapeBtnText]);
    this.escapeBtnBg.setVisible(false);
    this.escapeBtnText.setVisible(false);

    // 탈출 버튼 클릭은 GameScene에서 on('pointerdown')으로 처리
    this.onEscapeClick = null;
    this.escapeBtnBg.on('pointerdown', () => {
      if (this.onEscapeClick) this.onEscapeClick();
    });
  }

  buildEventLog() {
    const { width, height } = this.scene.scale;
    this.eventLogTexts = [];
    this.eventLogEntries = [];
  }

  showEventLog(text, color) {
    const { width, height } = this.scene.scale;
    this.eventLogEntries.unshift({ text, color, alpha: 1 });
    if (this.eventLogEntries.length > 5) this.eventLogEntries.pop();

    this.eventLogTexts.forEach(t => t.destroy());
    this.eventLogTexts = [];

    this.eventLogEntries.forEach((e, i) => {
      const t = this.scene.add.text(width - 12, height - 60 - i * 20, e.text, {
        fontSize: '12px', color: e.color || '#ffffff', fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(1, 1).setScrollFactor(0).setDepth(101).setAlpha(1 - i * 0.18);
      this.eventLogTexts.push(t);
    });
  }

  toggleBuildMenu() {
    this.buildMenuOpen ? this.closeBuildMenu() : this.openBuildMenu();
  }

  openBuildMenu() {
    this.buildMenuOpen = true;
    this.buildMenuPanel.setVisible(true);
    this.buildMenuItems.forEach(item => {
      item.bg.setVisible(true);
      item.nameText.setVisible(true);
      item.costText.setVisible(true);
    });
    this.buildBtnBg.setFillStyle(0x2a5a2a);
  }

  closeBuildMenu() {
    this.buildMenuOpen = false;
    this.hideBuildMenu();
    this.buildBtnBg.setFillStyle(0x1a3a1a);
  }

  hideBuildMenu() {
    this.buildMenuPanel.setVisible(false);
    this.buildMenuItems.forEach(item => {
      item.bg.setVisible(false);
      item.nameText.setVisible(false);
      item.costText.setVisible(false);
    });
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

  showEscapeButton(show) {
    this.escapeBtnBg.setVisible(show);
    this.escapeBtnText.setVisible(show);
    if (show) {
      this.scene.tweens.add({
        targets: [this.escapeBtnBg, this.escapeBtnText],
        alpha: 0.5,
        duration: 700,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  updateBuildMenuAffordability(resources) {
    const defs = this.buildingSystem.getAllDefs();
    this.buildMenuItems.forEach(item => {
      const canAfford = this.buildingSystem.canAfford(item.key, resources);
      item.nameText.setColor(canAfford ? '#ccffcc' : '#667766');
      item.costText.setColor(canAfford ? '#aaaaaa' : '#555555');
    });
  }

  update(resources, day, isNight) {
    this.resourceText.setText(
      `🪵${resources.wood}  🪨${resources.stone}  🍖${resources.food}  💧${resources.water}`
    );
    this.dayText.setText(`Day ${day}`);
    this.timeText.setText(isNight ? '🌙 밤' : '☀ 낮');
    this.timeText.setColor(isNight ? '#8888ff' : '#ffcc66');

    if (this.selectedSurvivor) {
      const s = this.selectedSurvivor;
      this.survivorName.setText(s.name);
      this.survivorInfo.setText(`[${s.job}]  ${s.trait}  ${s.task ? '(' + this.taskLabel(s.task) + ')' : '(대기 중)'}`);
      this.survivorStats.setText(
        `HP    ${this.bar(s.hp, s.maxHp, '#ff6666')}\n` +
        `배고픔 ${this.bar(s.hunger, 100, '#ffaa44')}\n` +
        `갈증  ${this.bar(s.thirst, 100, '#44aaff')}\n` +
        `체력  ${this.bar(s.energy, 100, '#44ff88')}`
      );
    }

    if (this.buildMenuOpen) {
      this.updateBuildMenuAffordability(resources);
    }
  }

  taskLabel(task) {
    const labels = { move: '이동', gather: '채집' };
    return labels[task] || task;
  }

  bar(val, max, color) {
    const pct = Math.floor(Math.max(0, val / max) * 10);
    return '█'.repeat(pct) + '░'.repeat(10 - pct) + ` ${Math.floor(val)}`;
  }
}
