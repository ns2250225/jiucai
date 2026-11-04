import Phaser from 'phaser';
import type { BattleScene } from '../scenes/BattleScene';
import { inputState } from '../systems/InputSystem';
import { AudioService } from '../../services/AudioService';
import { GameManager } from '../GameManager';

export class Player {
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  scythe: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  shieldImg: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  radius = 13;
  hp = 100;
  dead = false;
  iframes = 0;
  shieldT = 0;
  rageT = 0;
  revives = 0;
  faceX = 1;
  faceY = 0;
  private anim: 'idle' | 'walk' | 'attack' | 'hurt' = 'idle';
  private animT = 0;
  private animF = 0;
  private overrideT = 0;
  private slowT = 0;
  private slowMul = 1;
  private pullT = 0;
  private pullX = 0;
  private pullY = 0;
  private pullF = 0;
  private regenAcc = 0;
  private reapT = 60;
  private dir = { x: 0, y: 0 };
  skinKey: string;

  constructor(private scene: BattleScene, x: number, y: number, skinKey: string) {
    this.x = x;
    this.y = y;
    this.skinKey = skinKey;
    this.shadow = scene.add.image(x, y, 'atlas', 'fx_shadow').setDepth(-40000).setScale(1.5);
    this.glow = scene.add.image(x, y, 'atlas', 'fx_glow').setDepth(-30000).setScale(2.4).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.sprite = scene.add.image(x, y, 'atlas', this.frame('idle0')).setOrigin(0.5, 0.62).setScale(1.55);
    this.scythe = scene.add.image(x, y, 'atlas', 'w_scythe').setScale(1.3);
    this.shieldImg = scene.add.image(x, y, 'atlas', 'fx_shield').setVisible(false).setScale(1.1);
    this.hp = scene.pstats.maxHp;
  }

  private frame(n: string) {
    return `player_${this.skinKey}_${n}`;
  }

  applySlow(mul: number, t: number) {
    this.slowMul = Math.min(this.slowT > 0 ? this.slowMul : 1, mul);
    this.slowT = Math.max(this.slowT, t);
  }
  applyPull(x: number, y: number, force: number, t: number) {
    this.pullX = x;
    this.pullY = y;
    this.pullF = force;
    this.pullT = t;
  }

  playAttack() {
    this.anim = 'attack';
    this.overrideT = 0.14;
    this.sprite.setFrame(this.frame('attack0'));
  }

  heal(n: number) {
    if (this.dead) return;
    this.hp = Math.min(this.scene.pstats.maxHp, this.hp + n);
  }

  takeDamage(raw: number) {
    if (this.dead || this.iframes > 0 || this.shieldT > 0 || raw <= 0) return;
    const s = this.scene;
    const dmg = raw * s.mods.enemyDmg * (1 - s.pstats.armor);
    this.hp -= dmg;
    this.iframes = 0.4;
    s.stats.damageTaken += dmg;
    this.anim = 'hurt';
    this.overrideT = 0.16;
    this.sprite.setFrame(this.frame('hurt0'));
    s.fx.number(this.x, this.y - 12, dmg, false, 0xff5a5a);
    s.fx.shake(0.004, 90);
    AudioService.play('playerHurt', 0.1);
    if (this.hp <= 0) {
      if (this.revives > 0) {
        this.revives--;
        s.stats.revivesUsed++;
        this.hp = s.pstats.maxHp * 0.5;
        this.iframes = 2.5;
        s.fx.flash(300, 120, 200, 255);
        s.fx.ring(this.x, this.y, 10, 300, 0x7dd0ff, 0.6, 5);
        GameManager.emit('banner', { text: '风险对冲协议生效！', kind: 'info', sub: '保险公司表示下次不赔了' });
        for (const l of s.spatial.query(this.x, this.y, 260)) {
          const a = Math.atan2(l.y - this.y, l.x - this.x);
          l.knock(Math.cos(a), Math.sin(a), 620);
        }
        return;
      }
      this.die();
    }
  }

  private die() {
    this.dead = true;
    this.hp = 0;
    this.vx = this.vy = 0;
    this.scythe.setVisible(false);
    AudioService.play('playerDie');
    const frames = ['dead0', 'dead1', 'dead2'];
    frames.forEach((f, i) => this.scene.time.delayedCall(i * 220, () => this.sprite.setFrame(this.frame(f))));
    this.scene.onPlayerDead();
  }

  update(dt: number) {
    const s = this.scene;
    if (this.dead) return;
    const st = s.pstats;
    if (this.iframes > 0) {
      this.iframes -= dt;
      this.sprite.setAlpha(Math.floor(this.iframes * 18) % 2 ? 0.55 : 1);
      if (this.iframes <= 0) this.sprite.setAlpha(1);
    }
    if (this.shieldT > 0) {
      this.shieldT -= dt;
      this.shieldImg.setVisible(this.shieldT > 1 || Math.floor(this.shieldT * 8) % 2 === 0);
      this.shieldImg.setPosition(this.x, this.y - 6);
      this.shieldImg.setDepth(this.y + 2);
      if (this.shieldT <= 0) this.shieldImg.setVisible(false);
    }
    if (this.rageT > 0) {
      this.rageT -= dt;
      if (Math.random() < dt * 14) s.fx.burst('ember', this.x, this.y - 8, 1);
    }
    if (st.regen > 0) {
      this.regenAcc += st.regen * dt;
      if (this.regenAcc >= 1) {
        const n = Math.floor(this.regenAcc);
        this.regenAcc -= n;
        this.heal(n);
      }
    }
    // 死亡收割
    if (s.skills.reapLevel > 0) {
      this.reapT -= dt;
      if (this.reapT <= 0) {
        this.reapT = 60 * Math.pow(0.8, s.skills.reapLevel - 1);
        s.ult.deathReap();
      }
    }

    inputState.read(this.dir);
    let spd = 165 * st.speed;
    if (this.slowT > 0) {
      this.slowT -= dt;
      spd *= this.slowMul;
    }
    this.vx = this.dir.x * spd;
    this.vy = this.dir.y * spd;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.pullT > 0) {
      this.pullT -= dt;
      const d = Math.hypot(this.pullX - this.x, this.pullY - this.y) || 1;
      this.x += ((this.pullX - this.x) / d) * this.pullF * dt;
      this.y += ((this.pullY - this.y) / d) * this.pullF * dt;
    }
    s.combat.pushOutObstacle(this);
    const w = s.worldSize;
    this.x = Phaser.Math.Clamp(this.x, 16, w - 16);
    this.y = Phaser.Math.Clamp(this.y, 16, w - 16);

    const moving = this.dir.x !== 0 || this.dir.y !== 0;
    if (moving) {
      this.faceX = this.dir.x;
      this.faceY = this.dir.y;
    }
    // 动画：待机 / 移动 / 攻击 / 受伤
    if (this.overrideT > 0) {
      this.overrideT -= dt;
      if (this.overrideT <= 0) this.anim = moving ? 'walk' : 'idle';
    } else {
      const want = moving ? 'walk' : 'idle';
      if (want !== this.anim) {
        this.anim = want;
        this.animT = 1;
        this.animF = 0;
      }
      this.animT += dt * (moving ? 9 : 2.5);
      if (this.animT >= 1) {
        this.animT = 0;
        const n = moving ? 4 : 2;
        this.animF = (this.animF + 1) % n;
        this.sprite.setFrame(this.frame(`${moving ? 'walk' : 'idle'}${this.animF}`));
      }
    }
    if (this.dir.x !== 0) this.sprite.flipX = this.dir.x < 0;
    this.sprite.setPosition(this.x, this.y).setDepth(this.y);
    this.shadow.setPosition(this.x, this.y + 18);
    this.glow.setPosition(this.x, this.y);
    const target = s.aimTarget;
    const ang = target ? Math.atan2(target.y - this.y, target.x - this.x) : Math.atan2(this.faceY, this.faceX);
    this.scythe.setPosition(this.x + Math.cos(ang) * 20, this.y - 2 + Math.sin(ang) * 16).setRotation(ang + 0.6).setDepth(this.y + 1);
    this.scythe.setFlipX(false);
  }

  syncDead() {
    this.shieldImg.setVisible(false);
  }
}
