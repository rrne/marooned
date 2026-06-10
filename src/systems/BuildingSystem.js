const BUILDING_DEFS = {
  campfire: {
    name: '모닥불',
    desc: '주변 생존자 회복 +50%',
    cost: { wood: 3 },
    color: 0xff6600,
    icon: '🔥',
    sandOnly: false,
    nearWater: false,
    isEscape: false,
  },
  shelter: {
    name: '쉼터',
    desc: '야간 에너지 감소 방지',
    cost: { wood: 6, stone: 2 },
    color: 0x8b5e3c,
    icon: '🏕',
    sandOnly: false,
    nearWater: false,
    isEscape: false,
  },
  rainCollector: {
    name: '빗물 수집기',
    desc: '30초마다 💧+1 자동 생산',
    cost: { wood: 4 },
    color: 0x4488cc,
    icon: '💧',
    sandOnly: false,
    nearWater: false,
    isEscape: false,
    productionInterval: 30000,
    productionType: 'water',
  },
  fishingPier: {
    name: '낚시터',
    desc: '25초마다 🍖+1 (물가 필요)',
    cost: { wood: 8 },
    color: 0x6b3a1f,
    icon: '🎣',
    sandOnly: false,
    nearWater: true,
    isEscape: false,
    productionInterval: 25000,
    productionType: 'food',
  },
  raft: {
    name: '뗏목',
    desc: '탈출! 모래사장에만 설치',
    cost: { wood: 20, stone: 5 },
    color: 0xd4a017,
    icon: '⛵',
    sandOnly: true,
    nearWater: false,
    isEscape: true,
  },
};

class BuildingSystem {
  constructor(scene, mapSystem) {
    this.scene = scene;
    this.mapSystem = mapSystem;
    this.buildings = [];
    this.placingType = null;
    this.graphics = scene.add.graphics().setDepth(8);
    this.ghostGraphics = scene.add.graphics().setDepth(9);
    this.labels = [];
    this.hasRaft = false;
    this.hasEscaped = false;
  }

  getDef(type) {
    return BUILDING_DEFS[type];
  }

  getAllDefs() {
    return BUILDING_DEFS;
  }

  canAfford(type, resources) {
    const def = BUILDING_DEFS[type];
    if (!def) return false;
    return Object.entries(def.cost).every(([k, v]) => (resources[k] || 0) >= v);
  }

  isValidPlacement(col, row, type) {
    const tile = this.mapSystem.getTile(col, row);
    if (!tile) return false;
    if (!this.mapSystem.isWalkable(col, row)) return false;
    if (this.getBuildingAt(col, row)) return false;

    const def = BUILDING_DEFS[type];

    if (def.sandOnly && tile.type !== 2) return false;

    if (def.nearWater) {
      const dirs = [{ dc: 0, dr: -1 }, { dc: 0, dr: 1 }, { dc: -1, dr: 0 }, { dc: 1, dr: 0 }];
      const hasWater = dirs.some(({ dc, dr }) => {
        const t = this.mapSystem.getTile(col + dc, row + dr);
        return t && (t.type === 0 || t.type === 1);
      });
      if (!hasWater) return false;
    }

    return true;
  }

  getBuildingAt(col, row) {
    return this.buildings.find(b => b.col === col && b.row === row) || null;
  }

  startPlacing(type) {
    this.placingType = type;
  }

  cancelPlacing() {
    this.placingType = null;
    this.ghostGraphics.clear();
  }

  place(col, row, resources) {
    if (!this.placingType) return false;
    if (!this.canAfford(this.placingType, resources)) return false;
    if (!this.isValidPlacement(col, row, this.placingType)) return false;

    const def = BUILDING_DEFS[this.placingType];
    Object.entries(def.cost).forEach(([k, v]) => { resources[k] -= v; });

    const building = {
      type: this.placingType,
      col,
      row,
      def,
      timer: 0,
    };

    this.buildings.push(building);
    if (def.isEscape) this.hasRaft = true;

    this.drawBuilding(building);
    this.cancelPlacing();
    return true;
  }

  drawBuilding(b) {
    const ts = this.mapSystem.tileSize;
    const x = b.col * ts;
    const y = b.row * ts;

    this.graphics.fillStyle(b.def.color, 0.85);
    this.graphics.fillRect(x + 1, y + 1, ts - 2, ts - 2);
    this.graphics.lineStyle(1, 0xffffff, 0.4);
    this.graphics.strokeRect(x + 1, y + 1, ts - 2, ts - 2);

    const label = this.scene.add.text(x + ts / 2, y + ts / 2, b.def.icon, {
      fontSize: '11px',
    }).setOrigin(0.5).setDepth(9);
    this.labels.push({ building: b, text: label });
  }

  drawGhost(worldX, worldY) {
    if (!this.placingType) return;
    const ts = this.mapSystem.tileSize;
    const col = Math.floor(worldX / ts);
    const row = Math.floor(worldY / ts);
    const valid = this.isValidPlacement(col, row, this.placingType);

    this.ghostGraphics.clear();
    const color = valid ? 0x00ff88 : 0xff4444;
    this.ghostGraphics.fillStyle(color, 0.35);
    this.ghostGraphics.fillRect(col * ts, row * ts, ts - 1, ts - 1);
    this.ghostGraphics.lineStyle(2, color, 0.9);
    this.ghostGraphics.strokeRect(col * ts, row * ts, ts - 1, ts - 1);
  }

  update(delta, resources, onProduce) {
    for (const b of this.buildings) {
      if (!b.def.productionInterval) continue;
      b.timer += delta;
      if (b.timer >= b.def.productionInterval) {
        b.timer = 0;
        resources[b.def.productionType] += 1;
        if (onProduce) onProduce(b);
      }
    }
  }

  hasCampfire() {
    return this.buildings.some(b => b.type === 'campfire');
  }

  hasShelter() {
    return this.buildings.some(b => b.type === 'shelter');
  }

  getRaftPosition() {
    const b = this.buildings.find(b => b.type === 'raft');
    if (!b) return null;
    const ts = this.mapSystem.tileSize;
    return { x: b.col * ts + ts / 2, y: b.row * ts + ts / 2 };
  }
}
