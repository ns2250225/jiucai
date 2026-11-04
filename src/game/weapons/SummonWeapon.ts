import Phaser from 'phaser';
import { Weapon } from './Weapon';
import type { Leek } from '../entities/Leek';

interface Clone {
  x: number;
  y: number;
  img: Phaser.GameObjects.Image;
  scythe: Phaser.GameObjects.Image;
  life: number;
  cd: number;
  target: Leek | null;
  retarget: number;
}

/** 影分身镰刀：分身独立索敌、移动和攻击 */
export class SummonWeapon extends Weapon {
  private clones: Clone[] = [];

  protected fire() {
    if (this.clones.length >= this.count) return false;
    if (!this.scene.aimTarget) return false;
    this.spawnClone();
    return true;
  }
  override get cooldown() {
    return 1.1 / this.scene.atkMul;
  }

  private spawnClone() {
    const s = this.scene;
    const p = this.p;
    const frame = p.sprite.frame.name;
    const img = s.add.image(p.x, p.y, 'atlas', frame).setOrigin(0.5, 0.62).setScale(1.4).setTint(0x5a4a90).setAlpha(0.8);
    const scythe = s.add.image(p.x, p.y, 'atlas', 'w_clone').setScale(1.1).setAlpha(0.85);
    this.clones.push({ x: p.x, y: p.y, img, scythe, life: this.stats.duration, cd: 0.2, target: null, retarget: 0 });
    this.fx.burst('smoke', p.x, p.y, 3);
  }

  private spinSlash(c: Clone, mult: number, r: number) {
    this.fx.sprite('fx_slash_big', c.x, c.y, { scale: (r / 46) * 0.7, endScale: r / 46, life: 0.2, spin: 16, tint: 0xb79cff });
    for (const l of this.scene.spatial.query(c.x, c.y, r)) this.hit(l, mult, { srcX: c.x, srcY: c.y, knock: 120 });
  }

  protected override tick(dt: number) {
    const s = this.scene;
    const p = this.p;
    const r = this.stats.range * s.pstats.range;
    const speed = (this.stats.speed ?? 240) * s.pstats.speed;
    for (let i = this.clones.length - 1; i >= 0; i--) {
      const c = this.clones[i];
      c.life -= dt;
      c.cd -= dt;
      c.retarget -= dt;
      if (c.life <= 0) {
        if (this.special) this.spinSlash(c, 2.5, r * 1.8);
        this.fx.burst('smoke', c.x, c.y, 4);
        c.img.destroy();
        c.scythe.destroy();
        this.clones.splice(i, 1);
        continue;
      }
      if (c.retarget <= 0 || !c.target?.active) {
        c.retarget = 0.5;
        c.target = s.spatial.nearest(c.x, c.y, 380);
      }
      const t = c.target?.active ? c.target : null;
      const tx = t ? t.x : p.x + Math.cos(i * 2 + s.simTime) * 60;
      const ty = t ? t.y : p.y + Math.sin(i * 2 + s.simTime) * 60;
      const d = Math.hypot(tx - c.x, ty - c.y) || 1;
      const stop = t ? r * 0.55 : 18;
      if (d > stop) {
        c.x += ((tx - c.x) / d) * speed * dt;
        c.y += ((ty - c.y) / d) * speed * dt;
      }
      if (t && d < r && c.cd <= 0) {
        c.cd = this.stats.interval / s.atkMul;
        const a = Math.atan2(ty - c.y, tx - c.x);
        this.fx.sprite('fx_slash', c.x, c.y, { rot: a, scale: (r / 30) * 0.85, endScale: r / 30, life: 0.15, tint: 0xb79cff });
        for (const l of s.spatial.query(c.x, c.y, r)) {
          const dx = l.x - c.x;
          const dy = l.y - c.y;
          const dl = Math.hypot(dx, dy) || 1;
          if ((dx * Math.cos(a) + dy * Math.sin(a)) / dl < 0.3 && dl > 20) continue;
          this.hit(l, 1, { srcX: c.x, srcY: c.y, knock: 70, knockX: dx / dl, knockY: dy / dl });
        }
      }
      c.img.setPosition(c.x, c.y).setDepth(c.y).setFlipX(tx < c.x);
      c.img.setAlpha(Math.min(0.8, c.life * 1.5));
      c.scythe.setPosition(c.x + (tx < c.x ? -14 : 14), c.y - 4).setDepth(c.y + 1).setFlipX(tx < c.x);
    }
  }

  override destroy() {
    for (const c of this.clones) {
      c.img.destroy();
      c.scythe.destroy();
    }
    this.clones.length = 0;
  }
}
