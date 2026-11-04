import type { BattleScene } from '../scenes/BattleScene';
import type { Leek } from '../entities/Leek';
import type { WeaponDef, WeaponStats } from '../types';
import type { HitOpts } from '../systems/DamageSystem';

/** 武器基类：只负责数值成长、冷却循环和命中辅助，攻击逻辑全部在子类 */
export abstract class Weapon {
  level = 1;
  stats!: WeaponStats;
  timer = 0.2;
  protected hitMap = new Map<number, number>();
  private pruneT = 5;

  constructor(
    public scene: BattleScene,
    public def: WeaponDef,
    level = 1,
  ) {
    this.level = level;
    this.recalc();
  }

  recalc() {
    const st: WeaponStats = { ...this.def.stats };
    for (let lv = 2; lv <= this.level; lv++) {
      const g = this.def.growth[lv - 2];
      if (!g) continue;
      if (g.mul) for (const [k, v] of Object.entries(g.mul)) (st as unknown as Record<string, number>)[k] = ((st as unknown as Record<string, number>)[k] ?? 0) * (v as number);
      if (g.add) for (const [k, v] of Object.entries(g.add)) (st as unknown as Record<string, number>)[k] = ((st as unknown as Record<string, number>)[k] ?? 0) + (v as number);
    }
    this.stats = st;
  }

  get special() {
    return (this.stats.special ?? 0) > 0;
  }
  get range() {
    return this.stats.range * this.scene.pstats.range;
  }
  get count() {
    return this.stats.count + this.scene.pstats.extraCount;
  }
  get cooldown() {
    return this.stats.interval / this.scene.atkMul;
  }

  update(dt: number) {
    this.pruneT -= dt;
    if (this.pruneT <= 0) {
      this.pruneT = 5;
      const now = this.scene.simTime;
      for (const [k, t] of this.hitMap) if (now - t > 3) this.hitMap.delete(k);
    }
    this.timer -= dt;
    if (this.timer <= 0 && this.fire()) this.timer = this.cooldown;
    this.tick(dt);
  }

  /** 冷却结束时调用；没有目标时返回 false，下一帧重试 */
  protected abstract fire(): boolean;
  protected tick(_dt: number) {}

  onLevelUp() {}
  destroy() {}

  protected canHit(l: Leek, cd: number) {
    const now = this.scene.simTime;
    const last = this.hitMap.get(l.uid);
    if (last !== undefined && now - last < cd) return false;
    this.hitMap.set(l.uid, now);
    return true;
  }
  protected hit(l: Leek, mult = 1, opts: HitOpts = {}) {
    const st = this.stats;
    return this.scene.damage.hit(l, st.damage * mult, this.def.id, this.def.dtype, { critRate: st.critRate, critDmg: st.critDmg, ...opts });
  }
  protected get p() {
    return this.scene.player;
  }
  protected get fx() {
    return this.scene.fx;
  }
  protected combo(id: string) {
    return this.scene.weapons.hasCombo(id);
  }
}
