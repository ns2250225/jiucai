import Phaser from 'phaser';
import { Weapon } from './Weapon';
import type { Projectile } from '../entities/Projectile';
import type { Leek } from '../entities/Leek';

/** 飞旋镰刀 / 冰霜镰刀 / 永恒轮回 */
export class ProjectileWeapon extends Weapon {
  private orbits: Phaser.GameObjects.Image[] = [];
  private phase = 0;

  protected fire() {
    const b = this.def.behavior;
    if (b === 'boomerang') return this.fireBoomerang();
    if (b === 'frost') return this.fireFrost();
    return this.eternalTick();
  }

  private fireBoomerang() {
    const p = this.p;
    const s = this.scene;
    const tgt = s.spatial.nearest(p.x, p.y, this.range * 1.2);
    if (!tgt) return false;
    const n = this.count;
    const base = Math.atan2(tgt.y - p.y, tgt.x - p.x);
    // 飞出段匀减速，初速取平均速度的两倍才能真正飞满射程
    const spd = (this.range / (this.stats.duration * 0.5)) * 2;
    const back = this.special ? 2 : 1;
    const update = (pr: Projectile, dt: number) => {
      if (pr.data === 0) {
        // 匀减速飞出，速度归零后折返
        const decay = Math.max(0, 1 - pr.age / (this.stats.duration * 0.5));
        const d = Math.hypot(pr.vx, pr.vy) || 1;
        pr.vx = (pr.vx / d) * spd * Math.max(0.05, decay);
        pr.vy = (pr.vy / d) * spd * Math.max(0.05, decay);
        if (decay <= 0.02) pr.data = 1;
      } else {
        const dx = p.x - pr.x;
        const dy = p.y - pr.y;
        const d = Math.hypot(dx, dy) || 1;
        const v = Math.min(spd * back * Math.min(1, (pr.age - this.stats.duration * 0.5) * 2.2 + 0.2), 900);
        pr.vx = (dx / d) * v;
        pr.vy = (dy / d) * v;
        if (d < 24) pr.life = 0;
      }
      if (Math.random() < dt * 22) this.fx.sprite('fx_blade', pr.x, pr.y, { rot: pr.img.rotation, scale: 1.5, life: 0.14, alpha: 0.5, tint: 0x9fd8ff });
    };
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.4;
      const pr = s.projectiles.fire('fx_blade', p.x, p.y, Math.cos(a) * spd, Math.sin(a) * spd, {
        dmg: this.stats.damage, life: 4, pierce: 999, radius: 14, scale: 1.8, spin: 16, weaponId: this.def.id, dtype: 'ranged',
        hitCd: 0.35, critRate: this.stats.critRate, critDmg: this.stats.critDmg, knock: this.special ? 120 : 30, tint: 0xbfe6ff,
      });
      if (pr) pr.onUpdate = update;
    }
    this.fx.sfx.play('swing', 0.1);
    return true;
  }

  private fireFrost() {
    const p = this.p;
    const s = this.scene;
    const tgt = s.spatial.nearest(p.x, p.y, this.range);
    if (!tgt) return false;
    const base = Math.atan2(tgt.y - p.y, tgt.x - p.x);
    const n = this.count;
    const onHit = (_: Projectile, l: Leek) => {
      if (l.freezeT > 0 && this.special) {
        // 碎裂：击碎冻结目标，额外伤害并向四周溅射
        l.freezeT = 0;
        this.hit(l, 1.5, { noCrit: true, color: 0xa8ecff });
        this.fx.burst('shard', l.x, l.y, 8);
        for (const o of s.spatial.query(l.x, l.y, 60)) if (o !== l) this.hit(o, 0.5, { noCrit: true });
        return;
      }
      l.slow(1 - (this.stats.slow ?? 0.45), this.stats.duration);
      if (this.special && Math.random() < 0.3) l.freeze(1.1);
      this.fx.burst('shard', l.x, l.y, 2);
    };
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.16;
      const pr = s.projectiles.fire('fx_ice', p.x, p.y, Math.cos(a) * 400, Math.sin(a) * 400, {
        dmg: this.stats.damage, life: this.range / 400, pierce: this.stats.pierce, radius: 8, scale: 1.5, orient: true,
        weaponId: this.def.id, dtype: 'frost', critRate: this.stats.critRate, critDmg: this.stats.critDmg,
      });
      if (pr) pr.onHit = onHit;
    }
    this.fx.sfx.play('ice', 0.1);
    return true;
  }

  private eternalTick() {
    return true; // 永恒轮回无冷却，实际判定在 tick 中
  }

  protected override tick(dt: number) {
    if (this.def.behavior !== 'eternal') return;
    const p = this.p;
    const s = this.scene;
    const n = this.count;
    while (this.orbits.length < n) {
      this.orbits.push(s.add.image(p.x, p.y, 'atlas', 'fx_blade').setScale(2).setTint(0xffe9a0).setDepth(400000));
    }
    while (this.orbits.length > n) this.orbits.pop()!.destroy();
    this.phase += dt * (this.stats.speed ?? 1.5);
    const R = this.range;
    for (let i = 0; i < n; i++) {
      // 无限符号（∞）轨迹，每把镰刀错开相位
      const t = this.phase + (i / n) * Math.PI * 2;
      const c = Math.cos(t);
      const sn = Math.sin(t);
      const den = 1 + sn * sn;
      const x = p.x + (R * c) / den;
      const y = p.y + (R * sn * c) / den * 1.3;
      const img = this.orbits[i];
      img.setPosition(x, y);
      img.rotation += dt * 22;
      if (Math.random() < dt * 14) this.fx.sprite('fx_blade', x, y, { rot: img.rotation, scale: 1.7, life: 0.16, alpha: 0.45, tint: i % 2 ? 0x9fd8ff : 0xffd23e });
      for (const l of s.spatial.query(x, y, 18)) {
        if (this.canHit(l, this.stats.interval)) this.hit(l, 1, { srcX: x, srcY: y, knock: 40 });
      }
    }
  }

  override destroy() {
    for (const o of this.orbits) o.destroy();
    this.orbits.length = 0;
  }
}
