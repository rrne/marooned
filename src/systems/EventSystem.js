class EventSystem {
  constructor(scene) {
    this.scene = scene;
    this.elapsed = 0;
    this.nextEventIn = Phaser.Math.Between(50000, 100000);
  }

  update(delta, survivors, resources, hasShelter, onEvent) {
    this.elapsed += delta;
    if (this.elapsed >= this.nextEventIn) {
      this.elapsed = 0;
      this.nextEventIn = Phaser.Math.Between(50000, 100000);
      this.trigger(survivors, resources, hasShelter, onEvent);
    }
  }

  trigger(survivors, resources, hasShelter, cb) {
    const pool = [
      { weight: 3, fn: () => this.storm(survivors, resources, hasShelter, cb) },
      { weight: 2, fn: () => this.disease(survivors, cb) },
      { weight: 2, fn: () => this.wildAnimal(survivors, cb) },
      { weight: 2, fn: () => this.luckyFind(resources, cb) },
      { weight: 1, fn: () => this.rescueSignal(survivors, cb) },
    ];

    const total = pool.reduce((s, e) => s + e.weight, 0);
    let rnd = Math.random() * total;
    for (const e of pool) {
      rnd -= e.weight;
      if (rnd <= 0) { e.fn(); return; }
    }
    pool[0].fn();
  }

  storm(survivors, resources, hasShelter, cb) {
    const foodLoss = hasShelter ? 2 : 4;
    resources.food = Math.max(0, resources.food - foodLoss);
    resources.water += 6;
    if (!hasShelter) {
      for (const s of survivors) s.energy = Math.max(0, s.energy - 25);
    }
    cb(
      hasShelter
        ? '⛈ 폭풍! 쉼터 덕에 피해 감소. 식량 -2, 물 +6'
        : '⛈ 폭풍! 식량 -4, 물 +6, 전원 에너지 -25',
      '#aaccff'
    );
  }

  disease(survivors, cb) {
    if (!survivors.length) return;
    const s = survivors[Math.floor(Math.random() * survivors.length)];
    s.hp = Math.max(1, s.hp - 30);
    s.energy = Math.max(0, s.energy - 20);
    cb(`🤒 ${s.name}이(가) 병에 걸렸다! HP -30`, '#ff8888');
  }

  wildAnimal(survivors, cb) {
    if (!survivors.length) return;
    const s = survivors[Math.floor(Math.random() * survivors.length)];
    s.hp = Math.max(1, s.hp - 20);
    cb(`🐗 야생 동물 습격! ${s.name} HP -20`, '#ffaa44');
  }

  luckyFind(resources, cb) {
    const items = [
      { wood: 6, stone: 0, food: 2, water: 0, msg: '표류 목재 발견! 🪵+6 🍖+2' },
      { wood: 0, stone: 4, food: 0, water: 3, msg: '해변 잔해 발견! 🪨+4 💧+3' },
      { wood: 3, stone: 2, food: 4, water: 2, msg: '난파선 화물 발견! 🪵+3 🪨+2 🍖+4 💧+2' },
    ];
    const item = items[Math.floor(Math.random() * items.length)];
    resources.wood += item.wood;
    resources.stone += item.stone;
    resources.food += item.food;
    resources.water += item.water;
    cb(`🎁 ${item.msg}`, '#88ff88');
  }

  rescueSignal(survivors, cb) {
    for (const s of survivors) {
      s.energy = Math.min(100, s.energy + 30);
      s.hp = Math.min(s.maxHp, s.hp + 15);
      s.hunger = Math.min(100, s.hunger + 15);
    }
    cb('🚢 구조선 목격! 희망으로 전원 회복 (HP·에너지·배고픔)', '#f0e68c');
  }
}
