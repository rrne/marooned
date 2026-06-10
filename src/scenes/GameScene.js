class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    const TILE_SIZE = 20;
    const COLS = 100;
    const ROWS = 100;

    // 카메라 설정
    this.cameras.main.setBounds(0, 0, COLS * TILE_SIZE, ROWS * TILE_SIZE);
    this.cameras.main.setZoom(1.5);
    this.cameras.main.centerOn((COLS / 2) * TILE_SIZE, (ROWS / 2) * TILE_SIZE);

    // 맵 생성
    this.mapSystem = new MapSystem(this, COLS, ROWS, TILE_SIZE);
    this.mapSystem.generate();
    this.mapSystem.draw();

    // 게임 상태
    this.resources = { wood: 10, stone: 5, food: 20, water: 30 };
    this.survivors = [];
    this.selectedSurvivor = null;
    this.day = 1;
    this.dayTimer = 0;
    this.DAY_DURATION = 120; // 120초 = 하루

    // 초기 생존자 3명 생성 (섬 중앙 근처)
    const cx = (COLS / 2) * TILE_SIZE;
    const cy = (ROWS / 2) * TILE_SIZE;
    this.spawnSurvivor(cx - 30, cy);
    this.spawnSurvivor(cx, cy - 20);
    this.spawnSurvivor(cx + 30, cy + 10);

    // HUD
    this.hud = new HUD(this);

    // 입력: 생존자 클릭 & 이동 명령
    this.input.on('pointerdown', (pointer) => this.handleClick(pointer));

    // 카메라 드래그
    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown && pointer.button === 2) {
        this.cameras.main.scrollX -= pointer.velocity.x / this.cameras.main.zoom;
        this.cameras.main.scrollY -= pointer.velocity.y / this.cameras.main.zoom;
      }
    });

    // 스크롤 줌
    this.input.on('wheel', (pointer, objs, dx, dy) => {
      const zoom = this.cameras.main.zoom - dy * 0.001;
      this.cameras.main.setZoom(Phaser.Math.Clamp(zoom, 0.8, 3));
    });

    // ESC → 메뉴
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'));

    // 난파선 이벤트: 첫 이벤트 30초 후
    this.time.delayedCall(30000, () => this.triggerShipwreck());
  }

  spawnSurvivor(x, y) {
    const s = new Survivor(this, x, y);
    s.container.on('pointerdown', (pointer) => {
      pointer.event.stopPropagation();
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

  handleClick(pointer) {
    if (pointer.button !== 0) return;

    if (!this.selectedSurvivor) return;

    const wx = pointer.worldX;
    const wy = pointer.worldY;
    const { col, row } = this.mapSystem.worldToTile(wx, wy);
    const tile = this.mapSystem.getTile(col, row);

    if (!tile || !this.mapSystem.isWalkable(col, row)) return;

    const TILE_SIZE = this.mapSystem.tileSize;
    const survivor = this.selectedSurvivor;

    // 물 타일 클릭 → 낚시 + 물 채집 (인접 육지로 이동)
    if (tile.type === 1 || tile.type === 0) {
      const neighbor = this.mapSystem.getNearestWalkableNeighbor(col, row);
      if (!neighbor) return;
      const tx = neighbor.wx;
      const ty = neighbor.wy;

      survivor.assignGather(col, row, tx, ty, () => {
        // 물 +2, 50% 확률로 물고기(식량) +1
        this.resources.water += 2;
        this.showGatherEffect(tx, ty, 'water');
        if (Math.random() < 0.5) {
          this.resources.food += 1;
          this.showGatherEffect(tx, ty - 16, 'food');
        }
      }, 4000);

      this.showGatherCursor(tx, ty);
      return;
    }

    // 자원 타일 클릭 → 채집 명령
    if (tile.resource && tile.amount > 0) {
      const tileCenterX = col * TILE_SIZE + TILE_SIZE / 2;
      const tileCenterY = row * TILE_SIZE + TILE_SIZE / 2;
      const durations = { wood: 3000, stone: 4000, berry: 2000, coconut: 2500 };
      const duration = durations[tile.resource] || 3000;

      survivor.assignGather(col, row, tileCenterX, tileCenterY, () => {
        const result = this.mapSystem.harvest(col, row);
        if (!result) return;

        if (result.type === 'berry') {
          this.resources.food += result.gained;
          this.showGatherEffect(tileCenterX, tileCenterY, 'food');
        } else if (result.type === 'coconut') {
          this.resources.food += 1;
          this.resources.water += 1;
          this.showGatherEffect(tileCenterX, tileCenterY, 'food');
          this.showGatherEffect(tileCenterX, tileCenterY - 16, 'water');
        } else {
          this.resources[result.type] += result.gained;
          this.showGatherEffect(tileCenterX, tileCenterY, result.type);
        }
      }, duration);

      this.showGatherCursor(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);
    } else {
      // 일반 이동
      survivor.moveTo(wx, wy);
      this.showMoveMarker(wx, wy);
    }
  }

  showGatherCursor(x, y) {
    const ring = this.add.circle(x, y, 12, 0xffffff, 0).setStrokeStyle(2, 0xffd700).setDepth(20);
    this.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 400,
      onComplete: () => ring.destroy(),
    });
  }

  showGatherEffect(x, y, type) {
    const icons = { wood: '🪵+1', stone: '🪨+1', food: '🍖+1', water: '💧+1', berry: '🍓+1', coconut: '🥥+1' };
    const icon = icons[type] || '+1';
    const label = this.add.text(x, y - 10, icon, {
      fontSize: '13px',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: label,
      y: y - 40,
      alpha: 0,
      duration: 1200,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  showMoveMarker(x, y) {
    const marker = this.add.circle(x, y, 5, 0xffff00, 0.8).setDepth(20);
    this.tweens.add({
      targets: marker,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 500,
      onComplete: () => marker.destroy(),
    });
  }

  autoConsume(survivor) {
    // 배고픔 < 35 이면 자동으로 식량 소비
    if (survivor.hunger < 35 && this.resources.food > 0) {
      this.resources.food -= 1;
      survivor.hunger = Math.min(100, survivor.hunger + 35);
      survivor.energy = Math.min(100, survivor.energy + 10);
    }
    // 갈증 < 35 이면 자동으로 물 소비
    if (survivor.thirst < 35 && this.resources.water > 0) {
      this.resources.water -= 1;
      survivor.thirst = Math.min(100, survivor.thirst + 40);
    }
  }

  triggerShipwreck() {
    const COLS = 100;
    const TILE_SIZE = 20;

    // 해안선 근처에 새 생존자 표류
    const cx = (COLS / 2) * TILE_SIZE;
    const cy = 15 * TILE_SIZE;
    const newSurvivor = this.spawnSurvivor(cx + Phaser.Math.Between(-60, 60), cy);

    // 알림
    this.showNotification(`난파선 발견! ${newSurvivor.name}이(가) 섬에 표류했습니다.`);

    // 다음 난파선 이벤트: 60~120초 후
    this.time.delayedCall(
      Phaser.Math.Between(60000, 120000),
      () => this.triggerShipwreck()
    );
  }

  showNotification(text) {
    const { width } = this.scale;
    const notif = this.add.text(width / 2, 60, text, {
      fontSize: '14px',
      color: '#f0e68c',
      fontFamily: 'monospace',
      backgroundColor: '#000000cc',
      padding: { x: 12, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200);

    this.tweens.add({
      targets: notif,
      y: 50,
      alpha: 0,
      delay: 3000,
      duration: 1000,
      onComplete: () => notif.destroy(),
    });
  }

  update(time, delta) {
    // 낮 시간 경과
    this.dayTimer += delta / 1000;
    if (this.dayTimer >= this.DAY_DURATION) {
      this.dayTimer = 0;
      this.day++;
      this.showNotification(`Day ${this.day} 시작`);
    }

    // 생존자 업데이트 + 자동 소비
    for (const s of this.survivors) {
      s.update(delta);
      this.autoConsume(s);
    }

    // HUD 업데이트
    this.hud.update(this.resources, this.day);

    // 카메라 키보드 이동
    const cam = this.cameras.main;
    const spd = 200 / cam.zoom;
    const cursors = this.input.keyboard.createCursorKeys();
    if (cursors.left.isDown) cam.scrollX -= spd * (delta / 1000);
    if (cursors.right.isDown) cam.scrollX += spd * (delta / 1000);
    if (cursors.up.isDown) cam.scrollY -= spd * (delta / 1000);
    if (cursors.down.isDown) cam.scrollY += spd * (delta / 1000);
  }
}
