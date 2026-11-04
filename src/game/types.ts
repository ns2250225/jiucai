export type DType = 'melee' | 'ranged' | 'fire' | 'lightning' | 'frost' | 'void';
export type EvoLineId = DType | 'moving' | 'camping';
export const DTYPES: DType[] = ['melee', 'ranged', 'fire', 'lightning', 'frost', 'void'];
export const DTYPE_NAMES: Record<DType, string> = { melee: '近战', ranged: '远程', fire: '火焰', lightning: '闪电', frost: '冰霜', void: '黑洞' };

export interface WeaponStats {
  damage: number;
  interval: number;
  range: number;
  count: number;
  pierce: number;
  critRate: number;
  critDmg: number;
  duration: number;
  cooldown: number;
  special?: number;
  speed?: number;
  pull?: number;
  chainRange?: number;
  slow?: number;
  width?: number;
  sawRadius?: number;
  arc?: number;
}
export interface WeaponGrowth {
  mul?: Partial<Record<keyof WeaponStats, number>>;
  add?: Partial<Record<keyof WeaponStats, number>>;
  text: string;
}
export interface WeaponDef {
  id: string;
  name: string;
  kind: string;
  dtype: DType;
  behavior: string;
  desc: string;
  special: string;
  price?: number;
  evolved?: boolean;
  from?: string;
  stats: WeaponStats;
  growth: WeaponGrowth[];
}
export interface PassiveDef {
  id: string;
  name: string;
  desc: string;
  effects: Record<string, number>;
  max: number;
  rare?: boolean;
  locked?: boolean;
  price?: number;
  evolves?: string;
}
export interface StatDef {
  id: string;
  name: string;
  desc: string;
  key: string;
  value: number;
}
export interface SpecialDef {
  id: string;
  name: string;
  desc: string;
  flag: string;
  max: number;
}
export interface UltDef {
  id: string;
  name: string;
  desc: string;
  price: number;
}
export interface EnemyDef {
  id: string;
  name: string;
  group: 'normal' | 'special' | 'elite' | 'unit' | 'boss';
  ai: string;
  hp: number;
  speed: number;
  dmg: number;
  xp: number;
  goldChance: number;
  gold: number;
  radius: number;
  scale?: number;
  knockRes?: number;
  pack?: number;
  attack: string;
  ability: string;
  react: string;
}
export interface BossDef {
  id: string;
  name: string;
  ai: string;
  hp: number;
  speed: number;
  dmg: number;
  radius: number;
  scale: number;
  gold: number;
  xp: number;
  revives?: number;
  look: string;
  skills: string[];
  trait: string;
  quote: string;
}
export interface MapPhase {
  until: number;
  pool: Record<string, number>;
}
export interface MapDef {
  id: string;
  name: string;
  theme: string;
  desc: string;
  mechanic: string;
  price: number;
  difficulty: number;
  spawnRate: number;
  goldMul: number;
  evoSpeed: number;
  evoStart: number;
  eliteEvery: number;
  techEvery?: number;
  towerEvery?: number;
  attackFreq?: number;
  flags: { market?: boolean; devalue?: boolean; lab?: boolean; towers?: boolean; organized?: boolean; allKinds?: boolean };
  props: [string, number][];
  bossMid: string;
  bossFinal: string;
  bossMidScale: number;
  events: string[];
  phases: MapPhase[];
}
export interface EventMods {
  spawn?: number;
  drop?: number;
  flee?: number;
  aggro?: number;
  playerDmg?: number;
  enemyDmg?: number;
  gold?: number;
}
export interface EventDef {
  id: string;
  name: string;
  duration: number;
  mods?: EventMods;
  action?: string;
  reward: number;
  announce: string;
  result: string;
  exclusive?: boolean;
}
export interface EvoLineDef {
  id: EvoLineId;
  name: string;
  trigger: string;
  tint: string;
  weak: string;
  behavior: string;
  research: string;
  done: string;
}
export interface EvoLevelDef {
  name: string;
  resist: number;
  hp: number;
  mutChance: number;
}
export interface WeaponEvoDef {
  base: string;
  passive: string;
  result: string;
  effect: string;
}
export interface ComboDef {
  id: string;
  name: string;
  a: string[];
  b: string[];
  desc: string;
}

export interface PlayerStats {
  maxHp: number;
  speed: number;
  damage: number;
  range: number;
  atkSpeed: number;
  luck: number;
  gold: number;
  xp: number;
  magnet: number;
  crit: number;
  armor: number;
  leekDmg: number;
  eliteGold: number;
  lightning: number;
  pull: number;
  ultCharge: number;
  ultCd: number;
  extraCount: number;
  regen: number;
  vamp: number;
}

export interface RunStats {
  mapId: string;
  charId: string;
  endless: boolean;
  won: boolean;
  time: number;
  level: number;
  kills: number;
  gold: number;
  goldenKills: number;
  eliteKills: number;
  bossKills: number;
  maxCombo: number;
  maxBurst: number;
  weaponEvos: number;
  antiEvos: number;
  techDestroyed: number;
  coresDestroyed: number;
  scientistKills: number;
  events: number;
  uprisings: number;
  chests: number;
  ultCasts: number;
  maxUltKills: number;
  lightningKills: number;
  voidEaten: number;
  frozen: number;
  damageTaken: number;
  revivesUsed: number;
  chairmanDead: boolean;
  byType: Record<string, number>;
  byWeapon: Record<string, { name: string; damage: number; kills: number }>;
  kindKills: Record<string, number>;
  weaponsUsed: string[];
  passivesUsed: string[];
  combos: string[];
  evoLevels: Record<string, number>;
  maxEvoLevel: number;
  fragments: number;
  title?: string;
  titles?: string[];
  rating?: string;
  newAchievements?: string[];
}

export interface StartConfig {
  charId: string;
  weaponId: string;
  mapId: string;
  ultId: string;
  skin: string;
  endless: boolean;
}

export interface UpgradeCard {
  id: string;
  type: 'weapon_new' | 'weapon_up' | 'passive' | 'stat' | 'special' | 'fallback';
  typeName: string;
  name: string;
  desc: string;
  icon: string;
  level: number;
  nextLevel: number;
  maxLevel: number;
  rarity: 'common' | 'rare' | 'epic' | 'legend';
  value?: number;
  hint?: string;
}

export interface HudChip {
  id: string;
  name: string;
  icon: string;
  level: number;
  max: number;
  evolved?: boolean;
  ready?: boolean;
}
export interface HudEvo {
  id: string;
  name: string;
  level: number;
  progress: number;
  color: string;
  blocked: boolean;
}
export interface HudState {
  time: number;
  wave: number;
  kills: number;
  gold: number;
  level: number;
  xp: number;
  xpMax: number;
  hp: number;
  hpMax: number;
  ult: number;
  ultMax: number;
  ultName: string;
  ultReady: boolean;
  ultCd: number;
  boss: { name: string; hp: number; max: number; phase: string } | null;
  weapons: HudChip[];
  passives: HudChip[];
  evo: HudEvo[];
  market: number | null;
  shield: number;
  rage: number;
  combo: number;
  event: { name: string; remain: number } | null;
  phase: string;
  revives: number;
  endless: boolean;
}
export const WORLD_SIZE = 3200;
