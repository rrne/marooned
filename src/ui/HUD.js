class HUD {
  constructor(scene, buildingSystem) {
    this.scene = scene;
    this.buildingSystem = buildingSystem;
    this.onEscapeClick = null;
    this.buildMenuOpen = false;
    this.buildMenuItems = [];
    this.eventLogEntries = [];
    this.eventLogTexts = [];
    this.trayCards = [];

    this.uiLayer = scene.add.container(0, 0).setScrollFactor(0).setDepth(100);

    this.buildTopBar();
    this.buildDetailPanel();
    this.buildSurvivorTray();
    this.buildBuildButton();
    this.buildBuildMenu();
    this.buildEscapeButton();
    this.buildTooltip();
  }

  // ─── 상단바 ─────────────────────────────────────

  buildTopBar() {
    const { width } = this.scene.scale;

    // 배경
    const bg = this.scene.add.rectangle(width / 2, 22, width, 44, 0x070d0b, 0.9);
    bg.setStrokeStyle(1, 0x1a2a1a, 0.7);

    // 좌상단: Day 텍스트 (plain)
    this.dayText = this.scene.add.text(12, 22, 'Day 1', {
      fontSize: '17px', color: '#c8e8c8', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    this.timeText = this.scene.add.text(72, 22, '· 낮', {
      fontSize: '12px', color: '#ffcc66', fontFamily: 'monospace',
    }).setOrigin(0, 0.5);

    // 자원 아이콘 + 수치 (중앙)
    this.resTexts = {};
    const items = [
      { key: 'wood',  icon: '🪵', label: '목재', cx: 240 },
      { key: 'stone', icon: '🪨', label: '돌',   cx: 380 },
      { key: 'food',  icon: '🍖', label: '식량', cx: 520 },
      { key: 'water', icon: '💧', label: '물',   cx: 660 },
    ];

    items.forEach(({ key, icon, label, cx }) => {
      const iconT = this.scene.add.text(cx - 26, 22, icon, { fontSize: '16px' }).setOrigin(0.5);
      const labelT = this.scene.add.text(cx - 7, 13, label, {
        fontSize: '9px', color: '#557755', fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
      const valT = this.scene.add.text(cx - 7, 26, '0', {
        fontSize: '15px', color: '#ddfedd', fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(0, 0.5);
      this.resTexts[key] = valT;
      this.uiLayer.add([iconT, labelT, valT]);
    });

    // 우상단: 생존자 수
    this.survivorCountText = this.scene.add.text(width - 14, 22, '👥 3명', {
      fontSize: '13px', color: '#99cc99', fontFamily: 'monospace',
    }).setOrigin(1, 0.5);

    this.uiLayer.add([bg, this.dayText, this.timeText, this.survivorCountText]);
  }

  // ─── 생존자 상세 패널 (좌하단) ──────────────────

  buildDetailPanel() {
    const { height } = this.scene.scale;
    const PW = 300;
    const PH = 130;
    const TRAY_H = 66;
    const PX = 10;
    const PY = height - TRAY_H - PH - 8;

    const bg = this.scene.add.rectangle(PX + PW / 2, PY + PH / 2, PW, PH, 0x060d0a, 0.93)
      .setStrokeStyle(1, 0x1f3f2f);

    this.dpName = this.scene.add.text(PX + 12, PY + 10, '', {
      fontSize: '15px', color: '#e8f8d0', fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.dpJob = this.scene.add.text(PX + 12, PY + 29, '', {
      fontSize: '11px', color: '#6a9a6a', fontFamily: 'monospace',
    });
    this.dpTask = this.scene.add.text(PX + 12, PY + PH - 10, '', {
      fontSize: '10px', color: '#4a7a4a', fontFamily: 'monospace',
    }).setOrigin(0, 1);

    // 스탯 바
    this.dpBars = [];
    const defs = [
      { label: 'HP',    color: 0xcc3333, yOff: 50 },
      { label: '배고픔', color: 0xcc7722, yOff: 68 },
      { label: '갈증',  color: 0x2266bb, yOff: 86 },
      { label: '체력',  color: 0x228844, yOff: 104 },
    ];
    const BAR_W = 188;

    defs.forEach(({ label, color, yOff }) => {
      const lbl = this.scene.add.text(PX + 12, PY + yOff, label, {
        fontSize: '10px', color: '#4a6a4a', fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
      const barBg = this.scene.add.rectangle(PX + 80, PY + yOff, BAR_W, 9, 0x111d14).setOrigin(0, 0.5);
      const bar   = this.scene.add.rectangle(PX + 80, PY + yOff, BAR_W, 9, color).setOrigin(0, 0.5);
      const val   = this.scene.add.text(PX + 80 + BAR_W + 6, PY + yOff, '100', {
        fontSize: '10px', color: '#778877', fontFamily: 'monospace',
      }).setOrigin(0, 0.5);
      this.uiLayer.add([lbl, barBg, bar, val]);
      this.dpBars.push({ bar, val, maxW: BAR_W, baseColor: color,
        dangerColor: color === 0xcc3333 ? 0xff2222 : color === 0xcc7722 ? 0xff6600 : color === 0x2266bb ? 0x1144ff : 0x22ff66 });
    });

    this.dpPanelBg = bg;
    this.uiLayer.add([bg, this.dpName, this.dpJob, this.dpTask]);
    this.hideDetailPanel();
  }

  showDetailPanel(s) {
    this.dpPanelBg.setVisible(true);
    this.dpName.setVisible(true);
    this.dpJob.setVisible(true);
    this.dpTask.setVisible(true);
    this.dpBars.forEach(b => { b.bar.setVisible(true); b.val.setVisible(true); });
    this._refreshDetail(s);
  }

  hideDetailPanel() {
    this.dpPanelBg.setVisible(false);
    this.dpName.setVisible(false);
    this.dpJob.setVisible(false);
    this.dpTask.setVisible(false);
    this.dpBars.forEach(b => { b.bar.setVisible(false); b.val.setVisible(false); });
  }

  _refreshDetail(s) {
    if (!s) return;
    this.dpName.setText(s.name);
    this.dpJob.setText(`[${s.job}]  ${s.trait}`);
    this.dpTask.setText(s.task ? `▶ ${s.task === 'gather' ? '채집 중' : '이동 중'}` : '· 대기 중');
    const stats = [s.hp / s.maxHp, s.hunger / 100, s.thirst / 100, s.energy / 100];
    stats.forEach((pct, i) => {
      const b = this.dpBars[i];
      b.bar.width = Math.max(2, pct * b.maxW);
      b.val.setText(Math.floor(pct * 100) + '');
      b.bar.setFillStyle(pct < 0.25 ? b.dangerColor : b.baseColor);
    });
  }

  // ─── 생존자 트레이 (하단 전체) ─────────────────

  buildSurvivorTray() {
    const { width, height } = this.scene.scale;
    const TRAY_H = 66;

    this.trayBg = this.scene.add.rectangle(width / 2, height - TRAY_H / 2, width, TRAY_H, 0x060d0a, 0.88)
      .setStrokeStyle(1, 0x1a2a1a);
    this.trayLabel = this.scene.add.text(width / 2, height - TRAY_H / 2, '생존자를 드래그해서 선택하세요', {
      fontSize: '12px', color: '#2a3a2a', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.uiLayer.add([this.trayBg, this.trayLabel]);
  }

  updateSurvivorTray(selectedSurvivors, primary, onCardClick) {
    // 기존 카드 제거
    this.clearSurvivorTray();

    const { width, height } = this.scene.scale;
    const TRAY_H = 66;
    const CARD_W = 90;
    const CARD_H = 52;
    const START_X = 16;
    const CARD_Y = height - TRAY_H / 2;

    this.trayLabel.setVisible(selectedSurvivors.length === 0);

    selectedSurvivors.forEach((s, i) => {
      const cx = START_X + i * (CARD_W + 6) + CARD_W / 2;
      const isPrimary = s === primary;

      const cardBg = this.scene.add.rectangle(cx, CARD_Y, CARD_W, CARD_H, 0x0d1f14, 0.95)
        .setStrokeStyle(isPrimary ? 2 : 1, isPrimary ? 0xffd700 : 0x2a4a2a)
        .setInteractive({ useHandCursor: true });

      const nameT = this.scene.add.text(cx, CARD_Y - 14, s.name, {
        fontSize: '11px', color: isPrimary ? '#ffd700' : '#a0c8a0', fontFamily: 'monospace',
      }).setOrigin(0.5);

      // 미니 스탯바 (HP, 배고픔, 갈증, 체력)
      const barDefs = [
        { v: s.hp / s.maxHp, color: 0xcc3333 },
        { v: s.hunger / 100, color: 0xcc7722 },
        { v: s.thirst / 100, color: 0x2266bb },
        { v: s.energy / 100, color: 0x228844 },
      ];
      const miniBarW = 70;
      const miniBars = barDefs.map((b, bi) => {
        const by = CARD_Y - 4 + bi * 9;
        const bgR = this.scene.add.rectangle(cx - 4, by, miniBarW, 6, 0x111811).setOrigin(0, 0.5);
        const fgR = this.scene.add.rectangle(cx - 4, by, Math.max(2, b.v * miniBarW), 6, b.color).setOrigin(0, 0.5);
        this.uiLayer.add([bgR, fgR]);
        return { bg: bgR, fg: fgR, maxW: miniBarW };
      });

      cardBg.on('pointerover', () => cardBg.setFillStyle(0x142814));
      cardBg.on('pointerout', () => cardBg.setFillStyle(0x0d1f14));
      cardBg.on('pointerdown', () => onCardClick && onCardClick(s));

      this.uiLayer.add([cardBg, nameT]);
      this.trayCards.push({ cardBg, nameT, miniBars, survivor: s });
    });
  }

  clearSurvivorTray() {
    this.trayCards.forEach(c => {
      c.cardBg.destroy();
      c.nameT.destroy();
      c.miniBars.forEach(b => { b.bg.destroy(); b.fg.destroy(); });
    });
    this.trayCards = [];
    this.trayLabel.setVisible(true);
  }

  // ─── 건설 버튼 ──────────────────────────────────

  buildBuildButton() {
    const { width, height } = this.scene.scale;
    const BX = width - 76;
    const BY = height - 100;

    this.buildBtnBg = this.scene.add.rectangle(BX, BY, 136, 36, 0x0c1a0c, 0.95)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(1, 0x2f6a2f);
    this.buildBtnLabel = this.scene.add.text(BX, BY, '🔨  건설 [B]', {
      fontSize: '13px', color: '#77dd77', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.buildBtnBg.on('pointerover', () => this.buildBtnBg.setFillStyle(0x183018));
    this.buildBtnBg.on('pointerout', () => this.buildBtnBg.setFillStyle(this.buildMenuOpen ? 0x183018 : 0x0c1a0c));
    this.buildBtnBg.on('pointerdown', () => this.toggleBuildMenu());
    this.uiLayer.add([this.buildBtnBg, this.buildBtnLabel]);
  }

  // ─── 건설 메뉴 ──────────────────────────────────

  buildBuildMenu() {
    const { width, height } = this.scene.scale;
    const defs = this.buildingSystem.getAllDefs();
    const keys = Object.keys(defs);
    const CW = 252, CH = 48, PAD = 6;
    const totalH = keys.length * (CH + PAD) + PAD + 30;
    const PX = width - CW / 2 - 14;
    const PY = height - 140 - totalH / 2;

    this.buildMenuPanel = this.scene.add.rectangle(PX, PY, CW + 14, totalH, 0x050e07, 0.97)
      .setStrokeStyle(1, 0x224422);

    const title = this.scene.add.text(PX, PY - totalH / 2 + 16, '─  건설 메뉴  ─', {
      fontSize: '11px', color: '#3a6a3a', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.buildMenuItems = [];
    keys.forEach((key, i) => {
      const def = defs[key];
      const cy = PY - totalH / 2 + 30 + PAD + i * (CH + PAD) + CH / 2;

      const cardBg = this.scene.add.rectangle(PX, cy, CW, CH, 0x0c1a0c, 0.96)
        .setInteractive({ useHandCursor: true })
        .setStrokeStyle(1, 0x1f3f1f);

      const iconT = this.scene.add.text(PX - CW / 2 + 18, cy, def.icon, { fontSize: '17px' }).setOrigin(0.5);
      const nameT = this.scene.add.text(PX - CW / 2 + 34, cy - 9, def.name, {
        fontSize: '13px', color: '#aaddaa', fontFamily: 'monospace', fontStyle: 'bold',
      });
      const costT = this.scene.add.text(PX - CW / 2 + 34, cy + 9, this.costStr(def.cost), {
        fontSize: '11px', color: '#5a7a5a', fontFamily: 'monospace',
      });

      cardBg.on('pointerover', () => cardBg.setFillStyle(0x162816));
      cardBg.on('pointerout', () => cardBg.setFillStyle(0x0c1a0c));
      cardBg.on('pointerdown', () => { this.buildingSystem.startPlacing(key); this.closeBuildMenu(); });

      this.buildMenuItems.push({ bg: cardBg, nameT, costT, iconT, key });
      this.uiLayer.add([cardBg, iconT, nameT, costT]);
    });

    this.buildMenuPanel.setDepth(-1);
    this.uiLayer.add([this.buildMenuPanel, title]);
    this.buildMenuExtraItems = [title];
    this.hideBuildMenu();
  }

  costStr(cost) {
    const icons = { wood: '🪵', stone: '🪨', food: '🍖', water: '💧' };
    return Object.entries(cost).map(([k, v]) => `${icons[k]}×${v}`).join('  ');
  }

  toggleBuildMenu() { this.buildMenuOpen ? this.closeBuildMenu() : this.openBuildMenu(); }

  openBuildMenu() {
    this.buildMenuOpen = true;
    this.buildMenuPanel.setVisible(true);
    this.buildMenuExtraItems.forEach(t => t.setVisible(true));
    this.buildMenuItems.forEach(({ bg, nameT, costT, iconT }) => {
      bg.setVisible(true); nameT.setVisible(true); costT.setVisible(true); iconT.setVisible(true);
    });
    this.buildBtnBg.setFillStyle(0x183018);
  }

  closeBuildMenu() {
    this.buildMenuOpen = false;
    this.hideBuildMenu();
    this.buildBtnBg.setFillStyle(0x0c1a0c);
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
    this.escapeBtnBg = this.scene.add.rectangle(width / 2, height - 100, 210, 36, 0x1e1a00, 0.96)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(2, 0xffd700);
    this.escapeBtnLabel = this.scene.add.text(width / 2, height - 100, '⛵  탈출하기!', {
      fontSize: '15px', color: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.escapeBtnBg.on('pointerover', () => this.escapeBtnBg.setFillStyle(0x3a3400));
    this.escapeBtnBg.on('pointerout', () => this.escapeBtnBg.setFillStyle(0x1e1a00));
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
        alpha: 0.5, duration: 800, yoyo: true, repeat: -1,
      });
    }
  }

  // ─── 툴팁 ───────────────────────────────────────

  buildTooltip() {
    this.tooltipBg = this.scene.add.rectangle(0, 0, 10, 10, 0x060e08, 0.94)
      .setStrokeStyle(1, 0x2a4a2a).setDepth(200).setVisible(false).setScrollFactor(0);
    this.tooltipText = this.scene.add.text(0, 0, '', {
      fontSize: '11px', color: '#bbddbb', fontFamily: 'monospace',
      lineSpacing: 4, padding: { x: 8, y: 6 },
    }).setDepth(201).setVisible(false).setScrollFactor(0);
  }

  showTooltip(sx, sy, lines) {
    this.tooltipText.setText(lines.join('\n'));
    const tw = this.tooltipText.width + 16;
    const th = this.tooltipText.height + 12;
    const tx = Math.min(sx + 14, this.scene.scale.width - tw - 4);
    const ty = Math.max(4, sy - th - 8);
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
    if (this.eventLogEntries.length > 5) this.eventLogEntries.pop();
    this.eventLogTexts.forEach(t => t.destroy());
    this.eventLogTexts = [];
    const { width, height } = this.scene.scale;
    this.eventLogEntries.forEach((e, i) => {
      const t = this.scene.add.text(width - 14, height - 80 - i * 18, e.text, {
        fontSize: '11px', color: e.color, fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 2,
      }).setOrigin(1, 1).setScrollFactor(0).setDepth(102).setAlpha(Math.max(0.1, 1 - i * 0.2));
      this.eventLogTexts.push(t);
    });
  }

  // ─── 메인 업데이트 ───────────────────────────────

  update(resources, day, isNight, survivorCount, primarySurvivor) {
    // 자원
    Object.keys(this.resTexts).forEach(k => {
      const v = resources[k] ?? 0;
      this.resTexts[k].setText(String(v));
      this.resTexts[k].setColor(v < 5 ? '#ff7777' : '#ddfedd');
    });

    // 날짜 (좌상단 plain)
    this.dayText.setText(`Day ${day}`);
    this.timeText.setText(isNight ? '· 밤' : '· 낮');
    this.timeText.setColor(isNight ? '#7788ff' : '#ffcc66');

    this.survivorCountText.setText(`👥 ${survivorCount}명`);

    // 상세 패널 갱신
    if (primarySurvivor && this.dpPanelBg.visible) {
      this._refreshDetail(primarySurvivor);
    }

    // 트레이 미니바 실시간 갱신
    this.trayCards.forEach(({ miniBars, survivor: s }) => {
      const vals = [s.hp / s.maxHp, s.hunger / 100, s.thirst / 100, s.energy / 100];
      vals.forEach((v, i) => {
        miniBars[i].fg.width = Math.max(2, v * miniBars[i].maxW);
      });
    });

    if (this.buildMenuOpen) {
      this.buildMenuItems.forEach(({ bg, nameT, costT, key }) => {
        const ok = this.buildingSystem.canAfford(key, resources);
        nameT.setColor(ok ? '#aaddaa' : '#445544');
        costT.setColor(ok ? '#5a7a5a' : '#2a3a2a');
        bg.setStrokeStyle(1, ok ? 0x2a5a2a : 0x1a2a1a);
      });
    }
  }
}
