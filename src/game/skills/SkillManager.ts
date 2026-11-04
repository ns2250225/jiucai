import Phaser from 'phaser';
import type { BattleScene } from '../scenes/BattleScene';
import { BASE_WEAPONS, PASSIVE_MAP, SPECIALS, STATS, WEAPON_MAP, WEAPON_EVOS } from '../data';
import type { UpgradeCard } from '../types';
import { MAX_WEAPON_LEVEL, MAX_WEAPON_SLOTS } from '../weapons/WeaponManager';
import { GameManager } from '../GameManager';

const MAX_PASSIVE_SLOTS = 8;
const RARITY_NAMES = { common: '普通', rare: '稀有', epic: '史诗', legend: '传说' };
const RARITY_MUL = { common: 1, rare: 1.5, epic: 2.2, legend: 3.5 };
const RARITY_ORDER: UpgradeCard['rarity'][] = ['common', 'rare', 'epic', 'legend'];

interface Candidate {
  card: UpgradeCard;
  weight: number;
}

/** 升级三选一：生成候选卡、按权重抽取、应用选择 */
export class SkillManager {
  flags: Record<string, number> = {};
  reapLevel = 0;

  constructor(private scene: BattleScene) {}

  flag(f: string) {
    return this.flags[f] ?? 0;
  }

  private rollRarity(): UpgradeCard['rarity'] {
    const luck = this.scene.pstats.luck;
    const r = Math.random() / luck;
    if (r < 0.015) return 'legend';
    if (r < 0.08) return 'epic';
    if (r < 0.28) return 'rare';
    return 'common';
  }

  private candidates(): Candidate[] {
    const s = this.scene;
    const out: Candidate[] = [];
    const w = s.weapons;
    const unlocked = s.profile.unlockedWeapons;

    for (const wp of w.owned) {
      if (wp.def.evolved || wp.level >= MAX_WEAPON_LEVEL) continue;
      const g = wp.def.growth[wp.level - 1];
      out.push({
        weight: wp.level >= 5 ? 7 : 5,
        card: {
          id: wp.def.id, type: 'weapon_up', typeName: '武器升级', name: wp.def.name, desc: g?.text ?? '强化',
          icon: `w_${wp.def.id}`, level: wp.level, nextLevel: wp.level + 1, maxLevel: MAX_WEAPON_LEVEL,
          rarity: wp.level >= 6 ? 'epic' : wp.level >= 4 ? 'rare' : 'common',
          hint: wp.level + 1 === 7 ? wp.def.special : undefined,
        },
      });
    }
    if (w.owned.length < MAX_WEAPON_SLOTS) {
      for (const def of BASE_WEAPONS) {
        if (!unlocked.includes(def.id) || w.get(def.id)) continue;
        // 已进化的基础武器不再出现
        const evolvedOwned = WEAPON_EVOS.some((e) => e.base === def.id && w.get(e.result));
        if (evolvedOwned) continue;
        out.push({
          weight: 3.2,
          card: {
            id: def.id, type: 'weapon_new', typeName: '新武器', name: def.name, desc: def.desc, icon: `w_${def.id}`,
            level: 0, nextLevel: 1, maxLevel: MAX_WEAPON_LEVEL, rarity: 'rare', hint: def.kind,
          },
        });
      }
    }
    const slotsFree = s.passives.owned.size < MAX_PASSIVE_SLOTS;
    for (const def of s.passives.available()) {
      const lv = s.passives.level(def.id);
      if (lv >= def.max) continue;
      if (lv === 0 && !slotsFree) continue;
      let weight = lv > 0 ? 3 : 2;
      let hint: string | undefined;
      // 拥有对应武器时，进化素材更容易刷到
      const evo = WEAPON_EVOS.find((e) => e.passive === def.id);
      if (evo) {
        const owned = w.get(evo.base);
        if (def.rare && !owned) weight = 0.25;
        if (owned) {
          weight = def.rare ? 4 : weight + 1.5;
          hint = `${WEAPON_MAP[evo.base].name} Lv8 进化为 ${WEAPON_MAP[evo.result].name}`;
        }
      }
      out.push({
        weight,
        card: {
          id: def.id, type: 'passive', typeName: def.rare ? '稀有被动' : '被动道具', name: def.name, desc: def.desc, icon: `i_${def.id}`,
          level: lv, nextLevel: lv + 1, maxLevel: def.max, rarity: def.rare ? 'epic' : 'common', hint,
        },
      });
    }
    for (const def of STATS) {
      const rarity = this.rollRarity();
      const value = def.value * RARITY_MUL[rarity];
      const desc = def.desc.replace('{v}', String(Math.round(value * 100))).replace('{n}', String(Math.round(value)));
      out.push({
        weight: 1.3,
        card: {
          id: def.id, type: 'stat', typeName: '属性强化', name: def.name, desc, icon: `i_${def.id}`,
          level: 0, nextLevel: 1, maxLevel: 1, rarity, value,
        },
      });
    }
    for (const def of SPECIALS) {
      const lv = this.flag(def.flag);
      if (lv >= def.max) continue;
      if (def.flag === 'resetEvo' && s.stats.antiEvos === 0) continue;
      if (def.flag === 'analyst' && s.simTime < 120) continue;
      out.push({
        weight: def.flag === 'resetEvo' ? 2 : 0.8,
        card: {
          id: def.id, type: 'special', typeName: '特殊能力', name: def.name, desc: def.desc, icon: `i_${def.id}`,
          level: lv, nextLevel: lv + 1, maxLevel: def.max > 50 ? 1 : def.max, rarity: def.max > 50 ? 'legend' : 'epic',
        },
      });
    }
    return out;
  }

  roll(): UpgradeCard[] {
    const pool = this.candidates();
    const picked: UpgradeCard[] = [];
    // 新手前几级：保证有拿新武器的机会，形成 Build 方向
    while (picked.length < 3 && pool.length > 0) {
      let sum = 0;
      for (const c of pool) sum += c.weight;
      let r = Math.random() * sum;
      let idx = 0;
      for (let i = 0; i < pool.length; i++) {
        r -= pool[i].weight;
        if (r <= 0) {
          idx = i;
          break;
        }
      }
      picked.push(pool[idx].card);
      pool.splice(idx, 1);
    }
    const fallback: UpgradeCard[] = [
      { id: 'fb_gold', type: 'fallback', typeName: '补偿', name: '现金分红', desc: '立即获得金币', icon: 'i_fb_gold', level: 0, nextLevel: 1, maxLevel: 1, rarity: 'common', value: 80 },
      { id: 'fb_heal', type: 'fallback', typeName: '补偿', name: '医保报销', desc: '恢复 40% 生命', icon: 'i_fb_heal', level: 0, nextLevel: 1, maxLevel: 1, rarity: 'common', value: 0.4 },
      { id: 'fb_xp', type: 'fallback', typeName: '补偿', name: '行业白皮书', desc: '立即获得经验', icon: 'i_stat_xp', level: 0, nextLevel: 1, maxLevel: 1, rarity: 'common', value: 30 },
    ];
    for (const f of fallback) if (picked.length < 3) picked.push(f);
    return picked;
  }

  apply(card: UpgradeCard) {
    const s = this.scene;
    switch (card.type) {
      case 'weapon_new':
        s.weapons.add(card.id);
        break;
      case 'weapon_up':
        s.weapons.levelUp(card.id);
        break;
      case 'passive':
        s.passives.add(card.id);
        break;
      case 'stat': {
        const def = STATS.find((x) => x.id === card.id)!;
        s.passives.addStat(def.key, card.value ?? def.value);
        break;
      }
      case 'special':
        this.applySpecial(card.id);
        break;
      case 'fallback':
        if (card.id === 'fb_gold') s.drops.addGold(card.value ?? 50);
        else if (card.id === 'fb_heal') s.player.heal(s.pstats.maxHp * (card.value ?? 0.4));
        else s.exp.gain(card.value ?? 20);
        break;
    }
    s.fx.ring(s.player.x, s.player.y, 16, 90, RARITY_COLORS[card.rarity], 0.4, 3);
  }

  private applySpecial(id: string) {
    const s = this.scene;
    const def = SPECIALS.find((x) => x.id === id);
    if (!def) return;
    if (def.flag === 'resetEvo') {
      s.evolution.resetAll(1, '市场教育成功：韭菜暂时相信了你。');
      return;
    }
    this.flags[def.flag] = this.flag(def.flag) + 1;
    if (def.flag === 'reap') this.reapLevel++;
    s.passives.recalc();
  }

  /** 宝箱：随机升级一项已有内容 */
  grantRandomUpgrade(): string | null {
    const s = this.scene;
    const options: (() => string)[] = [];
    for (const w of s.weapons.owned) {
      if (!w.def.evolved && w.level < MAX_WEAPON_LEVEL) {
        options.push(() => {
          s.weapons.levelUp(w.def.id);
          return `${w.def.name} Lv${w.level}`;
        });
      }
    }
    for (const [id, lv] of s.passives.owned) {
      const def = PASSIVE_MAP[id];
      if (lv < def.max) {
        options.push(() => {
          s.passives.add(id);
          return `${def.name} Lv${lv + 1}`;
        });
      }
    }
    if (!options.length) {
      s.drops.addGold(40);
      return '金币 +40';
    }
    return Phaser.Math.RND.pick(options)();
  }

  /** 宝箱：稀有被动，优先发放当前武器需要的进化素材 */
  grantRarePassive(): string | null {
    const s = this.scene;
    const need = WEAPON_EVOS.filter((e) => s.weapons.get(e.base) && s.passives.level(e.passive) === 0).map((e) => e.passive);
    const rare = s.passives.available().filter((p) => p.rare && s.passives.level(p.id) === 0).map((p) => p.id);
    const list = need.length ? need : rare;
    if (!list.length || s.passives.owned.size >= MAX_PASSIVE_SLOTS + 2) return null;
    const id = Phaser.Math.RND.pick(list);
    s.passives.add(id);
    return PASSIVE_MAP[id].name;
  }

  /** 神秘庄家事件：随机强力强化 */
  bankerGift() {
    const s = this.scene;
    const gifts: [string, () => void][] = [
      ['伤害 +25%', () => s.passives.addStat('damage', 0.25)],
      ['攻速 +20%', () => s.passives.addStat('atkSpeed', 0.2)],
      ['范围 +20%', () => s.passives.addStat('range', 0.2)],
      ['最大生命 +40', () => s.passives.addStat('hp', 40)],
      ['金币获取 +40%', () => s.passives.addStat('gold', 0.4)],
    ];
    const [name, fn] = Phaser.Math.RND.pick(gifts);
    fn();
    s.player.heal(s.pstats.maxHp * 0.3);
    GameManager.emit('banner', { text: `庄家的礼物：${name}`, kind: 'info' });
  }

  rarityLabel(r: UpgradeCard['rarity']) {
    return RARITY_NAMES[r];
  }
  rarityOrder() {
    return RARITY_ORDER;
  }
}

const RARITY_COLORS = { common: 0xffffff, rare: 0x6fb6ff, epic: 0xc27bff, legend: 0xffb338 };
