import { Pen } from './Pen';

// ---------- 玩家 ----------
export interface PlayerPal {
  robe: string;
  robe2: string;
  mask: string;
  glow: string;
  trim: string;
}
export const PLAYER_PALS: Record<string, PlayerPal> = {
  reaper: { robe: '#22222e', robe2: '#3a3a4c', mask: '#ece8da', glow: '#6dff9a', trim: '#55556e' },
  capitalist: { robe: '#2a2612', robe2: '#4d4418', mask: '#ece8da', glow: '#ffd23e', trim: '#d0a52a' },
  farmer: { robe: '#4a3320', robe2: '#6b4c2e', mask: '#ece8da', glow: '#b4ff5a', trim: '#a07b45' },
  flash: { robe: '#1b2550', robe2: '#2f4088', mask: '#ece8da', glow: '#7ee0ff', trim: '#f2d84a' },
  doctor: { robe: '#2a1a42', robe2: '#46307a', mask: '#ece8da', glow: '#c27bff', trim: '#8a6fd4' },
  judge: { robe: '#4a1416', robe2: '#7a2226', mask: '#ffe9d0', glow: '#ff5a4a', trim: '#ffd23e' },
  skin_bone: { robe: '#d8d4c6', robe2: '#f2eee0', mask: '#22222e', glow: '#ff5ae0', trim: '#9b978a' },
  skin_gold: { robe: '#a97e1c', robe2: '#e0b02e', mask: '#fff5c4', glow: '#fff5a0', trim: '#fff0a0' },
  skin_neon: { robe: '#0c1230', robe2: '#1a2560', mask: '#c6fff5', glow: '#ff3dd0', trim: '#39ffe0' },
  skin_leek: { robe: '#2f7a28', robe2: '#58c23a', mask: '#f3f6e6', glow: '#fff', trim: '#a6ea6c' },
};

export function paintPlayer(p: Pen, pal: PlayerPal, anim: string, f: number) {
  const cx = 12;
  if (anim === 'dead') {
    const y = 18 + f * 4;
    p.rect(cx - 8, y + 2, 16, 8 - f * 2, pal.robe);
    p.rect(cx - 8, y + 2, 16, 1, pal.robe2);
    if (f < 2) p.rect(cx - 3, y - 2, 6, 5, pal.mask);
    if (f < 2) {
      p.px(cx - 2, y - 1, '#111');
      p.px(cx + 1, y - 1, '#111');
    }
    p.outline();
    return;
  }
  const step = anim === 'walk' ? [0, 1, 0, -1][f] : 0;
  const bob = anim === 'idle' ? f : anim === 'walk' ? Math.abs(step) : 0;
  const top = 3 + bob;
  // 袍子
  p.rect(cx - 5, top + 8, 10, 15 - bob, pal.robe);
  p.rect(cx - 6, top + 14, 12, 9 - bob, pal.robe);
  p.rect(cx - 5, top + 8, 2, 12, pal.robe2);
  // 下摆
  for (let i = 0; i < 6; i++) {
    const wav = ((i + f) % 2) * 1;
    p.rect(cx - 6 + i * 2, 25 + wav + step * (i % 2 ? 1 : -1) * 0, 2, 1, pal.robe);
  }
  p.rect(cx - 6, 24, 12, 1, pal.trim);
  // 兜帽
  p.rect(cx - 5, top + 1, 10, 9, pal.robe);
  p.rect(cx - 4, top, 8, 1, pal.robe);
  p.rect(cx - 5, top + 1, 2, 7, pal.robe2);
  p.px(cx + 4, top - 1, pal.robe);
  // 骷髅面具
  p.rect(cx - 3, top + 3, 6, 5, pal.mask);
  p.rect(cx - 3, top + 8, 6, 1, pal.mask);
  p.rect(cx - 2, top + 4, 2, 2, '#111');
  p.rect(cx + 1, top + 4, 2, 2, '#111');
  p.px(cx - 2, top + 4, pal.glow);
  p.px(cx + 2, top + 4, pal.glow);
  p.px(cx - 1, top + 7, '#555');
  p.px(cx + 1, top + 7, '#555');
  // 手臂
  if (anim === 'attack') {
    p.line(cx + 4, top + 11, cx + 9, top + 8, pal.robe, 2);
    p.rect(cx + 9, top + 7, 2, 2, pal.mask);
  } else {
    p.rect(cx + 5, top + 11 + step, 2, 6, pal.robe2);
    p.rect(cx + 5, top + 17 + step, 2, 1, pal.mask);
    p.rect(cx - 7, top + 11 - step, 2, 6, pal.robe);
    p.rect(cx - 7, top + 17 - step, 2, 1, pal.mask);
  }
  if (anim === 'hurt') {
    p.ctx.globalCompositeOperation = 'source-atop';
    p.rect(0, 0, p.w, p.h, 'rgba(255,60,60,0.45)');
    p.ctx.globalCompositeOperation = 'source-over';
  }
  p.outline();
}

// ---------- 镰刀（武器图标 + 世界中的镰刀精灵） ----------
function scythe(p: Pen, blade: string, edge: string, handle: string, cx = 12, cy = 12) {
  p.line(cx - 8, cy + 9, cx + 4, cy - 7, handle, 2);
  p.arc(cx - 2, cy - 2, 9, -2.6, -0.45, blade, 3);
  p.arc(cx - 2, cy - 2, 10, -2.45, -0.5, edge, 1);
  p.rect(cx + 3, cy - 8, 2, 2, handle);
}
const gem = (p: Pen, c: string, c2: string, cx = 12, cy = 12, r = 6) => {
  for (let y = -r; y <= r; y++) {
    const w = r - Math.abs(y);
    p.rect(cx - w, cy + y, w * 2 + 1, 1, c);
  }
  for (let y = -r + 1; y <= 0; y++) {
    const w = r - Math.abs(y) - 1;
    if (w > 0) p.rect(cx - w, cy + y, w, 1, c2);
  }
  p.px(cx - 1, cy - r + 2, '#fff');
};

export const WEAPON_ICONS: Record<string, (p: Pen) => void> = {
  scythe: (p) => scythe(p, '#c6d3dc', '#ffffff', '#7a5a36'),
  boomerang: (p) => {
    p.arc(12, 13, 8, -2.9, -0.3, '#9fd8ff', 3);
    p.arc(12, 13, 10, -2.6, -0.5, '#e5f6ff', 1);
    p.px(5, 16, '#7a5a36');
    p.px(19, 16, '#7a5a36');
    p.rect(11, 10, 2, 2, '#7a5a36');
  },
  twin: (p) => {
    scythe(p, '#c6d3dc', '#fff', '#7a5a36', 9, 12);
    scythe(p, '#8fe0c0', '#e0fff5', '#5a4a36', 15, 14);
  },
  whirl: (p) => {
    p.arc(12, 12, 9, 0, 2, '#b6f0ff', 2);
    p.arc(12, 12, 9, 2.1, 4.1, '#7fd4ff', 2);
    p.arc(12, 12, 9, 4.2, 6.2, '#b6f0ff', 2);
    p.arc(12, 12, 5, 1, 4, '#e5ffff', 2);
    p.disc(12, 12, 1.4, '#fff');
  },
  lightning: (p) => {
    scythe(p, '#fff07a', '#fff', '#3a3a50');
    p.line(14, 8, 10, 14, '#fff', 2);
    p.line(10, 14, 15, 14, '#fff', 1);
    p.line(15, 14, 9, 22, '#ffe948', 2);
  },
  fire: (p) => {
    scythe(p, '#ff9248', '#ffe07a', '#5a2a1a');
    p.rect(9, 17, 6, 4, '#ff5a2a');
    p.rect(10, 15, 4, 2, '#ff9248');
    p.rect(11, 13, 2, 2, '#ffe07a');
  },
  frost: (p) => {
    scythe(p, '#a8ecff', '#fff', '#3a5a7a');
    p.line(12, 15, 12, 22, '#d8f8ff');
    p.line(9, 18, 15, 18, '#d8f8ff');
    p.line(10, 16, 14, 20, '#fff');
    p.line(14, 16, 10, 20, '#fff');
  },
  blackhole: (p) => {
    p.disc(12, 12, 8, '#3a1f6b');
    p.ring(12, 12, 9, '#c27bff');
    p.disc(12, 12, 4, '#0a0614');
    p.arc(12, 12, 6, 0.5, 2.5, '#c27bff');
    p.arc(12, 12, 6, 3.6, 5.6, '#7e4bd0');
  },
  laser: (p) => {
    scythe(p, '#ff6bb0', '#fff', '#444');
    p.line(3, 21, 22, 15, '#ff9ccd', 2);
    p.line(3, 21, 22, 15, '#fff');
  },
  clone: (p) => {
    p.ctx.globalAlpha = 0.45;
    scythe(p, '#8a8aa8', '#c6c6e0', '#444', 8, 11);
    p.ctx.globalAlpha = 0.7;
    scythe(p, '#8a8aa8', '#c6c6e0', '#444', 11, 12);
    p.ctx.globalAlpha = 1;
    scythe(p, '#c6d3dc', '#fff', '#222', 14, 13);
  },
  chainsaw: (p) => {
    p.rect(4, 13, 7, 6, '#e8862e');
    p.rect(4, 13, 7, 1, '#ffb368');
    p.rect(11, 11, 10, 6, '#b8c4cc');
    for (let x = 11; x < 21; x += 2) {
      p.px(x, 10, '#eef');
      p.px(x + 1, 17, '#eef');
    }
    p.rect(2, 19, 5, 2, '#444');
  },
  giant: (p) => {
    p.line(3, 22, 15, 6, '#6d4a26', 3);
    p.arc(9, 10, 12, -2.8, -0.2, '#9aa8b4', 4);
    p.arc(9, 10, 13, -2.6, -0.3, '#eef6ff', 1);
  },
  golden_reaper: (p) => {
    scythe(p, '#ffd23e', '#fff7c0', '#a02020');
    p.disc(7, 18, 3, '#ffd23e');
    p.px(7, 18, '#c6922a');
    p.px(5, 7, '#fff');
    p.px(20, 18, '#fff');
  },
  calamity: (p) => {
    for (let i = 0; i < 6; i++) p.rect(12 - (9 - i * 1.3), 3 + i * 3, (9 - i * 1.3) * 2, 2, i % 2 ? '#9ad8e8' : '#d2f5ff');
    p.line(5, 7, 19, 10, '#6ab0c4');
    p.line(7, 14, 17, 17, '#6ab0c4');
  },
  thor: (p) => {
    p.rect(5, 3, 14, 7, '#c8d0dc');
    p.rect(5, 3, 14, 2, '#eef2f8');
    p.rect(10, 10, 4, 3, '#7a5a36');
    p.line(14, 13, 9, 18, '#ffe948', 2);
    p.line(9, 18, 15, 18, '#fff', 1);
    p.line(15, 18, 10, 23, '#ffe948', 2);
  },
  hell: (p) => {
    p.rect(5, 15, 14, 7, '#c02810');
    p.rect(7, 10, 10, 5, '#ff5a2a');
    p.rect(9, 6, 6, 4, '#ff9248');
    p.rect(11, 3, 2, 3, '#ffe07a');
    p.rect(9, 12, 2, 3, '#111');
    p.rect(13, 12, 2, 3, '#111');
    p.rect(10, 17, 4, 2, '#111');
  },
  zero: (p) => {
    gem(p, '#8fe4ff', '#d8f8ff', 12, 12, 9);
    p.line(12, 3, 12, 21, '#fff');
    p.line(3, 12, 21, 12, '#fff');
    p.line(6, 6, 18, 18, '#fff');
    p.line(18, 6, 6, 18, '#fff');
  },
  void_eater: (p) => {
    p.disc(12, 12, 10, '#150a2c');
    p.ring(12, 12, 10, '#b45cff', 2);
    p.rect(7, 8, 3, 3, '#ff3b8b');
    p.rect(14, 8, 3, 3, '#ff3b8b');
    for (let x = 6; x < 18; x += 3) p.rect(x, 15, 2, 3, '#e8e8f0');
  },
  sun: (p) => {
    p.disc(12, 12, 5, '#ffd23e');
    p.disc(12, 12, 3, '#fff7c0');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      p.line(12 + Math.cos(a) * 6, 12 + Math.sin(a) * 6, 12 + Math.cos(a) * 11, 12 + Math.sin(a) * 11, '#ff9ccd');
    }
  },
  blade_storm: (p) => {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      p.line(12 + Math.cos(a) * 4, 12 + Math.sin(a) * 4, 12 + Math.cos(a + 0.5) * 10, 12 + Math.sin(a + 0.5) * 10, i % 2 ? '#e0f0ff' : '#8fb8d8', 2);
    }
    p.disc(12, 12, 2, '#fff');
  },
  mech_reaper: (p) => {
    p.rect(8, 7, 8, 7, '#7c8894');
    p.rect(9, 9, 2, 2, '#ff3b3b');
    p.rect(13, 9, 2, 2, '#ff3b3b');
    p.rect(9, 14, 6, 6, '#56626e');
    p.line(8, 15, 3, 10, '#aab4c0', 2);
    p.line(16, 15, 21, 10, '#aab4c0', 2);
    p.ring(3, 7, 3, '#eef');
    p.ring(21, 7, 3, '#eef');
  },
  eternal: (p) => {
    p.arc(7, 12, 5, 0, Math.PI * 2, '#9fd8ff', 2);
    p.arc(17, 12, 5, 0, Math.PI * 2, '#ffd23e', 2);
    p.rect(11, 11, 2, 2, '#fff');
    p.px(3, 7, '#fff');
    p.px(21, 17, '#fff');
  },
};

// ---------- 被动 / 属性 / 特殊 / 大招 图标 ----------
const rune = (p: Pen, c: string, g: (p: Pen) => void) => {
  p.rect(5, 3, 14, 18, '#6c6f7a');
  p.rect(6, 4, 12, 16, '#8b8e9a');
  p.rect(6, 4, 12, 1, '#b4b7c2');
  p.ctx.save();
  g(p);
  p.ctx.restore();
  p.rect(5, 21, 14, 1, c);
};
export const ITEM_ICONS: Record<string, (p: Pen) => void> = {
  greed_heart: (p) => {
    p.disc(8, 9, 4, '#ffd23e');
    p.disc(15, 9, 4, '#ffd23e');
    for (let y = 0; y < 9; y++) p.rect(4 + y, 11 + y, 16 - y * 2, 1, '#e0a020');
    p.px(7, 7, '#fff');
    p.rect(11, 9, 2, 6, '#8a5a12');
  },
  death_watch: (p) => {
    p.disc(12, 13, 8, '#d0a52a');
    p.disc(12, 13, 6, '#f5efd8');
    p.rect(11, 2, 2, 3, '#d0a52a');
    p.line(12, 13, 12, 8, '#111');
    p.line(12, 13, 16, 15, '#c02020');
    p.px(10, 12, '#555');
  },
  glove: (p) => {
    p.rect(7, 10, 10, 11, '#6b4c2e');
    for (let i = 0; i < 4; i++) p.rect(7 + i * 3 - (i > 2 ? 1 : 0), 4 + (i === 0 ? 2 : 0), 2, 7, '#8a6840');
    p.rect(4, 11, 3, 5, '#8a6840');
    p.rect(7, 18, 10, 2, '#3a2a18');
  },
  clover: (p) => {
    p.disc(8, 8, 3.4, '#4fb22e');
    p.disc(16, 8, 3.4, '#58c23a');
    p.disc(8, 16, 3.4, '#58c23a');
    p.disc(16, 16, 3.4, '#4fb22e');
    p.rect(11, 11, 2, 2, '#a6ea6c');
    p.line(13, 13, 19, 22, '#2f7a28');
  },
  xp_crystal: (p) => gem(p, '#4ac8ff', '#b8ecff', 12, 12, 9),
  life_potion: (p) => {
    p.rect(10, 3, 4, 4, '#c4b488');
    p.rect(9, 7, 6, 2, '#dff');
    p.disc(12, 15, 7, '#dff');
    p.disc(12, 15, 6, '#e02a4a');
    p.rect(8, 11, 8, 2, '#dff');
    p.px(9, 14, '#fff');
  },
  sandals: (p) => {
    p.rect(4, 15, 16, 5, '#c8a050');
    p.rect(4, 15, 16, 1, '#e8c878');
    p.rect(7, 9, 3, 6, '#7a5a26');
    p.rect(14, 11, 3, 4, '#7a5a26');
    p.line(7, 10, 17, 12, '#7a5a26');
  },
  iron_armor: (p) => {
    p.rect(5, 5, 14, 14, '#8391a0');
    p.rect(5, 5, 14, 2, '#c4d0da');
    p.rect(8, 19, 8, 3, '#6b7884');
    p.rect(11, 7, 2, 12, '#5c6874');
    p.rect(2, 5, 3, 6, '#6b7884');
    p.rect(19, 5, 3, 6, '#6b7884');
  },
  magnet_item: (p) => {
    p.arc(12, 11, 7, Math.PI, Math.PI * 2, '#e0303a', 4);
    p.rect(5, 11, 4, 8, '#e0303a');
    p.rect(15, 11, 4, 8, '#e0303a');
    p.rect(5, 17, 4, 3, '#eef');
    p.rect(15, 17, 4, 3, '#eef');
  },
  encyclopedia: (p) => {
    p.rect(5, 3, 14, 18, '#2f7a28');
    p.rect(5, 3, 2, 18, '#1d5418');
    p.rect(7, 19, 12, 2, '#eee8d0');
    p.rect(11, 6, 2, 8, '#a6ea6c');
    p.rect(9, 8, 2, 4, '#58c23a');
    p.rect(13, 8, 2, 4, '#58c23a');
  },
  contract: (p) => {
    p.rect(5, 3, 14, 18, '#f4edd2');
    for (let i = 0; i < 5; i++) p.rect(7, 6 + i * 2, 10 - (i % 2) * 2, 1, '#8a8470');
    p.disc(15, 18, 3, '#c02020');
    p.px(15, 18, '#ffd23e');
  },
  hedge: (p) => {
    p.rect(6, 3, 12, 11, '#3f7ed8');
    for (let y = 0; y < 8; y++) p.rect(6 + y * 0.75, 14 + y, 12 - y * 1.5, 1, '#3f7ed8');
    p.rect(6, 3, 12, 2, '#8fbaf5');
    p.rect(11, 6, 2, 10, '#fff');
    p.rect(8, 9, 8, 2, '#fff');
  },
  storm_core: (p) => {
    gem(p, '#7fd4ff', '#e5f8ff');
    p.arc(12, 12, 9, 0.3, 2.5, '#b6f0ff');
    p.arc(12, 12, 9, 3.4, 5.6, '#b6f0ff');
  },
  thunder_rune: (p) => rune(p, '#ffe948', (q) => {
    q.line(14, 6, 10, 12, '#ffe948', 2);
    q.line(10, 12, 14, 12, '#ffe948', 2);
    q.line(14, 12, 10, 18, '#ffe948', 2);
  }),
  heat_core: (p) => {
    gem(p, '#ff5a2a', '#ffb368');
    p.rect(11, 9, 2, 6, '#ffe07a');
  },
  perma_crystal: (p) => {
    gem(p, '#a8ecff', '#fff', 12, 12, 8);
    p.line(12, 4, 12, 20, '#7cc8ee');
  },
  void_core: (p) => {
    p.disc(12, 12, 8, '#3a1f6b');
    p.disc(12, 12, 4, '#000');
    p.ring(12, 12, 8, '#c27bff');
    p.px(9, 8, '#fff');
  },
  optic_core: (p) => {
    gem(p, '#ff9ccd', '#fff');
    p.line(2, 12, 22, 12, '#fff');
  },
  clone_rune: (p) => rune(p, '#8fe0c0', (q) => {
    q.rect(8, 7, 3, 9, '#3a3a50');
    q.rect(13, 9, 3, 9, '#8fe0c0');
  }),
  power_core: (p) => {
    gem(p, '#e8862e', '#ffc98a');
    p.ring(12, 12, 3, '#fff');
  },
  return_rune: (p) => rune(p, '#9fd8ff', (q) => {
    q.arc(12, 12, 5, -2.5, 1.5, '#2e6ea8', 2);
    q.rect(7, 7, 3, 3, '#2e6ea8');
  }),

  stat_damage: (p) => { p.line(5, 20, 18, 6, '#c6d3dc', 3); p.rect(4, 16, 6, 2, '#7a5a36'); p.px(19, 4, '#fff'); },
  stat_speed: (p) => { p.line(4, 7, 14, 7, '#7fd4ff', 2); p.line(2, 12, 18, 12, '#b6f0ff', 2); p.line(4, 17, 14, 17, '#7fd4ff', 2); p.line(18, 12, 22, 12, '#fff', 2); },
  stat_range: (p) => { p.ring(12, 12, 9, '#b4ff5a', 2); p.ring(12, 12, 5, '#6fb935'); p.disc(12, 12, 1.4, '#fff'); },
  stat_atk: (p) => { p.line(5, 18, 11, 8, '#ffb338', 2); p.line(11, 18, 17, 8, '#ffb338', 2); p.line(17, 18, 21, 11, '#ffe07a', 2); },
  stat_hp: (p) => { p.disc(8, 9, 4, '#e02a4a'); p.disc(15, 9, 4, '#e02a4a'); for (let y = 0; y < 9; y++) p.rect(4 + y, 11 + y, 16 - y * 2, 1, '#c01f3c'); p.px(7, 7, '#fff'); },
  stat_luck: (p) => { p.rect(5, 5, 14, 14, '#eee'); p.rect(5, 5, 14, 1, '#fff'); p.rect(8, 8, 2, 2, '#c02020'); p.rect(14, 8, 2, 2, '#c02020'); p.rect(11, 11, 2, 2, '#c02020'); p.rect(8, 14, 2, 2, '#c02020'); p.rect(14, 14, 2, 2, '#c02020'); },
  stat_crit: (p) => { p.ring(12, 12, 8, '#e0303a', 2); p.line(12, 1, 12, 8, '#e0303a'); p.line(12, 16, 12, 23, '#e0303a'); p.line(1, 12, 8, 12, '#e0303a'); p.line(16, 12, 23, 12, '#e0303a'); p.disc(12, 12, 1.4, '#ffd23e'); },
  stat_xp: (p) => { p.rect(5, 5, 14, 15, '#3a78c6'); p.rect(5, 5, 2, 15, '#2a5ca0'); p.rect(9, 8, 8, 1, '#fff'); p.rect(9, 11, 6, 1, '#fff'); p.rect(9, 14, 8, 1, '#fff'); },
  stat_gold: (p) => { p.disc(12, 12, 8, '#ffd23e'); p.ring(12, 12, 8, '#c6922a'); p.rect(11, 8, 2, 8, '#c6922a'); p.px(9, 8, '#fff'); },
  stat_magnet: (p) => { p.arc(12, 11, 7, Math.PI, Math.PI * 2, '#3a78c6', 4); p.rect(5, 11, 4, 8, '#3a78c6'); p.rect(15, 11, 4, 8, '#3a78c6'); p.rect(5, 17, 4, 3, '#eef'); p.rect(15, 17, 4, 3, '#eef'); },

  sp_reap: (p) => { p.rect(7, 4, 10, 10, '#ece8da'); p.rect(9, 14, 6, 4, '#ece8da'); p.rect(8, 7, 3, 3, '#111'); p.rect(13, 7, 3, 3, '#111'); p.px(10, 16, '#555'); p.px(13, 16, '#555'); p.arc(12, 12, 10, 0.3, 2.8, '#6dff9a'); },
  sp_wealth: (p) => { p.disc(7, 15, 4, '#ffd23e'); p.disc(16, 15, 4, '#ffd23e'); p.disc(12, 9, 5, '#ffe67a'); p.rect(11, 6, 2, 6, '#c6922a'); p.px(4, 4, '#fff'); p.px(20, 6, '#fff'); },
  sp_chain: (p) => { p.disc(12, 14, 7, '#222'); p.rect(11, 3, 2, 5, '#6d4a26'); p.rect(11, 1, 2, 2, '#ff9248'); p.px(9, 11, '#fff'); p.line(6, 19, 3, 22, '#ff5a2a'); p.line(18, 19, 21, 22, '#ff5a2a'); },
  sp_count: (p) => { p.rect(5, 10, 14, 4, '#ffd23e'); p.rect(10, 5, 4, 14, '#ffd23e'); p.rect(10, 5, 4, 1, '#fff'); p.rect(5, 10, 1, 4, '#fff'); },
  sp_stoploss: (p) => { p.line(3, 6, 10, 12, '#e0303a', 2); p.line(10, 12, 14, 9, '#e0303a', 2); p.line(14, 9, 21, 18, '#e0303a', 2); p.rect(3, 19, 18, 1, '#fff'); },
  sp_regen: (p) => { p.line(3, 19, 9, 13, '#4ce07a', 2); p.line(9, 13, 13, 16, '#4ce07a', 2); p.line(13, 16, 21, 6, '#4ce07a', 2); p.rect(17, 5, 5, 2, '#4ce07a'); p.rect(20, 5, 2, 5, '#4ce07a'); },
  sp_ult: (p) => { p.rect(9, 3, 6, 18, '#3a3f49'); p.rect(10, 12, 4, 8, '#ffb338'); p.rect(10, 7, 4, 4, '#ffe07a'); p.rect(11, 1, 2, 2, '#aab4c0'); },
  sp_vamp: (p) => { p.disc(12, 10, 7, '#c02020'); p.rect(7, 15, 3, 5, '#fff'); p.rect(14, 15, 3, 5, '#fff'); p.px(9, 7, '#ffb0b0'); },
  sp_analyst: (p) => { p.rect(4, 5, 16, 12, '#20252e'); p.line(6, 14, 10, 9, '#4ce07a'); p.line(10, 9, 13, 12, '#ff5252'); p.line(13, 12, 18, 7, '#4ce07a'); p.rect(10, 17, 4, 3, '#555'); },
  sp_reset: (p) => { p.arc(12, 12, 8, -2.6, 2.4, '#7ee0ff', 2); p.rect(4, 3, 2, 6, '#7ee0ff'); p.rect(4, 8, 6, 2, '#7ee0ff'); },

  u_reaper: (p) => { scythe(p, '#fff', '#6dff9a', '#222'); p.ring(12, 12, 10, '#6dff9a'); },
  u_gold_storm: (p) => { for (let i = 0; i < 7; i++) p.disc(4 + (i * 7) % 18, 4 + (i * 11) % 17, 2, '#ffd23e'); },
  u_black_devour: (p) => { p.disc(12, 12, 9, '#3a1f6b'); p.disc(12, 12, 5, '#000'); p.arc(12, 12, 8, 0.2, 2.4, '#c27bff', 2); p.arc(12, 12, 8, 3.3, 5.5, '#c27bff', 2); },
  u_thunder: (p) => { p.line(15, 2, 8, 12, '#ffe948', 3); p.line(8, 12, 15, 12, '#ffe948', 3); p.line(15, 12, 8, 22, '#ffe948', 3); },
  u_hellfire: (p) => { p.rect(4, 14, 16, 8, '#c02810'); p.rect(6, 9, 12, 5, '#ff5a2a'); p.rect(9, 4, 6, 5, '#ff9248'); p.rect(11, 1, 2, 3, '#ffe07a'); },
  u_timefreeze: (p) => { p.disc(12, 12, 9, '#a8ecff'); p.disc(12, 12, 7, '#e5f8ff'); p.line(12, 12, 12, 6, '#2e6ea8', 2); p.line(12, 12, 17, 14, '#2e6ea8', 2); },
  u_blades: (p) => { for (let i = 0; i < 5; i++) p.line(4 + i * 4, 21, 8 + i * 3, 4, i % 2 ? '#e5f6ff' : '#9fb8d0', 2); },
  u_final: (p) => { p.rect(7, 3, 10, 10, '#ece8da'); p.rect(9, 13, 6, 4, '#ece8da'); p.rect(8, 6, 3, 3, '#e0303a'); p.rect(13, 6, 3, 3, '#e0303a'); p.line(2, 20, 22, 20, '#e0303a', 3); },

  // 占位（未知、兜底卡片）
  unknown: (p) => { p.rect(5, 3, 14, 18, '#30333c'); p.rect(9, 6, 6, 2, '#aab'); p.rect(14, 8, 2, 3, '#aab'); p.rect(11, 11, 3, 2, '#aab'); p.rect(11, 15, 2, 2, '#aab'); },
  fb_gold: (p) => { p.disc(12, 12, 8, '#ffd23e'); p.ring(12, 12, 8, '#c6922a'); },
  fb_heal: (p) => { p.rect(9, 4, 6, 16, '#e02a4a'); p.rect(4, 9, 16, 6, '#e02a4a'); p.rect(9, 4, 6, 1, '#ff8aa0'); },
};

// ---------- 掉落 ----------
export const PICKUPS: Record<string, { w: number; h: number; draw: (p: Pen) => void }> = {
  xp_small: { w: 9, h: 11, draw: (p) => { p.rect(3, 1, 3, 9, '#58e06a'); p.rect(2, 3, 5, 5, '#58e06a'); p.rect(3, 2, 1, 3, '#d4ffd8'); } },
  xp_big: { w: 13, h: 15, draw: (p) => gem(p, '#44b4ff', '#c8eeff', 6, 7, 6) },
  coin: { w: 11, h: 11, draw: (p) => { p.disc(5, 5, 4, '#ffd23e'); p.ring(5, 5, 4, '#c6922a'); p.rect(5, 3, 1, 5, '#c6922a'); p.px(3, 3, '#fff'); } },
  coin_bag: { w: 15, h: 16, draw: (p) => { p.disc(7, 10, 5.5, '#b98a4a'); p.rect(5, 2, 5, 3, '#9a7038'); p.rect(4, 4, 7, 1, '#6d4a26'); p.disc(7, 10, 2.4, '#ffd23e'); p.px(5, 8, '#e0c08a'); } },
  potion: { w: 13, h: 15, draw: (p) => { p.rect(5, 1, 3, 3, '#c4b488'); p.disc(6, 9, 4.5, '#e02a4a'); p.rect(3, 6, 2, 2, '#ff9ab0'); } },
  bomb: { w: 15, h: 15, draw: (p) => { p.disc(7, 9, 5, '#262830'); p.px(5, 7, '#aab'); p.rect(7, 2, 2, 3, '#6d4a26'); p.rect(9, 1, 2, 2, '#ff9248'); } },
  magnet: { w: 15, h: 15, draw: (p) => { p.arc(7, 6, 5, Math.PI, Math.PI * 2, '#e0303a', 3); p.rect(2, 6, 3, 6, '#e0303a'); p.rect(10, 6, 3, 6, '#e0303a'); p.rect(2, 10, 3, 2, '#eef'); p.rect(10, 10, 3, 2, '#eef'); } },
  shield: { w: 15, h: 16, draw: (p) => { p.rect(3, 2, 9, 8, '#3fb0ff'); for (let y = 0; y < 5; y++) p.rect(3 + y, 10 + y, 9 - y * 2, 1, '#3fb0ff'); p.rect(3, 2, 9, 1, '#b8e6ff'); p.rect(7, 4, 1, 8, '#fff'); } },
  rage: { w: 13, h: 15, draw: (p) => { p.rect(5, 1, 3, 3, '#c4b488'); p.disc(6, 9, 4.5, '#ff7a1c'); p.line(4, 7, 8, 11, '#ffe07a'); } },
  reset: { w: 13, h: 15, draw: (p) => { p.rect(5, 1, 3, 3, '#c4b488'); p.disc(6, 9, 4.5, '#b45cff'); p.rect(4, 7, 2, 2, '#fff'); } },
  fragment: { w: 13, h: 13, draw: (p) => { p.line(2, 10, 6, 2, '#ff9ccd', 2); p.line(6, 2, 10, 8, '#ffd23e', 2); p.line(10, 8, 2, 10, '#7ee0ff', 2); } },
  chest_normal: { w: 21, h: 18, draw: (p) => chest(p, '#8a5a2e', '#b57d44', '#d0d4dc') },
  chest_gold: { w: 21, h: 18, draw: (p) => chest(p, '#d09a24', '#ffd23e', '#fff7c0') },
  chest_rare: { w: 21, h: 18, draw: (p) => chest(p, '#7a3fd0', '#b47bff', '#7ee0ff') },
  chest_boss: { w: 21, h: 18, draw: (p) => chest(p, '#a82020', '#e0404a', '#ffd23e') },
  chest_evo: { w: 21, h: 18, draw: (p) => chest(p, '#14887a', '#3fe0c8', '#fff') },
};
function chest(p: Pen, c: string, c2: string, m: string) {
  p.rect(2, 7, 17, 10, c);
  p.rect(2, 2, 17, 5, c2);
  p.rect(2, 2, 17, 1, m);
  p.rect(2, 7, 17, 1, '#222');
  p.rect(9, 5, 3, 5, m);
  p.rect(2, 2, 2, 15, m);
  p.rect(17, 2, 2, 15, m);
}

// ---------- 特效 ----------
export const FX: Record<string, { w: number; h: number; draw: (p: Pen) => void }> = {
  fx_slash: { w: 64, h: 64, draw: (p) => { p.arc(32, 32, 30, -1.1, 1.1, '#ffffff', 3); p.arc(32, 32, 26, -0.9, 0.9, '#d8e8f4', 3); p.arc(32, 32, 22, -0.6, 0.6, 'rgba(200,220,240,0.6)', 2); } },
  fx_slash_g: { w: 64, h: 64, draw: (p) => { p.arc(32, 32, 30, -1.5, 1.5, '#fff7c0', 3); p.arc(32, 32, 26, -1.2, 1.2, '#ffd23e', 3); p.arc(32, 32, 22, -0.9, 0.9, 'rgba(255,190,60,0.6)', 2); } },
  fx_slash_big: { w: 96, h: 96, draw: (p) => { p.arc(48, 48, 46, -1.75, 1.75, '#ffffff', 4); p.arc(48, 48, 41, -1.6, 1.6, '#b8d4e8', 5); p.arc(48, 48, 35, -1.2, 1.2, 'rgba(180,210,235,0.55)', 4); } },
  fx_blade: { w: 21, h: 21, draw: (p) => { p.arc(10, 10, 8, -2.4, 0.2, '#e5eef6', 3); p.arc(10, 10, 9, -2.2, 0.1, '#ffffff'); p.line(10, 10, 4, 16, '#7a5a36', 2); } },
  fx_blade_gold: { w: 21, h: 21, draw: (p) => { p.arc(10, 10, 8, -2.4, 0.2, '#ffd23e', 3); p.arc(10, 10, 9, -2.2, 0.1, '#fff7c0'); p.line(10, 10, 4, 16, '#a02020', 2); } },
  fx_saw0: { w: 25, h: 25, draw: (p) => saw(p, 0) },
  fx_saw1: { w: 25, h: 25, draw: (p) => saw(p, Math.PI / 8) },
  fx_ice: { w: 19, h: 11, draw: (p) => { p.rect(2, 4, 11, 3, '#8fe4ff'); p.line(13, 4, 17, 5, '#eef'); p.line(13, 6, 17, 5, '#eef'); p.rect(3, 4, 8, 1, '#fff'); p.px(0, 5, '#c6f4ff'); } },
  fx_fire0: { w: 17, h: 21, draw: (p) => flame(p, 0) },
  fx_fire1: { w: 17, h: 21, draw: (p) => flame(p, 1) },
  fx_fire2: { w: 17, h: 21, draw: (p) => flame(p, 2) },
  fx_firezone: { w: 64, h: 64, draw: (p) => { p.disc(32, 32, 30, 'rgba(200,50,16,0.35)'); p.disc(32, 32, 24, 'rgba(255,110,30,0.28)'); p.ring(32, 32, 30, 'rgba(255,170,60,0.75)', 2); } },
  fx_bh0: { w: 64, h: 64, draw: (p) => hole(p, 0) },
  fx_bh1: { w: 64, h: 64, draw: (p) => hole(p, 0.6) },
  fx_bh2: { w: 64, h: 64, draw: (p) => hole(p, 1.2) },
  fx_tornado0: { w: 48, h: 64, draw: (p) => tornado(p, 0) },
  fx_tornado1: { w: 48, h: 64, draw: (p) => tornado(p, 1) },
  fx_tornado2: { w: 48, h: 64, draw: (p) => tornado(p, 2) },
  fx_whirl: { w: 64, h: 64, draw: (p) => { for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; p.arc(32, 32, 28, a, a + 1.6, 'rgba(200,244,255,0.9)', 3); p.arc(32, 32, 22, a + 0.5, a + 1.8, 'rgba(150,220,245,0.6)', 2); } } },
  fx_boom0: { w: 48, h: 48, draw: (p) => { p.disc(24, 24, 8, '#fff'); p.disc(24, 24, 5, '#fffbe0'); } },
  fx_boom1: { w: 48, h: 48, draw: (p) => { p.disc(24, 24, 15, '#ff9248'); p.disc(24, 24, 11, '#ffe07a'); p.disc(24, 24, 6, '#fff'); } },
  fx_boom2: { w: 48, h: 48, draw: (p) => { p.disc(24, 24, 21, '#c02810'); p.disc(24, 24, 17, '#ff9248'); p.disc(24, 24, 10, '#ffe07a'); } },
  fx_boom3: { w: 48, h: 48, draw: (p) => { p.ring(24, 24, 22, '#ff9248', 3); p.ring(24, 24, 17, 'rgba(90,70,60,0.7)', 5); } },
  fx_spark: { w: 5, h: 5, draw: (p) => { p.rect(1, 1, 3, 3, '#fff'); } },
  fx_leaf: { w: 7, h: 5, draw: (p) => { p.rect(1, 1, 5, 2, '#58c23a'); p.px(2, 3, '#3f9e2c'); p.px(5, 0, '#a6ea6c'); } },
  fx_root: { w: 5, h: 5, draw: (p) => { p.rect(1, 1, 3, 3, '#f3f6e6'); } },
  fx_coin: { w: 7, h: 7, draw: (p) => { p.disc(3, 3, 2.4, '#ffd23e'); p.px(2, 2, '#fff'); } },
  fx_ember: { w: 5, h: 5, draw: (p) => { p.rect(1, 1, 3, 3, '#ff9248'); p.px(2, 2, '#ffe07a'); } },
  fx_shard: { w: 7, h: 7, draw: (p) => { p.line(1, 5, 5, 1, '#a8ecff', 2); p.px(3, 3, '#fff'); } },
  fx_smoke: { w: 9, h: 9, draw: (p) => p.disc(4, 4, 3.4, 'rgba(120,120,128,0.8)') },
  fx_shield: { w: 56, h: 56, draw: (p) => { p.ring(28, 28, 26, 'rgba(120,210,255,0.95)', 2); p.disc(28, 28, 24, 'rgba(120,210,255,0.2)'); p.arc(28, 28, 22, -2.6, -1.5, '#fff', 2); } },
  fx_glow: { w: 48, h: 48, draw: (p) => { for (let r = 22; r > 0; r -= 3) p.disc(24, 24, r, `rgba(255,255,255,${0.07})`); } },
  fx_bullet: { w: 9, h: 9, draw: (p) => { p.disc(4, 4, 3, '#ff4f6a'); p.disc(4, 4, 1.4, '#ffd9df'); } },
  fx_bullet_g: { w: 11, h: 11, draw: (p) => { p.disc(5, 5, 4, '#ffd23e'); p.ring(5, 5, 4, '#a0701a'); p.px(4, 3, '#fff'); } },
  fx_fork: { w: 15, h: 11, draw: (p) => { p.rect(0, 5, 9, 1, '#7a5a36'); p.rect(9, 2, 1, 7, '#c6ced6'); p.rect(10, 2, 4, 1, '#c6ced6'); p.rect(10, 5, 4, 1, '#c6ced6'); p.rect(10, 8, 4, 1, '#c6ced6'); } },
  fx_blade_red: { w: 19, h: 19, draw: (p) => { p.arc(9, 9, 7, -2.4, 0.2, '#ff5a5a', 3); p.arc(9, 9, 8, -2.2, 0.1, '#ffd2d2'); p.disc(9, 9, 1.4, '#600'); } },
  fx_bomb: { w: 15, h: 15, draw: (p) => { p.disc(7, 8, 5, '#20222a'); p.rect(4, 7, 7, 2, '#ffd23e'); p.rect(7, 2, 2, 2, '#ff9248'); } },
  fx_badge: { w: 7, h: 7, draw: (p) => { p.rect(1, 1, 5, 5, '#fff'); p.rect(2, 2, 3, 3, '#ddd'); } },
  fx_shadow: { w: 28, h: 9, draw: (p) => { for (let y = 0; y < 9; y++) { const w = Math.round(Math.sqrt(1 - ((y - 4) / 4.5) ** 2) * 13); p.rect(14 - w, y, w * 2, 1, 'rgba(0,0,0,0.3)'); } } },
  fx_dirt: { w: 21, h: 9, draw: (p) => { p.disc(10, 5, 3.6, '#6d4f2e'); p.rect(3, 6, 15, 3, '#7a5a36'); p.px(3, 5, '#5a3f22'); p.px(17, 5, '#5a3f22'); } },
};
function saw(p: Pen, off: number) {
  p.disc(12, 12, 8, '#c4d0da');
  p.disc(12, 12, 3, '#59636f');
  for (let i = 0; i < 8; i++) {
    const a = off + (i / 8) * Math.PI * 2;
    p.line(12 + Math.cos(a) * 8, 12 + Math.sin(a) * 8, 12 + Math.cos(a + 0.35) * 11, 12 + Math.sin(a + 0.35) * 11, '#eef6ff', 2);
  }
}
function flame(p: Pen, f: number) {
  const dx = [0, 1, -1][f];
  p.disc(8, 15, 5.5, '#d03014');
  p.disc(8 + dx, 11, 4.2, '#ff5a2a');
  p.disc(8 - dx, 7, 2.8, '#ff9248');
  p.rect(8 + dx, 1 + f, 1, 3, '#ffb368');
  p.disc(8, 14, 2.6, '#ffe07a');
}
function hole(p: Pen, off: number) {
  p.disc(32, 32, 16, '#160a30');
  p.disc(32, 32, 10, '#000');
  for (let i = 0; i < 3; i++) {
    const a = off + (i / 3) * Math.PI * 2;
    p.arc(32, 32, 24, a, a + 1.5, '#a76bff', 2);
    p.arc(32, 32, 18, a + 0.6, a + 1.9, '#d6b3ff', 1);
    p.arc(32, 32, 29, a + 1, a + 2, 'rgba(120,70,200,0.6)', 1);
  }
}
function tornado(p: Pen, f: number) {
  for (let i = 0; i < 9; i++) {
    const w = 3 + i * 2.2;
    const off = Math.sin(i * 0.9 + f * 2) * 3;
    const y = 58 - i * 6.2;
    p.rect(24 + off - w, y, w * 2, 3, i % 2 ? '#d2f5ff' : '#8fcfe2');
    p.rect(24 + off - w + ((i + f) % 3) * 3, y, 4, 3, '#ffffff');
  }
}

// ---------- 场景物件 ----------
export interface PropArt {
  w: number;
  h: number;
  solid?: number;
  ground?: boolean;
  draw: (p: Pen) => void;
}
const box = (p: Pen, x: number, y: number, w: number, h: number, c: string, top: string, side: string) => {
  p.rect(x, y, w, h, c);
  p.rect(x, y, w, 2, top);
  p.rect(x + w - 2, y, 2, h, side);
};
export const PROPS: Record<string, PropArt> = {
  fence: { w: 30, h: 18, solid: 10, draw: (p) => { p.rect(3, 3, 3, 14, '#a07b45'); p.rect(14, 3, 3, 14, '#a07b45'); p.rect(25, 3, 3, 14, '#a07b45'); p.rect(0, 6, 30, 2, '#b98f55'); p.rect(0, 11, 30, 2, '#8a683a'); } },
  scarecrow: { w: 24, h: 34, solid: 8, draw: (p) => { p.rect(11, 8, 2, 25, '#6d4a26'); p.rect(2, 13, 20, 2, '#6d4a26'); p.rect(7, 12, 10, 12, '#a33a3a'); p.disc(12, 7, 4, '#e0c080'); p.rect(6, 2, 12, 2, '#a07b45'); p.rect(9, 0, 6, 3, '#a07b45'); p.px(10, 6, '#222'); p.px(13, 6, '#222'); p.px(1, 15, '#e0c080'); p.px(22, 15, '#e0c080'); } },
  tool: { w: 18, h: 22, draw: (p) => { p.line(4, 21, 12, 2, '#7a5a36', 2); p.rect(9, 0, 7, 2, '#aab4c0'); p.line(16, 21, 12, 8, '#6d4a26', 2); p.rect(13, 4, 2, 4, '#aab4c0'); } },
  shed: { w: 54, h: 50, solid: 26, draw: (p) => { box(p, 4, 20, 46, 28, '#8a5a2e', '#a97440', '#6d4522'); for (let i = 0; i < 12; i++) p.rect(i * 4 + 2, 16 - Math.abs(i - 6) * 2.3 + 2, 4, 6 + Math.abs(6 - Math.abs(i - 6)) * 0 + 4, '#a83a2e'); p.rect(2, 19, 50, 3, '#7a2820'); p.rect(21, 32, 12, 16, '#4a2e14'); p.rect(8, 28, 8, 7, '#a8dcf0'); p.rect(38, 28, 8, 7, '#a8dcf0'); } },
  grass: { w: 9, h: 7, ground: true, draw: (p) => { p.rect(1, 3, 1, 3, '#4c9c3c'); p.rect(4, 1, 1, 5, '#58ad45'); p.rect(7, 3, 1, 3, '#4c9c3c'); } },
  flower: { w: 7, h: 8, ground: true, draw: (p) => { p.rect(3, 4, 1, 4, '#3f8a2c'); p.rect(2, 1, 3, 3, '#f2d84a'); p.px(3, 2, '#e0404a'); } },
  ledscreen: { w: 58, h: 42, solid: 22, draw: (p) => { p.rect(2, 2, 54, 30, '#16181f'); p.rect(4, 4, 50, 26, '#0a2a1a'); let y = 20; for (let x = 6; x < 50; x += 4) { const ny = 8 + ((x * 37) % 19); p.line(x, y, x + 4, ny, ny < y ? '#4ce07a' : '#ff4f4f'); y = ny; } p.rect(24, 32, 10, 8, '#555b66'); p.rect(14, 40, 30, 2, '#3a3f49'); } },
  coinstatue: { w: 30, h: 40, solid: 14, draw: (p) => { p.rect(6, 30, 18, 10, '#6f7886'); p.rect(6, 30, 18, 2, '#9aa4b2'); p.disc(15, 15, 13, '#d0a52a'); p.disc(15, 15, 10, '#ffd23e'); p.rect(13, 8, 4, 14, '#c6922a'); p.px(10, 9, '#fff'); } },
  billboard: { w: 54, h: 44, solid: 12, draw: (p) => { p.rect(8, 26, 3, 18, '#555'); p.rect(43, 26, 3, 18, '#555'); p.rect(0, 0, 54, 28, '#ffffff'); p.rect(2, 2, 50, 24, '#2e6ea8'); p.rect(6, 6, 22, 3, '#ffd23e'); p.rect(6, 12, 16, 2, '#fff'); p.rect(6, 17, 20, 2, '#fff'); p.line(32, 21, 40, 13, '#4ce07a', 2); p.line(40, 13, 48, 7, '#4ce07a', 2); } },
  desk: { w: 34, h: 26, solid: 13, draw: (p) => { p.rect(1, 12, 32, 5, '#70503a'); p.rect(2, 17, 3, 9, '#55392a'); p.rect(29, 17, 3, 9, '#55392a'); p.rect(10, 1, 14, 10, '#20242c'); p.rect(11, 2, 12, 8, '#163a5c'); p.line(12, 8, 22, 4, '#4ce07a'); } },
  papers: { w: 11, h: 7, ground: true, draw: (p) => { p.rect(1, 2, 7, 4, '#d8d8cc'); p.rect(3, 1, 7, 4, '#eeeee2'); p.rect(4, 2, 5, 1, '#888'); } },
  coinpile: { w: 13, h: 9, ground: true, draw: (p) => { p.disc(3, 6, 2, '#d0a52a'); p.disc(8, 6, 2.4, '#ffd23e'); p.disc(6, 3, 2, '#ffe67a'); } },
  deadtree: { w: 34, h: 46, solid: 9, draw: (p) => { p.line(16, 45, 16, 18, '#2c2420', 4); p.line(17, 26, 6, 11, '#2c2420', 2); p.line(18, 22, 28, 6, '#2c2420', 2); p.line(10, 16, 3, 16, '#2c2420'); p.line(25, 11, 32, 13, '#2c2420'); p.line(17, 16, 15, 3, '#2c2420', 2); p.px(5, 10, '#5a1f1f'); } },
  brokenexchange: { w: 66, h: 52, solid: 28, draw: (p) => { box(p, 4, 14, 58, 36, '#3a3c44', '#5a5d68', '#2a2c33'); for (let x = 8; x < 58; x += 12) p.rect(x, 18, 5, 32, '#50535e'); p.rect(0, 10, 44, 5, '#62656f'); p.line(44, 10, 52, 20, '#1a1a20', 3); p.rect(16, 3, 24, 7, '#62656f'); p.rect(40, 30, 20, 20, '#1a1a20'); p.rect(20, 5, 14, 2, '#ff3b3b'); } },
  redlamp: { w: 14, h: 40, solid: 5, draw: (p) => { p.rect(6, 12, 2, 28, '#3a3a42'); p.rect(3, 38, 8, 2, '#2a2a32'); p.disc(7, 7, 6, '#ff3b3b'); p.disc(7, 6, 3, '#ffc0c0'); } },
  rubble: { w: 17, h: 11, ground: true, draw: (p) => { p.rect(1, 6, 7, 4, '#5c5f68'); p.rect(6, 3, 8, 7, '#6e717b'); p.rect(6, 3, 8, 1, '#8b8e98'); p.rect(12, 7, 4, 3, '#50535c'); } },
  labdesk: { w: 34, h: 26, solid: 13, draw: (p) => { p.rect(0, 13, 34, 5, '#b4c0cc'); p.rect(1, 18, 3, 8, '#7a8694'); p.rect(30, 18, 3, 8, '#7a8694'); p.rect(4, 5, 4, 8, '#7ae0c7'); p.rect(5, 3, 2, 2, '#c6fff0'); p.rect(14, 7, 6, 6, '#ff9ccd'); p.rect(16, 4, 2, 3, '#ffd9ec'); p.rect(25, 3, 6, 10, '#a8ecff'); } },
  pod: { w: 28, h: 46, solid: 13, draw: (p) => { p.rect(2, 38, 24, 8, '#4f5763'); p.rect(2, 2, 24, 6, '#4f5763'); p.rect(4, 8, 20, 30, '#2ccfa8'); p.rect(4, 8, 4, 30, '#9affea'); p.rect(12, 16, 4, 20, '#79d34c'); p.rect(11, 12, 2, 5, '#3f9e2c'); p.rect(15, 12, 2, 5, '#3f9e2c'); p.px(13, 20, '#111'); p.px(15, 20, '#111'); } },
  machine: { w: 44, h: 42, solid: 20, draw: (p) => { box(p, 2, 6, 40, 36, '#4a525e', '#6f7886', '#363c46'); p.rect(6, 10, 14, 10, '#101820'); p.line(8, 16, 18, 14, '#4ce07a'); p.disc(30, 15, 5, '#2a2f38'); p.disc(30, 15, 2, '#ff3b3b'); for (let i = 0; i < 4; i++) p.rect(7 + i * 7, 26, 5, 3, i % 2 ? '#ffb338' : '#7ee0ff'); p.rect(4, 34, 34, 4, '#2a2f38'); } },
  turretprop: { w: 28, h: 32, solid: 12, draw: (p) => { p.rect(5, 22, 18, 10, '#4f5763'); p.rect(8, 8, 12, 14, '#6f7886'); p.rect(20, 11, 8, 3, '#2d333c'); p.rect(11, 12, 2, 2, '#ffcc33'); p.rect(12, 3, 2, 5, '#39414b'); } },
  cable: { w: 25, h: 9, ground: true, draw: (p) => { p.line(0, 4, 8, 7, '#2a2f38', 2); p.line(8, 7, 16, 2, '#2a2f38', 2); p.line(16, 2, 24, 5, '#2a2f38', 2); } },
  floorlight: { w: 13, h: 7, ground: true, draw: (p) => { p.rect(1, 2, 11, 3, '#26c6da'); p.rect(3, 3, 7, 1, '#d0fbff'); } },
  goldbuilding: { w: 66, h: 66, solid: 30, draw: (p) => { box(p, 6, 22, 54, 44, '#d0a52a', '#ffe67a', '#a57c1a'); for (let i = 0; i < 4; i++) p.rect(11 + i * 12, 30, 6, 24, '#fff0b0'); p.rect(26, 50, 14, 16, '#70501a'); for (let i = 0; i < 12; i++) p.rect(10 + i * 4, 21 - (6 - Math.abs(i - 6)) * 3, 4, (6 - Math.abs(i - 6)) * 3 + 2, '#ffd23e'); } },
  manor: { w: 66, h: 54, solid: 30, draw: (p) => { box(p, 4, 20, 58, 34, '#f0e6d0', '#fff', '#c6b89a'); p.rect(0, 16, 66, 5, '#a83a3a'); p.rect(4, 10, 58, 6, '#c04a4a'); p.rect(28, 36, 10, 18, '#6d4a26'); for (const x of [10, 20, 42, 52]) p.rect(x, 26, 6, 9, '#7ec8e8'); p.rect(30, 22, 6, 8, '#ffd23e'); } },
  fountain: { w: 46, h: 38, solid: 20, draw: (p) => { p.disc(23, 26, 20, '#b4bcc6'); p.disc(23, 26, 16, '#ffd23e'); p.disc(23, 26, 13, '#ffe67a'); p.rect(21, 8, 4, 18, '#d0d6dc'); p.disc(23, 8, 6, '#ffd23e'); p.px(18, 5, '#fff'); p.px(28, 3, '#fff'); p.px(33, 14, '#ffd23e'); p.px(13, 14, '#ffd23e'); } },
  goldstatue: { w: 26, h: 44, solid: 11, draw: (p) => { p.rect(4, 36, 18, 8, '#6f7886'); p.rect(4, 36, 18, 2, '#9aa4b2'); p.rect(9, 14, 8, 22, '#ffd23e'); p.rect(9, 14, 2, 22, '#fff0b0'); p.line(9, 14, 4, 6, '#ffd23e', 3); p.line(16, 14, 21, 6, '#ffd23e', 3); p.rect(12, 8, 2, 7, '#d0a52a'); p.px(10, 16, '#a57c1a'); p.px(15, 16, '#a57c1a'); } },
  hedge: { w: 34, h: 20, solid: 12, draw: (p) => { p.rect(1, 6, 32, 14, '#2f7a38'); for (let x = 2; x < 32; x += 5) p.disc(x, 7, 3, '#3f9a48'); for (let x = 3; x < 31; x += 6) p.px(x, 12, '#5abf62'); } },
  warruin: { w: 30, h: 22, solid: 13, draw: (p) => { p.rect(1, 12, 28, 10, '#5c5450'); p.rect(4, 4, 7, 8, '#6e6660'); p.rect(18, 8, 8, 4, '#6e6660'); p.line(9, 22, 14, 13, '#2a2522', 2); p.rect(4, 4, 7, 1, '#8c837c'); } },
  bunker: { w: 62, h: 40, solid: 28, draw: (p) => { p.rect(2, 12, 58, 28, '#4f5340'); p.rect(8, 6, 46, 6, '#5f6450'); p.rect(2, 12, 58, 2, '#73795f'); p.rect(14, 22, 34, 5, '#14160f'); p.rect(24, 22, 14, 3, '#3a3a2a'); } },
  flag: { w: 26, h: 42, solid: 5, draw: (p) => { p.rect(3, 2, 2, 40, '#6d4a26'); p.rect(5, 3, 20, 13, '#e0303a'); p.rect(11, 5, 2, 9, '#a6ea6c'); p.rect(8, 7, 3, 4, '#58c23a'); p.rect(13, 7, 3, 4, '#58c23a'); p.rect(0, 40, 8, 2, '#3a3a3a'); } },
  camp: { w: 44, h: 32, solid: 19, draw: (p) => { for (let i = 0; i < 16; i++) p.rect(22 - i * 1.3, 4 + i * 1.7, i * 2.6 + 2, 2, i % 3 ? '#5f6a3f' : '#4f5a32'); p.rect(19, 18, 6, 13, '#23261a'); p.rect(0, 30, 44, 2, '#3a3f28'); } },
  sandbag: { w: 32, h: 16, solid: 11, draw: (p) => { for (let i = 0; i < 4; i++) p.rect(i * 8, 8, 7, 7, '#a89670'); for (let i = 0; i < 3; i++) p.rect(i * 8 + 4, 2, 7, 6, '#bda982'); } },
  skyscraper: { w: 66, h: 96, solid: 30, draw: (p) => { box(p, 8, 8, 50, 88, '#23283a', '#3a4258', '#171a28'); for (let y = 14; y < 90; y += 7) for (let x = 13; x < 52; x += 7) p.rect(x, y, 4, 4, (x * y) % 5 === 0 ? '#ffd23e' : '#37405a'); p.rect(30, 0, 5, 8, '#555b70'); p.px(32, 0, '#ff3b3b'); } },
  floatcoin: { w: 15, h: 17, ground: true, draw: (p) => { p.disc(7, 6, 5, '#ffd23e'); p.rect(6, 3, 2, 6, '#c6922a'); p.px(5, 3, '#fff'); p.rect(3, 15, 9, 1, 'rgba(0,0,0,0.3)'); } },
  giantscythe: { w: 64, h: 96, solid: 14, draw: (p) => { p.rect(22, 84, 22, 12, '#3a3f4e'); p.line(32, 88, 42, 12, '#48414a', 5); p.arc(26, 26, 24, -2.6, -0.3, '#a8b6c4', 6); p.arc(26, 26, 27, -2.5, -0.4, '#eaf2fa', 2); } },
};

export const TILE_STYLES = [
  { base: '#5aa346', a: '#4f9640', b: '#67b24f', mark: '#7ac05e', kind: 'grass' },
  { base: '#37404f', a: '#2f3845', b: '#414b5c', mark: '#505c70', kind: 'floor' },
  { base: '#1e2028', a: '#191b22', b: '#25272f', mark: '#4a1a1e', kind: 'dark' },
  { base: '#2b3a44', a: '#25333c', b: '#33434e', mark: '#2ca89a', kind: 'tech' },
  { base: '#8a6f34', a: '#7d632d', b: '#987c3c', mark: '#d0a52a', kind: 'marble' },
  { base: '#4e4638', a: '#453e31', b: '#584f40', mark: '#2f2a22', kind: 'war' },
  { base: '#191c2b', a: '#141724', b: '#202437', mark: '#6a5a20', kind: 'peak' },
];
