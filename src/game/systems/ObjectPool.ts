export class ObjectPool<T> {
  private free: T[] = [];
  created = 0;
  constructor(
    private factory: () => T,
    private onRelease?: (t: T) => void,
  ) {}
  get(): T {
    const t = this.free.pop();
    if (t) return t;
    this.created++;
    return this.factory();
  }
  release(t: T) {
    this.onRelease?.(t);
    this.free.push(t);
  }
  get available() {
    return this.free.length;
  }
}

/** 空间网格：每帧重建，范围查询只检查附近格子 */
export class SpatialHash<T extends { x: number; y: number; active: boolean; radius: number }> {
  private cols: number;
  private cells: T[][];
  private used: number[] = [];
  constructor(
    private worldSize: number,
    private cellSize: number,
  ) {
    this.cols = Math.ceil(worldSize / cellSize) + 1;
    this.cells = Array.from({ length: this.cols * this.cols }, () => []);
  }
  private idx(v: number) {
    const i = Math.floor(v / this.cellSize);
    return i < 0 ? 0 : i >= this.cols ? this.cols - 1 : i;
  }
  rebuild(items: T[]) {
    for (let i = 0; i < this.used.length; i++) this.cells[this.used[i]].length = 0;
    this.used.length = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.active) continue;
      const k = this.idx(it.y) * this.cols + this.idx(it.x);
      const cell = this.cells[k];
      if (cell.length === 0) this.used.push(k);
      cell.push(it);
    }
  }
  /** 返回圆内对象。因为命中回调可能再次查询，每次都返回独立数组 */
  query(x: number, y: number, r: number): T[] {
    const out: T[] = [];
    const x0 = this.idx(x - r - 48);
    const x1 = this.idx(x + r + 48);
    const y0 = this.idx(y - r - 48);
    const y1 = this.idx(y + r + 48);
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        const cell = this.cells[cy * this.cols + cx];
        for (let i = 0; i < cell.length; i++) {
          const it = cell[i];
          if (!it.active) continue;
          const dx = it.x - x;
          const dy = it.y - y;
          const rr = r + it.radius;
          if (dx * dx + dy * dy <= rr * rr) out.push(it);
        }
      }
    }
    return out;
  }
  /** 线段范围查询：激光用 */
  queryLine(x0: number, y0: number, x1: number, y1: number, width: number): T[] {
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const seen = new Set<T>();
    const out: T[] = [];
    const steps = Math.ceil(len / (this.cellSize * 0.8));
    const pad = width + 32;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const px = x0 + (x1 - x0) * t;
      const py = y0 + (y1 - y0) * t;
      for (const it of this.query(px, py, pad)) {
        if (seen.has(it)) continue;
        seen.add(it);
        const u = Math.max(0, Math.min(1, ((it.x - x0) * (x1 - x0) + (it.y - y0) * (y1 - y0)) / (len * len)));
        const dx = it.x - (x0 + (x1 - x0) * u);
        const dy = it.y - (y0 + (y1 - y0) * u);
        const rr = width + it.radius;
        if (dx * dx + dy * dy <= rr * rr) out.push(it);
      }
    }
    return out;
  }
  /** 取同格邻居：用于轻量的敌人分离 */
  neighbors(x: number, y: number): T[] {
    return this.cells[this.idx(y) * this.cols + this.idx(x)];
  }
  nearest(x: number, y: number, r: number, filter?: (t: T) => boolean): T | null {
    let best: T | null = null;
    let bd = Infinity;
    for (const it of this.query(x, y, r)) {
      if (filter && !filter(it)) continue;
      const d = (it.x - x) ** 2 + (it.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = it;
      }
    }
    return best;
  }
}
