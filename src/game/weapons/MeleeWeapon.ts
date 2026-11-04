import { Weapon } from './Weapon';
import type { Leek } from '../entities/Leek';

/** 普通镰刀 / 巨型镰刀 / 黄金收割者：瞬时弧形挥砍 */
export class MeleeWeapon extends Weapon {
  private arcDeg() {
    switch (this.def.behavior) {
      case 'giant':
        return this.stats.arc ?? 200;
      case 'golden':
        return 360;
      default:
        return 130;
    }
  }

  protected fire() {
    const p = this.p;
    const s = this.scene;
    const r = this.range;
    const tgt = s.spatial.nearest(p.x, p.y, r * 1.25);
    if (!tgt) return false;
    const base = Math.atan2(tgt.y - p.y, tgt.x - p.x);
    p.playAttack();
    this.fx.sfx.play('swing', 0.08);
    if (this.def.behavior === 'golden') {
      this.goldenSweep(r);
      return true;
    }
    if (this.def.behavior === 'giant') {
      this.swing(base, r, this.arcDeg(), 2.2, 420, 'fx_slash_big', 46);
      this.fx.shake(0.005, 110);
      if (this.special) {
        const x = p.x;
        const y = p.y;
        s.time.delayedCall(180, () => {
          this.fx.ring(x, y, r * 0.6, r * 1.6, 0xd8ecff, 0.3, 5);
          for (const l of s.spatial.query(x, y, r * 1.6)) this.hit(l, 0.5, { knock: 200, srcX: x, srcY: y });
        });
      }
      return true;
    }
    const n = this.count;
    for (let i = 0; i < n; i++) {
      const a = base + (i / n) * Math.PI * 2;
      this.swing(a, r, this.arcDeg(), 1, 160, 'fx_slash', 30);
      if (this.special) {
        s.projectiles.fire('fx_blade', p.x, p.y, Math.cos(a) * 340, Math.sin(a) * 340, {
          dmg: this.stats.damage * 0.7, life: 0.9, pierce: 5, radius: 14, scale: 1.7, spin: 14,
          weaponId: this.def.id, dtype: 'melee', critRate: this.stats.critRate, critDmg: this.stats.critDmg,
        });
      }
    }
    return true;
  }

  private swing(angle: number, r: number, arcDeg: number, _pw: number, knock: number, frame: string, frameR: number) {
    const p = this.p;
    const half = (arcDeg / 2) * (Math.PI / 180);
    const cosHalf = Math.cos(half);
    const ax = Math.cos(angle);
    const ay = Math.sin(angle);
    const scale = r / frameR;
    this.fx.sprite(frame, p.x, p.y, { rot: angle, scale: scale * 0.85, endScale: scale, life: this.stats.duration + 0.05 });
    const hits = this.scene.spatial.query(p.x, p.y, r);
    for (const l of hits) {
      const dx = l.x - p.x;
      const dy = l.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if ((dx * ax + dy * ay) / d < cosHalf && d > l.radius + 16) continue;
      this.hit(l, 1, { knock, knockX: dx / d, knockY: dy / d });
    }
  }

  private goldenSweep(r: number) {
    const p = this.p;
    const s = this.scene;
    const a0 = s.simTime * 2;
    const scale = r / 30;
    for (let i = 0; i < 3; i++) {
      this.fx.sprite('fx_slash_g', p.x, p.y, { rot: a0 + (i * Math.PI * 2) / 3, scale: scale * 0.8, endScale: scale, life: 0.25, spin: 8 });
    }
    this.fx.burst('coin', p.x, p.y, 3);
    for (const l of s.spatial.query(p.x, p.y, r)) {
      const d = Math.hypot(l.x - p.x, l.y - p.y) || 1;
      this.hit(l, 1, { knock: 90, knockX: (l.x - p.x) / d, knockY: (l.y - p.y) / d, bonusGold: 2 });
    }
  }
}

export type { Leek };
