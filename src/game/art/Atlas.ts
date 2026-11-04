import { Pen, seeded } from './Pen';
import { leekCellSize, leekIds, paintLeek } from './leekArt';
import { FX, ITEM_ICONS, PICKUPS, PLAYER_PALS, PROPS, TILE_STYLES, WEAPON_ICONS, paintPlayer } from './itemArt';

export interface AtlasFrame {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ATLAS_SIZE = 2048;
let canvas: HTMLCanvasElement | null = null;
let frames: Record<string, AtlasFrame> = {};
const urlCache = new Map<string, string>();

/** 把全部像素资源绘制并打包到一张精灵图集（减少绘制调用） */
export function buildAtlas() {
  if (canvas) return { canvas, frames };
  canvas = document.createElement('canvas');
  canvas.width = ATLAS_SIZE;
  canvas.height = ATLAS_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  let cx = 1;
  let cy = 1;
  let rowH = 0;
  const add = (name: string, w: number, h: number, draw: (p: Pen) => void) => {
    const cw = w + 2;
    const ch = h + 2;
    if (cx + cw + 1 > ATLAS_SIZE) {
      cx = 1;
      cy += rowH + 1;
      rowH = 0;
    }
    frames[name] = { x: cx, y: cy, w: cw, h: ch };
    // 裁剪到单元格，防止绘制溢出污染相邻帧
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx, cy, cw, ch);
    ctx.clip();
    draw(new Pen(ctx, cx, cy, cw, ch));
    ctx.restore();
    cx += cw + 1;
    rowH = Math.max(rowH, ch);
  };

  // 韭菜与 BOSS：两帧行走
  for (const id of leekIds()) {
    const { w, h } = leekCellSize(id);
    for (let f = 0; f < 2; f++) add(`${id}_${f}`, w, h, (p) => paintLeek(p, id, f));
  }
  // 玩家：待机/移动/攻击/受伤/死亡
  for (const [id, pal] of Object.entries(PLAYER_PALS)) {
    const anims: [string, number][] = [['idle', 2], ['walk', 4], ['attack', 1], ['hurt', 1], ['dead', 3]];
    for (const [anim, n] of anims) {
      for (let f = 0; f < n; f++) add(`player_${id}_${anim}${f}`, 24, 28, (p) => paintPlayer(p, pal, anim, f));
    }
  }
  const outlined = (draw: (p: Pen) => void) => (p: Pen) => {
    draw(p);
    p.outline();
  };
  for (const [id, draw] of Object.entries(WEAPON_ICONS)) add(`w_${id}`, 24, 24, outlined(draw));
  for (const [id, draw] of Object.entries(ITEM_ICONS)) add(`i_${id}`, 24, 24, outlined(draw));
  for (const [id, a] of Object.entries(PICKUPS)) add(`p_${id}`, a.w, a.h, outlined(a.draw));
  for (const [id, a] of Object.entries(FX)) add(id, a.w, a.h, a.draw);
  for (const [id, a] of Object.entries(PROPS)) add(`prop_${id}`, a.w, a.h, a.ground ? a.draw : outlined(a.draw));
  return { canvas, frames };
}

/** Vue UI 需要的图标：从图集裁出单帧转成 dataURL */
export function frameUrl(name: string): string {
  const cached = urlCache.get(name);
  if (cached) return cached;
  const { canvas: atlas, frames: all } = buildAtlas();
  const f = all[name] ?? all['i_unknown'];
  const c = document.createElement('canvas');
  c.width = f.w;
  c.height = f.h;
  c.getContext('2d')!.drawImage(atlas, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  const url = c.toDataURL();
  urlCache.set(name, url);
  return url;
}

/** 生成每张地图的 128×128 地面贴图 */
export function makeTile(index: number): HTMLCanvasElement {
  const st = TILE_STYLES[index % TILE_STYLES.length];
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const p = new Pen(ctx, 0, 0, size, size);
  const r = seeded(1000 + index * 77);
  p.rect(0, 0, size, size, st.base);
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(r() * size);
    const y = Math.floor(r() * size);
    const w = 1 + Math.floor(r() * 3);
    p.rect(x, y, w, 1 + Math.floor(r() * 2), r() < 0.5 ? st.a : st.b);
  }
  switch (st.kind) {
    case 'grass':
      for (let i = 0; i < 26; i++) {
        const x = Math.floor(r() * size);
        const y = Math.floor(r() * size);
        p.rect(x, y, 1, 3, st.mark);
        p.px(x + 2, y + 1, st.mark);
      }
      for (let y = 8; y < size; y += 32) for (let x = 0; x < size; x += 6) p.rect(x, y + (x % 12 ? 0 : 1), 3, 1, st.a);
      break;
    case 'floor':
    case 'tech':
    case 'marble':
      for (let i = 0; i < size; i += 32) {
        p.rect(i, 0, 1, size, st.a);
        p.rect(0, i, size, 1, st.a);
      }
      if (st.kind === 'tech') {
        p.rect(16, 16, 40, 1, st.mark);
        p.rect(56, 16, 1, 32, st.mark);
        p.rect(56, 48, 48, 1, st.mark);
        p.rect(80, 96, 1, 32, st.mark);
        p.px(16, 16, '#7dfff0');
        p.px(104, 48, '#7dfff0');
      } else if (st.kind === 'marble') {
        for (let i = 0; i < 8; i++) {
          const x = r() * size;
          const y = r() * size;
          p.line(x, y, x + 12 * r(), y + 12 * r(), st.mark);
        }
      } else {
        p.rect(8, 40, 18, 6, st.mark);
        p.rect(72, 104, 18, 6, st.mark);
      }
      break;
    case 'dark':
      for (let i = 0; i < 10; i++) {
        const x = r() * size;
        const y = r() * size;
        p.line(x, y, x + (r() - 0.5) * 30, y + r() * 20, st.mark);
      }
      break;
    case 'war':
      for (let i = 0; i < 5; i++) {
        const x = r() * size;
        const y = r() * size;
        p.disc(x, y, 3 + r() * 3, st.mark);
        p.disc(x, y, 1.4, st.a);
      }
      break;
    case 'peak':
      for (let i = 0; i < size; i += 32) {
        p.rect(i, 0, 1, size, st.a);
        p.rect(0, i, size, 1, st.a);
      }
      for (let i = 0; i < 12; i++) p.px(r() * size, r() * size, st.mark);
      break;
  }
  return c;
}

/** 伤害数字用的位图字体：字符按 5×7 点阵绘制 */
export const NUM_CHARS = '0123456789+-!KM.';
const GLYPHS: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
};
export function makeNumFont(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const cw = 7;
  const ch = 9;
  c.width = cw * NUM_CHARS.length;
  c.height = ch;
  const ctx = c.getContext('2d')!;
  const p = new Pen(ctx, 0, 0, c.width, c.height);
  [...NUM_CHARS].forEach((chr, i) => {
    GLYPHS[chr].forEach((row, y) => {
      [...row].forEach((bit, x) => {
        if (bit === '1') p.px(i * cw + x + 1, y + 1, '#ffffff');
      });
    });
  });
  p.outline('#111');
  return c;
}
