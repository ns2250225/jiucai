import Phaser from 'phaser';
import type { BattleScene } from '../scenes/BattleScene';
import type { Leek } from './Leek';
import type { DType } from '../types';
import { ObjectPool } from '../systems/ObjectPool';

export class Projectile {
  img: Phaser.GameObjects.Image;
  active = false;
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  life = 0;
  age = 0;
  radius = 8;
  dmg = 0;
  pierce = 0;
  hostile = false;
  spin = 0;
  orient = false;
  weaponId: string | null = null;
  dtype: DType = 'ranged';
  knock = 0;
  critRate = 0;
  critDmg = 1.5;
  // 可选的自定义行为：回旋、冰霜减速等由武器注入
  onUpdate: ((p: Projectile, dt: number) => void) | null = null;
  onHit: ((p: Projectile, l: Leek) => void) | null = null;
  onExpire: ((p: Projectile) => void) | null = null;
  hitCd = 0;
  data = 0;
  hitTimes: Map<number, number> | null = null;

  constructor(scene: Phaser.Scene) {
    this.img = scene.add.image(0, 0, 'atlas', 'fx_blade').setVisible(false).setDepth(400000);
  }
}

interface Bomb {
  img: Phaser.GameObjects.Image;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  dur: number;
  r: number;
  dmg: number;
}

/** 玩家与敌人的投射物都由这里驱动，上限防止屏幕过于混乱 */
export class ProjectileSystem {
  list: Projectile[] = [];
  private pool: ObjectPool<Projectile>;
  private bombs: Bomb[] = [];
  private bombPool: ObjectPool<Phaser.GameObjects.Image>;
  maxPlayer = 200;
  maxEnemy = 120;
  private enemyCount = 0;
  private playerCount = 0;

  constructor(private scene: BattleScene) {
    this.pool = new ObjectPool(() => new Projectile(scene), (p) => {
      p.active = false;
      p.img.setVisible(false);
      p.onUpdate = p.onHit = p.onExpire = null;
      p.hitTimes = null;
    });
    this.bombPool = new ObjectPool(() => scene.add.image(0, 0, 'atlas', 'fx_bomb').setDepth(400001), (i) => i.setVisible(false));
  }

  fire(frame: string, x: number, y: number, vx: number, vy: number, o: {
    dmg: number; life: number; pierce?: number; radius?: number; scale?: number; spin?: number; orient?: boolean;
    weaponId?: string | null; dtype?: DType; knock?: number; hitCd?: number; critRate?: number; critDmg?: number; tint?: number;
  }): Projectile | null {
    if (this.playerCount >= this.maxPlayer) return null;
    const p = this.pool.get();
    this.playerCount++;
    p.active = true;
    p.hostile = false;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.age = 0;
    p.data = 0;
    p.life = o.life;
    p.dmg = o.dmg;
    p.pierce = o.pierce ?? 0;
    p.radius = o.radius ?? 10;
    p.spin = o.spin ?? 0;
    p.orient = o.orient ?? false;
    p.weaponId = o.weaponId ?? null;
    p.dtype = o.dtype ?? 'ranged';
    p.knock = o.knock ?? 0;
    p.hitCd = o.hitCd ?? 0;
    p.critRate = o.critRate ?? 0;
    p.critDmg = o.critDmg ?? 1.5;
    p.hitTimes = p.hitCd > 0 ? new Map() : null;
    p.img.setFrame(frame).setPosition(x, y).setScale(o.scale ?? 1.4).setVisible(true).setRotation(o.orient ? Math.atan2(vy, vx) : 0);
    if (o.tint !== undefined) p.img.setTint(o.tint);
    else p.img.clearTint();
    this.list.push(p);
    return p;
  }

  enemyShot(x: number, y: number, tx: number, ty: number, speed: number, dmg: number, frame: string, orient = false, spinOrRadius = 0) {
    if (this.enemyCount >= this.maxEnemy) return;
    const d = Math.hypot(tx - x, ty - y) || 1;
    const p = this.pool.get();
    this.enemyCount++;
    p.active = true;
    p.hostile = true;
    p.x = x;
    p.y = y;
    p.vx = ((tx - x) / d) * speed;
    p.vy = ((ty - y) / d) * speed;
    p.age = 0;
    p.life = 3.6;
    p.dmg = dmg;
    p.pierce = 0;
    p.radius = spinOrRadius > 0 ? spinOrRadius : 7;
    p.spin = frame === 'fx_blade_red' ? 12 : 0;
    p.orient = orient && frame !== 'fx_blade_red';
    p.hitCd = 0;
    p.img.setFrame(frame).setPosition(x, y).setScale(1.5).setVisible(true).clearTint();
    p.img.setRotation(p.orient ? Math.atan2(p.vy, p.vx) : 0);
    this.list.push(p);
  }

  /** 抛物线炸弹：落点有预警，给玩家躲避时间 */
  lobBomb(x: number, y: number, tx: number, ty: number, r: number, dmg: number, frame: string, dur: number) {
    const s = this.scene;
    const img = this.bombPool.get();
    img.setFrame(frame).setPosition(x, y).setScale(1.6).setVisible(true);
    this.bombs.push({ img, x0: x, y0: y, x1: tx, y1: ty, t: 0, dur, r, dmg });
    s.fx.warn(tx, ty, r, dur);
  }

  update(dt: number) {
    const s = this.scene;
    const pl = s.player;
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i];
      b.t += dt;
      const t = Math.min(1, b.t / b.dur);
      b.img.x = b.x0 + (b.x1 - b.x0) * t;
      b.img.y = b.y0 + (b.y1 - b.y0) * t - Math.sin(t * Math.PI) * 90;
      b.img.rotation += dt * 8;
      if (t >= 1) {
        s.fx.boom(b.x1, b.y1, b.r / 50);
        s.fx.sfx.play('boom', 0.1);
        if (Math.hypot(pl.x - b.x1, pl.y - b.y1) < b.r + 10) pl.takeDamage(b.dmg);
        this.bombPool.release(b.img);
        this.bombs[i] = this.bombs[this.bombs.length - 1];
        this.bombs.pop();
      }
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dt;
      p.life -= dt;
      if (p.onUpdate) p.onUpdate(p, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const img = p.img;
      img.x = p.x;
      img.y = p.y;
      if (p.spin) img.rotation += p.spin * dt;
      else if (p.orient) img.rotation = Math.atan2(p.vy, p.vx);
      let dead = p.life <= 0;
      if (!dead) {
        if (p.hostile) {
          const r = p.radius + pl.radius;
          if ((p.x - pl.x) ** 2 + (p.y - pl.y) ** 2 < r * r) {
            pl.takeDamage(p.dmg);
            dead = true;
          }
        } else {
          dead = this.collide(p);
        }
      }
      if (dead) {
        p.onExpire?.(p);
        if (p.hostile) this.enemyCount--;
        else this.playerCount--;
        this.list[i] = this.list[this.list.length - 1];
        this.list.pop();
        this.pool.release(p);
      }
    }
  }

  private collide(p: Projectile): boolean {
    const s = this.scene;
    const hits = s.spatial.query(p.x, p.y, p.radius);
    for (let k = 0; k < hits.length; k++) {
      const l = hits[k];
      if (!l.active || l.invuln) continue;
      if (p.hitTimes) {
        const last = p.hitTimes.get(l.uid);
        if (last !== undefined && s.simTime - last < p.hitCd) continue;
        p.hitTimes.set(l.uid, s.simTime);
      }
      const d = Math.hypot(p.vx, p.vy) || 1;
      s.damage.hit(l, p.dmg, p.weaponId, p.dtype, {
        srcX: p.x - (p.vx / d) * 30, srcY: p.y - (p.vy / d) * 30,
        critRate: p.critRate, critDmg: p.critDmg,
        knock: p.knock, knockX: p.vx / d, knockY: p.vy / d,
      });
      p.onHit?.(p, l);
      // 装甲变异：投射物穿透消耗翻倍
      p.pierce -= s.evolution.level('ranged') >= 3 && p.dtype === 'ranged' ? 2 : 1;
      if (p.pierce < 0) return true;
    }
    return false;
  }
}
