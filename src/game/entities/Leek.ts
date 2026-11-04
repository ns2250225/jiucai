import Phaser from 'phaser';
import type { BattleScene } from '../scenes/BattleScene';
import type { EnemyDef, EvoLineId } from '../types';

let UID = 1;
const DRAW_SCALE = 1.3;

/** 普通/特殊韭菜。AI 是一个简单的行为状态机，不做逐帧寻路 */
export class Leek {
  uid = UID++;
  sprite: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Image | null = null;
  def!: EnemyDef;
  active = false;
  isElite = false;
  isBoss = false;
  x = 0;
  y = 0;
  hp = 1;
  maxHp = 1;
  radius = 12;
  speed = 40;
  dmg = 5;
  frames: string[] = ['leek_basic_0', 'leek_basic_1'];
  baseScale = DRAW_SCALE;
  baseTint = 0xffffff;
  animT = 0;
  animF = 0;
  // 状态
  slowT = 0;
  slowMul = 1;
  freezeT = 0;
  burnT = 0;
  burnDps = 0;
  burnTick = 0;
  burnWeapon: string | null = null;
  flashT = 0;
  kx = 0;
  ky = 0;
  invuln = false;
  mutMask = 0;
  mutLine: EvoLineId | null = null;
  auraResist = 0;
  auraT = 0;
  buffMul = 1;
  buffT = 0;
  immune: string | null = null;
  // AI
  state = 0;
  stateT = 0;
  aiCd = 0;
  mx = 0;
  my = 0;
  life = 0;
  flag = false;
  counter = 0;
  leader: Leek | null = null;
  offX = 0;
  offY = 0;
  value = 1;
  evoLine: EvoLineId | null = null;
  dirX = 1;
  dirY = 0;
  knockRes = 0;
  xpMul = 1;
  goldMul = 1;
  noDrop = false;

  constructor(public scene: BattleScene) {
    this.sprite = scene.add.image(0, 0, 'atlas', this.frames[0]).setOrigin(0.5, 0.62).setVisible(false);
  }

  spawn(def: EnemyDef, x: number, y: number, hpMul: number, dmgMul: number) {
    this.def = def;
    this.active = true;
    this.x = x;
    this.y = y;
    this.maxHp = this.hp = def.hp * hpMul;
    this.dmg = def.dmg * dmgMul;
    this.speed = def.speed * (0.92 + Math.random() * 0.16);
    this.radius = def.radius;
    this.frames = [`${def.id}_0`, `${def.id}_1`];
    this.baseScale = DRAW_SCALE * (def.scale ?? 1);
    this.knockRes = def.knockRes ?? 0;
    this.baseTint = 0xffffff;
    this.animT = Math.random();
    this.animF = 0;
    this.slowT = this.freezeT = this.burnT = this.flashT = this.kx = this.ky = 0;
    this.slowMul = 1;
    this.invuln = false;
    this.mutMask = 0;
    this.mutLine = null;
    this.auraResist = this.auraT = 0;
    this.buffMul = 1;
    this.buffT = 0;
    this.immune = null;
    this.state = 0;
    this.stateT = 0;
    this.aiCd = 1 + Math.random() * 1.5;
    this.life = 0;
    this.flag = false;
    this.counter = 0;
    this.leader = null;
    this.offX = this.offY = 0;
    this.value = 1;
    this.evoLine = null;
    this.xpMul = 1;
    this.goldMul = 1;
    this.noDrop = false;
    this.mx = this.my = 0;
    this.sprite.setFrame(this.frames[0]).setScale(this.baseScale).setPosition(x, y).setVisible(true).setAlpha(1).clearTint().setFlipX(false).setRotation(0);
    this.badge?.setVisible(false);
    this.onSpawn();
  }

  protected onSpawn() {}

  setBaseTint(c: number) {
    this.baseTint = c;
    this.sprite.setTint(c);
  }

  showBadge(tint: number) {
    if (!this.badge) this.badge = this.scene.add.image(0, 0, 'atlas', 'fx_badge').setScale(1.1);
    this.badge.setTint(tint).setVisible(true);
  }

  release() {
    this.active = false;
    this.sprite.setVisible(false);
    this.badge?.setVisible(false);
  }

  freeze(t: number) {
    if (this.isBoss || this.def.group === 'unit') return this.slow(0.6, t);
    const f = this.scene.evolution.ctrlFactor(this);
    if (f <= 0) return;
    this.freezeT = Math.max(this.freezeT, t * f);
    this.scene.monitor.recordControl();
    this.scene.stats.frozen++;
  }
  slow(mul: number, t: number) {
    const f = this.scene.evolution.ctrlFactor(this);
    if (f <= 0) return;
    this.slowMul = Math.min(this.slowMul < 1 && this.slowT > 0 ? this.slowMul : 1, 1 - (1 - mul) * f);
    this.slowT = Math.max(this.slowT, t * f);
    this.scene.monitor.recordControl();
  }
  ignite(dps: number, t: number, weaponId: string | null) {
    if (this.scene.evolution.burnImmune(this)) {
      // 耐火变异：火烧反而兴奋
      this.buffMul = 1.3;
      this.buffT = 1.5;
      return;
    }
    this.burnDps = Math.max(this.burnDps * (this.burnT > 0 ? 1 : 0), dps);
    this.burnT = Math.max(this.burnT, t);
    this.burnWeapon = weaponId;
  }
  /** 引力：由黑洞/龙卷调用，反重力变异会削弱甚至挣脱 */
  pull(cx: number, cy: number, force: number, dt: number) {
    if (this.invuln) return;
    const res = this.scene.evolution.pullFactor(this);
    if (this.isBoss) force *= 0.12;
    else if (this.isElite) force *= 0.45;
    if (res <= 0.3 && !this.isBoss && Math.random() < dt * 0.6) {
      // 反重力韭菜：挣脱冲刺
      const a = Math.atan2(this.y - cy, this.x - cx);
      this.kx += Math.cos(a) * 220;
      this.ky += Math.sin(a) * 220;
    }
    const dx = cx - this.x;
    const dy = cy - this.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d < 4) return;
    const step = Math.min(d, force * res * dt);
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    this.scene.monitor.recordControlTick(dt);
  }
  knock(ax: number, ay: number, power: number) {
    if (this.scene.evolution.knockImmune(this)) return;
    const p = power * (1 - this.knockRes);
    this.kx += ax * p;
    this.ky += ay * p;
  }

  /** 受击后的行为反应（逃跑、反击等） */
  onHit(_dmg: number, _dtype: string) {
    const ai = this.def.ai;
    if (ai === 'runner') this.aiCd = 2;
    else if (ai === 'old' && !this.flag && this.hp > 0 && this.hp < this.maxHp * 0.35) {
      this.flag = true;
      this.hp += this.maxHp * 0.55;
      this.scene.fx.burst('leaf', this.x, this.y - 10, 5);
    }
  }
  /** 伤害结算前的修正（护盾、格挡）。返回修正后的伤害 */
  modifyDamage(dmg: number, dtype: string, srcX: number, srcY: number): number {
    if (this.def.ai === 'shield') {
      const p = this.scene.player;
      const fx = p.x - this.x;
      const fy = p.y - this.y;
      if ((srcX - this.x) * fx + (srcY - this.y) * fy > 0 && dtype !== 'void' && dtype !== 'fire') {
        if (Math.random() < 0.2) this.scene.fx.burst('spark', this.x + Math.sign(fx) * 14, this.y, 2);
        return dmg * 0.2;
      }
    }
    return dmg;
  }
  /** 死亡前判定，返回 true 表示拦截了死亡（复活、阶段切换） */
  beforeDeath(): boolean {
    return false;
  }

  protected steer(tx: number, ty: number, mul = 1) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy) || 1;
    this.mx = (dx / d) * mul;
    this.my = (dy / d) * mul;
  }
  protected away(tx: number, ty: number, mul = 1) {
    const dx = this.x - tx;
    const dy = this.y - ty;
    const d = Math.hypot(dx, dy) || 1;
    this.mx = (dx / d) * mul;
    this.my = (dy / d) * mul;
  }
  protected freqCd(cd: number) {
    return cd / (this.scene.map.attackFreq ?? 1);
  }

  /** 目标点：预判进化后会朝玩家的未来位置走 */
  protected aimPoint(lead = 0) {
    const p = this.scene.player;
    const l = lead + this.scene.evolution.predictLead(this);
    return { x: p.x + p.vx * l, y: p.y + p.vy * l };
  }

  protected think(dt: number) {
    const s = this.scene;
    const p = s.player;
    this.aiCd -= dt;
    this.stateT += dt;
    this.life += dt;
    const ai = this.def.ai;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy);

    // 全局事件：大逃亡。固定单位不受影响
    if (s.mods.flee > 0 && this.speed > 0 && ai !== 'tide') {
      const cx = s.worldSize / 2;
      this.away(cx, cx, 1.25);
      return;
    }
    const aim = this.aimPoint();
    switch (ai) {
      case 'chase':
        this.steer(aim.x, aim.y);
        break;
      case 'old':
        this.steer(aim.x, aim.y);
        break;
      case 'dash': {
        const burst = (this.stateT % 2.4) < 0.6 ? 1.6 : 0.85;
        this.steer(aim.x, aim.y, burst);
        break;
      }
      case 'runner':
        if (this.aiCd > 0 && this.life > 2) this.away(p.x, p.y, 1.35);
        else this.steer(aim.x, aim.y);
        break;
      case 'cluster':
        if (this.leader?.active) this.steer(this.leader.x + this.offX, this.leader.y + this.offY, 1.1);
        else this.steer(aim.x, aim.y);
        break;
      case 'burrow':
        if (this.state === 0) {
          this.steer(aim.x, aim.y);
          if (this.stateT > 2.6 && dist > 60) {
            this.state = 1;
            this.stateT = 0;
            this.invuln = true;
            this.sprite.setFrame('fx_dirt');
            s.fx.burst('smoke', this.x, this.y, 3);
          }
        } else {
          this.steer(aim.x, aim.y, 2.3);
          if (this.stateT > 1.5) {
            this.state = 0;
            this.stateT = 0;
            this.invuln = false;
            this.sprite.setFrame(this.frames[0]);
            s.fx.burst('smoke', this.x, this.y, 4);
          }
        }
        break;
      case 'suit':
        if (this.hp < this.maxHp * 0.6) this.away(p.x, p.y, 1.5);
        else this.steer(aim.x, aim.y);
        break;
      case 'stock': {
        this.value = s.eventSys.marketFor(this.uid);
        if (this.value >= 1) this.steer(aim.x, aim.y, 0.8 + this.value * 0.35);
        else this.away(p.x, p.y, 0.9);
        break;
      }
      case 'gold':
        if (this.life > 22) {
          s.fx.burst('coin', this.x, this.y, 8);
          s.combat.removeSilently(this);
          return;
        }
        if (dist < 420) this.away(p.x, p.y, 1);
        else {
          const a = this.uid + this.stateT * 0.5;
          this.mx = Math.cos(a) * 0.5;
          this.my = Math.sin(a) * 0.5;
        }
        break;
      case 'scientist':
        if (dist < 240) this.away(p.x, p.y);
        else if (dist > 320) this.steer(p.x, p.y);
        else this.mx = this.my = 0;
        if (this.aiCd <= 0) {
          this.aiCd = 1.2;
          this.emitAura(150, 0.22, 1.6);
        }
        break;
      case 'muscle':
        if (this.state === 0) {
          this.steer(aim.x, aim.y);
          if (this.aiCd <= 0 && dist < 380) {
            this.state = 1;
            this.stateT = 0;
            s.fx.warnLine(this.x, this.y, p.x, p.y, 14, 0.55);
            this.dirX = dx / (dist || 1);
            this.dirY = dy / (dist || 1);
          }
        } else if (this.state === 1) {
          this.mx = this.my = 0;
          if (this.stateT > 0.55) {
            this.state = 2;
            this.stateT = 0;
          }
        } else {
          this.mx = this.dirX * 3.8;
          this.my = this.dirY * 3.8;
          if (this.stateT > 0.5) {
            this.state = 0;
            this.aiCd = this.freqCd(3.5 + Math.random() * 2);
          }
        }
        break;
      case 'shield':
        this.steer(aim.x, aim.y);
        break;
      case 'medic': {
        if (this.aiCd <= 0) {
          this.aiCd = 1.4;
          let healed = 0;
          for (const o of s.spatial.query(this.x, this.y, 130)) {
            if (o !== this && !o.isBoss && o.hp < o.maxHp) {
              o.hp = Math.min(o.maxHp, o.hp + o.maxHp * 0.1);
              healed++;
            }
          }
          if (healed) {
            s.fx.ring(this.x, this.y, 10, 130, 0x62ff8a, 0.4, 2);
          }
        }
        if (dist < 200) this.away(p.x, p.y, 0.8);
        else this.steer(aim.x, aim.y, 0.8);
        break;
      }
      case 'mech':
        if (dist < 210) this.away(p.x, p.y, 0.9);
        else if (dist > 290) this.steer(aim.x, aim.y);
        else this.mx = this.my = 0;
        if (this.aiCd <= 0 && dist < 480) {
          this.aiCd = this.freqCd(2.3 + Math.random());
          const t = this.aimPoint(0.25);
          s.projectiles.enemyShot(this.x, this.y - 8, t.x, t.y, 190, this.dmg, 'fx_bullet');
        }
        break;
      case 'pyramid':
        this.steer(aim.x, aim.y, dist < 220 ? 0 : 1);
        if (this.aiCd <= 0) {
          this.aiCd = this.freqCd(5);
          s.fx.ring(this.x, this.y, 8, 180, 0xd070ff, 0.5, 3);
          let n = 0;
          for (const o of s.spatial.query(this.x, this.y, 180)) {
            if (o !== this && !o.isBoss) {
              o.buffMul = 1.45;
              o.buffT = 3.2;
              n++;
            }
          }
          const pulls = Math.min(3, 1 + Math.floor(n / 6));
          for (let i = 0; i < pulls; i++) {
            s.spawner.spawnNear('leek_newbie', this.x, this.y, 40);
          }
        }
        break;
      case 'rich':
        if (dist < 320) this.away(p.x, p.y, 1);
        else this.mx = this.my = 0;
        if (this.aiCd <= 0 && this.counter < 3) {
          this.aiCd = this.freqCd(7);
          this.counter++;
          const g = s.spawner.spawnNear('elite_guard', this.x, this.y, 40, 0.3, 0.7);
          if (g) {
            g.xpMul = 0.3;
            g.goldMul = 0.2;
          }
          s.fx.burst('coin', this.x, this.y, 8);
        }
        break;
      case 'rebel':
        this.steer(aim.x, aim.y, 1.05);
        if (this.aiCd <= 0 && dist < 340 && dist > 70) {
          this.aiCd = this.freqCd(3.4 + Math.random() * 2);
          s.projectiles.enemyShot(this.x, this.y - 8, p.x, p.y, 230, this.dmg * 0.9, 'fx_fork', true);
        }
        break;
      case 'bomber':
        if (this.state === 0) {
          this.steer(aim.x, aim.y);
          if (dist < 52) {
            this.state = 1;
            this.stateT = 0;
            const r = s.evolution.bomberRadius();
            s.fx.warn(this.x, this.y, r, 0.45);
          }
        } else {
          this.mx = this.my = 0;
          this.sprite.setTint(Math.floor(this.stateT * 14) % 2 ? 0xffffff : 0xff3030);
          if (this.stateT > 0.45) {
            const r = s.evolution.bomberRadius();
            s.fx.boom(this.x, this.y, r / 55);
            s.fx.sfx.play('boom');
            if (dist < r + 12) p.takeDamage(this.dmg);
            s.combat.removeSilently(this);
            return;
          }
        }
        break;
      case 'predict': {
        const t = this.aimPoint(1);
        this.steer(t.x, t.y);
        break;
      }
      case 'tower':
        if (this.aiCd <= 0 && dist < 560) {
          this.aiCd = this.freqCd(1.9);
          const c = this.aimPoint(0.15);
          s.projectiles.enemyShot(this.x + 18, this.y - 26, c.x, c.y, 240, this.dmg, 'fx_bullet');
          s.fx.burst('spark', this.x + 18, this.y - 26, 2);
        }
        break;
      case 'robot':
        this.steer(aim.x, aim.y);
        if (this.aiCd <= 0 && dist < 420) {
          this.aiCd = this.freqCd(2.6);
          for (let i = -1; i <= 1; i++) {
            const a = Math.atan2(dy, dx) + i * 0.3;
            s.projectiles.enemyShot(this.x, this.y - 8, this.x + Math.cos(a) * 100, this.y + Math.sin(a) * 100, 210, this.dmg * 0.7, 'fx_blade_red', true, 10);
          }
        }
        break;
      case 'vine':
        if (dist < 62) p.applySlow(0.55, 0.5);
        if (this.life > 8) {
          s.fx.burst('leaf', this.x, this.y, 6);
          s.combat.removeSilently(this);
          return;
        }
        break;
      case 'clone':
        this.steer(aim.x, aim.y);
        if (this.life > 6) {
          s.fx.burst('smoke', this.x, this.y, 5);
          s.combat.removeSilently(this);
          return;
        }
        break;
      case 'tide':
        this.mx = this.dirX;
        this.my = this.dirY;
        if (this.life > 7) {
          s.combat.removeSilently(this);
          return;
        }
        break;
      case 'tech':
        this.mx = this.my = 0;
        if (this.aiCd <= 0) {
          this.aiCd = 2.4;
          s.fx.ring(this.x, this.y, 20, 170, 0x7dfff0, 0.7, 2);
          this.emitAura(180, 0.18, 2.6);
        }
        break;
      case 'core':
        this.mx = this.my = 0;
        if (this.life > 45) {
          s.fx.burst('shard', this.x, this.y, 8);
          s.combat.removeSilently(this);
          return;
        }
        break;
      default:
        this.steer(aim.x, aim.y);
    }
  }

  protected emitAura(radius: number, resist: number, dur: number) {
    for (const o of this.scene.spatial.query(this.x, this.y, radius)) {
      if (o === this) continue;
      o.auraResist = Math.max(o.auraResist, resist);
      o.auraT = dur;
    }
  }

  update(dt: number) {
    const s = this.scene;
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) {
        this.sprite.clearTint();
        if (this.baseTint !== 0xffffff) this.sprite.setTint(this.baseTint);
      }
    }
    if (this.auraT > 0) {
      this.auraT -= dt;
      if (this.auraT <= 0) this.auraResist = 0;
    }
    if (this.buffT > 0) {
      this.buffT -= dt;
      if (this.buffT <= 0) this.buffMul = 1;
    }
    if (this.burnT > 0) {
      this.burnT -= dt;
      this.burnTick -= dt;
      if (this.burnTick <= 0) {
        this.burnTick = 0.5;
        s.damage.hit(this, this.burnDps * 0.5, this.burnWeapon, 'fire', { noCrit: true, color: 0xff9248 });
        if (!this.active) return;
        s.fx.burst('ember', this.x, this.y - 10, 1);
      }
    }
    if (this.freezeT > 0) {
      this.freezeT -= dt;
      this.sprite.setTint(0x9ae4ff);
      if (this.freezeT <= 0) {
        this.sprite.clearTint();
        if (this.baseTint !== 0xffffff) this.sprite.setTint(this.baseTint);
      }
      this.syncSprite(dt, false);
      return;
    }
    let speedMul = this.buffMul * s.mods.aggro;
    if (this.slowT > 0) {
      this.slowT -= dt;
      speedMul *= this.slowMul;
      if (this.slowT <= 0) this.slowMul = 1;
    }
    this.think(dt);
    if (!this.active) return;
    const v = this.speed * speedMul;
    this.x += this.mx * v * dt + this.kx * dt;
    this.y += this.my * v * dt + this.ky * dt;
    if (this.kx !== 0 || this.ky !== 0) {
      const decay = Math.exp(-dt * 9);
      this.kx *= decay;
      this.ky *= decay;
      if (Math.abs(this.kx) + Math.abs(this.ky) < 2) this.kx = this.ky = 0;
    }
    if (this.speed > 0 && !this.invuln && !this.isBoss) s.combat.pushOutObstacle(this);
    const w = s.worldSize;
    if (this.x < 8) this.x = 8;
    else if (this.x > w - 8) this.x = w - 8;
    if (this.y < 8) this.y = 8;
    else if (this.y > w - 8) this.y = w - 8;
    this.syncSprite(dt, this.mx !== 0 || this.my !== 0);
  }

  protected syncSprite(dt: number, moving: boolean) {
    const sp = this.sprite;
    sp.x = this.x;
    sp.y = this.y;
    sp.depth = this.y;
    if (moving && !this.invuln) {
      this.animT += dt * (this.speed > 80 ? 7 : 4.5);
      if (this.animT >= 1) {
        this.animT = 0;
        this.animF = 1 - this.animF;
        sp.setFrame(this.frames[this.animF]);
      }
    }
    if (this.mx !== 0) sp.flipX = this.mx < 0;
    if (this.badge?.visible) {
      this.badge.x = this.x;
      this.badge.y = this.y - this.radius * 2.2;
      this.badge.depth = this.y + 1;
    }
  }
}
