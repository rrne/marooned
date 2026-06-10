const TILE = {
  DEEP_WATER: 0,
  WATER: 1,
  SAND: 2,
  GRASS: 3,
  FOREST: 4,
  ROCK: 5,
  TREE: 6,
};

const TILE_COLORS = {
  [TILE.DEEP_WATER]: 0x0a3a6a,
  [TILE.WATER]:      0x1a5a9a,
  [TILE.SAND]:       0xe8d5a0,
  [TILE.GRASS]:      0x4a8a2a,
  [TILE.FOREST]:     0x2a5a1a,
  [TILE.ROCK]:       0x888888,
  [TILE.TREE]:       0x1a4a0a,
};

class MapSystem {
  constructor(scene, cols, rows, tileSize) {
    this.scene = scene;
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.grid = [];
    this.graphics = scene.add.graphics();
  }

  generate() {
    const cx = this.cols / 2;
    const cy = this.rows / 2;
    const maxR = Math.min(cx, cy) * 0.85;

    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        const dx = c - cx;
        const dy = r - cy;
        const noise = (Math.random() - 0.5) * 8;
        const dist = Math.sqrt(dx * dx + dy * dy) + noise;

        if (dist > maxR) {
          this.grid[r][c] = { type: TILE.DEEP_WATER, resource: null, amount: 0 };
        } else if (dist > maxR * 0.85) {
          this.grid[r][c] = { type: TILE.WATER, resource: null, amount: 0 };
        } else if (dist > maxR * 0.75) {
          this.grid[r][c] = { type: TILE.SAND, resource: null, amount: 0 };
        } else if (dist > maxR * 0.65) {
          // 해안 모래사장: 일부에 야자수(코코넛)
          const rnd = Math.random();
          if (rnd < 0.12) {
            this.grid[r][c] = { type: TILE.SAND, resource: 'coconut', amount: Phaser.Math.Between(2, 4) };
          } else {
            this.grid[r][c] = { type: TILE.GRASS, resource: null, amount: 0 };
          }
        } else {
          const rnd = Math.random();
          if (rnd < 0.15) {
            this.grid[r][c] = { type: TILE.ROCK, resource: 'stone', amount: Phaser.Math.Between(3, 6) };
          } else if (rnd < 0.4) {
            this.grid[r][c] = { type: TILE.FOREST, resource: 'wood', amount: Phaser.Math.Between(4, 8) };
          } else if (rnd < 0.52) {
            // 열매 덤불
            this.grid[r][c] = { type: TILE.GRASS, resource: 'berry', amount: Phaser.Math.Between(2, 5) };
          } else {
            this.grid[r][c] = { type: TILE.GRASS, resource: null, amount: 0 };
          }
        }
      }
    }
  }

  harvest(col, row) {
    const tile = this.getTile(col, row);
    if (!tile || !tile.resource || tile.amount <= 0) return null;

    const type = tile.resource;
    const gained = 1;
    tile.amount -= gained;

    if (tile.amount <= 0) {
      tile.resource = null;
      tile.amount = 0;
      tile.type = tile.type === TILE.ROCK ? TILE.GRASS : TILE.GRASS;
    }

    this.redrawTile(col, row);
    return { type, gained };
  }

  redrawTile(col, row) {
    const tile = this.grid[row][col];
    const x = col * this.tileSize;
    const y = row * this.tileSize;
    const color = TILE_COLORS[tile.type] || TILE_COLORS[TILE.GRASS];

    this.graphics.fillStyle(color, 1);
    this.graphics.fillRect(x, y, this.tileSize - 1, this.tileSize - 1);
    this.drawTileResource(tile, x, y);
  }

  drawTileResource(tile, x, y) {
    if (tile.resource === 'wood') {
      this.graphics.fillStyle(0x3a7a0a, 1);
      this.graphics.fillRect(x + 4, y + 2, 8, 12);
      this.graphics.fillStyle(0x2a5a00, 1);
      this.graphics.fillTriangle(x + 8, y, x + 2, y + 8, x + 14, y + 8);
    } else if (tile.resource === 'stone') {
      this.graphics.fillStyle(0x999999, 1);
      this.graphics.fillCircle(x + 8, y + 10, 5);
      this.graphics.fillStyle(0x777777, 1);
      this.graphics.fillCircle(x + 12, y + 7, 4);
    } else if (tile.resource === 'berry') {
      // 열매 덤불: 초록 원 + 빨간 열매
      this.graphics.fillStyle(0x2d6e1a, 1);
      this.graphics.fillCircle(x + 8, y + 10, 6);
      this.graphics.fillStyle(0xcc2222, 1);
      this.graphics.fillCircle(x + 6, y + 8, 2);
      this.graphics.fillCircle(x + 11, y + 9, 2);
      this.graphics.fillCircle(x + 8, y + 13, 2);
    } else if (tile.resource === 'coconut') {
      // 야자수: 줄기 + 잎
      this.graphics.fillStyle(0x8b5e3c, 1);
      this.graphics.fillRect(x + 8, y + 4, 3, 13);
      this.graphics.fillStyle(0x2d7a1a, 1);
      this.graphics.fillTriangle(x + 9, y + 2, x + 2, y + 8, x + 16, y + 8);
      this.graphics.fillStyle(0x8b6914, 1);
      this.graphics.fillCircle(x + 9, y + 14, 3);
    }
  }

  getNearestWalkableNeighbor(col, row) {
    const dirs = [
      { dc: 0, dr: -1 }, { dc: 0, dr: 1 },
      { dc: -1, dr: 0 }, { dc: 1, dr: 0 },
      { dc: -1, dr: -1 }, { dc: 1, dr: -1 },
      { dc: -1, dr: 1 }, { dc: 1, dr: 1 },
    ];
    for (const { dc, dr } of dirs) {
      const nc = col + dc;
      const nr = row + dr;
      if (this.isWalkable(nc, nr)) {
        return {
          col: nc, row: nr,
          wx: nc * this.tileSize + this.tileSize / 2,
          wy: nr * this.tileSize + this.tileSize / 2,
        };
      }
    }
    return null;
  }

  draw() {
    this.graphics.clear();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tile = this.grid[r][c];
        const color = TILE_COLORS[tile.type];
        const x = c * this.tileSize;
        const y = r * this.tileSize;
        this.graphics.fillStyle(color, 1);
        this.graphics.fillRect(x, y, this.tileSize - 1, this.tileSize - 1);

        this.drawTileResource(tile, x, y);
      }
    }
  }

  getTile(col, row) {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return null;
    return this.grid[row][col];
  }

  isWalkable(col, row) {
    const tile = this.getTile(col, row);
    if (!tile) return false;
    return tile.type >= TILE.SAND;
  }

  worldToTile(wx, wy) {
    return {
      col: Math.floor(wx / this.tileSize),
      row: Math.floor(wy / this.tileSize),
    };
  }
}
