import { Pen } from './Pen';

export interface Pal {
  body: string;
  light: string;
  dark: string;
  leaf: string;
  leaf2: string;
  root: string;
}
export const GREEN: Pal = { body: '#79d34c', light: '#a6ea6c', dark: '#54a838', leaf: '#3f9e2c', leaf2: '#58c23a', root: '#f3f6e6' };
const GOLD: Pal = { body: '#f3c63c', light: '#ffe67a', dark: '#c6922a', leaf: '#c6922a', leaf2: '#f0b92e', root: '#fff5c4' };
const PALE: Pal = { body: '#b9cf8b', light: '#d5e3ad', dark: '#8fa369', leaf: '#6f8a4e', leaf2: '#8fa369', root: '#efe9d4' };
const DEEP: Pal = { body: '#4fa33e', light: '#6cc252', dark: '#37772b', leaf: '#2a6a24', leaf2: '#37882c', root: '#dfe6c8' };
const BRIGHT: Pal = { body: '#9ae64e', light: '#c6f57f', dark: '#6fb935', leaf: '#4fb22e', leaf2: '#72d03e', root: '#fbfff0' };
const ANCIENT: Pal = { body: '#7a8f4a', light: '#9db063', dark: '#566635', leaf: '#4c5a2c', leaf2: '#64743a', root: '#cfc29a' };
const STEEL: Pal = { body: '#9fb2bb', light: '#c9d7de', dark: '#6f818a', leaf: '#5c6c75', leaf2: '#7f929b', root: '#dde6ea' };

export interface LeekOpt {
  w: number;
  h: number;
  pal?: Pal;
  face?: 'calm' | 'angry' | 'sad' | 'smug' | 'scared' | 'dead';
  frame: number;
  noLegs?: boolean;
  noArms?: boolean;
}
export interface LeekAnchors {
  cx: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  eyeY: number;
  leafH: number;
  bob: number;
}

export function drawLeek(p: Pen, o: LeekOpt): LeekAnchors {
  const pal = o.pal ?? GREEN;
  const cx = Math.floor(p.w / 2);
  const bw = o.w;
  const leafH = Math.max(5, Math.round(o.h * 0.34));
  const bob = o.frame === 1 ? 1 : 0;
  const top = leafH + 1 + bob;
  const legH = o.noLegs ? 0 : 3;
  const footY = p.h - 2;
  const bottom = footY - legH;
  const left = cx - Math.floor(bw / 2);
  const right = left + bw;
  const sway = o.frame === 1 ? 1 : 0;

  // 叶片
  p.rect(cx - 1, 1 + bob, 2, top + 1 - bob, pal.leaf2);
  p.px(cx - 1, 1 + bob, pal.light);
  p.line(cx - 2, top, left - 1 - sway, 3 + bob, pal.leaf, 2);
  p.line(cx + 1, top, right - 1 + sway, 3 + bob, pal.leaf, 2);
  p.line(cx - 2, top - 1, left + 1 - sway, 5 + bob, pal.leaf2);
  p.line(cx + 1, top - 1, right - 2 + sway, 5 + bob, pal.leaf2);

  // 身体（上绿下白，保留圆角）
  const bodyH = bottom - top;
  const rootStart = top + Math.round(bodyH * 0.68);
  p.rect(left, top, bw, rootStart - top, pal.body);
  p.rect(left, rootStart, bw, bottom - rootStart, pal.root);
  p.rect(left, top, 1, rootStart - top, pal.light);
  p.rect(right - 1, top, 1, rootStart - top, pal.dark);
  p.rect(right - 1, rootStart, 1, bottom - rootStart, '#c9ccb8');
  for (let x = left + 1; x < right - 1; x += 2) p.px(x, rootStart - 1, pal.light);
  p.ctx.clearRect(p.ox + left, p.oy + top, 1, 1);
  p.ctx.clearRect(p.ox + right - 1, p.oy + top, 1, 1);
  p.ctx.clearRect(p.ox + left, p.oy + bottom - 1, 1, 1);
  p.ctx.clearRect(p.ox + right - 1, p.oy + bottom - 1, 1, 1);

  // 根须与腿
  if (!o.noLegs) {
    const a = o.frame === 0 ? 0 : -1;
    const b = o.frame === 0 ? -1 : 0;
    p.rect(cx - 3, bottom, 2, 3 + a, pal.root);
    p.rect(cx + 1, bottom, 2, 3 + b, pal.root);
    p.px(cx - 4, bottom + 2 + a, pal.root);
    p.px(cx + 3, bottom + 2 + b, pal.root);
  } else {
    for (let x = left + 1; x < right - 1; x += 2) p.px(x, bottom, pal.root);
  }

  // 手臂
  if (!o.noArms) {
    const ay = top + Math.round(bodyH * 0.45) + (o.frame === 1 ? 1 : 0);
    p.rect(left - 1, ay, 1, 3, pal.dark);
    p.rect(right, ay + (o.frame === 1 ? -1 : 0), 1, 3, pal.dark);
  }

  // 脸
  const eyeY = top + Math.max(1, Math.round(bodyH * 0.12));
  const ex0 = cx - Math.max(2, Math.floor(bw / 4)) - 1;
  const ex1 = cx + Math.max(2, Math.floor(bw / 4)) - 1;
  const face = o.face ?? 'calm';
  if (face === 'dead') {
    p.px(ex0, eyeY, '#111');
    p.px(ex0 + 1, eyeY + 1, '#111');
    p.px(ex0 + 1, eyeY, '#111');
    p.px(ex1, eyeY, '#111');
    p.px(ex1 + 1, eyeY + 1, '#111');
    p.px(ex1 + 1, eyeY, '#111');
  } else {
    p.rect(ex0, eyeY, 2, 2, '#fff');
    p.rect(ex1, eyeY, 2, 2, '#fff');
    p.px(ex0 + 1, eyeY + 1, '#111');
    p.px(ex1, eyeY + 1, '#111');
  }
  if (face === 'angry') {
    p.line(ex0 - 1, eyeY - 1, ex0 + 1, eyeY, '#23401a');
    p.line(ex1 + 2, eyeY - 1, ex1, eyeY, '#23401a');
  } else if (face === 'sad') {
    p.line(ex0 - 1, eyeY, ex0 + 1, eyeY - 1, '#23401a');
    p.line(ex1 + 2, eyeY, ex1, eyeY - 1, '#23401a');
  }
  const my = eyeY + 3;
  if (face === 'angry' || face === 'sad') {
    p.rect(cx - 1, my, 2, 1, '#23401a');
    p.px(cx - 2, my + 1, '#23401a');
    p.px(cx + 1, my + 1, '#23401a');
  } else if (face === 'smug') {
    p.rect(cx - 1, my, 3, 1, '#23401a');
    p.px(cx + 2, my - 1, '#23401a');
  } else if (face === 'scared') {
    p.rect(cx - 1, my, 2, 2, '#23401a');
  } else {
    p.rect(cx - 1, my, 2, 1, '#23401a');
  }
  return { cx, left, right, top, bottom, eyeY, leafH, bob };
}

type Acc = (p: Pen, a: LeekAnchors, frame: number) => void;
interface LeekSpec {
  w: number;
  h: number;
  cw?: number;
  ch?: number;
  pal?: Pal;
  face?: LeekOpt['face'];
  acc?: Acc;
  noLegs?: boolean;
  noArms?: boolean;
  custom?: (p: Pen, frame: number) => void;
}

const suit = (c: string, c2: string, tie: string): Acc => (p, a) => {
  const y = a.top + Math.round((a.bottom - a.top) * 0.42);
  p.rect(a.left, y, a.right - a.left, a.bottom - y, c);
  p.rect(a.left, y, 1, a.bottom - y, c2);
  p.rect(a.cx - 1, y, 2, 2, '#f7f7f0');
  p.rect(a.cx - 1, y + 1, 2, 4, tie);
};
const crown = (p: Pen, a: LeekAnchors) => {
  const y = a.top - 5;
  const w = 8;
  const x = a.cx - w / 2;
  p.rect(x, y + 2, w, 3, '#ffd23e');
  p.px(x, y + 1, '#ffd23e');
  p.px(x + 3, y, '#ffd23e');
  p.px(x + 4, y, '#ffd23e');
  p.px(x + w - 1, y + 1, '#ffd23e');
  p.px(x + 3, y + 3, '#e0404a');
  p.px(x + 1, y + 3, '#4a9cff');
  p.px(x + 6, y + 3, '#4a9cff');
};

const SPECS: Record<string, LeekSpec> = {
  leek_basic: { w: 10, h: 24 },
  leek_newbie: {
    w: 8, h: 18, pal: BRIGHT, face: 'scared',
    acc: (p, a) => { p.rect(a.cx - 3, a.top - 2, 6, 2, '#f0d24a'); p.rect(a.cx + 3, a.top - 1, 2, 1, '#f0d24a'); },
  },
  leek_old: {
    w: 10, h: 24, pal: PALE, face: 'sad',
    acc: (p, a) => {
      p.rect(a.cx - 3, a.eyeY + 4, 6, 3, '#ece8db');
      p.rect(a.left - 3, a.top + 4, 1, a.bottom - a.top - 2, '#6d4a26');
      p.rect(a.left - 4, a.top + 3, 2, 1, '#6d4a26');
    },
  },
  leek_fat: {
    w: 15, h: 25, pal: DEEP, face: 'smug',
    acc: (p, a) => { p.rect(a.left + 1, a.bottom - 7, a.right - a.left - 2, 2, '#5ab044'); p.rect(a.left - 1, a.top + 6, 1, 7, DEEP.body); p.rect(a.right, a.top + 6, 1, 7, DEEP.dark); },
  },
  leek_thin: { w: 6, h: 24, pal: BRIGHT, face: 'angry', acc: (p, a) => { p.px(a.left - 2, a.bottom - 2, '#e6f2ff'); p.px(a.left - 3, a.bottom - 5, '#e6f2ff'); } },
  leek_runner: {
    w: 9, h: 23, face: 'scared',
    acc: (p, a) => { p.rect(a.right + 1, a.top - 1, 1, 2, '#7fd4ff'); p.px(a.right + 2, a.top + 2, '#7fd4ff'); p.rect(a.left - 2, a.bottom - 4, 2, 3, '#b87438'); },
  },
  leek_cluster: { w: 9, h: 21, pal: DEEP, face: 'calm', acc: (p, a) => { p.rect(a.left - 1, a.top + 7, a.right - a.left + 2, 1, '#e0404a'); p.px(a.cx, a.top + 7, '#ffd23e'); } },
  leek_burrow: {
    w: 10, h: 23, face: 'angry',
    acc: (p, a) => {
      p.rect(a.cx - 4, a.top - 2, 8, 3, '#e8b23a');
      p.px(a.cx, a.top - 1, '#fff5c4');
      p.rect(a.left - 2, a.bottom - 1, a.right - a.left + 4, 2, '#7a5a36');
      p.px(a.left - 3, a.bottom, '#7a5a36');
      p.px(a.right + 2, a.bottom, '#7a5a36');
    },
  },
  leek_suit: { w: 10, h: 24, face: 'smug', acc: (p, a) => { suit('#2c3244', '#454c63', '#d0404a')(p, a, 0); p.rect(a.right, a.bottom - 5, 4, 3, '#6d4a26'); p.px(a.right + 1, a.bottom - 6, '#6d4a26'); } },
  leek_stock: {
    w: 10, h: 24, face: 'scared',
    acc: (p, a, f) => {
      p.rect(a.right, a.top + 4, 4, 6, '#23262e');
      p.rect(a.right + 1, a.top + 5, 2, 4, f ? '#ff5252' : '#4ce07a');
      p.line(a.left + 1, a.top + 1, a.left + 2, a.top + 1, '#111');
      p.rect(a.left, a.bottom - 6, 10, 1, '#4a78c6');
    },
  },
  leek_gold: {
    w: 11, h: 25, pal: GOLD, face: 'smug',
    acc: (p, a, f) => { p.px(a.left - 2, a.top + (f ? 2 : 6), '#fff'); p.px(a.right + 2, a.top + (f ? 7 : 3), '#fff'); p.px(a.cx + 3, a.top - 4, '#fff7c4'); },
  },
  leek_scientist: {
    w: 10, h: 24, face: 'calm',
    acc: (p, a) => {
      const y = a.top + 6;
      p.rect(a.left, y, a.right - a.left, a.bottom - y, '#eef3f6');
      p.rect(a.cx, y, 1, a.bottom - y, '#b7c2c9');
      p.rect(a.cx - 4, a.eyeY - 1, 4, 4, '#222');
      p.rect(a.cx + 0, a.eyeY - 1, 4, 4, '#222');
      p.rect(a.cx - 3, a.eyeY, 2, 2, '#a8ecff');
      p.rect(a.cx + 1, a.eyeY, 2, 2, '#a8ecff');
      p.rect(a.right, a.top + 7, 2, 4, '#7ae0c7');
      p.px(a.right, a.top + 6, '#d8fff5');
    },
  },
  leek_muscle: {
    w: 11, h: 25, pal: DEEP, face: 'angry',
    acc: (p, a, f) => {
      const y = a.top + 5 + (f ? 1 : 0);
      p.rect(a.left - 4, y, 4, 4, DEEP.body);
      p.rect(a.right, y, 4, 4, DEEP.body);
      p.rect(a.left - 4, y, 4, 1, DEEP.light);
      p.rect(a.right, y, 4, 1, DEEP.light);
      p.rect(a.cx - 3, a.top + 6, 3, 2, DEEP.light);
      p.rect(a.cx, a.top + 6, 3, 2, DEEP.light);
      p.rect(a.left, a.top - 1, a.right - a.left, 1, '#e0404a');
    },
  },
  leek_shield: {
    w: 10, h: 24, face: 'angry',
    acc: (p, a) => {
      p.rect(a.right - 1, a.top + 1, 6, 11, '#8391a0');
      p.rect(a.right, a.top + 2, 4, 9, '#b4c1cc');
      p.rect(a.right + 1, a.top + 4, 2, 5, '#e0404a');
      p.rect(a.right, a.top + 12, 4, 1, '#8391a0');
      p.rect(a.cx - 3, a.top - 3, 6, 3, '#6b7884');
    },
  },
  leek_medic: {
    w: 10, h: 24, face: 'calm',
    acc: (p, a) => {
      p.rect(a.cx - 3, a.top - 3, 6, 3, '#f5f5f0');
      p.rect(a.cx - 1, a.top - 3, 2, 3, '#e0404a');
      p.rect(a.right, a.bottom - 7, 5, 5, '#f5f5f0');
      p.rect(a.right + 2, a.bottom - 6, 1, 3, '#e0404a');
      p.rect(a.right + 1, a.bottom - 5, 3, 1, '#e0404a');
    },
  },
  leek_mech: {
    w: 11, h: 24, pal: STEEL, face: 'angry',
    acc: (p, a) => {
      p.rect(a.left, a.top + 6, a.right - a.left, 6, '#5a6470');
      p.rect(a.left + 1, a.top + 7, 3, 2, '#ffb338');
      p.rect(a.right - 1, a.top + 3, 8, 3, '#39414b');
      p.rect(a.right + 5, a.top + 2, 2, 5, '#59636f');
      p.px(a.cx, a.top - 3, '#ff5252');
      p.rect(a.cx, a.top - 2, 1, 3, '#39414b');
    },
  },
  leek_pyramid: {
    w: 10, h: 24, face: 'smug',
    acc: (p, a, f) => {
      suit('#7b3f8a', '#9a58aa', '#f0d24a')(p, a, 0);
      p.rect(a.right, a.top + 3, 2, 3, '#e8e8e8');
      p.line(a.right + 2, a.top + 4, a.right + 5, a.top + 1, '#f0d24a', 2);
      p.line(a.right + 2, a.top + 5, a.right + 5, a.top + 7, '#f0d24a', 2);
      if (f) { p.px(a.right + 7, a.top + 2, '#fff'); p.px(a.right + 7, a.top + 6, '#fff'); }
    },
  },
  leek_rich: {
    w: 12, h: 25, pal: GREEN, face: 'smug',
    acc: (p, a) => {
      suit('#e0ad2e', '#ffd86a', '#a02020')(p, a, 0);
      p.rect(a.cx - 4, a.top - 5, 8, 5, '#20222a');
      p.rect(a.cx - 6, a.top - 1, 12, 1, '#20222a');
      p.rect(a.cx - 4, a.top - 2, 8, 1, '#e0ad2e');
      p.rect(a.cx - 4, a.eyeY - 1, 4, 3, '#ffd23e');
      p.px(a.cx - 3, a.eyeY, '#111');
    },
  },
  leek_rebel: {
    w: 10, h: 24, face: 'angry',
    acc: (p, a) => {
      p.rect(a.left, a.top, a.right - a.left, 2, '#e0303a');
      p.rect(a.right, a.top + 1, 3, 1, '#e0303a');
      p.line(a.right + 2, a.bottom - 2, a.right + 2, a.top - 6, '#7a5a36');
      p.rect(a.right, a.top - 8, 5, 1, '#aeb6be');
      p.rect(a.right, a.top - 9, 1, 2, '#aeb6be');
      p.rect(a.right + 2, a.top - 9, 1, 2, '#aeb6be');
      p.rect(a.right + 4, a.top - 9, 1, 2, '#aeb6be');
    },
  },
  leek_bomber: {
    w: 10, h: 24, pal: { ...GREEN, body: '#c6d64c', dark: '#909c34' }, face: 'scared',
    acc: (p, a, f) => {
      p.rect(a.left - 1, a.top + 6, a.right - a.left + 2, 6, '#7a2a24');
      for (let x = a.left; x < a.right; x += 3) p.rect(x, a.top + 6, 2, 6, '#c04040');
      p.rect(a.left - 1, a.top + 8, a.right - a.left + 2, 1, '#222');
      p.px(a.cx, a.top + 9, f ? '#ff3030' : '#ffee58');
    },
  },
  leek_predict: {
    w: 9, h: 24, pal: { ...GREEN, body: '#62d9c7', light: '#9af2e3', dark: '#3fa596' }, face: 'smug',
    acc: (p, a, f) => {
      p.rect(a.left, a.eyeY - 1, a.right - a.left, 3, '#14282c');
      p.rect(a.left + 1, a.eyeY, a.right - a.left - 2, 1, f ? '#7dfff0' : '#26c6da');
    },
  },
  elite_guard: {
    w: 12, h: 25, pal: DEEP, face: 'angry',
    acc: (p, a) => {
      suit('#17191f', '#2c2f3a', '#17191f')(p, a, 0);
      p.rect(a.left, a.eyeY - 1, a.right - a.left, 3, '#0d0d10');
      p.rect(a.left + 2, a.eyeY, 2, 1, '#4a4f60');
      p.rect(a.left - 2, a.top + 4, 2, 7, DEEP.body);
      p.rect(a.right, a.top + 4, 2, 7, DEEP.body);
      p.px(a.right - 1, a.top - 1, '#d8d8d8');
    },
  },
  elite_prof: {
    w: 11, h: 25, pal: PALE, face: 'calm',
    acc: (p, a) => {
      p.rect(a.cx - 6, a.top - 2, 12, 2, '#20222a');
      p.rect(a.cx - 3, a.top - 4, 6, 2, '#20222a');
      p.rect(a.cx + 5, a.top - 1, 1, 4, '#e0b23a');
      p.rect(a.cx - 4, a.eyeY - 1, 3, 4, '#222');
      p.rect(a.cx + 1, a.eyeY - 1, 3, 4, '#222');
      p.rect(a.cx - 3, a.eyeY, 1, 2, '#fff');
      p.rect(a.cx + 2, a.eyeY, 1, 2, '#fff');
      p.rect(a.cx - 2, a.eyeY + 3, 4, 3, '#f0f0e6');
      p.rect(a.right, a.top + 4, 5, 6, '#7a3f24');
      p.rect(a.right + 1, a.top + 5, 3, 4, '#f4f0dc');
    },
  },
  elite_manager: {
    w: 11, h: 25, face: 'smug',
    acc: (p, a) => {
      suit('#30415f', '#4a6088', '#ffd23e')(p, a, 0);
      p.rect(a.left - 3, a.top + 2, 4, 4, '#222');
      p.px(a.left - 1, a.top + 1, '#ff7a30');
      p.px(a.left - 1, a.top, '#ffd23e');
      p.rect(a.cx - 4, a.top - 1, 8, 1, '#2a2a2a');
    },
  },
  elite_engineer: {
    w: 11, h: 25, face: 'calm',
    acc: (p, a) => {
      p.rect(a.cx - 5, a.top - 3, 10, 3, '#f0b52e');
      p.rect(a.cx - 6, a.top - 1, 12, 1, '#c98d1c');
      p.rect(a.left, a.top + 7, a.right - a.left, a.bottom - a.top - 7, '#3d6eb5');
      p.rect(a.left + 2, a.top + 5, 1, 3, '#3d6eb5');
      p.rect(a.right - 3, a.top + 5, 1, 3, '#3d6eb5');
      p.rect(a.right + 1, a.top + 2, 2, 9, '#8a8f98');
      p.rect(a.right, a.top + 1, 4, 3, '#adb4bd');
    },
  },
  elite_commander: {
    w: 12, h: 25, pal: DEEP, face: 'angry',
    acc: (p, a) => {
      p.rect(a.left, a.top + 6, a.right - a.left, a.bottom - a.top - 6, '#4c5a2c');
      p.rect(a.left, a.top + 7, a.right - a.left, 1, '#ffd23e');
      p.rect(a.cx - 6, a.top - 3, 12, 3, '#3a4622');
      p.rect(a.cx - 7, a.top - 1, 14, 1, '#262e16');
      p.px(a.cx, a.top - 2, '#e0303a');
      p.rect(a.left - 3, a.top + 6, 3, 2, '#ffd23e');
      p.rect(a.right, a.top + 6, 3, 2, '#ffd23e');
    },
  },
  elite_prophet: {
    w: 11, h: 25, pal: { ...GREEN, body: '#8a6fd4', light: '#b39cf0', dark: '#624caa', leaf: '#4f3c94', leaf2: '#6f58c0' }, face: 'smug',
    acc: (p, a, f) => {
      p.rect(a.left, a.top + 7, a.right - a.left, a.bottom - a.top - 7, '#3a2d70');
      p.disc(a.cx, a.top - 5, 3, '#a8ecff');
      p.px(a.cx - 1, a.top - 6, '#fff');
      p.rect(a.cx - 2, a.top - 2, 4, 2, '#d8c34a');
      p.px(a.cx - 4 + (f ? 1 : 0), a.top - 9, '#fff');
      p.px(a.cx + 4 - (f ? 1 : 0), a.top - 8, '#fff');
    },
  },
  elite_awaken: {
    w: 13, h: 26, pal: { ...DEEP, body: '#dfe4e8', light: '#ffffff', dark: '#9aa5ad', leaf: '#3a424a', leaf2: '#70808c' }, face: 'angry',
    acc: (p, a, f) => {
      p.rect(a.left - 3, a.top + 5, 3, 6, '#dfe4e8');
      p.rect(a.right, a.top + 5, 3, 6, '#dfe4e8');
      p.line(a.left, a.top + 2, a.cx, a.top + 9, '#ff4f4f');
      p.line(a.right - 1, a.top + 2, a.cx, a.top + 9, '#ff4f4f');
      p.px(a.cx, a.top - 6 + (f ? 1 : 0), '#fff');
    },
  },
  unit_tower: {
    w: 12, h: 26, custom: (p, f) => {
      const cx = 12;
      p.rect(cx - 8, 22, 16, 6, '#5d6470');
      p.rect(cx - 8, 22, 16, 1, '#8a93a0');
      p.rect(cx - 6, 10, 12, 12, '#6f7886');
      p.rect(cx - 6, 10, 2, 12, '#8d97a5');
      p.rect(cx - 5, 3, 10, 7, '#4f5763');
      p.rect(cx - 2, 0, 4, 3, GREEN.leaf2);
      p.rect(cx + 2, 5, 10, 3, '#2d333c');
      p.rect(cx + 10, 4, 2, 5, '#59636f');
      p.rect(cx - 3, 5, 2, 2, f ? '#ff3030' : '#ffcc33');
      p.rect(cx + 0, 5, 2, 2, f ? '#ff3030' : '#ffcc33');
    },
  },
  unit_robot: {
    w: 12, h: 26, custom: (p, f) => {
      const cx = 12;
      p.rect(cx - 6, 3, 12, 9, '#8ea0ad');
      p.rect(cx - 6, 3, 12, 1, '#c4d2dc');
      p.rect(cx - 4, 6, 3, 3, '#ff3b3b');
      p.rect(cx + 1, 6, 3, 3, '#ff3b3b');
      p.rect(cx - 1, 0, 2, 3, '#555f68');
      p.rect(cx - 7, 12, 14, 10, '#6e7f8c');
      p.rect(cx - 2, 14, 4, 4, '#ffb338');
      p.rect(cx - 10, 13, 3, 7, '#566470');
      p.rect(cx + 7, 13, 3, 7, '#566470');
      p.line(cx + 9, 11, cx + 14, 5, '#d6dee4', 2);
      p.rect(cx - 5, 22, 4, 5 - f, '#44505a');
      p.rect(cx + 1, 22, 4, 4 + f, '#44505a');
    },
  },
  unit_vine: {
    w: 12, h: 26, custom: (p, f) => {
      const cx = 12;
      const c1 = '#2f7a28';
      p.line(cx - 1, 27, cx - 4 + f, 16, c1, 3);
      p.line(cx - 4 + f, 16, cx + 2 - f, 6, c1, 3);
      p.line(cx + 2 - f, 6, cx - 1, 1, '#5cb53e', 2);
      p.rect(cx - 8, 13 - f, 4, 2, '#5cb53e');
      p.rect(cx + 3, 9 + f, 5, 2, '#5cb53e');
      p.rect(cx - 7, 25, 14, 3, '#55381f');
      p.px(cx + 1, 2, '#e04a5a');
    },
  },
  unit_clone: { w: 13, h: 28, pal: { ...DEEP, body: '#5ca1a0', light: '#8fd2d0', dark: '#3c7372', leaf: '#2c5f5e', leaf2: '#468c8a' }, face: 'angry', acc: (p, a) => { p.line(a.right + 1, a.bottom, a.right + 4, a.top - 9, '#c5e6e6'); p.arc(a.right - 1, a.top - 8, 6, -0.2, -2.2, '#e5ffff', 2); } },
  unit_tide: {
    w: 10, h: 22, pal: BRIGHT, face: 'angry',
    acc: (p, a) => { p.rect(a.left - 2, a.bottom - 3, a.right - a.left + 4, 2, '#8ae6ff'); p.px(a.left - 3, a.bottom - 4, '#d8f8ff'); p.px(a.right + 2, a.bottom - 4, '#d8f8ff'); },
  },
  unit_tech: {
    w: 12, h: 26, cw: 28, ch: 30, custom: (p, f) => {
      const cx = 14;
      p.rect(3, 12, 22, 16, '#39424f');
      p.rect(3, 12, 22, 1, '#7d8a9c');
      p.rect(3, 12, 1, 16, '#5c6776');
      p.rect(6, 15, 4, 3, f ? '#7dfff0' : '#26c6da');
      p.rect(12, 15, 4, 3, f ? '#ff7a7a' : '#ff3b3b');
      p.rect(18, 15, 4, 3, f ? '#7dfff0' : '#26c6da');
      p.rect(11, 21, 6, 7, '#1f242c');
      p.rect(7, 4, 14, 8, '#7ae0c7');
      p.rect(8, 5, 12, 6, '#c6fff0');
      p.rect(cx - 1, 5, 2, 6, GREEN.leaf2);
      p.rect(cx - 3, 7, 2, 3, GREEN.leaf);
      p.rect(cx + 1, 7, 2, 3, GREEN.leaf);
      p.rect(cx - 1, 0, 2, 4, '#aab4c0');
      p.px(cx, 0, f ? '#ff3030' : '#ffee58');
    },
  },
  unit_core: {
    w: 12, h: 24, custom: (p, f) => {
      const cx = 12;
      p.rect(cx - 8, 20, 16, 5, '#3a3f49');
      p.rect(cx - 6, 18, 12, 2, '#60697a');
      const r = f ? 8 : 7;
      p.disc(cx, 10, r, '#b45cff');
      p.disc(cx, 10, r - 2, '#e3b6ff');
      p.disc(cx, 10, r - 5, '#ffffff');
      p.rect(cx - 1, 6, 2, 8, GREEN.leaf2);
    },
  },

  // BOSS
  boss_coach: {
    w: 20, h: 40, cw: 42, ch: 46, pal: DEEP, face: 'angry',
    acc: (p, a, f) => {
      const y = a.top + 7 + f;
      p.rect(a.left - 8, y, 8, 8, DEEP.body);
      p.rect(a.right, y, 8, 8, DEEP.body);
      p.rect(a.left - 8, y, 8, 2, DEEP.light);
      p.rect(a.right, y, 8, 2, DEEP.light);
      p.rect(a.left - 11, y + 2, 3, 4, '#333');
      p.rect(a.right + 8, y + 2, 3, 4, '#333');
      p.rect(a.cx - 6, a.top + 9, 6, 3, DEEP.light);
      p.rect(a.cx, a.top + 9, 6, 3, DEEP.light);
      p.rect(a.cx - 4, a.top + 13, 4, 2, DEEP.light);
      p.rect(a.cx, a.top + 13, 4, 2, DEEP.light);
      p.rect(a.left, a.top - 2, a.right - a.left, 2, '#e0303a');
      p.rect(a.left - 3, a.top - 2, 3, 1, '#e0303a');
      p.rect(a.left, a.bottom - 7, a.right - a.left, 4, '#2c3e9e');
    },
  },
  boss_king: {
    w: 20, h: 40, cw: 42, ch: 46, face: 'smug',
    acc: (p, a) => {
      suit('#e0ad2e', '#ffe07a', '#a02020')(p, a, 0);
      crown(p, a);
      p.rect(a.left - 4, a.top + 11, 4, 8, '#e0ad2e');
      p.rect(a.right, a.top + 11, 4, 8, '#e0ad2e');
      p.disc(a.right + 3, a.top + 21, 3, '#ffd23e');
      p.rect(a.right + 2, a.top + 20, 2, 2, '#c6922a');
      p.rect(a.cx - 6, a.eyeY - 1, 5, 4, '#ffd23e');
      p.px(a.cx - 4, a.eyeY, '#111');
    },
  },
  boss_saint: {
    w: 18, h: 40, cw: 44, ch: 48, pal: DEEP, face: 'angry',
    acc: (p, a, f) => {
      p.rect(a.left, a.top + 10, a.right - a.left, a.bottom - a.top - 10, '#2f4a2c');
      p.rect(a.left, a.top + 10, a.right - a.left, 2, '#a83030');
      p.line(a.left + 2, a.top + 12, a.right - 3, a.bottom - 1, '#d8d0b0');
      p.rect(a.left - 2, a.top - 2, a.right - a.left + 4, 2, '#20262c');
      p.line(a.left + 2, a.eyeY - 1, a.left + 5, a.eyeY, '#111', 2);
      p.line(a.right - 3, a.eyeY - 1, a.right - 6, a.eyeY, '#111', 2);
      p.line(a.right + 3, a.bottom + 3, a.right + 8, a.top - 8 + f, '#6d4a26', 2);
      p.arc(a.right + 1, a.top - 8 + f, 11, -0.1, -2.6, '#e6f4ff', 3);
      p.arc(a.right + 1, a.top - 8 + f, 9, -0.2, -2.4, '#8fd9ff', 1);
    },
  },
  boss_ancient: {
    w: 24, h: 44, cw: 48, ch: 50, pal: ANCIENT, face: 'sad',
    acc: (p, a, f) => {
      for (let i = 0; i < 6; i++) p.line(a.left + 2 + i * 3, a.top + 3 + (i % 2), a.left + 3 + i * 3, a.top + 12, ANCIENT.dark);
      p.rect(a.cx - 7, a.eyeY + 5, 14, 8, '#d8d2bc');
      for (let i = 0; i < 5; i++) p.rect(a.cx - 6 + i * 3, a.eyeY + 13, 2, 3 + (i % 2) * 2, '#d8d2bc');
      p.line(a.left - 1, a.bottom, a.left - 9, a.bottom - 14 - f, ANCIENT.leaf, 3);
      p.line(a.right, a.bottom, a.right + 8, a.bottom - 14 + f, ANCIENT.leaf, 3);
      p.px(a.left - 9, a.bottom - 16, '#e04a5a');
      p.px(a.right + 8, a.bottom - 16, '#e04a5a');
    },
  },
  boss_lord: {
    w: 24, h: 40, cw: 46, ch: 46, pal: GOLD, face: 'smug',
    acc: (p, a, f) => {
      suit('#fff0b0', '#ffffff', '#e0303a')(p, a, 0);
      crown(p, a);
      p.rect(a.left - 5, a.top + 11, 5, 8, '#fff0b0');
      p.rect(a.right, a.top + 11, 5, 8, '#fff0b0');
      for (let i = 0; i < 3; i++) p.disc(a.left + 4 + i * 8, a.bottom - 2 - ((i + f) % 2), 2, '#ffd23e');
      p.rect(a.cx - 7, a.eyeY - 1, 6, 4, '#111');
      p.rect(a.cx + 1, a.eyeY - 1, 6, 4, '#111');
    },
  },
  boss_general: {
    w: 20, h: 40, cw: 46, ch: 50, pal: DEEP, face: 'angry',
    acc: (p, a, f) => {
      p.rect(a.left, a.top + 8, a.right - a.left, a.bottom - a.top - 8, '#4c3a2c');
      p.rect(a.left, a.top + 9, a.right - a.left, 2, '#ffd23e');
      p.rect(a.left - 5, a.top + 8, 5, 4, '#ffd23e');
      p.rect(a.right, a.top + 8, 5, 4, '#ffd23e');
      p.rect(a.left, a.top, a.right - a.left, 3, '#e0303a');
      p.rect(a.left - 3, a.top + 1, 3, 2, '#e0303a');
      p.line(a.right + 7, a.bottom + 3, a.right + 7, 0, '#6d4a26', 2);
      p.rect(a.right + 9, 1 + f, 10, 8, '#e0303a');
      p.rect(a.right + 11, 3 + f, 5, 4, '#ffd23e');
      p.rect(a.left - 4, a.top + 12, 3, 12, DEEP.body);
    },
  },
  boss_chairman: {
    w: 22, h: 40, cw: 56, ch: 58, pal: GREEN, face: 'smug',
    custom: (p, f) => {
      const cx = 28;
      // 王座
      p.rect(cx - 22, 10, 44, 42, '#54223a');
      p.rect(cx - 22, 10, 44, 3, '#ffd23e');
      p.rect(cx - 22, 10, 3, 42, '#ffd23e');
      p.rect(cx + 19, 10, 3, 42, '#ffd23e');
      p.rect(cx - 26, 40, 52, 16, '#6e2c4b');
      p.rect(cx - 26, 40, 52, 2, '#ffd23e');
      for (let i = 0; i < 5; i++) {
        p.rect(cx - 20 + i * 9, 4 + (i % 2) * 3, 4, 8, GREEN.leaf2);
        p.px(cx - 19 + i * 9, 3 + (i % 2) * 3, GREEN.light);
      }
      const b = new Pen(p.ctx, p.ox + 14, p.oy + 8, 28, 40);
      const a = drawLeek(b, { w: 18, h: 40, face: 'smug', frame: f, pal: GREEN });
      suit('#20222a', '#3a3f4c', '#ffd23e')(b, a, f);
      crown(b, a);
    },
  },
  boss_chairman_small: {
    w: 10, h: 24, face: 'angry',
    acc: (p, a, f) => {
      p.rect(a.left, a.top, a.right - a.left, 2, '#e0303a');
      p.rect(a.cx - 2, a.top - 3, 4, 2, '#ffd23e');
      p.px(a.cx - 2, a.top - 4, '#ffd23e');
      p.px(a.cx + 1, a.top - 4, '#ffd23e');
      p.px(a.left - 2, a.top + 2 + f * 3, '#fff7a0');
    },
  },
};

export function leekIds() {
  return Object.keys(SPECS);
}
export function leekCellSize(id: string) {
  const s = SPECS[id];
  return { w: s.cw ?? Math.max(s.w + 14, 24), h: s.ch ?? s.h + 8 };
}
export function paintLeek(p: Pen, id: string, frame: number) {
  const s = SPECS[id];
  if (s.custom) {
    s.custom(p, frame);
  } else {
    const a = drawLeek(p, { w: s.w, h: s.h, pal: s.pal, face: s.face, frame, noLegs: s.noLegs, noArms: s.noArms });
    s.acc?.(p, a, frame);
  }
  p.outline();
}
