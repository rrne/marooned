class HUD {
  constructor(scene, buildingSystem) {
    this.scene = scene;
    this.buildingSystem = buildingSystem;
    this.selectedSurvivor = null;
    this.buildMenuOpen = false;
    this.buildMenuItems = [];
    this.onEscapeClick = null;
    this.eventLogEntries = [];
    this.eventLogTexts = [];

    // UI 레이어 (scrollFactor 0)
    this.uiLayer = scene.add.container(0, 0).setScrollFactor(0).setDepth(100);

    this.buildTopBar();
    this.buildSurvivorPanel();
    this.buildBuildButton();
    this.buildBuildMenu();
    this.buildEscapeButton();
    this.buildTooltip();
  }

  // ─── 상단 자원바 ────────────────────────────────

  buildTopBar() {
    const { width } = this.scene.scale;

    // 반투명 배경
    const bg = this.scene.add.rectangle(width / 2, 22, width, 44, 0x0a0e14, 0.88);
    bg.setStrokeStyle(1, 0x2a3a2a, 0.6);

    // 자원 아이콘+수치 텍스트
    this.resTexts = {};
    const items = [
      { key: 'wood',  icon: '🪵', label: '목재', x: 70  },
      { key: 'stone', icon: '🪨', label: '돌',   x: 200 },
      { key: 'food',  icon: '🍖', label: '식량', x: 330 },
      { key: 'water', icon: '💧', label: '물',   x: 460 },
    ];

    items.forEach(({ key, icon, label, x }) => {
      const iconT = this.scene.add.text(x - 28, 22, icon, { fontSize: '16px' }).setOrigin(0.5);
      const labelT = this.scene.add.text(x - 8, 14, label, {
        fontSize: '9px', color: '#778877', fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
      const valT = this.scene.add.text(x - 8, 26, '0', {
        fontSize: '15px', color: '#eeffee', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      this.resTexts[key] = valT;
      this.uiLayer.add([iconT, labelT, valT]);
    });

    // 날짜 + 시간
    this.dayText = this.scene.add.text(width - 16, 12, 'Day 1', {
      fontSize: '15px', color: '#f0e68c', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(1, 0);
    this.timeText = this.scene.add.text(width - 16, 30, '☀ 낮', {
      fontSize: '11px', color: '#ffcc66', fontFamily: 'monospace',
    }).setOrigin(1, 0);

    // 생존자 수
    this.survivorCountText = this.scene.add.text(580, 22, '👥 3명', {
      fontSize: '13px', color: '#aaddaa', fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    this.uiLayer.add([bg, this.dayText, this.timeText, this.survivorCountText]);
  }

  // ─── 생존자 패널 (하단 좌) ──────────────────────

  buildSurvivorPanel() {
    const { height } = this.scene.scale;
    const PW = 310;
    const PH = 140;
    const PX = 10;
    const PY = height - PH - 10;

    // 배경 패널
    const bg = this.scene.add.rectangle(PX + PW / 2, PY + PH / 2, PW, PH, 0x080e0c, 0.92);
    bg.setStrokeStyle(1, 0x2a4a3a, 1);

    // 이름 / 직업
    this.sPanelName = this.scene.add.text(PX + 12, PY + 10, '', {
      fontSize: '15px', color: '#f0e68c', fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.sPanelJob = this.scene.add.text(PX + 12, PY + 30, '', {
      fontSize: '11px', color: '#88aa88', fontFamily: 'monospace',
    });

    // HP / 배고픔 / 갈증 / 에너지 바
    this.statBars = [];
    const statDefs = [
      { label: 'HP',   color: 0xdd4444, yOff: 52 },
      { label: '배고픔', color: 0xdd8833, yOff: 72 },
      { label: '갈증',  color: 0x3388dd, yOff: 92 },
      { label: '체력',  color: 0x33bb55, yOff: 112 },
    ];

    statDefs.forEach(({ label, color, yOff }) => {
      const lbl = this.scene.add.text(PX + 12, PY + yOff, label, {
        fontSize: '10px', color: '#667766', fontFamily: 'monospace',
      }).setOrigin(0, 0.5);

      // 배경 바
      const barBg = this.scene.add.rectangle(PX + 68, PY + yOff, 200, 10, 0x1a2a1a).setOrigin(0, 0.5);
      barBg.setStrokeStyle(1, 0x2a3a2a);

      // 컬러 바
      const bar = this.scene.add.rectangle(PX + 68, PY + yOff, 200, 10, color).setOrigin(0, 0.5);

      // 수치 텍스트
      const val = this.scene.add.text(PX + 278, PY + yOff, '100', {
        fontSize: '10px', color: '#aaaaaa', fontFamily: 'monospace',
      }).setOrigin(1, 0.5);

      this.uiLayer.add([lbl, barBg, bar, val]);
      this.statBars.push({ bar, val, maxW: 200 });
    });

    this.sPanelTask = this.scene.add.text(PX + 12, PY + PH - 12, '', {
      fontSize: '10px', color: '#557755', fontFamily: 'monospace',
    }).setOrigin(0, 1);

    this.survivorPanelBg = bg;
    this.uiLayer.add([bg, this.sPanelName, this.sPanelJob, this.sPanelTask]);
    this.hideSurvivorPanel();
  }

  showSurvivorPanel(s) {
    this.selectedSurvivor = s;
    this.survivorPanelBg.setVisible(true);
    this.sPanelName.setVisible(true);
    this.sPanelJob.setVisible(true);
    this.sPanelTask.setVisible(true);
    this.statBars.forEach(b => {
      b.bar.setVisible(true);
      b.val.setVisible(true);
    });
    // label들은 항상 visible (add됐을 때 기본 true)
  }

  hideSurvivorPanel() {
    this.selectedSurvivor = null;
    this.survivorPanelBg.setVisible(false);
    this.sPanelName.setVisible(false);
    this.sPanelJob.setVisible(false);
    this.sPanelTask.setVisible(false);
    this.statBars.forEach(b => {
      b.bar.setVisible(false);
      b.val.setVisible(false);
    });
  }

  // ─── 건설 버튼 ──────────────────────────────────

  buildBuildButton() {
    const { width, height } = this.scene.scale;
    const BX = width - 76;
    const BY = height - 30;

    this.buildBtnBg = this.scene.add.rectangle(BX, BY, 136, 38, 0x0d1f0d, 0.95)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x3a7a3a);
    this.buildBtnLabel = this.scene.add.text(BX, BY, '🔨  건설 [B]', {
      fontSize: '13px', color: '#88ee88', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.buildBtnBg.on('pointerover', () => this.buildBtnBg.setFillStyle(0x1a3a1a));
    this.buildBtnBg.on('pointerout', () => this.buildBtnBg.setFillStyle(this.buildMenuOpen ? 0x1a3a1a : 0x0d1f0d));
    this.buildBtnBg.on('pointerdown', () => this.toggleBuildMenu());

    this.uiLayer.add([this.buildBtnBg, this.buildBtnLabel]);
  }

  // ─── 건설 메뉴 (카드형) ─────────────────────────

  buildBuildMenu() {
    const { width, height } = this.scene.scale;
    const defs = this.buildingSystem.getAllDefs();
    const keys = Object.keys(defs);
    const CARD_W = 260;
    const CARD_H = 50;
    const PAD = 8;
    const totalH = keys.length * (CARD_H + PAD) + PAD + 32;
    const panelX = width - CARD_W / 2 - 14;
    const panelY = height - 72 - totalH / 2;

    // 패널 배경
    this.buildMenuPanel = this.scene.add.rectangle(panelX, panelY, CARD_W + 16, totalH, 0x06100a, 0.97)
      .setStrokeStyle(1, 0x2a5a2a);

    const title = this.scene.add.text(panelX, panelY - totalH / 2 + 18, '건설 메뉴', {
      fontSize: '12px', color: '#557755', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.buildMenuItems = [];
    keys.forEach((key, i) => {
      const def = defs[key];
      const cardY = panelY - totalH / 2 + 32 + PAD + i * (CARD_H + PAD) + CARD_H / 2;

      const cardBg = this.scene.add.rectangle(panelX, cardY, CARD_W, CARD_H, 0x0f1f0f, 0.95)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0x2a4a2a);

      const iconT = this.scene.add.text(panelX - CARD_W / 2 + 20, cardY, def.icon, { fontSize: '18px' }).setOrigin(0.5);
      const nameT = this.scene.add.text(panelX - CARD_W / 2 + 36, cardY - 8, def.name, {
        fontSize: '13px', color: '#ccffcc', fontFamily: 'monospace', fontStyle: 'bold',
      });
      const costT = this.scene.add.text(panelX - CARD_W / 2 + 36, cardY + 9, this.costStr(def.cost), {
        fontSize: '11px', color: '#778877', fontFamily: 'monospace',
      });

      cardBg.on('pointerover', () => cardBg.setFillStyle(0x1a3a1a));
      cardBg.on('pointerout', () => cardBg.setFillStyle(0x0f1f0f));
      cardBg.on('pointerdown', () => {
        this.buildingSystem.startPlacing(key);
        this.closeBuildMenu();
      });

      this.buildMenuItems.push({ bg: cardBg, nameT, costT, iconT, key });
      this.uiLayer.add([cardBg, iconT, nameT, costT]);
    });

    this.uiLayer.add([this.buildMenuPanel, title]);
    this.buildMenuExtraItems = [title];
    this.hideBuildMenu();
  }

  costStr(cost) {
    const icons = { wood: '🪵', stone: '🪨', food: '🍖', water: '💧' };
    return Object.entries(cost).map(([k, v]) => `${icons[k]}×${v}`).join('  ');
  }

  toggleBuildMenu() {
    this.buildMenuOpen ? this.closeBuildMenu() : this.openBuildMenu();
  }

  openBuildMenu() {
    this.buildMenuOpen = true;
    this.buildMenuPanel.setVisible(true);
    this.buildMenuExtraItems.forEach(t => t.setVisible(true));
    this.buildMenuItems.forEach(({ bg, nameT, costT, iconT }) => {
      bg.setVisible(true); nameT.setVisible(true); costT.setVisible(true); iconT.setVisible(true);
    });
    this.buildBtnBg.setFillStyle(0x1a3a1a);
  }

  closeBuildMenu() {
    this.buildMenuOpen = false;
    this.hideBuildMenu();
    this.buildBtnBg.setFillStyle(0x0d1f0d);
  }

  hideBuildMenu() {
    this.buildMenuPanel.setVisible(false);
    this.buildMenuExtraItems.forEach(t => t.setVisible(false));
    this.buildMenuItems.forEach(({ bg, nameT, costT, iconT }) => {
      bg.setVisible(false); nameT.setVisible(false); costT.setVisible(false); iconT.setVisible(false);
    });
  }

  // ─── 탈출 버튼 ──────────────────────────────────

  buildEscapeButton() {
    const { width, height } = this.scene.scale;
    this.escapeBtnBg = this.scene.add.rectangle(width / 2, height - 30, 220, 38, 0x2a2200, 0.95)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xffd700);
    this.escapeBtnLabel = this.scene.add.text(width / 2, height - 30, '⛵  탈출하기!', {
      fontSize: '16px', color: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.escapeBtnBg.on('pointerover', () => this.escapeBtnBg.setFillStyle(0x4a3a00));
    this.escapeBtnBg.on('pointerout', () => this.escapeBtnBg.setFillStyle(0x2a2200));
    this.escapeBtnBg.on('pointerdown', () => { if (this.onEscapeClick) this.onEscapeClick(); });

    this.uiLayer.add([this.escapeBtnBg, this.escapeBtnLabel]);
    this.escapeBtnBg.setVisible(false);
    this.escapeBtnLabel.setVisible(false);
  }

  showEscapeButton(show) {
    this.escapeBtnBg.setVisible(show);
    this.escapeBtnLabel.setVisible(show);
    if (show) {
      this.scene.tweens.add({
        targets: [this.escapeBtnBg, this.escapeBtnLabel],
        alpha: 0.55, duration: 800, yoyo: true, repeat: -1,
      });
    }
  }

  // ─── 툴팁 ───────────────────────────────────────

  buildTooltip() {
    this.tooltipBg = this.scene.add.rectangle(0, 0, 160, 44, 0x080e0c, 0.93)
      .setStrokeStyle(1, 0x2a4a2a).setDepth(200).setVisible(false).setScrollFactor(0);
    this.tooltipText = this.scene.add.text(0, 0, '', {
      fontSize: '11px', color: '#ccffcc', fontFamily: 'monospace', lineSpacing: 3,
      padding: { x: 8, y: 6 },
    }).setDepth(201).setVisible(false).setScrollFactor(0);
  }

  showTooltip(screenX, screenY, lines) {
    const text = lines.join('\n');
    this.tooltipText.setText(text);
    const tw = this.tooltipText.width + 16;
    const th = this.tooltipText.height + 12;
    const tx = Math.min(screenX + 12, this.scene.scale.width - tw - 4);
    const ty = Math.min(screenY - 10, this.scene.scale.height - th - 4);
    this.tooltipBg.setPosition(tx + tw / 2, ty + th / 2).setSize(tw, th).setVisible(true);
    this.tooltipText.setPosition(tx, ty).setVisible(true);
  }

  hideTooltip() {
    this.tooltipBg.setVisible(false);
    this.tooltipText.setVisible(false);
  }

  // ─── 이벤트 로그 ────────────────────────────────

  showEventLog(text, color) {
    this.eventLogEntries.unshift({ text, color: color || '#ffffff' });
    if (this.eventLogEntries.length > 6) this.eventLogEntries.pop();
    this.redrawEventLog();
  }

  redrawEventLog() {
    const { width, height } = this.scene.scale;
    this.eventLogTexts.forEach(t => t.destroy());
    this.eventLogTexts = [];

    this.eventLogEntries.forEach((e, i) => {
      const t = this.scene.add.text(width - 14, height - 72 - i * 18, e.text, {
        fontSize: '11px', color: e.color, fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(1, 1).setScrollFactor(0).setDepth(102).setAlpha(Math.max(0.15, 1 - i * 0.17));
      this.eventLogTexts.push(t);
    });
  }

  // ─── 건설 가능 여부 표시 업데이트 ───────────────

  updateAffordability(resources) {
    this.buildMenuItems.forEach(({ bg, nameT, costT, key }) => {
      const ok = this.buildingSystem.canAfford(key, resources);
      nameT.setColor(ok ? '#ccffcc' : '#556655');
      costT.setColor(ok ? '#778877' : '#3a4a3a');
      bg.setStrokeStyle(1, ok ? 0x2a6a2a : 0x1a2a1a);
    });
  }

  // ─── 메인 업데이트 ───────────────────────────────

  update(resources, day, isNight, survivorCount) {
    // 자원 수치
    Object.keys(this.resTexts).forEach(k => {
      const v = resources[k] ?? 0;
      this.resTexts[k].setText(String(v));
      this.resTexts[k].setColor(v < 5 ? '#ff8888' : '#eeffee');
    });

    this.dayText.setText(`Day ${day}`);
    this.timeText.setText(isNight ? '🌙 밤' : '☀ 낮');
    this.timeText.setColor(isNight ? '#8899ff' : '#ffcc66');
    this.survivorCountText.setText(`👥 ${survivorCount}명`);

    // 생존자 패널
    if (this.selectedSurvivor) {
      const s = this.selectedSurvivor;
      this.sPanelName.setText(s.name);
      this.sPanelJob.setText(`[${s.job}]  ${s.trait}`);
      this.sPanelTask.setText(s.task ? `▶ ${this.taskLabel(s.task)}` : '· 대기 중');

      const vals = [s.hp / s.maxHp, s.hunger / 100, s.thirst / 100, s.energy / 100];
      vals.forEach((pct, i) => {
        const { bar, val, maxW } = this.statBars[i];
        bar.width = Math.max(2, pct * maxW);
        val.setText(Math.floor(pct * 100).toString());
        // 위험 수치면 빨갛게
        const COLORS = [0xdd4444, 0xdd8833, 0x3388dd, 0x33bb55];
        const WARN   = [0xff2222, 0xff6600, 0x2266ff, 0x22ff66];
        bar.setFillStyle(pct < 0.25 ? WARN[i] : COLORS[i]);
      });
    }

    if (this.buildMenuOpen) this.updateAffordability(resources);
  }

  taskLabel(task) {
    return { move: '이동 중', gather: '채집 중' }[task] || task;
  }
}
