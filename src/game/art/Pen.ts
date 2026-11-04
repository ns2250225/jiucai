// 像素画笔：所有美术资源都通过它逐像素绘制
export class Pen {
  constructor(
    public ctx: CanvasRenderingContext2D,
    public ox: number,
    public oy: number,
    public w: number,
    public h: number,
  ) {}

  rect(x: number, y: number, w: number, h: number, c: string) {
    this.ctx.fillStyle = c;
    this.ctx.fillRect(this.ox + Math.round(x), this.oy + Math.round(y), Math.round(w), Math.round(h));
  }
  px(x: number, y: number, c: string) {
    this.rect(x, y, 1, 1, c);
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string, t = 1) {
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const n = Math.max(dx, dy, 1);
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = y0 + ((y1 - y0) * i) / n;
      this.rect(x, y, t, t, c);
    }
  }
  disc(cx: number, cy: number, r: number, c: string) {
    for (let y = -Math.ceil(r); y <= r; y++) {
      for (let x = -Math.ceil(r); x <= r; x++) {
        if (x * x + y * y <= r * r + 0.4) this.px(cx + x, cy + y, c);
      }
    }
  }
  ring(cx: number, cy: number, r: number, c: string, t = 1) {
    for (let y = -Math.ceil(r); y <= r; y++) {
      for (let x = -Math.ceil(r); x <= r; x++) {
        const d = Math.sqrt(x * x + y * y);
        if (d <= r + 0.4 && d > r - t + 0.1) this.px(cx + x, cy + y, c);
      }
    }
  }
  arc(cx: number, cy: number, r: number, a0: number, a1: number, c: string, t = 1) {
    const steps = Math.max(8, Math.ceil(Math.abs(a1 - a0) * r * 1.5));
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      this.rect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, t, t, c);
    }
  }
  /** 给不透明像素勾一圈深色描边，统一像素风格 */
  outline(c = '#14130f') {
    const { ctx, ox, oy, w, h } = this;
    const img = ctx.getImageData(ox, oy, w, h);
    const d = img.data;
    const solid = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 40;
    const pts: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (solid(x, y)) continue;
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) pts.push(x, y);
      }
    }
    for (let i = 0; i < pts.length; i += 2) this.px(pts[i], pts[i + 1], c);
  }
}

/** 确定性随机，让每次生成的图集完全一致 */
export function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
