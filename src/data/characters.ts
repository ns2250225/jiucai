import type { SaveData } from '../services/SaveService';

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  desc: string;
  ability: string;
  skill?: string;
  hp: number;
  speed: number;
  damage: number;
  range: number;
  atkSpeed: number;
  luck: number;
  gold: number;
  xp: number;
  magnet: number;
  lightning: number;
  pull: number;
  ultCd: number;
  startWeapon: string;
  ult: string;
  price: number | null;
  unlockText: string;
  unlocked: (s: SaveData) => boolean;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'reaper', name: '神秘收割者', title: '资本的右手', desc: '黑色长袍、兜帽、手持普通镰刀。一切均衡，除了他的良心。',
    ability: '死亡收割：每 60 秒发动一次范围收割，对周围韭菜造成高额伤害', skill: 'reap',
    hp: 100, speed: 1, damage: 1, range: 1, atkSpeed: 1, luck: 1, gold: 1, xp: 1, magnet: 1, lightning: 1, pull: 1, ultCd: 1,
    startWeapon: 'scythe', ult: 'reaper', price: 0, unlockText: '默认解锁', unlocked: () => true,
  },
  {
    id: 'capitalist', name: '贪婪资本家', title: '财富收割流', desc: '不赚最后一分钱，那是不可能的。身板脆，但钱多。',
    ability: '金币获取增加 30%，移动略慢',
    hp: 85, speed: 0.95, damage: 1, range: 1, atkSpeed: 1, luck: 1.15, gold: 1.3, xp: 1, magnet: 1.2, lightning: 1, pull: 1, ultCd: 1,
    startWeapon: 'scythe', ult: 'gold_storm', price: 3000, unlockText: '累计获得 10000 金币',
    unlocked: (s) => s.totalGoldEarned >= 10000,
  },
  {
    id: 'farmer', name: '疯狂农夫', title: '范围收割流', desc: '祖传三代种韭菜，第四代决定全割了。皮糙肉厚，出手大开大合。',
    ability: '攻击范围增加 20%，生命更高，攻速略慢',
    hp: 125, speed: 0.95, damage: 1, range: 1.2, atkSpeed: 0.92, luck: 0.95, gold: 1, xp: 1, magnet: 1, lightning: 1, pull: 1, ultCd: 1,
    startWeapon: 'whirl', ult: 'hellfire', price: 2500, unlockText: '累计收割 5000 根韭菜',
    unlocked: (s) => s.totalKills >= 5000,
  },
  {
    id: 'flash', name: '闪电收割者', title: '闪电连锁流', desc: '跑得比韭菜听到利空时还快。一身导电的高定长袍。',
    ability: '闪电伤害增加 30%，移动更快，生命较低',
    hp: 80, speed: 1.15, damage: 1, range: 1, atkSpeed: 1.05, luck: 1, gold: 1, xp: 1, magnet: 1, lightning: 1.3, pull: 1, ultCd: 1,
    startWeapon: 'lightning', ult: 'thunder', price: 3500, unlockText: '使用闪电击杀 500 根韭菜',
    unlocked: (s) => s.lightningKills >= 500,
  },
  {
    id: 'doctor', name: '黑洞博士', title: '黑洞吞噬流', desc: '研究流动性黑洞多年，顺手做了个真的。',
    ability: '吸引范围增加 30%，经验获取提升，近身偏弱',
    hp: 90, speed: 1, damage: 0.95, range: 1, atkSpeed: 1, luck: 1, gold: 1, xp: 1.15, magnet: 1.3, lightning: 1, pull: 1.3, ultCd: 1,
    startWeapon: 'blackhole', ult: 'black_devour', price: 4000, unlockText: '解锁黑洞镰刀',
    unlocked: (s) => s.unlockedWeapons.includes('blackhole'),
  },
  {
    id: 'judge', name: '末日审判官', title: '终极爆发流', desc: '韭菜联合会主席的继任者，把审判写进了每一次大招。',
    ability: '大招冷却减少 30%，伤害更高，金币获取略低',
    hp: 100, speed: 1, damage: 1.1, range: 1, atkSpeed: 1, luck: 1, gold: 0.9, xp: 1, magnet: 1, lightning: 1, pull: 1, ultCd: 0.7,
    startWeapon: 'scythe', ult: 'final', price: null, unlockText: '击败最终 BOSS',
    unlocked: (s) => s.chairmanKills > 0,
  },
];
export const CHAR_MAP: Record<string, CharacterDef> = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
