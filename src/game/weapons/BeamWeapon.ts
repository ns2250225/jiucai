import { Weapon } from './Weapon';
import type { Leek } from '../entities/Leek';

interface Beam {
  angle: number;
  life: number;
  tick: number;
}

/** 闪电 / 雷神审判 / 激光 / 太阳审判 */
export class BeamWeapon extends Weapon {
  private beams: Beam[] = [];
  private sunAngle = 0;
  private sunTick = 0;

  protected fire() {
    switch (this.def.behavior) {
      case 'chain':
        return this.fireChain();
      case 'thor':
        return this.fireThor();
      case 'laser':
        return this.fireLaser();
      default:
        return true;
    }
  }

  /** 从 from 出发向周围跳跃，绝缘进化会削减跳数 */
  private chain(from: { x: number; y: number }, first: Leek, hops: number, mult: number, chainRange: number, fork: boolean) {
    const s = this.scene;
    const visited = new Set<number>();
    let cur: Leek = first;
    let px = from.x;
    let py = from.y;
    let dmgMul = mult;
    for (let i = 0; i < hops && cur; i++) {
      visited.add(cur.uid);
      this.fx.bolt(px, py, cur.x, cur.y - 10, 0xfff27a, 2 + (i === 0 ? 1 : 0), 0.15);
      this.hit(cur, dmgMul, { srcX: px, srcY: py, noKnock: true });
      px = cur.x;
      py = cur.y;
      dmgMul *= 0.93;
      const next = s.spatial.nearest(px, py, chainRange, (o) => !visited.has(o.uid));
      if (!next) break;
      if (fork && Math.random() < 0.3) {
        const other = s.spatial.nearest(next.x, next.y, chainRange, (o) => !visited.has(o.uid) && o !== next);
        if (other) {
          this.fx.bolt(px, py, other.x, other.y - 10, 0xfff27a, 1, 0.13);
          this.hit(other, dmgMul * 0.8, { noKnock: true });
          visited.add(other.uid);
        }
      }
      cur = next;
    }
  }

  private hops() {
    // 绝缘 Lv3 起：闪电跳数减少
    const lv = this.scene.evolution.level('lightning');
    return Math.max(1, this.count - (lv >= 3 ? lv - 1 : 0));
  }

  private fireChain() {
    const p = this.p;
    const s = this.scene;
    const first = s.spatial.nearest(p.x, p.y, this.range);
    if (!first) return false;
    this.chain({ x: first.x, y: first.y - 170 }, first, this.hops(), 1, (this.stats.chainRange ?? 130) * s.pstats.range, this.special);
    this.fx.sprite('fx_spark', first.x, first.y, { scale: 6, endScale: 2, life: 0.15, add: true });
    this.fx.sfx.play('zap', 0.08);
    return true;
  }

  private fireThor() {
    const p = this.p;
    const s = this.scene;
    const pool = s.spatial.query(p.x, p.y, this.range);
    if (pool.length === 0) return false;
    const n = this.count;
    const chainRange = (this.stats.chainRange ?? 170) * s.pstats.range;
    for (let i = 0; i < n; i++) {
      const t = pool[Math.floor(Math.random() * pool.length)];
      s.time.delayedCall(i * 70, () => {
        if (!t.active) return;
        this.fx.bolt(t.x, t.y - 300, t.x, t.y - 10, 0xfff27a, 5, 0.2);
        this.fx.sprite('fx_boom1', t.x, t.y, { scale: 1.2, life: 0.2, tint: 0xfff27a });
        this.fx.sfx.play('zap', 0.05);
        // 分裂扩散：每道落雷向外派生多条闪电
        this.spread(t, 3, 1, chainRange);
        for (const l of s.spatial.query(t.x, t.y, 60)) if (l !== t) this.hit(l, 0.7, { noKnock: true });
      });
    }
    return true;
  }

  private spread(t: Leek, depth: number, mult: number, range: number) {
    if (!t.active) return;
    const s = this.scene;
    this.hit(t, mult, { noKnock: true });
    if (depth <= 0) return;
    const near = s.spatial.query(t.x, t.y, range);
    const insulated = s.evolution.level('lightning') >= 3;
    const forks = insulated ? 1 : 2;
    for (let k = 0; k < forks && near.length; k++) {
      const o = near[Math.floor(Math.random() * near.length)];
      if (o === t) continue;
      this.fx.bolt(t.x, t.y - 8, o.x, o.y - 8, 0xfff27a, 2, 0.15);
      s.time.delayedCall(60, () => this.spread(o, depth - 1, mult * 0.65, range));
    }
  }

  private fireLaser() {
    const p = this.p;
    const s = this.scene;
    const t = s.spatial.nearest(p.x, p.y, this.range);
    if (!t) return false;
    const base = Math.atan2(t.y - p.y, t.x - p.x);
    const n = this.count;
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.32;
      this.beams.push({ angle: a, life: this.stats.duration, tick: 0 });
    }
    this.fx.sfx.play('laser', 0.1);
    p.playAttack();
    return true;
  }

  private strikeBeam(angle: number, len: number, width: number, mult: number) {
    const p = this.p;
    const s = this.scene;
    const x1 = p.x + Math.cos(angle) * len;
    const y1 = p.y + Math.sin(angle) * len;
    const frost = this.combo('frost_beam');
    for (const l of s.spatial.queryLine(p.x, p.y, x1, y1, width)) {
      this.hit(l, mult, { srcX: p.x, srcY: p.y, noKnock: true, numberChance: 0.6, color: frost ? 0xa8ecff : undefined });
      if (frost) {
        l.slow(0.5, 1.5);
        if (Math.random() < 0.08) l.freeze(1);
      }
      if (Math.random() < 0.2) this.fx.burst('spark', l.x, l.y, 1);
    }
  }

  protected override tick(dt: number) {
    const p = this.p;
    const s = this.scene;
    const frost = this.combo('frost_beam');
    const color = frost ? 0x8fe4ff : 0xff5aa8;
    if (this.def.behavior === 'laser') {
      const len = this.range;
      const width = (this.stats.width ?? 16) * s.pstats.range;
      for (let i = this.beams.length - 1; i >= 0; i--) {
        const b = this.beams[i];
        b.life -= dt;
        b.tick -= dt;
        // 光束略微追踪最近的敌人
        if (s.aimTarget) {
          const want = Math.atan2(s.aimTarget.y - p.y, s.aimTarget.x - p.x);
          let diff = want - b.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          b.angle += Math.max(-1, Math.min(1, diff)) * dt * 1.2;
        }
        this.fx.beam(p.x, p.y, p.x + Math.cos(b.angle) * len, p.y + Math.sin(b.angle) * len, color, width, 0.04);
        if (b.tick <= 0) {
          b.tick = 0.12;
          this.strikeBeam(b.angle, len, width, 1);
        }
        if (b.life <= 0) {
          if (this.special) {
            // 折射光束
            for (const off of [-0.55, 0.55]) {
              this.fx.beam(p.x, p.y, p.x + Math.cos(b.angle + off) * len, p.y + Math.sin(b.angle + off) * len, color, width * 0.7, 0.22);
              this.strikeBeam(b.angle + off, len, width * 0.7, 1.5);
            }
          }
          this.beams.splice(i, 1);
        }
      }
    } else if (this.def.behavior === 'sun') {
      const n = this.count;
      const len = this.range;
      const width = (this.stats.width ?? 24) * s.pstats.range;
      this.sunAngle += dt * (this.stats.speed ?? 0.55);
      this.sunTick -= dt;
      const doHit = this.sunTick <= 0;
      if (doHit) this.sunTick = this.stats.interval;
      const beamColor = frost ? 0x8fe4ff : 0xffb040;
      for (let i = 0; i < n; i++) {
        const a = this.sunAngle + (i / n) * Math.PI * 2;
        this.fx.beam(p.x, p.y, p.x + Math.cos(a) * len, p.y + Math.sin(a) * len, beamColor, width, 0.03);
        if (doHit) this.strikeBeam(a, len, width, 1);
      }
      if (Math.random() < dt * 4) this.fx.burst('ember', p.x, p.y, 2);
    }
  }
}
