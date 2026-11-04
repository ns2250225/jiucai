import Phaser from 'phaser';
import type { BattleScene } from '../scenes/BattleScene';
import type { Leek } from '../entities/Leek';
import { ULT_MAP } from '../data';
import { GameManager } from '../GameManager';
import { AudioService } from '../../services/AudioService';

const ENERGY_MAX = 100;
const BASE_COOLDOWN = 22;

/** 大招：击杀积攒能量，满能量且冷却结束才能释放 */
export class UltimateManager {
  energy = 0;
  cd = 0;
  windowOpen = false;
  windowKills = 0;
  private windowT = 0;
  readonly id: string;

  constructor(private scene: BattleScene, id: string) {
    this.id = id;
  }

  get max() {
    return ENERGY_MAX;
  }
  get ready() {
    return this.energy >= ENERGY_MAX && this.cd <= 0;
  }
  get name() {
    return ULT_MAP[this.id]?.name ?? '';
  }

  onKill(l: Leek) {
    const gain = (l.isBoss ? 40 : l.isElite ? 8 : 0.55) * this.scene.pstats.ultCharge * (1 / this.scene.pstats.ultCd);
    this.energy = Math.min(ENERGY_MAX, this.energy + gain);
  }

  update(dt: number) {
    if (this.cd > 0) this.cd -= dt;
    if (this.windowOpen) {
      this.windowT -= dt;
      if (this.windowT <= 0) {
        this.windowOpen = false;
        const st = this.scene.stats;
        if (this.windowKills > st.maxUltKills) st.maxUltKills = this.windowKills;
      }
    }
  }

  private dmg() {
    return 55 + this.scene.exp.level * 7;
  }

  /** 屏幕内的敌人快照 */
  private onScreen(): Leek[] {
    const s = this.scene;
    const v = s.cameras.main.worldView;
    return s.enemies.filter((l) => l.active && v.contains(l.x, l.y));
  }
  private normals(list: Leek[]) {
    return list.filter((l) => !l.isBoss && !l.isElite && l.def.group !== 'unit');
  }

  cast() {
    if (!this.ready || this.scene.player.dead) return;
    const s = this.scene;
    const p = s.player;
    this.energy = 0;
    this.cd = BASE_COOLDOWN * s.pstats.ultCd;
    s.stats.ultCasts++;
    this.windowOpen = true;
    this.windowKills = 0;
    this.windowT = 4.5;
    // 统一的释放演出：变暗 + 角色发光 + 技能名
    s.fx.darken(0.6, 1.1);
    s.fx.shake(0.01, 400);
    AudioService.play('ult');
    s.tweens.killTweensOf(p.glow);
    p.glow.setAlpha(1).setScale(2.4);
    s.tweens.add({ targets: p.glow, alpha: 0, scale: 6, duration: 1100, ease: 'Cubic.Out' });
    GameManager.emit('banner', { text: this.name, kind: 'ult', sub: ULT_MAP[this.id]?.desc });
    switch (this.id) {
      case 'reaper':
        return this.reaper();
      case 'gold_storm':
        return this.goldStorm();
      case 'black_devour':
        return this.blackDevour();
      case 'thunder':
        return this.thunder();
      case 'hellfire':
        return this.hellfire();
      case 'timefreeze':
        return this.timeFreeze();
      case 'blades':
        return this.blades();
      case 'final':
        return this.finalHarvest();
    }
  }

  private hitAll(list: Leek[], mult: number, color: number, dtype: 'melee' | 'fire' | 'lightning' | 'frost' | 'void' = 'melee') {
    const s = this.scene;
    for (const l of list) s.damage.hit(l, this.dmg() * mult, null, dtype, { noCrit: false, critRate: 0.2, critDmg: 2, color, numberChance: 0.85 });
  }

  private reaper() {
    const s = this.scene;
    const p = s.player;
    const v = s.cameras.main.worldView;
    for (let w = 0; w < 3; w++) {
      s.time.delayedCall(w * 260, () => {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + w;
          s.fx.sprite('fx_slash_big', p.x + Math.cos(a) * 200, p.y + Math.sin(a) * 160, { rot: a, scale: 2.4, endScale: 3.4, life: 0.32, tint: 0x9affb4 });
        }
        s.fx.ring(p.x, p.y, 40, v.width * 0.7, 0x6dff9a, 0.4, 6);
        s.fx.burst('spark', p.x, p.y, 20);
        this.hitAll(this.onScreen(), 1.2, 0x9affb4);
        AudioService.play('swing', 0.05);
      });
    }
  }

  private goldStorm() {
    const s = this.scene;
    const v = s.cameras.main.worldView;
    let n = 0;
    const tick = s.time.addEvent({
      delay: 120,
      repeat: 22,
      callback: () => {
        n++;
        for (let i = 0; i < 6; i++) {
          const x = v.x + Math.random() * v.width;
          const y = v.y + Math.random() * v.height;
          s.fx.sprite('p_coin', x, y - 240, { vy: 900, life: 0.26, scale: 2.2, spin: 12, fade: false, depth: 480000 });
          s.time.delayedCall(240, () => s.fx.burst('coin', x, y, 2));
          if (i < 3) s.drops.spawn('coin', x, y, 3);
        }
        if (n % 4 === 0) this.hitAll(this.onScreen(), 0.45, 0xffd23e);
        AudioService.play('coin', 0.05);
      },
    });
    void tick;
  }

  private blackDevour() {
    const s = this.scene;
    const p = s.player;
    const x = p.x;
    const y = p.y;
    s.fx.sprite('fx_bh0', x, y, { frames: ['fx_bh0', 'fx_bh1', 'fx_bh2', 'fx_bh0', 'fx_bh1', 'fx_bh2', 'fx_bh0', 'fx_bh1', 'fx_bh2'], life: 2.4, scale: 3, endScale: 7, spin: 4, fade: false, depth: 450000 });
    AudioService.play('hole', 0.1);
    const ev = s.time.addEvent({
      delay: 100,
      repeat: 18,
      callback: () => {
        for (const l of this.onScreen()) l.pull(x, y, 900, 0.1);
      },
    });
    void ev;
    s.time.delayedCall(2000, () => {
      s.fx.flash(200, 190, 130, 255);
      s.fx.ring(x, y, 20, 700, 0xc27bff, 0.5, 8);
      AudioService.play('boom', 0.05);
      const all = this.onScreen();
      for (const l of this.normals(all)) {
        s.stats.voidEaten++;
        s.damage.hit(l, 1e7, null, 'void', { pure: true, noNumber: true });
      }
      for (const l of all) if (l.active) s.damage.hit(l, this.dmg() * 2, null, 'void', { color: 0xc27bff });
    });
  }

  private thunder() {
    const s = this.scene;
    for (let w = 0; w < 6; w++) {
      s.time.delayedCall(w * 300, () => {
        const list = this.onScreen();
        const n = Math.min(24, list.length);
        for (let i = 0; i < n; i++) {
          const l = Phaser.Math.RND.pick(list);
          s.fx.bolt(l.x, l.y - 320, l.x, l.y - 8, 0xfff27a, 3, 0.2);
        }
        s.fx.flash(70, 255, 250, 180);
        this.hitAll(list, 0.6, 0xfff27a, 'lightning');
        AudioService.play('zap', 0.03);
      });
    }
  }

  private hellfire() {
    const s = this.scene;
    const p = s.player;
    for (let w = 0; w < 3; w++) {
      s.time.delayedCall(w * 420, () => {
        const r = 150 + w * 170;
        for (let i = 0; i < 12 + w * 6; i++) {
          const a = (i / (12 + w * 6)) * Math.PI * 2;
          s.fx.boom(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1.4);
        }
        s.fx.ring(p.x, p.y, r * 0.5, r * 1.3, 0xff6a2a, 0.5, 10);
        s.fx.shake(0.012, 200);
        AudioService.play('boom', 0.05);
        for (const l of s.spatial.query(p.x, p.y, r * 1.35)) {
          s.damage.hit(l, this.dmg() * 1.3, null, 'fire', { critRate: 0.2, critDmg: 2, color: 0xff9248 });
          if (l.active) l.ignite(this.dmg() * 0.3, 4, null);
        }
      });
    }
  }

  private timeFreeze() {
    const s = this.scene;
    const p = s.player;
    s.fx.ring(p.x, p.y, 10, 1200, 0xa8ecff, 0.7, 10);
    s.fx.flash(220, 170, 230, 255);
    AudioService.play('ice', 0.05);
    const list = this.onScreen();
    for (const l of this.normals(list)) l.freeze(6);
    for (const l of list) {
      if (l.isElite) l.slow(0.3, 5);
      s.damage.hit(l, this.dmg() * 0.4, null, 'frost', { color: 0xa8ecff, numberChance: 0.7 });
    }
    for (let i = 0; i < 20; i++) {
      const l = list[i];
      if (l) s.fx.burst('shard', l.x, l.y, 2);
    }
    s.stats.frozen += list.length;
  }

  private blades() {
    const s = this.scene;
    const p = s.player;
    const total = 90;
    for (let i = 0; i < total; i++) {
      s.time.delayedCall(i * 22, () => {
        const a = (i / 18) * Math.PI * 2;
        s.projectiles.fire('fx_blade', p.x, p.y, Math.cos(a) * 520, Math.sin(a) * 520, {
          dmg: this.dmg() * 0.55, life: 1.3, pierce: 8, radius: 16, scale: 2.2, spin: 22, weaponId: null, dtype: 'melee', critRate: 0.2, critDmg: 2,
        });
        if (i % 6 === 0) AudioService.play('swing', 0.04);
      });
    }
  }

  private finalHarvest() {
    const s = this.scene;
    const p = s.player;
    s.fx.flash(300, 255, 60, 60);
    s.fx.shake(0.02, 600);
    const v = s.cameras.main.worldView;
    s.fx.sprite('fx_slash_big', p.x, p.y, { scale: (v.width / 96) * 0.6, endScale: v.width / 96, life: 0.5, tint: 0xff4040, spin: 5 });
    const list = this.onScreen();
    for (const l of this.normals(list)) {
      s.fx.number(l.x, l.y - 10, 99999, true, 0xff4040);
      s.damage.hit(l, 1e7, null, 'melee', { pure: true, noNumber: true });
    }
    for (const l of list) {
      if (!l.active) continue;
      s.damage.hit(l, Math.max(this.dmg() * 2, l.maxHp * (l.isBoss ? 0.04 : 0.2)), null, 'melee', { pure: true, color: 0xff4040 });
    }
  }

  /** 神秘收割者的固有技能：每 60 秒一次 */
  deathReap() {
    const s = this.scene;
    const p = s.player;
    const r = 300 * s.pstats.range;
    const scale = r / 46;
    s.fx.darken(0.3, 0.45);
    s.fx.sprite('fx_slash_big', p.x, p.y, { scale: scale * 0.5, endScale: scale, life: 0.3, spin: 14, tint: 0xb4ffc8 });
    s.fx.sprite('fx_slash_big', p.x, p.y, { rot: Math.PI, scale: scale * 0.5, endScale: scale, life: 0.3, spin: 14, tint: 0x6dff9a });
    s.fx.ring(p.x, p.y, 30, r, 0x6dff9a, 0.35, 6);
    AudioService.play('swing', 0.02);
    p.playAttack();
    for (const l of s.spatial.query(p.x, p.y, r)) {
      const normal = !l.isBoss && !l.isElite && l.def.group !== 'unit';
      s.damage.hit(l, (40 + s.exp.level * 6) * (normal ? 2 : 0.6), null, 'melee', { color: 0x9affb4, numberChance: 0.7 });
    }
    GameManager.emit('banner', { text: '死亡收割', kind: 'quip' });
  }
}
