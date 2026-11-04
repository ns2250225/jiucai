import Phaser from 'phaser';
import type { BattleScene } from '../scenes/BattleScene';
import { ObjectPool } from './ObjectPool';
import { AudioService } from '../../services/AudioService';

interface Shape {
  kind: 'line' | 'bolt' | 'ring' | 'warn' | 'beam';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  r0: number;
  r1: number;
  width: number;
  color: number;
  life: number;
  max: number;
  seed: number;
}
interface FxSprite {
  img: Phaser.GameObjects.Image;
  frames: string[] | null;
  life: number;
  max: number;
  vx: number;
  vy: number;
  spin: number;
  s0: number;
  s1: number;
  fade: boolean;
  follow: boolean;
}
interface FxNum {
  txt: Phaser.GameObjects.BitmapText;
  life: number;
  max: number;
  vy: number;
  vx: number;
}
export interface SpriteOpt {
  rot?: number;
  scale?: number;
  endScale?: number;
  life?: number;
  fade?: boolean;
  vx?: number;
  vy?: number;
  spin?: number;
  tint?: number;
  add?: boolean;
  depth?: number;
  frames?: string[];
  alpha?: number;
  follow?: boolean;
}
const FX_DEPTH = 500000;
const OVER_DEPTH = 600000;

type EmitterKind = 'spark' | 'leaf' | 'root' | 'coin' | 'ember' | 'shard' | 'smoke';

/** 瞬时特效统一管理：图形每帧重绘，精灵和数字走对象池，结束即回收 */
export class FxSystem {
  private gfx: Phaser.GameObjects.Graphics;
  private overGfx: Phaser.GameObjects.Graphics;
  private shapes: Shape[] = [];
  private shapeFree: Shape[] = [];
  private sprites: FxSprite[] = [];
  private spritePool: ObjectPool<FxSprite>;
  private nums: FxNum[] = [];
  private numPool: ObjectPool<FxNum>;
  private emitters: Record<string, Phaser.GameObjects.Particles.ParticleEmitter> = {};
  private dim: Phaser.GameObjects.Rectangle;
  private dimT = 0;
  private dimMax = 0;
  private dimAlpha = 0;
  private numBudget = 0;
  private sparkBudget = 0;
  low = false;
  showNumbers = true;
  shakeOn = true;

  constructor(private scene: BattleScene) {
    this.gfx = scene.add.graphics().setDepth(-50000);
    this.overGfx = scene.add.graphics().setDepth(FX_DEPTH);
    this.dim = scene.add.rectangle(0, 0, 8000, 8000, 0x000000, 0).setScrollFactor(0).setDepth(OVER_DEPTH - 1).setOrigin(0.5);
    this.dim.setVisible(false);
    this.spritePool = new ObjectPool<FxSprite>(
      () => ({
        img: scene.add.image(0, 0, 'atlas', 'fx_spark').setVisible(false),
        frames: null, life: 0, max: 1, vx: 0, vy: 0, spin: 0, s0: 1, s1: 1, fade: true, follow: false,
      }),
      (s) => s.img.setVisible(false),
    );
    this.numPool = new ObjectPool<FxNum>(
      () => ({ txt: scene.add.bitmapText(0, 0, 'num', '', 9).setDepth(FX_DEPTH + 5).setOrigin(0.5).setVisible(false), life: 0, max: 1, vy: 0, vx: 0 }),
      (n) => n.txt.setVisible(false),
    );
    const cfg = (frame: string, o: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig) =>
      scene.add.particles(0, 0, 'atlas', { frame, emitting: false, ...o }).setDepth(FX_DEPTH + 1);
    this.emitters.spark = cfg('fx_spark', { lifespan: 320, speed: { min: 60, max: 220 }, scale: { start: 1.3, end: 0 }, maxAliveParticles: 120 });
    this.emitters.leaf = cfg('fx_leaf', { lifespan: 520, speed: { min: 50, max: 170 }, gravityY: 240, rotate: { min: 0, max: 360 }, scale: { start: 1.4, end: 0.6 }, alpha: { start: 1, end: 0 }, maxAliveParticles: 160 });
    this.emitters.root = cfg('fx_root', { lifespan: 380, speed: { min: 40, max: 130 }, gravityY: 280, scale: { start: 1.2, end: 0.2 }, maxAliveParticles: 80 });
    this.emitters.coin = cfg('fx_coin', { lifespan: 650, speed: { min: 80, max: 260 }, gravityY: 380, scale: { start: 1.5, end: 0.7 }, alpha: { start: 1, end: 0 }, maxAliveParticles: 140 });
    this.emitters.ember = cfg('fx_ember', { lifespan: 620, speed: { min: 30, max: 130 }, gravityY: -110, scale: { start: 1.4, end: 0 }, maxAliveParticles: 120 });
    this.emitters.shard = cfg('fx_shard', { lifespan: 440, speed: { min: 80, max: 260 }, rotate: { min: 0, max: 360 }, scale: { start: 1.5, end: 0.3 }, alpha: { start: 1, end: 0 }, maxAliveParticles: 110 });
    this.emitters.smoke = cfg('fx_smoke', { lifespan: 620, speed: { min: 20, max: 80 }, gravityY: -40, scale: { start: 1.2, end: 3 }, alpha: { start: 0.65, end: 0 }, maxAliveParticles: 50 });
  }

  private shape(): Shape {
    return this.shapeFree.pop() ?? { kind: 'line', x0: 0, y0: 0, x1: 0, y1: 0, r0: 0, r1: 0, width: 1, color: 0, life: 0, max: 1, seed: 0 };
  }
  bolt(x0: number, y0: number, x1: number, y1: number, color = 0xfff27a, width = 2, life = 0.16) {
    const s = this.shape();
    Object.assign(s, { kind: 'bolt', x0, y0, x1, y1, width, color, life, max: life, seed: Math.random() * 1000 });
    this.shapes.push(s);
  }
  beam(x0: number, y0: number, x1: number, y1: number, color: number, width: number, life = 0.06) {
    const s = this.shape();
    Object.assign(s, { kind: 'beam', x0, y0, x1, y1, width, color, life, max: life });
    this.shapes.push(s);
  }
  ring(x: number, y: number, r0: number, r1: number, color = 0xffffff, life = 0.3, width = 3) {
    const s = this.shape();
    Object.assign(s, { kind: 'ring', x0: x, y0: y, r0, r1, color, life, max: life, width });
    this.shapes.push(s);
  }
  /** 红色地面预警圈：BOSS 与精英技能的出招提示 */
  warn(x: number, y: number, r: number, life: number, color = 0xff3030) {
    const s = this.shape();
    Object.assign(s, { kind: 'warn', x0: x, y0: y, r0: r, r1: r, color, life, max: life, width: 2 });
    this.shapes.push(s);
  }
  warnLine(x0: number, y0: number, x1: number, y1: number, width: number, life: number) {
    const s = this.shape();
    Object.assign(s, { kind: 'line', x0, y0, x1, y1, width, color: 0xff3030, life, max: life });
    this.shapes.push(s);
  }

  sprite(frame: string, x: number, y: number, o: SpriteOpt = {}) {
    if (this.low && this.sprites.length > 120) return null;
    if (this.sprites.length > 260) return null;
    const s = this.spritePool.get();
    const life = o.life ?? 0.3;
    Object.assign(s, {
      frames: o.frames ?? null, life, max: life, vx: o.vx ?? 0, vy: o.vy ?? 0, spin: o.spin ?? 0,
      s0: o.scale ?? 1, s1: o.endScale ?? o.scale ?? 1, fade: o.fade ?? true, follow: o.follow ?? false,
    });
    s.img
      .setFrame(frame)
      .setPosition(x, y)
      .setRotation(o.rot ?? 0)
      .setScale(s.s0)
      .setAlpha(o.alpha ?? 1)
      .setVisible(true)
      .setDepth(o.depth ?? FX_DEPTH - 2)
      .setBlendMode(o.add ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
    if (o.tint !== undefined) s.img.setTint(o.tint);
    else s.img.clearTint();
    this.sprites.push(s);
    return s;
  }

  burst(kind: EmitterKind, x: number, y: number, n: number) {
    if (this.low) n = Math.ceil(n / 2);
    if (this.sparkBudget <= 0) return;
    this.sparkBudget -= n;
    this.emitters[kind].explode(n, x, y);
  }

  boom(x: number, y: number, scale = 1, tint?: number) {
    this.sprite('fx_boom0', x, y, { frames: ['fx_boom0', 'fx_boom1', 'fx_boom2', 'fx_boom3'], life: 0.32, scale: scale * 1.6, tint, fade: false, depth: FX_DEPTH });
    this.burst('smoke', x, y, 3);
    this.burst('ember', x, y, 6);
  }

  number(x: number, y: number, value: number, crit: boolean, color?: number) {
    if (!this.showNumbers) return;
    if (this.numBudget <= 0 && !crit) return;
    if (this.nums.length > (this.low ? 40 : 90)) return;
    this.numBudget--;
    const n = this.numPool.get();
    let text: string;
    if (value >= 1e6) text = (value / 1e6).toFixed(1) + 'M';
    else if (value >= 10000) text = (value / 1000).toFixed(1) + 'K';
    else text = String(Math.max(1, Math.round(value)));
    if (crit) text += '!';
    n.life = n.max = crit ? 0.7 : 0.5;
    n.vy = crit ? -90 : -60;
    n.vx = (Math.random() - 0.5) * 40;
    n.txt
      .setText(text)
      .setPosition(x + (Math.random() - 0.5) * 12, y - 22)
      .setFontSize(crit ? 15 : 10)
      .setTint(color ?? (crit ? 0xffd23e : 0xffffff))
      .setAlpha(1)
      .setVisible(true);
    this.nums.push(n);
  }

  text(x: number, y: number, str: string, color = '#ffffff', size = 16) {
    const t = this.scene.add
      .text(x, y, str, { fontFamily: 'monospace', fontSize: `${size}px`, color, stroke: '#000', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(OVER_DEPTH);
    this.scene.tweens.add({ targets: t, y: y - 34, alpha: 0, duration: 1100, ease: 'Cubic.Out', onComplete: () => t.destroy() });
  }

  shake(intensity = 0.004, dur = 120) {
    if (this.shakeOn) this.scene.cameras.main.shake(dur, intensity, false);
  }
  /** 大招和 BOSS 出场时屏幕短暂变暗 */
  darken(alpha: number, dur: number) {
    this.dimT = this.dimMax = dur;
    this.dimAlpha = alpha;
    const cam = this.scene.cameras.main;
    this.dim.setPosition(cam.width / 2, cam.height / 2).setVisible(true);
  }
  flash(dur = 150, r = 255, g = 255, b = 255) {
    this.scene.cameras.main.flash(dur, r, g, b, false);
  }

  update(dt: number) {
    this.numBudget = Math.min(this.numBudget + dt * 45, 12);
    this.sparkBudget = Math.min(this.sparkBudget + dt * 260, 80);
    const g = this.gfx;
    const o = this.overGfx;
    g.clear();
    o.clear();
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const s = this.shapes[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.shapes[i] = this.shapes[this.shapes.length - 1];
        this.shapes.pop();
        this.shapeFree.push(s);
        continue;
      }
      const t = 1 - s.life / s.max;
      const a = s.life / s.max;
      switch (s.kind) {
        case 'bolt': {
          const dx = s.x1 - s.x0;
          const dy = s.y1 - s.y0;
          const len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len;
          const ny = dx / len;
          const segs = Math.max(2, Math.min(7, Math.floor(len / 26)));
          for (const pass of [0, 1]) {
            o.lineStyle(pass === 0 ? s.width + 3 : s.width, pass === 0 ? s.color : 0xffffff, pass === 0 ? a * 0.6 : a);
            o.beginPath();
            o.moveTo(s.x0, s.y0);
            for (let k = 1; k < segs; k++) {
              const off = Math.sin(s.seed + k * 12.9) * 14;
              o.lineTo(s.x0 + (dx * k) / segs + nx * off, s.y0 + (dy * k) / segs + ny * off);
            }
            o.lineTo(s.x1, s.y1);
            o.strokePath();
          }
          break;
        }
        case 'line':
          g.lineStyle(s.width, s.color, 0.2 + 0.35 * (0.5 + 0.5 * Math.sin(t * 22)));
          g.lineBetween(s.x0, s.y0, s.x1, s.y1);
          break;
        case 'beam':
          o.lineStyle(s.width * 1.7, s.color, 0.32 * a);
          o.lineBetween(s.x0, s.y0, s.x1, s.y1);
          o.lineStyle(s.width, s.color, 0.8 * a);
          o.lineBetween(s.x0, s.y0, s.x1, s.y1);
          o.lineStyle(Math.max(1, s.width * 0.35), 0xffffff, a);
          o.lineBetween(s.x0, s.y0, s.x1, s.y1);
          break;
        case 'ring':
          o.lineStyle(s.width, s.color, a);
          o.strokeCircle(s.x0, s.y0, s.r0 + (s.r1 - s.r0) * t);
          break;
        case 'warn':
          g.fillStyle(s.color, 0.1 + t * 0.2);
          g.fillCircle(s.x0, s.y0, s.r0);
          g.fillStyle(s.color, 0.22);
          g.fillCircle(s.x0, s.y0, s.r0 * t);
          g.lineStyle(2, s.color, 0.85);
          g.strokeCircle(s.x0, s.y0, s.r0);
          break;
      }
    }
    for (let i = this.sprites.length - 1; i >= 0; i--) {
      const s = this.sprites[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.sprites[i] = this.sprites[this.sprites.length - 1];
        this.sprites.pop();
        this.spritePool.release(s);
        continue;
      }
      const t = 1 - s.life / s.max;
      if (s.frames) s.img.setFrame(s.frames[Math.min(s.frames.length - 1, Math.floor(t * s.frames.length))]);
      if (s.follow) {
        s.img.x = this.scene.player.x;
        s.img.y = this.scene.player.y;
      } else {
        s.img.x += s.vx * dt;
        s.img.y += s.vy * dt;
      }
      if (s.spin) s.img.rotation += s.spin * dt;
      if (s.s0 !== s.s1) s.img.setScale(s.s0 + (s.s1 - s.s0) * t);
      if (s.fade) s.img.setAlpha(1 - t);
    }
    for (let i = this.nums.length - 1; i >= 0; i--) {
      const n = this.nums[i];
      n.life -= dt;
      if (n.life <= 0) {
        this.nums[i] = this.nums[this.nums.length - 1];
        this.nums.pop();
        this.numPool.release(n);
        continue;
      }
      n.txt.y += n.vy * dt;
      n.txt.x += n.vx * dt;
      n.vy *= 0.93;
      if (n.life < 0.2) n.txt.setAlpha(n.life / 0.2);
    }
    if (this.dimT > 0) {
      this.dimT -= dt;
      const t = this.dimT / this.dimMax;
      this.dim.setFillStyle(0x000000, this.dimAlpha * Math.min(1, t * 2));
      if (this.dimT <= 0) this.dim.setVisible(false);
    }
  }

  sfx = AudioService;
}
