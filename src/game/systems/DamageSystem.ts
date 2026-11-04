import type { BattleScene } from '../scenes/BattleScene';
import type { Leek } from '../entities/Leek';
import type { DType } from '../types';
import { WEAPON_MAP } from '../data';

export interface HitOpts {
  noCrit?: boolean;
  noNumber?: boolean;
  numberChance?: number;
  color?: number;
  srcX?: number;
  srcY?: number;
  critRate?: number;
  critDmg?: number;
  knock?: number;
  knockX?: number;
  knockY?: number;
  noKnock?: boolean;
  /** 无视所有减免（吞噬、即死） */
  pure?: boolean;
  bonusGold?: number;
}

/** 伤害结算唯一入口：所有抗性、暴击、统计都在这里，反进化才能真实影响战斗 */
export class DamageSystem {
  constructor(private scene: BattleScene) {}

  /** 当前的全局增伤（事件 + 财富暴击 + 止损线） */
  private globalMul() {
    const s = this.scene;
    let m = s.pstats.damage * s.pstats.leekDmg * s.mods.playerDmg;
    if (s.combat.wealthT > 0) m *= 1.35;
    if (s.skills.flag('stoploss') > 0 && s.player.hp < s.pstats.maxHp * 0.35) m *= 1.35;
    return m;
  }

  hit(l: Leek, amount: number, weaponId: string | null, dtype: DType, o: HitOpts = {}): number {
    if (!l.active || l.invuln) return 0;
    const s = this.scene;
    const p = s.player;
    let dmg = amount;
    let crit = false;
    if (!o.pure) {
      dmg *= this.globalMul();
      if (dtype === 'lightning') dmg *= s.pstats.lightning;
      if (!o.noCrit) {
        const rate = (o.critRate ?? 0) + s.pstats.crit + (s.pstats.luck - 1) * 0.1;
        if (Math.random() < rate) {
          crit = true;
          dmg *= o.critDmg ?? 1.5;
        }
      }
      dmg *= s.resist.factor(l, dtype);
      if (l.auraResist > 0) dmg *= 1 - l.auraResist;
      dmg = l.modifyDamage(dmg, dtype, o.srcX ?? p.x, o.srcY ?? p.y);
    }
    // 统计按实际扣除的血量算，即死类伤害不污染占比
    const dealt = Math.min(dmg, Math.max(0, l.hp));
    l.hp -= dmg;
    s.monitor.recordDamage(dtype, dealt);
    if (weaponId) this.track(weaponId, dealt);
    if (l.flashT <= 0) {
      l.flashT = 0.07;
      l.sprite.setTintFill(0xffffff);
    }
    if (!o.noKnock && o.knock) {
      let kx = o.knockX;
      let ky = o.knockY;
      if (kx === undefined || ky === undefined) {
        const sx = o.srcX ?? p.x;
        const sy = o.srcY ?? p.y;
        const d = Math.hypot(l.x - sx, l.y - sy) || 1;
        kx = (l.x - sx) / d;
        ky = (l.y - sy) / d;
      }
      l.knock(kx, ky, o.knock);
    }
    if (!o.noNumber && (o.numberChance === undefined || Math.random() < o.numberChance || crit)) {
      s.fx.number(l.x, l.y - l.radius, dmg, crit, o.color);
    }
    s.fx.sfx.play('hit', 0.07);
    // 钢铁变异：近战命中可能被反伤
    if (dtype === 'melee' && s.evolution.thorns(l) && Math.random() < 0.02) {
      p.takeDamage(3);
      s.fx.burst('spark', p.x, p.y, 4);
    }
    if (l.hp <= 0) {
      s.combat.kill(l, weaponId, dtype, o.bonusGold ?? 0);
    } else {
      l.onHit(dmg, dtype);
    }
    return dmg;
  }

  private track(id: string, dmg: number) {
    const by = this.scene.stats.byWeapon;
    let e = by[id];
    if (!e) e = by[id] = { name: WEAPON_MAP[id]?.name ?? id, damage: 0, kills: 0 };
    e.damage += dmg;
  }
}
