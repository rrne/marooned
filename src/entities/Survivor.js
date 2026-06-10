const TRAITS = ['용감한', '겁쟁이', '부지런한', '게으른', '낙관적', '비관적', '강인한', '허약한'];
const JOBS = ['어부', '목수', '의사', '농부', '탐험가', '요리사'];

class Survivor {
  constructor(scene, x, y, name) {
    this.scene = scene;
    this.name = name || this.randomName();
    this.trait = TRAITS[Math.floor(Math.random() * TRAITS.length)];
    this.job = JOBS[Math.floor(Math.random() * JOBS.length)];

    // 스탯
    this.hp = 100;
    this.maxHp = 100;
    this.hunger = 100;   // 0 = 굶어죽음
    this.thirst = 100;   // 0 = 탈수
    this.energy = 100;   // 0 = 탈진

    // 상태
    this.isSelected = false;
    this.targetX = x;
    this.targetY = y;
    this.task = null;      // 'move' | 'gather' | null
    this.gatherTarget = null; // { col, row, wx, wy, onArrive }
    this.gatherProgress = 0;
    this.gatherDuration = 3000; // ms
    this.speed = 80;

    // 채집 진행바 (타일 위에 표시)
    this.progressBar = null;
    this.progressBg = null;

    // Phaser 오브젝트
    this.container = scene.add.container(x, y);
    this.body = scene.add.rectangle(0, 0, 14, 18, 0xffcc88);
    this.clothes = scene.add.rectangle(0, 5, 14, 8, this.randomClothColor());
    this.head = scene.add.circle(0, -12, 7, 0xffcc88);
    this.selectionRing = scene.add.circle(0, 0, 14, 0xffff00, 0).setStrokeStyle(2, 0xffff00);

    this.container.add([this.selectionRing, this.body, this.clothes, this.head]);
    this.container.setDepth(10);

    // 이름 라벨
    this.nameLabel = scene.add.text(x, y - 28, this.name, {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(11);

    // 인터랙션
    this.container.setInteractive(
      new Phaser.Geom.Rectangle(-10, -20, 20, 24),
      Phaser.Geom.Rectangle.Contains
    );
  }

  randomName() {
    const first = ['김', '이', '박', '최', '정', '한', '오', '장', '윤', '임'];
    const last = ['민준', '서연', '지훈', '수진', '현우', '지은', '태양', '하늘', '바다', '강'];
    return first[Math.floor(Math.random() * first.length)] + last[Math.floor(Math.random() * last.length)];
  }

  randomClothColor() {
    const colors = [0x4466aa, 0xaa4444, 0x44aa44, 0xaaaa44, 0x884422];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  select(val) {
    this.isSelected = val;
    this.selectionRing.setFillStyle(val ? 0xffff00 : 0x000000, val ? 0.2 : 0);
  }

  moveTo(wx, wy) {
    this.cancelGather();
    this.targetX = wx;
    this.targetY = wy;
    this.task = 'move';
  }

  assignGather(col, row, wx, wy, onComplete, duration) {
    this.cancelGather();
    this.targetX = wx;
    this.targetY = wy;
    this.task = 'gather';
    this.gatherProgress = 0;
    this.gatherDuration = duration || 3000;
    this.gatherTarget = { col, row, wx, wy, onComplete };
  }

  cancelGather() {
    this.gatherTarget = null;
    this.gatherProgress = 0;
    this.destroyProgressBar();
  }

  destroyProgressBar() {
    if (this.progressBg) { this.progressBg.destroy(); this.progressBg = null; }
    if (this.progressBar) { this.progressBar.destroy(); this.progressBar = null; }
  }

  showProgressBar(wx, wy) {
    this.destroyProgressBar();
    this.progressBg = this.scene.add.rectangle(wx, wy - 14, 18, 4, 0x333333).setDepth(15);
    this.progressBar = this.scene.add.rectangle(wx - 9, wy - 14, 0, 4, 0x00ff88).setOrigin(0, 0.5).setDepth(16);
  }

  updateProgressBar(pct) {
    if (this.progressBar) this.progressBar.width = 18 * pct;
  }

  update(delta) {
    const dt = delta / 1000;

    // 니즈 감소
    this.hunger -= dt * 1.5;
    this.thirst -= dt * 2.5;
    this.energy -= dt * 0.8;

    this.hunger = Math.max(0, this.hunger);
    this.thirst = Math.max(0, this.thirst);
    this.energy = Math.max(0, this.energy);

    // 굶거나 탈수시 hp 감소
    if (this.hunger <= 0 || this.thirst <= 0) {
      this.hp -= dt * 3;
    }
    this.hp = Math.min(this.hp, this.maxHp);

    // 이동
    const dx = this.targetX - this.container.x;
    const dy = this.targetY - this.container.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 4) {
      const spd = this.speed * (this.energy < 20 ? 0.4 : 1);
      this.container.x += (dx / dist) * spd * dt;
      this.container.y += (dy / dist) * spd * dt;
    } else if (this.task === 'move') {
      this.task = null;
    } else if (this.task === 'gather' && this.gatherTarget) {
      // 목표 타일에 도착 → 채집 진행
      this.gatherProgress += delta;
      const pct = Math.min(this.gatherProgress / this.gatherDuration, 1);

      if (!this.progressBar) {
        this.showProgressBar(this.gatherTarget.wx, this.gatherTarget.wy);
      }
      this.updateProgressBar(pct);

      if (pct >= 1) {
        const cb = this.gatherTarget.onComplete;
        this.cancelGather();
        this.task = null;
        if (cb) cb();
      }
    }

    // 라벨 따라가기
    this.nameLabel.setPosition(this.container.x, this.container.y - 28);
  }

  getStatusColor() {
    const worst = Math.min(this.hp, this.hunger, this.thirst, this.energy);
    if (worst < 20) return '#ff4444';
    if (worst < 50) return '#ffaa44';
    return '#44ff88';
  }

  destroy() {
    this.cancelGather();
    this.container.destroy();
    this.nameLabel.destroy();
  }
}
