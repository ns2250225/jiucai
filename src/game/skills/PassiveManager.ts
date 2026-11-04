import type { BattleScene } from '../scenes/BattleScene';
import { PASSIVE_MAP, PASSIVES } from '../data';
import type { CharacterDef } from '../../data/characters';
import { SHOP_ITEMS } from '../../data/progression';
import type { PlayerStats } from '../types';

/** 所有属性来源（角色 + 局外强化 + 被动 + 局内属性卡）汇总成 pstats */
export class PassiveManager {
  owned = new Map<string, number>();
  statBonus: Record<string, number> = {};

  constructor(
    private scene: BattleScene,
    private char: CharacterDef,
  ) {}

  level(id: string) {
    return this.owned.get(id) ?? 0;
  }

  add(id: string) {
    const def = PASSIVE_MAP[id];
    if (!def) return;
    const lv = this.level(id);
    if (lv >= def.max) return;
    this.owned.set(id, lv + 1);
    if (!this.scene.stats.passivesUsed.includes(id)) this.scene.stats.passivesUsed.push(id);
    if (def.effects.revive) this.scene.player.revives += def.effects.revive;
    this.recalc();
    this.scene.weapons.evolution.checkReady();
  }

  addStat(key: string, v: number) {
    this.statBonus[key] = (this.statBonus[key] ?? 0) + v;
    this.recalc();
  }

  available() {
    const unlocked = this.scene.profile.unlockedItems;
    return PASSIVES.filter((p) => !p.locked || unlocked.includes(p.id));
  }

  recalc() {
    const s = this.scene;
    const c = this.char;
    const b: Record<string, number> = { ...this.statBonus };
    const add = (k: string, v: number) => {
      b[k] = (b[k] ?? 0) + v;
    };
    for (const item of SHOP_ITEMS) add(item.key, (s.profile.shop[item.id] ?? 0) * item.perLevel);
    for (const [id, lv] of this.owned) {
      for (const [k, v] of Object.entries(PASSIVE_MAP[id].effects)) add(k, v * lv);
    }
    const prevMax = s.pstats?.maxHp;
    const armor = 1 - Math.pow(0.9, (b.armor ?? 0) / 0.1);
    const next: PlayerStats = {
      maxHp: c.hp + (b.hp ?? 0),
      speed: c.speed * (1 + (b.speed ?? 0)) * (s.weapons?.get('mech_reaper') ? 1.15 : 1),
      damage: c.damage * (1 + (b.damage ?? 0)),
      range: c.range * (1 + (b.range ?? 0)),
      atkSpeed: c.atkSpeed * (1 + (b.atkSpeed ?? 0)),
      luck: c.luck * (1 + (b.luck ?? 0)),
      gold: c.gold * (1 + (b.gold ?? 0)),
      xp: c.xp * (1 + (b.xp ?? 0)),
      magnet: c.magnet * (1 + (b.magnet ?? 0)),
      crit: b.crit ?? 0,
      armor,
      leekDmg: 1 + (b.leekDmg ?? 0),
      eliteGold: 1 + (b.eliteGold ?? 0),
      lightning: c.lightning * (1 + (b.lightning ?? 0)),
      pull: c.pull * (1 + (b.pull ?? 0)),
      ultCharge: 1 + 0.3 * (s.skills?.flag('ultCharge') ?? 0),
      ultCd: c.ultCd,
      extraCount: s.skills?.flag('extraCount') ?? 0,
      regen: 0.6 * (s.skills?.flag('regen') ?? 0),
      vamp: s.skills?.flag('vamp') ?? 0,
    };
    s.pstats = next;
    if (prevMax !== undefined && s.player && next.maxHp > prevMax) s.player.heal(next.maxHp - prevMax);
  }
}
