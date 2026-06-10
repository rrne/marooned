class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.TILE_SIZE = 20;
    this.COLS = 100;
    this.ROWS = 100;

    // 카메라
    this.cameras.main.setBounds(0, 0, this.COLS * this.TILE_SIZE, this.ROWS * this.TILE_SIZE);
    this.cameras.main.setZoom(1.5);
    this.cameras.main.centerOn((this.COLS / 2) * this.TILE_SIZE, (this.ROWS / 2) * this.TILE_SIZE);

    // 맵
    this.mapSystem = new MapSystem(this, this.COLS, this.ROWS, this.TILE_SIZE);
    this.mapSystem.generate();
    this.mapSystem.draw();

    // 게임 상태
    this.resources = { wood: 10, stone: 5, food: 20, water: 30 };
    this.survivors = [];
    this.selectedSurvivors = [];   // 멀티셀렉
    this.primarySurvivor = null;   // 명령 대상
    this.day = 1;
    this.dayTimer = 0;
    this.DAY_DURATION = 240;
    this.NIGHT_START = 0.65;
    this.isNight = false;
    this.gameOver = false;
    this.escaped = false;

    // 시스템
    this.buildingSystem = new BuildingSystem(this, this.mapSystem);
    this.eventSystem = new EventSystem(this);

    // 낮/밤 오버레이
    const { width, height } = this.scale;
    this.nightOverlay = this.add.rectangle(width / 2, height / 2, width, height, 0x00001a, 0)
      .setScrollFactor(0).setDepth(60);

    // 드래그 선택 박스 (스크린 공간)
    this.selBoxGfx = this.add.graphics().setScrollFactor(0).setDepth(90);
    this.dragState = null; // { startSX, startSY, startWX, startWY }
    this.isDragSelecting = false;

    // 카메라 패닝 상태
    this.panState = { active: false, lastX: 0, lastY: 0 };

    // 초기 생존자 3명
    const cx = (this.COLS / 2) * this.TILE_SIZE;
    const cy = (this.ROWS / 2) * this.TILE_SIZE;
    this.spawnSurvivor(cx - 30, cy);
    this.spawnSurvivor(cx, cy - 20);
    this.spawnSurvivor(cx + 30, cy + 10);

    // HUD
    this.hud = new HUD(this, this.buildingSystem);
    this.hud.onEscapeClick = () => this.triggerEscape();

    // 입력
    this.cursors = this.input.keyboard.createCursorKeys();
    this.setupInput();
    this.time.delayedCall(30000, () => this.scheduleShipwreck());
  }

  // ─── 입력 설정 ────────────────────────────────────

  setupInput() {
    // 마우스 버튼 DOWN
    this.input.on('pointerdown', (p) => {
      if (p.button === 1 || p.button === 2) {
        // 중간/우클릭 → 카메라 패닝 시작
        this.panState = { active: true, lastX: p.x, lastY: p.y };
        return;
      }
      if (p.button === 0) {
        this.onLeftDown(p);
      }
    });

    // 마우스 이동
    this.input.on('pointermove', (p) => {
      // 카메라 패닝
      if (this.panState.active) {
        const dx = p.x - this.panState.lastX;
        const dy = p.y - this.panState.lastY;
        const cam = this.cameras.main;
        cam.scrollX -= dx / cam.zoom;
        cam.scrollY -= dy / cam.zoom;
        this.panState.lastX = p.x;
        this.panState.lastY = p.y;
      }

      // 드래그 선택 박스
      if (this.dragState && p.leftButtonDown()) {
        const moved = Math.abs(p.x - this.dragState.startSX) + Math.abs(p.y - this.dragState.startSY);
        if (moved > 6) this.isDragSelecting = true;
        if (this.isDragSelecting) this.drawSelectionBox(p);
      }

      // 건설 고스트
      if (this.buildingSystem.placingType) {
        this.buildingSystem.drawGhost(p.worldX, p.worldY);
      }

      // 툴팁
      this.updateTooltip(p);
    });

    // 마우스 버튼 UP
    this.input.on('pointerup', (p) => {
      if (p.button === 1 || p.button === 2) {
        this.panState.active = false;
        return;
      }
      if (p.button === 0) {
        this.onLeftUp(p);
      }
    });

    // 휠 줌 (더 빠르게)
    this.input.on('wheel', (p, objs, dx, dy) => {
      const cam = this.cameras.main;
      const factor = dy > 0 ? 0.85 : 1 / 0.85;
      const newZoom = Phaser.Math.Clamp(cam.zoom * factor, 0.5, 4);
      // 마우스 위치 기준으로 줌
      const wx = p.worldX;
      const wy = p.worldY;
      cam.setZoom(newZoom);
      // 줌 후 마우스 위치 보정
      const nwx = p.worldX;
      const nwy = p.worldY;
      cam.scrollX -= nwx - wx;
      cam.scrollY -= nwy - wy;
    });

    // 키보드
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.buildingSystem.placingType) {
        this.buildingSystem.cancelPlacing();
      } else if (this.selectedSurvivors.length) {
        this.clearSelection();
      } else {
        this.scene.start('MenuScene');
      }
    });
    this.input.keyboard.on('keydown-B', () => this.hud.toggleBuildMenu());
  }

  onLeftDown(p) {
    if (this.buildingSystem.placingType) return; // move는 pointerup에서 처리
    this.dragState = { startSX: p.x, startSY: p.y, startWX: p.worldX, startWY: p.worldY };
    this.isDragSelecting = false;
  }

  onLeftUp(p) {
    this.selBoxGfx.clear();

    if (this.buildingSystem.placingType) {
      const { col, row } = this.mapSystem.worldToTile(p.worldX, p.worldY);
      const placingType = this.buildingSystem.placingType;
      const placed = this.buildingSystem.place(col, row, this.resources);
      if (placed) {
        this.showNotification(`${this.buildingSystem.getAllDefs()[placingType]?.name} 완공!`, '#88ff88');
        if (this.buildingSystem.hasRaft) this.hud.showEscapeButton(true);
      } else {
        this.showNotification('설치 불가 또는 자원 부족', '#ff8888');
        this.buildingSystem.cancelPlacing();
      }
      this.dragState = null;
      return;
    }

    if (this.isDragSelecting && this.dragState) {
      // 드래그 선택 완료
      this.finalizeDragSelect(p);
    } else if (this.dragState) {
      // 일반 클릭
      this.handleTileClick(p.worldX, p.worldY);
    }

    this.dragState = null;
    this.isDragSelecting = false;
  }

  drawSelectionBox(p) {
    const x1 = this.dragState.startSX;
    const y1 = this.dragState.startSY;
    const x2 = p.x;
    const y2 = p.y;
    const rx = Math.min(x1, x2);
    const ry = Math.min(y1, y2);
    const rw = Math.abs(x2 - x1);
    const rh = Math.abs(y2 - y1);

    this.selBoxGfx.clear();
    this.selBoxGfx.fillStyle(0x88ff88, 0.08);
    this.selBoxGfx.fillRect(rx, ry, rw, rh);
    this.selBoxGfx.lineStyle(1.5, 0x88ff88, 0.85);
    this.selBoxGfx.strokeRect(rx, ry, rw, rh);
  }

  finalizeDragSelect(p) {
    const minWX = Math.min(this.dragState.startWX, p.worldX);
    const maxWX = Math.max(this.dragState.startWX, p.worldX);
    const minWY = Math.min(this.dragState.startWY, p.worldY);
    const maxWY = Math.max(this.dragState.startWY, p.worldY);

    const inBox = this.survivors.filter(s =>
      s.container.x >= minWX && s.container.x <= maxWX &&
      s.container.y >= minWY && s.container.y <= maxWY
    );

    if (inBox.length > 0) {
      this.setSelection(inBox);
    } else {
      this.clearSelection();
    }
  }

  setSelection(survivors) {
    // 기존 선택 해제
    this.selectedSurvivors.forEach(s => s.select(false));
    this.selectedSurvivors = survivors;
    survivors.forEach(s => s.select(true));
    this.primarySurvivor = survivors[0] || null;
    this.hud.updateSurvivorTray(this.selectedSurvivors, this.primarySurvivor, (s) => {
      this.setPrimary(s);
    });
    if (this.primarySurvivor) this.hud.showDetailPanel(this.primarySurvivor);
    else this.hud.hideDetailPanel();
  }

  setPrimary(survivor) {
    this.primarySurvivor = survivor;
    this.hud.showDetailPanel(survivor);
    this.hud.updateSurvivorTray(this.selectedSurvivors, survivor, (s) => this.setPrimary(s));
  }

  clearSelection() {
    this.selectedSurvivors.forEach(s => s.select(false));
    this.selectedSurvivors = [];
    this.primarySurvivor = null;
    this.hud.hideDetailPanel();
    this.hud.clearSurvivorTray();
  }

  // ─── 생존자 ──────────────────────────────────────

  spawnSurvivor(x, y) {
    const s = new Survivor(this, x, y);
    s.container.on('pointerdown', (p) => {
      p.event.stopPropagation();
      this.setSelection([s]);
    });
    this.survivors.push(s);
    return s;
  }

  // ─── 타일 클릭 명령 ──────────────────────────────

  handleTileClick(wx, wy) {
    if (this.selectedSurvivors.length === 0) return;
    const { col, row } = this.mapSystem.worldToTile(wx, wy);
    const tile = this.mapSystem.getTile(col, row);
    if (!tile) return;

    // 물 타일 → primary만 낚시/물 채집
    if (tile.type === 0 || tile.type === 1) {
      const neighbor = this.mapSystem.getNearestWalkableNeighbor(col, row);
      if (!neighbor) return;
      const s = this.primarySurvivor;
      s.assignGather(col, row, neighbor.wx, neighbor.wy, () => {
        this.resources.water += 2;
        this.showGatherEffect(neighbor.wx, neighbor.wy, 'water');
        if (Math.random() < 0.5) {
          this.resources.food += 1;
          this.showGatherEffect(neighbor.wx, neighbor.wy - 16, 'food');
        }
      }, 4000);
      this.showGatherCursor(neighbor.wx, neighbor.wy);
      return;
    }

    if (!this.mapSystem.isWalkable(col, row)) return;

    // 자원 타일 → primary만 채집
    if (tile.resource && tile.amount > 0) {
      const durations = { wood: 3000, stone: 4000, berry: 2000, coconut: 2500 };
      const tcx = col * this.TILE_SIZE + this.TILE_SIZE / 2;
      const tcy = row * this.TILE_SIZE + this.TILE_SIZE / 2;
      this.primarySurvivor.assignGather(col, row, tcx, tcy, () => {
        const result = this.mapSystem.harvest(col, row);
        if (!result) return;
        if (result.type === 'berry' || result.type === 'coconut') {
          this.resources.food += 1;
          this.showGatherEffect(tcx, tcy, 'food');
          if (result.type === 'coconut') {
            this.resources.water += 1;
            this.showGatherEffect(tcx, tcy - 16, 'water');
          }
        } else {
          this.resources[result.type] += result.gained;
          this.showGatherEffect(tcx, tcy, result.type);
        }
      }, durations[tile.resource] || 3000);
      this.showGatherCursor(tcx, tcy);
      return;
    }

    // 이동 → 전체 선택된 생존자 이동 (살짝 퍼짐)
    const count = this.selectedSurvivors.length;
    this.selectedSurvivors.forEach((s, i) => {
      const offset = count > 1 ? (i - (count - 1) / 2) * 18 : 0;
      s.moveTo(wx + offset, wy + (i % 2 === 0 ? 0 : 10));
    });
    this.showMoveMarker(wx, wy);
  }

  // ─── 툴팁 ────────────────────────────────────────

  updateTooltip(pointer) {
    const { col, row } = this.mapSystem.worldToTile(pointer.worldX, pointer.worldY);
    const tile = this.mapSystem.getTile(col, row);
    if (!tile) { this.hud.hideTooltip(); return; }

    const lines = [];
    const building = this.buildingSystem.getBuildingAt(col, row);
    if (building) {
      lines.push(`${building.def.icon} ${building.def.name}`);
      lines.push(building.def.desc);
      if (building.def.productionInterval) {
        const sec = Math.ceil((building.def.productionInterval - building.timer) / 1000);
        lines.push(`다음 생산: ${sec}초 후`);
      }
    } else {
      const names = ['깊은 바다', '바다', '모래사장', '풀밭', '숲', '바위밭'];
      lines.push(names[tile.type] || '');
      if (tile.resource && tile.amount > 0) {
        const rn = { wood: '목재', stone: '돌', berry: '열매', coconut: '코코넛' };
        lines.push(`${rn[tile.resource] || tile.resource} ×${tile.amount}`);
      }
      if (tile.type === 0 || tile.type === 1) lines.push('낚시·물 채집 가능');
    }
    if (lines.length) this.hud.showTooltip(pointer.x, pointer.y, lines);
    else this.hud.hideTooltip();
  }

  // ─── 난파선 이벤트 ───────────────────────────────

  scheduleShipwreck() {
    this.triggerShipwreck();
    this.time.delayedCall(Phaser.Math.Between(60000, 120000), () => this.scheduleShipwreck());
  }

  triggerShipwreck() {
    const cx = (this.COLS / 2) * this.TILE_SIZE;
    const cy = 15 * this.TILE_SIZE;
    const s = this.spawnSurvivor(cx + Phaser.Math.Between(-80, 80), cy);
    this.showNotification(`⛵ 난파선! ${s.name}이(가) 표류했습니다.`);
  }

  // ─── 자동 소비 ────────────────────────────────────

  autoConsume(survivor) {
    if (survivor.hunger < 20 && this.resources.food > 0) {
      this.resources.food -= 1;
      survivor.hunger = Math.min(100, survivor.hunger + 40);
      if (this.buildingSystem.hasCampfire()) survivor.energy = Math.min(100, survivor.energy + 10);
    }
    if (survivor.thirst < 20 && this.resources.water > 0) {
      this.resources.water -= 1;
      survivor.thirst = Math.min(100, survivor.thirst + 45);
    }
  }

  // ─── 탈출 ─────────────────────────────────────────

  triggerEscape() {
    if (this.escaped) return;
    this.escaped = true;
    this.cameras.main.fade(2000, 0, 0, 0);
    this.time.delayedCall(2000, () => {
      this.scene.start('WinScene', {
        days: this.day,
        survivorCount: this.survivors.length,
        survivorNames: this.survivors.map(s => s.name),
      });
    });
    this.showNotification('탈출 시작! 뗏목을 타고 바다로…', '#ffd700');
  }

  // ─── 밤낮 주기 ────────────────────────────────────

  updateDayNight() {
    const progress = this.dayTimer / this.DAY_DURATION;
    const wasNight = this.isNight;
    this.isNight = progress >= this.NIGHT_START;
    if (this.isNight !== wasNight) {
      this.tweens.add({
        targets: this.nightOverlay,
        alpha: this.isNight ? 0.55 : 0,
        duration: 4000,
        ease: 'Sine.easeInOut',
      });
      if (this.isNight) this.showNotification('🌙 밤이 됐습니다.', '#8888ff');
    }
  }

  // ─── 게임 오버 체크 ───────────────────────────────

  checkGameOver() {
    if (this.gameOver || this.escaped) return;
    if (this.survivors.every(s => s.hp <= 0)) {
      this.gameOver = true;
      this.cameras.main.fade(2000, 20, 0, 0);
      this.time.delayedCall(2000, () => {
        this.scene.start('GameOverScene', { days: this.day, cause: '섬은 모두를 삼켰다' });
      });
    }
    const dead = this.survivors.filter(s => s.hp <= 0);
    dead.forEach(s => {
      if (this.selectedSurvivors.includes(s)) {
        this.setSelection(this.selectedSurvivors.filter(x => x !== s));
      }
      this.showNotification(`💀 ${s.name}이(가) 사망했습니다.`, '#ff4444');
      s.destroy();
    });
    this.survivors = this.survivors.filter(s => s.hp > 0);
  }

  // ─── 비주얼 피드백 ────────────────────────────────

  showMoveMarker(x, y) {
    const m = this.add.circle(x, y, 5, 0xffff00, 0.8).setDepth(20);
    this.tweens.add({ targets: m, alpha: 0, scaleX: 2, scaleY: 2, duration: 500, onComplete: () => m.destroy() });
  }

  showGatherCursor(x, y) {
    const ring = this.add.circle(x, y, 12, 0xffffff, 0).setStrokeStyle(2, 0xffd700).setDepth(20);
    this.tweens.add({ targets: ring, alpha: 0, scaleX: 1.5, scaleY: 1.5, duration: 400, onComplete: () => ring.destroy() });
  }

  showGatherEffect(x, y, type) {
    const icons = { wood: '🪵+1', stone: '🪨+1', food: '🍖+1', water: '💧+1' };
    const label = this.add.text(x, y - 10, icons[type] || '+1', {
      fontSize: '13px', fontFamily: 'monospace', stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets: label, y: y - 42, alpha: 0, duration: 1200, ease: 'Cubic.easeOut', onComplete: () => label.destroy() });
  }

  showNotification(text, color) {
    color = color || '#f0e68c';
    const { width } = this.scale;
    const notif = this.add.text(width / 2, 58, text, {
      fontSize: '14px', color, fontFamily: 'monospace',
      backgroundColor: '#000000cc', padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);
    this.tweens.add({ targets: notif, y: 46, alpha: 0, delay: 3000, duration: 900, onComplete: () => notif.destroy() });
    this.hud.showEventLog(text, color);
  }

  // ─── 메인 업데이트 ────────────────────────────────

  update(time, delta) {
    if (this.gameOver || this.escaped) return;
    const dt = delta / 1000;

    // 낮 시간
    this.dayTimer += dt;
    if (this.dayTimer >= this.DAY_DURATION) {
      this.dayTimer = 0;
      this.day++;
      this.showNotification(`☀ Day ${this.day} 시작`);
    }
    this.updateDayNight();

    // 생존자 업데이트
    for (const s of this.survivors) {
      s.update(delta, this.isNight, this.buildingSystem.hasShelter());
      this.autoConsume(s);
    }

    // 건물 생산
    this.buildingSystem.update(delta, this.resources, (b) => {
      const ts = this.TILE_SIZE;
      this.showGatherEffect(b.col * ts + ts / 2, b.row * ts - 10, b.def.productionType);
    });

    // 이벤트
    this.eventSystem.update(delta, this.survivors, this.resources,
      this.buildingSystem.hasShelter(), (text, color) => this.showNotification(text, color));

    this.checkGameOver();

    // HUD
    this.hud.update(this.resources, this.day, this.isNight, this.survivors.length, this.primarySurvivor);

    // 엣지 스크롤
    this.edgeScroll(dt);

    // 키보드 카메라 이동
    const cam = this.cameras.main;
    const spd = 240 / cam.zoom;
    if (this.cursors.left.isDown)  cam.scrollX -= spd * dt;
    if (this.cursors.right.isDown) cam.scrollX += spd * dt;
    if (this.cursors.up.isDown)    cam.scrollY -= spd * dt;
    if (this.cursors.down.isDown)  cam.scrollY += spd * dt;
  }

  edgeScroll(dt) {
    const EDGE = 50;
    const SPEED = 300;
    const cam = this.cameras.main;
    const { width, height } = this.scale;
    const p = this.input.activePointer;
    if (!p.active) return;

    const spd = SPEED / cam.zoom;
    if (p.x < EDGE)           cam.scrollX -= spd * dt * (1 - p.x / EDGE);
    if (p.x > width - EDGE)   cam.scrollX += spd * dt * (1 - (width - p.x) / EDGE);
    if (p.y < EDGE)            cam.scrollY -= spd * dt * (1 - p.y / EDGE);
    if (p.y > height - EDGE)   cam.scrollY += spd * dt * (1 - (height - p.y) / EDGE);
  }
}
