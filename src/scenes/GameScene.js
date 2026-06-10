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
    this.selectedSurvivor = null;
    this.day = 1;
    this.dayTimer = 0;
    this.DAY_DURATION = 120;
    this.NIGHT_START = 0.65;   // 전체 주기의 65%부터 밤
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
    this.input.on('pointerdown', (p) => this.handleClick(p));
    this.input.on('pointermove', (p) => this.handlePointerMove(p));

    // 우클릭 카메라 드래그
    this.input.on('pointermove', (p) => {
      if (p.isDown && p.button === 2) {
        this.cameras.main.scrollX -= p.velocity.x / this.cameras.main.zoom;
        this.cameras.main.scrollY -= p.velocity.y / this.cameras.main.zoom;
      }
    });

    // 마우스 휠 줌
    this.input.on('wheel', (p, objs, dx, dy) => {
      const zoom = this.cameras.main.zoom - dy * 0.001;
      this.cameras.main.setZoom(Phaser.Math.Clamp(zoom, 0.8, 3));
    });

    this.input.keyboard.on('keydown-ESC', () => {
      if (this.buildingSystem.placingType) {
        this.buildingSystem.cancelPlacing();
      } else {
        this.scene.start('MenuScene');
      }
    });

    this.input.keyboard.on('keydown-B', () => this.hud.toggleBuildMenu());

    // 난파선 이벤트 스케줄
    this.time.delayedCall(30000, () => this.scheduleShipwreck());
  }

  // ─── 생존자 ──────────────────────────────────────

  spawnSurvivor(x, y) {
    const s = new Survivor(this, x, y);
    s.container.on('pointerdown', (p) => {
      p.event.stopPropagation();
      this.selectSurvivor(s);
    });
    this.survivors.push(s);
    return s;
  }

  selectSurvivor(survivor) {
    if (this.selectedSurvivor) this.selectedSurvivor.select(false);
    this.selectedSurvivor = survivor;
    survivor.select(true);
    this.hud.showSurvivorPanel(survivor);
  }

  // ─── 클릭 처리 ───────────────────────────────────

  handlePointerMove(pointer) {
    if (this.buildingSystem.placingType) {
      this.buildingSystem.drawGhost(pointer.worldX, pointer.worldY);
    }
  }

  handleClick(pointer) {
    if (pointer.button !== 0) return;

    const wx = pointer.worldX;
    const wy = pointer.worldY;
    const { col, row } = this.mapSystem.worldToTile(wx, wy);
    const tile = this.mapSystem.getTile(col, row);

    // 건설 모드
    if (this.buildingSystem.placingType) {
      const placingType = this.buildingSystem.placingType;
      const placed = this.buildingSystem.place(col, row, this.resources);
      if (placed) {
        const name = this.buildingSystem.getAllDefs()[placingType]?.name || '건물';
        this.showNotification(`${name} 완공!`, '#88ff88');
        if (this.buildingSystem.hasRaft) {
          this.hud.showEscapeButton(true);
        }
      } else {
        this.showNotification('설치 불가 또는 자원 부족', '#ff8888');
        this.buildingSystem.cancelPlacing();
      }
      return;
    }

    if (!this.selectedSurvivor) return;
    if (!tile) return;

    const survivor = this.selectedSurvivor;

    // 물 타일 → 낚시 + 물 채집
    if (tile.type === 0 || tile.type === 1) {
      const neighbor = this.mapSystem.getNearestWalkableNeighbor(col, row);
      if (!neighbor) return;
      survivor.assignGather(col, row, neighbor.wx, neighbor.wy, () => {
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

    // 자원 타일 → 채집
    if (tile.resource && tile.amount > 0) {
      const durations = { wood: 3000, stone: 4000, berry: 2000, coconut: 2500 };
      const tileCX = col * this.TILE_SIZE + this.TILE_SIZE / 2;
      const tileCY = row * this.TILE_SIZE + this.TILE_SIZE / 2;

      survivor.assignGather(col, row, tileCX, tileCY, () => {
        const result = this.mapSystem.harvest(col, row);
        if (!result) return;
        if (result.type === 'berry') {
          this.resources.food += result.gained;
          this.showGatherEffect(tileCX, tileCY, 'food');
        } else if (result.type === 'coconut') {
          this.resources.food += 1;
          this.resources.water += 1;
          this.showGatherEffect(tileCX, tileCY, 'food');
          this.showGatherEffect(tileCX, tileCY - 16, 'water');
        } else {
          this.resources[result.type] += result.gained;
          this.showGatherEffect(tileCX, tileCY, result.type);
        }
      }, durations[tile.resource] || 3000);

      this.showGatherCursor(col * this.TILE_SIZE + this.TILE_SIZE / 2, row * this.TILE_SIZE + this.TILE_SIZE / 2);
      return;
    }

    // 일반 이동
    survivor.moveTo(wx, wy);
    this.showMoveMarker(wx, wy);
  }

  // ─── 이벤트 & 난파선 ──────────────────────────────

  scheduleShipwreck() {
    this.triggerShipwreck();
    this.time.delayedCall(Phaser.Math.Between(60000, 120000), () => this.scheduleShipwreck());
  }

  triggerShipwreck() {
    const cx = (this.COLS / 2) * this.TILE_SIZE;
    const cy = 15 * this.TILE_SIZE;
    const newSurvivor = this.spawnSurvivor(cx + Phaser.Math.Between(-80, 80), cy);
    this.showNotification(`⛵ 난파선 발견! ${newSurvivor.name}이(가) 표류했습니다.`);
  }

  // ─── 자동 소비 ────────────────────────────────────

  autoConsume(survivor) {
    if (survivor.hunger < 35 && this.resources.food > 0) {
      this.resources.food -= 1;
      survivor.hunger = Math.min(100, survivor.hunger + 35);
      if (this.buildingSystem.hasCampfire()) {
        survivor.energy = Math.min(100, survivor.energy + 8);
      }
    }
    if (survivor.thirst < 35 && this.resources.water > 0) {
      this.resources.water -= 1;
      survivor.thirst = Math.min(100, survivor.thirst + 40);
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

  updateDayNight(dt) {
    const progress = this.dayTimer / this.DAY_DURATION;
    const wasNight = this.isNight;
    this.isNight = progress >= this.NIGHT_START;

    if (this.isNight !== wasNight) {
      const targetAlpha = this.isNight ? 0.55 : 0;
      this.tweens.add({
        targets: this.nightOverlay,
        alpha: targetAlpha,
        duration: 4000,
        ease: 'Sine.easeInOut',
      });
      if (this.isNight) {
        this.showNotification('🌙 밤이 됐습니다. 조심하세요.', '#8888ff');
      }
    }
  }

  // ─── 게임 오버 체크 ───────────────────────────────

  checkGameOver() {
    if (this.gameOver || this.escaped) return;
    const allDead = this.survivors.every(s => s.hp <= 0);
    if (allDead) {
      this.gameOver = true;
      this.cameras.main.fade(2000, 20, 0, 0);
      this.time.delayedCall(2000, () => {
        this.scene.start('GameOverScene', {
          days: this.day,
          cause: '배고픔, 질병, 자연의 힘에 굴복했다',
        });
      });
    }

    // 죽은 생존자 제거
    const dead = this.survivors.filter(s => s.hp <= 0);
    dead.forEach(s => {
      if (this.selectedSurvivor === s) {
        this.selectedSurvivor = null;
        this.hud.hideSurvivorPanel();
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

    this.tweens.add({
      targets: notif, y: 46, alpha: 0, delay: 3000, duration: 900,
      onComplete: () => notif.destroy(),
    });

    this.hud.showEventLog(text, color);
  }

  // ─── 메인 업데이트 ────────────────────────────────

  update(time, delta) {
    if (this.gameOver || this.escaped) return;

    // 낮 시간
    this.dayTimer += delta / 1000;
    if (this.dayTimer >= this.DAY_DURATION) {
      this.dayTimer = 0;
      this.day++;
      this.showNotification(`☀ Day ${this.day} 시작`);
    }

    this.updateDayNight(delta / 1000);

    // 생존자 업데이트
    for (const s of this.survivors) {
      s.update(delta, this.isNight, this.buildingSystem.hasShelter());
      this.autoConsume(s);
    }

    // 건물 생산 업데이트
    this.buildingSystem.update(delta, this.resources, (b) => {
      const ts = this.TILE_SIZE;
      this.showGatherEffect(b.col * ts + ts / 2, b.row * ts - 10, b.def.productionType);
    });

    // 이벤트 시스템
    this.eventSystem.update(
      delta, this.survivors, this.resources,
      this.buildingSystem.hasShelter(),
      (text, color) => this.showNotification(text, color)
    );

    // 게임오버 체크
    this.checkGameOver();

    // HUD 업데이트
    this.hud.update(this.resources, this.day, this.isNight);

    // 카메라 키보드 이동
    const cam = this.cameras.main;
    const spd = 200 / cam.zoom;
    const dt = delta / 1000;
    if (this.cursors.left.isDown) cam.scrollX -= spd * dt;
    if (this.cursors.right.isDown) cam.scrollX += spd * dt;
    if (this.cursors.up.isDown) cam.scrollY -= spd * dt;
    if (this.cursors.down.isDown) cam.scrollY += spd * dt;
  }
}
