import Phaser from 'phaser';
import { Leek } from './Leek';
import type { EnemyDef } from '../types';

/** 精英韭菜：独立血条（由 CombatSystem 统一绘制）+ 技能 */
export class EliteLeek extends Leek {
  shieldT = 0;
  private shieldImg: Phaser.GameObjects.Image | null = null;

  override spawn(def: EnemyDef, x: number, y: number, hpMul: number, dmgMul: number) {
    super.spawn(def, x, y, hpMul, dmgMul);
    this.isElite = true;
    this.shieldT = 0;
    this.shieldImg?.setVisible(false);
    this.aiCd = 2;
  }
  override release() {
    super.release();
    this.shieldImg?.setVisible(false);
  }

  override modifyDamage(dmg: number, dtype: string, srcX: number, srcY: number) {
    let d = super.modifyDamage(dmg, dtype, srcX, srcY);
    if (this.shieldT > 0) d *= 0.15;
    // 电磁屏障：绝缘进化 Lv2 起精英额外减伤闪电
    if (dtype === 'lightning' && this.scene.evolution.level('lightning') >= 2) d *= 0.6;
    return d;
  }

  private setShield(t: number) {
    this.shieldT = t;
    if (!this.shieldImg) this.shieldImg = this.scene.add.image(this.x, this.y, 'atlas', 'fx_shield');
    this.shieldImg.setVisible(true).setScale(this.radius / 18);
  }

  protected override think(dt: number) {
    const s = this.scene;
    const p = s.player;
    this.aiCd -= dt;
    this.stateT += dt;
    this.life += dt;
    if (this.shieldT > 0) {
      this.shieldT -= dt;
      if (this.shieldImg) {
        this.shieldImg.x = this.x;
        this.shieldImg.y = this.y - 6;
        this.shieldImg.depth = this.y + 2;
        if (this.shieldT <= 0) this.shieldImg.setVisible(false);
      }
    }
    if (s.mods.flee > 0) {
      this.away(s.worldSize / 2, s.worldSize / 2, 1.1);
      return;
    }
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const aim = this.aimPoint();
    switch (this.def.ai) {
      case 'guard':
      case 'awaken':
        if (this.state === 0) {
          this.steer(aim.x, aim.y);
          if (this.aiCd <= 0 && dist < 420) {
            this.state = 1;
            this.stateT = 0;
            this.dirX = dx / dist;
            this.dirY = dy / dist;
            s.fx.warnLine(this.x, this.y, this.x + this.dirX * 300, this.y + this.dirY * 300, this.radius, 0.6);
          }
        } else if (this.state === 1) {
          this.mx = this.my = 0;
          if (this.stateT > 0.6) {
            this.state = 2;
            this.stateT = 0;
            if (this.def.ai === 'guard') this.setShield(2.6);
          }
        } else {
          this.mx = this.dirX * 4;
          this.my = this.dirY * 4;
          if (this.stateT > 0.65) {
            this.state = 0;
            this.aiCd = this.freqCd(this.def.ai === 'awaken' ? 2.6 : 4.2);
          }
        }
        break;
      case 'prof':
        if (dist < 260) this.away(p.x, p.y);
        else if (dist > 340) this.steer(p.x, p.y);
        else this.mx = this.my = 0;
        if (this.aiCd <= 0) {
          this.aiCd = this.freqCd(2.2);
          s.fx.ring(this.x, this.y, 16, 240, 0x7dd0ff, 0.6, 3);
          this.emitAura(240, 0.3, 2.6);
          s.evolution.boostResearch(1.2);
          s.projectiles.enemyShot(this.x, this.y - 10, p.x, p.y, 210, this.dmg, 'fx_bullet');
        }
        break;
      case 'manager':
        if (dist < 200) this.away(p.x, p.y);
        else if (dist > 320) this.steer(aim.x, aim.y);
        else this.mx = this.my = 0;
        if (this.aiCd <= 0) {
          this.aiCd = this.freqCd(3.2);
          const n = this.hp < this.maxHp * 0.5 ? 3 : 2;
          for (let i = 0; i < n; i++) {
            const t = i === 0 ? { x: p.x, y: p.y } : { x: p.x + (Math.random() - 0.5) * 160, y: p.y + (Math.random() - 0.5) * 160 };
            s.projectiles.lobBomb(this.x, this.y - 14, t.x, t.y, 70, this.dmg, 'fx_bomb', 1.1);
          }
        }
        break;
      case 'engineer':
        if (dist < 240) this.away(p.x, p.y);
        else if (dist > 340) this.steer(p.x, p.y);
        else this.mx = this.my = 0;
        if (this.aiCd <= 0 && this.counter < 4) {
          this.aiCd = this.freqCd(6);
          this.counter++;
          const tower = s.spawner.spawnNear('unit_tower', this.x, this.y, 60, 0.8, 0.9);
          s.fx.burst('spark', this.x, this.y, 8);
          // 绝缘进化：工程师建造绝缘防御塔
          if (tower && s.evolution.level('lightning') >= 2) {
            tower.immune = 'lightning';
            tower.setBaseTint(0xf2d84a);
          }
        }
        break;
      case 'commander':
        this.steer(aim.x, aim.y, dist < 180 ? 0.3 : 0.9);
        if (this.aiCd <= 0) {
          this.aiCd = this.freqCd(5);
          s.fx.ring(this.x, this.y, 20, 320, 0xff5a4a, 0.7, 4);
          s.fx.sfx.play('warn', 2);
          for (const o of s.spatial.query(this.x, this.y, 320)) {
            if (o !== this && !o.isBoss) {
              o.buffMul = 1.7;
              o.buffT = 3.5;
              o.dmg *= 1.02;
            }
          }
        }
        break;
      case 'prophet': {
        // 预测玩家未来 1 秒的位置，拦截 + 向未来位置射击
        const fut = this.aimPoint(1);
        this.steer(fut.x, fut.y, dist < 220 ? 0.2 : 1);
        if (this.aiCd <= 0) {
          this.aiCd = this.freqCd(2.6);
          s.fx.warn(fut.x, fut.y, 28, 0.55, 0xc080ff);
          for (let i = -1; i <= 1; i++) {
            const a = Math.atan2(fut.y - this.y, fut.x - this.x) + i * 0.12;
            s.projectiles.enemyShot(this.x, this.y - 10, this.x + Math.cos(a) * 100, this.y + Math.sin(a) * 100, 280, this.dmg * 0.75, 'fx_bullet');
          }
        }
        break;
      }
      default:
        this.steer(aim.x, aim.y);
    }
  }
}
