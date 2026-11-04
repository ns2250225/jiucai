import type { RunStats } from '../game/types';

export interface ShopItem {
  id: string;
  name: string;
  desc: string;
  key: string;
  perLevel: number;
  unit: string;
  max: number;
  base: number;
  icon: string;
}

// 局外强化：等级上限与涨价曲线共同限制“刷金币碾压”
export const SHOP_ITEMS: ShopItem[] = [
  { id: 'hp', name: '生命强化', desc: '最大生命', key: 'hp', perLevel: 5, unit: '', max: 10, base: 120, icon: 'i_stat_hp' },
  { id: 'atk', name: '攻击强化', desc: '基础伤害', key: 'damage', perLevel: 0.05, unit: '%', max: 8, base: 200, icon: 'i_stat_damage' },
  { id: 'spd', name: '移速强化', desc: '移动速度', key: 'speed', perLevel: 0.05, unit: '%', max: 5, base: 180, icon: 'i_stat_speed' },
  { id: 'luck', name: '幸运强化', desc: '幸运值', key: 'luck', perLevel: 0.05, unit: '%', max: 8, base: 150, icon: 'i_stat_luck' },
  { id: 'gold', name: '金币强化', desc: '金币收益', key: 'gold', perLevel: 0.05, unit: '%', max: 10, base: 180, icon: 'i_stat_gold' },
  { id: 'xp', name: '经验强化', desc: '经验收益', key: 'xp', perLevel: 0.05, unit: '%', max: 8, base: 180, icon: 'i_stat_xp' },
  { id: 'range', name: '收割范围', desc: '攻击范围', key: 'range', perLevel: 0.05, unit: '%', max: 6, base: 200, icon: 'i_stat_range' },
  { id: 'magnet', name: '磁铁强化', desc: '道具吸收范围', key: 'magnet', perLevel: 0.1, unit: '%', max: 6, base: 100, icon: 'i_stat_magnet' },
];

export function shopPrice(item: ShopItem, level: number) {
  return Math.round((item.base * Math.pow(1.55, level)) / 10) * 10;
}

export interface SkinDef {
  id: string;
  name: string;
  desc: string;
  price: number;
}
export const SKINS: SkinDef[] = [
  { id: 'default', name: '原版配色', desc: '每个角色自己的长袍', price: 0 },
  { id: 'skin_bone', name: '白骨长袍', desc: '干净、体面、合规的收割。', price: 1500 },
  { id: 'skin_leek', name: '韭菜卧底', desc: '混入韭菜内部，从根部瓦解。', price: 2500 },
  { id: 'skin_neon', name: '霓虹量化', desc: '高频交易专用夜行衣。', price: 4000 },
  { id: 'skin_gold', name: '黄金屠夫', desc: '钱是身外之物，所以穿在身外。', price: 8000 },
];

export const COMBO_FRAGMENT_COST = 3;

export function xpToNext(level: number) {
  return Math.floor(8 + 4 * level + 0.25 * level * level);
}

export const TITLES: { name: string; desc: string; test: (r: RunStats) => boolean }[] = [
  { name: '反抗镇压者', desc: '击败韭菜联合会主席', test: (r) => r.chairmanDead },
  { name: '镰刀艺术家', desc: '单局击杀 10000 根', test: (r) => r.kills >= 10000 },
  { name: '资本大魔王', desc: '单局获得 50000 金币', test: (r) => r.gold >= 50000 },
  { name: '韭菜公敌', desc: '引发韭菜起义', test: (r) => r.uprisings > 0 },
  { name: '金融收割机', desc: '获得 10000 金币', test: (r) => r.gold >= 10000 },
  { name: '韭菜终结者', desc: '收割 1000 根', test: (r) => r.kills >= 1000 },
  { name: '初级割草工', desc: '收割 100 根', test: (r) => r.kills >= 100 },
];

export function computeTitles(r: RunStats) {
  const list = TITLES.filter((t) => t.test(r)).map((t) => t.name);
  return list.length ? list : ['韭菜的朋友'];
}

export function computeRating(r: RunStats) {
  let score = r.time / 6 + r.kills / 25 + r.eliteKills * 2 + r.bossKills * 25 + r.weaponEvos * 10 + r.gold / 150;
  if (r.won) score += 60;
  if (r.chairmanDead) score += 80;
  if (score >= 420) return 'SSS';
  if (score >= 320) return 'SS';
  if (score >= 240) return 'S';
  if (score >= 160) return 'A';
  if (score >= 90) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

export const QUIPS = {
  kill: ['恭喜，你成功帮助一根韭菜实现了人生价值。', '这不是收割，这是资源优化。', '韭菜虽然倒下了，但它的梦想还在。', '感谢这根韭菜对本局收益的贡献。', '长期主义者，短期被收割。', '这根韭菜，曾经也想财务自由。', '价值投资，投完就没了。'],
  level: ['恭喜获得新的收割工具。', '技术进步，收割效率再次提高。', '你的镰刀已经通过了韭菜安全委员会认证。', '这不是外挂，这是先进生产力。'],
  death: ['你被韭菜成功反收割。', '资本的镰刀也有钝掉的一天。', '本局收益已全部归零。', '韭菜终于赢了一次。'],
  win: ['韭菜田恢复了平静。下一茬，已在路上。', '恭喜完成本季度收割指标。', '韭菜联合会宣布：我们还会回来的，割不完的。'],
};
