import Phaser from 'phaser';
import { Weapon } from './Weapon';
import type { Leek } from '../entities/Leek';

interface Zone {
  x: number;
  y: number;
  r: number;
  life: number;
  max: number;
  tick: number;
  img: Phaser.GameObjects.Image;
  fx?: Phaser.GameObjects.Image[];
  pulse: number;
}
interface Mover {
  x: number;
  y: number;
  img: Phaser.GameObjects.Image;
  target: Leek | null;
  retarget: number;
  tick: number;
  pullTick: number;
  wx: number;
  wy: number;
}

/** 火焰 / 黑洞 / 地狱 / 虚空 / 零度 / 龙卷：在地面制造持续区域 */
export class AreaWeapon extends Weapon {
  private zones: Zone[] = [];
  private movers: Mover[] = [];
  private rings: { r: number; t: number; x: number; y: number }[] = [];
  private frozenT = 0;
  private frozen: Leek[] = [];

  protected fire() {
    switch (this.def.behavior) {
      case 'fire':
        return this.fireZones();
      case 'blackhole':
        return this.fireHoles();
      case 'hell':
        return this.fireHell();
      case 'zero':
        return this.fireZero();
      default:
        return true;
    }
  }

  private randomTarget(radius: number) {
    const p = this.p;
    const near = this.scene.spatial.query(p.x, p.y, radius);
    return near.length ? near[Math.floor(Math.random() * near.length)] : null;
  }

  private fireZones() {
    const s = this.scene;
    const n = this.count;
    let any = false;
    for (let i = 0; i < n; i++) {
      const t = this.randomTarget(380);
      if (!t) continue;
      any = true;
      this.addFireZone(t.x, t.y, this.range, this.stats.duration);
      s.fx.sprite('fx_boom1', t.x, t.y, { life: 0.2, scale: 1.2, depth: 400000 });
    }
    if (any) this.fx.sfx.play('fire', 0.2);
    return any;
  }

  addFireZone(x: number, y: number, r: number, life: number) {
    const s = this.scene;
    if (this.zones.length > 40) return;
    const img = s.add.image(x, y, 'atlas', 'fx_firezone').setDepth(-20000).setScale(r / 30);
    const flames: Phaser.GameObjects.Image[] = [];
    const fCount = s.fx.low ? 2 : 4;
    for (let i = 0; i < fCount; i++) {
      const a = (i / fCount) * Math.PI * 2 + Math.random();
      const fx = x + Math.cos(a) * r * 0.55;
      const fy = y + Math.sin(a) * r * 0.55;
      flames.push(s.add.image(fx, fy, 'atlas', 'fx_fire0').setDepth(fy).setScale(1.5));
    }
    this.zones.push({ x, y, r, life, max: life, tick: 0, img, fx: flames, pulse: 0 });
  }

  private fireHoles() {
    const s = this.scene;
    const n = this.count;
    let any = false;
    for (let i = 0; i < n; i++) {
      const t = this.randomTarget(380);
      if (!t) continue;
      any = true;
      const img = s.add.image(t.x, t.y, 'atlas', 'fx_bh0').setDepth(-15000).setScale(this.range / 30);
      this.zones.push({ x: t.x, y: t.y, r: this.range, life: this.stats.duration, max: this.stats.duration, tick: 0, img, pulse: 0 });
    }
    if (any) this.fx.sfx.play('hole', 0.5);
    return any;
  }

  private fireHell() {
    const p = this.p;
    if (!this.scene.spatial.nearest(p.x, p.y, this.range + 80)) return false;
    this.rings.push({ r: 30, t: 0, x: p.x, y: p.y });
    this.hitMap.clear();
    this.fx.sfx.play('fire', 0.2);
    this.fx.ring(p.x, p.y, 20, this.range, 0xff6a2a, 0.75, 8);
    for (let i = 0; i < this.count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = this.range * (0.35 + Math.random() * 0.65);
      const x = p.x + Math.cos(a) * r;
      const y = p.y + Math.sin(a) * r;
      this.scene.time.delayedCall(r * 2, () => this.addFireZone(x, y, 95, this.stats.duration));
    }
    return true;
  }

  private fireZero() {
    const p = this.p;
    const s = this.scene;
    const hits = s.spatial.query(p.x, p.y, this.range);
    if (hits.length === 0) return false;
    this.fx.ring(p.x, p.y, 20, this.range, 0xa8ecff, 0.5, 10);
    this.fx.ring(p.x, p.y, 10, this.range * 0.8, 0xffffff, 0.45, 4);
    this.fx.flash(90, 170, 230, 255);
    this.fx.sfx.play('ice', 0.2);
    this.frozen = [];
    for (const l of hits) {
      this.hit(l, 0.6, { noCrit: true });
      l.freeze(this.stats.duration);
      this.frozen.push(l);
    }
    this.frozenT = this.stats.duration;
    return true;
  }

  private ensureMovers(n: number, frame: string, depth: number) {
    const s = this.scene;
    while (this.movers.length < n) {
      const a = Math.random() * 6.28;
      const p = this.p;
      const m: Mover = {
        x: p.x + Math.cos(a) * 200, y: p.y + Math.sin(a) * 200,
        img: s.add.image(p.x, p.y, 'atlas', frame).setDepth(depth),
        target: null, retarget: 0, tick: 0, pullTick: 0, wx: 0, wy: 0,
      };
      this.movers.push(m);
    }
    while (this.movers.length > n) this.movers.pop()!.img.destroy();
  }

  private stepMover(m: Mover, speed: number, dt: number, leash: number) {
    const p = this.p;
    const s = this.scene;
    m.retarget -= dt;
    if (m.retarget <= 0 || !m.target?.active) {
      m.retarget = 2 + Math.random() * 2;
      const around = s.spatial.query(p.x, p.y, leash);
      m.target = around.length ? around[Math.floor(Math.random() * around.length)] : null;
      if (!m.target) {
        const a = Math.random() * 6.28;
        m.wx = p.x + Math.cos(a) * 200;
        m.wy = p.y + Math.sin(a) * 200;
      }
    }
    const tx = m.target?.active ? m.target.x : m.wx;
    const ty = m.target?.active ? m.target.y : m.wy;
    const d = Math.hypot(tx - m.x, ty - m.y) || 1;
    if (d > 6) {
      m.x += ((tx - m.x) / d) * speed * dt;
      m.y += ((ty - m.y) / d) * speed * dt;
    }
    if (Math.hypot(p.x - m.x, p.y - m.y) > leash * 1.6) {
      m.x = p.x;
      m.y = p.y;
    }
  }

  protected override tick(dt: number) {
    const b = this.def.behavior;
    if (b === 'tornado') this.tickTornado(dt);
    else if (b === 'void') this.tickVoid(dt);
    this.tickZones(dt);
    this.tickRings(dt);
    if (this.frozenT > 0) {
      this.frozenT -= dt;
      if (this.frozenT <= 0) {
        // 绝对零度：解冻瞬间全体碎裂
        this.fx.sfx.play('ice', 0.1);
        for (const l of this.frozen) {
          if (!l.active) continue;
          this.fx.burst('shard', l.x, l.y, 3);
          this.hit(l, 1.4);
        }
        this.frozen.length = 0;
      }
    }
  }

  private tickRings(dt: number) {
    const s = this.scene;
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.t += dt;
      const r = 30 + (this.range - 30) * (ring.t / 0.75);
      for (const l of s.spatial.query(ring.x, ring.y, r)) {
        if (this.canHit(l, 1.2)) {
          this.hit(l, 1.4, { srcX: ring.x, srcY: ring.y });
          l.ignite(this.stats.damage, 3, this.def.id);
        }
      }
      if (ring.t >= 0.75) this.rings.splice(i, 1);
    }
  }

  private tickZones(dt: number) {
    const s = this.scene;
    const isHole = this.def.behavior === 'blackhole';
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.life -= dt;
      z.tick -= dt;
      if (isHole) {
        z.img.setFrame(`fx_bh${Math.floor(s.simTime * 10) % 3}`);
        z.img.rotation += dt * 2;
        const fade = Math.min(1, z.life * 3);
        z.img.setScale((z.r / 30) * fade);
        const pull = (this.stats.pull ?? 120) * s.pstats.pull;
        z.pulse -= dt;
        if (z.pulse <= 0) {
          z.pulse = 0.1;
          for (const l of s.spatial.query(z.x, z.y, z.r * 1.3)) l.pull(z.x, z.y, pull, 0.1);
        }
        if (this.combo('thunder_hole') && Math.random() < dt * 1.5) this.thunderBurst(z.x, z.y, z.r);
        if (z.tick <= 0) {
          z.tick = 0.5;
          for (const l of s.spatial.query(z.x, z.y, z.r)) this.hit(l, 1, { srcX: z.x, srcY: z.y, noKnock: true });
        }
      } else {
        const frame = `fx_fire${Math.floor(s.simTime * 9) % 3}`;
        if (z.fx) for (const f of z.fx) f.setFrame(frame);
        const alpha = Math.min(1, z.life * 2);
        z.img.setAlpha(alpha);
        if (z.tick <= 0) {
          z.tick = 0.5;
          for (const l of s.spatial.query(z.x, z.y, z.r)) {
            this.hit(l, 1, { srcX: z.x, srcY: z.y, noCrit: true, color: 0xffb368 });
            l.ignite(this.stats.damage * 0.8, 2, this.def.id);
          }
        }
      }
      if (z.life <= 0) {
        if (isHole && this.special) {
          this.fx.boom(z.x, z.y, z.r / 44, 0xc27bff);
          this.fx.sfx.play('boom', 0.1);
          for (const l of s.spatial.query(z.x, z.y, z.r * 1.1)) this.hit(l, 4, { srcX: z.x, srcY: z.y });
        }
        z.img.destroy();
        z.fx?.forEach((f) => f.destroy());
        this.zones.splice(i, 1);
      }
    }
  }

  private thunderBurst(x: number, y: number, r: number) {
    const s = this.scene;
    const near = s.spatial.query(x, y, r * 1.6);
    for (let k = 0; k < Math.min(4, near.length); k++) {
      const l = near[Math.floor(Math.random() * near.length)];
      this.fx.bolt(x, y, l.x, l.y, 0xc9a0ff, 2, 0.16);
      s.damage.hit(l, this.stats.damage * 1.2, this.def.id, 'lightning', { noCrit: true, color: 0xfff27a });
    }
    this.fx.sfx.play('zap', 0.15);
  }

  private tickTornado(dt: number) {
    const s = this.scene;
    const n = this.count;
    this.ensureMovers(n, 'fx_tornado0', 450000);
    const R = this.range;
    const flame = this.combo('flame_storm');
    const pull = (this.stats.pull ?? 190) * s.pstats.pull;
    const frame = `fx_tornado${Math.floor(s.simTime * 14) % 3}`;
    for (const m of this.movers) {
      this.stepMover(m, (this.stats.speed ?? 120) * s.pstats.speed, dt, 480);
      m.img.setFrame(frame).setPosition(m.x, m.y - 40).setScale((R / 50) * 1.5).setAlpha(0.82);
      if (flame) m.img.setTint(0xff9a55);
      else m.img.clearTint();
      m.pullTick -= dt;
      if (m.pullTick <= 0) {
        m.pullTick = 0.1;
        for (const l of s.spatial.query(m.x, m.y, R)) l.pull(m.x, m.y, pull, 0.1);
      }
      m.tick -= dt;
      if (m.tick <= 0) {
        m.tick = this.stats.interval;
        for (const l of s.spatial.query(m.x, m.y, R * 0.7)) {
          this.hit(l, 1, { srcX: m.x, srcY: m.y, noKnock: true, numberChance: 0.5 });
          if (flame) l.ignite(this.stats.damage, 2, this.def.id);
        }
        if (flame && Math.random() < 0.25) s.weapons.spawnBurnZone(m.x, m.y, 70, this.stats.damage, 2.5, this.def.id);
      }
    }
    if (Math.random() < dt * 2) this.fx.sfx.play('swing', 0.3);
  }

  private tickVoid(dt: number) {
    const s = this.scene;
    this.ensureMovers(this.count, 'fx_bh0', -15000);
    const R = this.range;
    const pull = (this.stats.pull ?? 280) * s.pstats.pull;
    for (const m of this.movers) {
      this.stepMover(m, (this.stats.speed ?? 110) * s.pstats.speed, dt, 460);
      m.img.setFrame(`fx_bh${Math.floor(s.simTime * 10) % 3}`).setPosition(m.x, m.y).setScale((R / 30) * 0.95);
      m.img.rotation += dt * 3;
      m.pullTick -= dt;
      if (m.pullTick <= 0) {
        m.pullTick = 0.1;
        for (const l of s.spatial.query(m.x, m.y, R * 1.3)) l.pull(m.x, m.y, pull, 0.1);
        // 吞噬：接触核心的普通韭菜直接被吸收
        for (const l of s.spatial.query(m.x, m.y, R * 0.3)) {
          if (l.isBoss || l.isElite || l.def.group === 'unit') continue;
          this.fx.burst('leaf', l.x, l.y, 2);
          s.stats.voidEaten++;
          s.damage.hit(l, 1e7, this.def.id, 'void', { noCrit: true, noNumber: true, pure: true });
        }
      }
      m.tick -= dt;
      if (m.tick <= 0) {
        m.tick = this.stats.interval;
        for (const l of s.spatial.query(m.x, m.y, R)) this.hit(l, 1, { srcX: m.x, srcY: m.y, noKnock: true, numberChance: 0.4 });
        if (this.combo('thunder_hole') && Math.random() < 0.5) this.thunderBurst(m.x, m.y, R);
      }
    }
  }

  override destroy() {
    for (const z of this.zones) {
      z.img.destroy();
      z.fx?.forEach((f) => f.destroy());
    }
    this.zones.length = 0;
    for (const m of this.movers) m.img.destroy();
    this.movers.length = 0;
  }
}
