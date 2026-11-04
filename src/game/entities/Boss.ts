import { Leek } from './Leek';
import type { BossDef, DType, EnemyDef } from '../types';
import { DTYPE_NAMES } from '../types';
import { GameManager } from '../GameManager';

type SkillFn = () => void;

/** BOSS：出招循环 = 选技能 → 预警 → 执行，都走状态机 */
export class Boss extends Leek {
  bossDef!: BossDef;
  phaseName = '';
  revivesLeft = 0;
  private skills: { name: string; fn: SkillFn; cd: number; t: number }[] = [];
  private queue: { t: number; fn: SkillFn }[] = [];
  private dashT = 0;
  private dashX = 0;
  private dashY = 0;
  private dashDmgCd = 0;
  private counterT = 0;
  private learned: DType | null = null;
  private hiding = false;
  private enraged = false;
  isFinal = false;
  intro = 0;
  private globalCd = 2;

  initBoss(def: BossDef, scale: number, isFinal: boolean, x: number, y: number) {
    const fake: EnemyDef = {
      id: def.id, name: def.name, group: 'boss', ai: def.ai, hp: def.hp, speed: def.speed, dmg: def.dmg,
      xp: def.xp, goldChance: 1, gold: def.gold, radius: def.radius, scale: def.scale, knockRes: 1,
      attack: '', ability: '', react: '',
    };
    const diff = this.scene.map.difficulty;
    this.spawn(fake, x, y, diff * scale, Math.sqrt(diff));
    this.bossDef = def;
    this.isBoss = true;
    this.isFinal = isFinal;
    this.revivesLeft = isFinal || scale > 0.5 ? def.revives ?? 0 : 0;
    this.phaseName = '';
    this.queue.length = 0;
    this.dashT = this.counterT = 0;
    this.learned = null;
    this.hiding = false;
    this.enraged = false;
    this.intro = 1.6;
    this.globalCd = 1.5;
    this.skills = this.buildSkills(def.ai);
  }

  private buildSkills(ai: string) {
    const sk = (name: string, cd: number, fn: SkillFn, t = cd * 0.5) => ({ name, cd, fn, t });
    const charge = sk('冲撞', 6, () => this.charge());
    const quake = sk('地面震荡', 8, () => this.quake(200));
    switch (ai) {
      case 'coach':
        return [charge, quake, sk('召唤小韭菜', 11, () => this.summon('leek_newbie', 10))];
      case 'king':
        return [
          sk('金融风暴', 7, () => this.finStorm()),
          sk('金币炸弹', 5, () => this.coinBombs()),
          sk('召唤保镖', 15, () => this.summon('elite_guard', 2, 0.35)),
          sk('瞬移', 4, () => this.blink()),
        ];
      case 'saint':
        return [
          sk('快速突进', 3.6, () => this.tripleDash()),
          sk('反击', 9, () => this.counterStance()),
          sk('分身', 14, () => this.summon('unit_clone', 3, 1)),
        ];
      case 'ancient':
        return [
          sk('植物藤蔓', 6.5, () => this.vines()),
          sk('全屏震荡', 11, () => this.screenQuake()),
          sk('召唤韭菜', 13, () => this.summon('leek_old', 8)),
        ];
      case 'general':
        return [charge, quake, sk('快速突进', 6, () => this.tripleDash()), sk('召唤起义军', 10, () => this.summon('leek_rebel', 12))];
      case 'chairman':
        return [
          sk('全屏韭菜浪潮', 11, () => this.tide()),
          sk('反镰刀机器人', 13, () => this.summon('unit_robot', 2, 0.8)),
          sk('学习攻击方式', 9, () => this.learnAndMimic()),
          sk('金融风暴', 8, () => this.finStorm()),
        ];
    }
    return [charge, quake];
  }

  private later(t: number, fn: SkillFn) {
    this.queue.push({ t, fn });
  }

  private charge() {
    const s = this.scene;
    const p = s.player;
    const d = Math.hypot(p.x - this.x, p.y - this.y) || 1;
    const dx = (p.x - this.x) / d;
    const dy = (p.y - this.y) / d;
    s.fx.warnLine(this.x, this.y, this.x + dx * 520, this.y + dy * 520, this.radius * 1.4, 0.8);
    this.dashT = -0.8;
    this.dashX = dx * 460;
    this.dashY = dy * 460;
    this.later(0.8, () => {
      this.dashT = 0.9;
      s.fx.sfx.play('bossAttack');
    });
  }
  private tripleDash() {
    const s = this.scene;
    for (let i = 0; i < 3; i++) {
      this.later(0.05 + i * 0.75, () => {
        const p = s.player;
        const d = Math.hypot(p.x - this.x, p.y - this.y) || 1;
        const dx = (p.x - this.x) / d;
        const dy = (p.y - this.y) / d;
        s.fx.warnLine(this.x, this.y, this.x + dx * 420, this.y + dy * 420, this.radius, 0.3);
        this.later(0.3, () => {
          this.dashT = 0.32;
          this.dashX = dx * 980;
          this.dashY = dy * 980;
          s.fx.sprite('fx_slash_big', this.x, this.y, { rot: Math.atan2(dy, dx), scale: 2.2, life: 0.22 });
          s.fx.sfx.play('swing');
        });
      });
    }
  }
  private quake(r: number) {
    const s = this.scene;
    s.fx.warn(this.x, this.y, r, 0.9);
    const x = this.x;
    const y = this.y;
    this.later(0.9, () => {
      s.fx.ring(x, y, 20, r, 0xffcc66, 0.35, 8);
      s.fx.burst('smoke', x, y, 12);
      s.fx.shake(0.012, 220);
      s.fx.sfx.play('boom');
      const p = s.player;
      if (Math.hypot(p.x - x, p.y - y) < r + 10) p.takeDamage(this.dmg);
    });
  }
  private screenQuake() {
    const s = this.scene;
    GameManager.emit('banner', { text: '全屏震荡即将来临！', kind: 'warn' });
    s.fx.sfx.play('warn');
    this.later(1.6, () => {
      s.fx.ring(this.x, this.y, 30, 1100, 0xc6a060, 0.7, 12);
      s.fx.shake(0.02, 450);
      s.fx.sfx.play('boom');
      const p = s.player;
      this.later(0.3, () => p.takeDamage(this.dmg * 0.8));
    });
  }
  private summon(id: string, n: number, hp = 1) {
    const s = this.scene;
    s.fx.ring(this.x, this.y, 10, 120, 0x7dff7d, 0.4, 3);
    for (let i = 0; i < n; i++) s.spawner.spawnNear(id, this.x, this.y, 90, hp);
    s.fx.sfx.play('bossAttack');
  }
  private finStorm() {
    const s = this.scene;
    s.fx.sfx.play('bossAttack');
    for (let w = 0; w < 4; w++) {
      this.later(w * 0.32, () => {
        const n = 14;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + w * 0.22;
          s.projectiles.enemyShot(this.x, this.y - 18, this.x + Math.cos(a) * 100, this.y + Math.sin(a) * 100, 170, this.dmg * 0.45, 'fx_bullet_g', true, 9);
        }
      });
    }
  }
  private coinBombs() {
    const s = this.scene;
    const p = s.player;
    for (let i = 0; i < 5; i++) {
      const t = i === 0 ? { x: p.x, y: p.y } : { x: p.x + (Math.random() - 0.5) * 300, y: p.y + (Math.random() - 0.5) * 300 };
      s.projectiles.lobBomb(this.x, this.y - 22, t.x, t.y, 78, this.dmg * 0.7, 'fx_bullet_g', 1 + i * 0.1);
    }
  }
  private blink() {
    const s = this.scene;
    const p = s.player;
    const a = Math.random() * Math.PI * 2;
    s.fx.burst('coin', this.x, this.y, 12);
    this.x = Phaser_clamp(p.x + Math.cos(a) * 260, 30, s.worldSize - 30);
    this.y = Phaser_clamp(p.y + Math.sin(a) * 260, 30, s.worldSize - 30);
    s.fx.burst('coin', this.x, this.y, 12);
  }
  private counterStance() {
    const s = this.scene;
    this.counterT = 1.8;
    s.fx.ring(this.x, this.y, 60, 30, 0xe5ffff, 0.5, 3);
    GameManager.emit('banner', { text: `${this.bossDef.name}：看破！（反击姿态）`, kind: 'warn' });
  }
  private vines() {
    const s = this.scene;
    const p = s.player;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const x = p.x + Math.cos(a) * 130;
      const y = p.y + Math.sin(a) * 130;
      s.fx.warn(x, y, 30, 0.7, 0x62d04a);
      this.later(0.7, () => s.spawner.spawnNear('unit_vine', x, y, 2, 0.8, 0.9));
    }
  }
  private tide() {
    const s = this.scene;
    const p = s.player;
    GameManager.emit('banner', { text: '全屏韭菜浪潮！', kind: 'warn', sub: '散户的力量，是无穷的' });
    s.fx.sfx.play('warn');
    const horizontal = Math.random() < 0.5;
    const dirSign = Math.random() < 0.5 ? 1 : -1;
    const gapAt = Math.floor(Math.random() * 12);
    this.later(1.2, () => {
      for (let i = 0; i < 16; i++) {
        if (i === gapAt || i === gapAt + 1 || i === gapAt + 2) continue;
        const off = (i - 8) * 58;
        const x = horizontal ? p.x - dirSign * 760 : p.x + off;
        const y = horizontal ? p.y + off : p.y - dirSign * 620;
        const t = s.spawner.spawnAt('unit_tide', x, y);
        if (t) {
          t.dirX = horizontal ? dirSign : 0;
          t.dirY = horizontal ? 0 : dirSign;
        }
      }
    });
  }
  /** 学习玩家当前主要攻击方式：获得对应抗性并模仿出招 */
  private learnAndMimic() {
    const s = this.scene;
    const top = s.monitor.topType();
    if (top !== this.learned) {
      this.learned = top;
      GameManager.emit('banner', { text: `主席学会了你的${DTYPE_NAMES[top]}攻击！`, kind: 'warn', sub: `对${DTYPE_NAMES[top]}伤害大幅降低，请更换打法` });
      s.fx.sfx.play('warn');
    }
    const p = s.player;
    switch (top) {
      case 'melee':
        this.quake(240);
        break;
      case 'ranged':
        for (let i = -3; i <= 3; i++) {
          const a = Math.atan2(p.y - this.y, p.x - this.x) + i * 0.14;
          s.projectiles.enemyShot(this.x, this.y - 18, this.x + Math.cos(a) * 100, this.y + Math.sin(a) * 100, 300, this.dmg * 0.4, 'fx_blade_red', true, 10);
        }
        break;
      case 'fire':
        for (let i = 0; i < 4; i++) {
          const x = p.x + (Math.random() - 0.5) * 240;
          const y = p.y + (Math.random() - 0.5) * 240;
          s.fx.warn(x, y, 54, 0.9, 0xff7a30);
          this.later(0.9, () => {
            s.fx.boom(x, y, 1.1);
            if (Math.hypot(p.x - x, p.y - y) < 62) p.takeDamage(this.dmg * 0.5);
          });
        }
        break;
      case 'lightning':
        for (let i = 0; i < 3; i++) {
          this.later(i * 0.4, () => {
            s.fx.warn(p.x, p.y, 36, 0.5, 0xfff27a);
            const x = p.x;
            const y = p.y;
            this.later(0.5, () => {
              s.fx.bolt(this.x, this.y - 30, x, y, 0xfff27a, 4, 0.22);
              s.fx.sfx.play('zap');
              if (Math.hypot(p.x - x, p.y - y) < 44) p.takeDamage(this.dmg * 0.45);
            });
          });
        }
        break;
      case 'frost':
        s.fx.ring(this.x, this.y, 30, 700, 0xa8ecff, 0.8, 5);
        p.applySlow(0.45, 2.4);
        break;
      case 'void':
        s.fx.sprite('fx_bh0', this.x, this.y, { frames: ['fx_bh0', 'fx_bh1', 'fx_bh2', 'fx_bh0', 'fx_bh1', 'fx_bh2'], life: 1.6, scale: 3, fade: false });
        p.applyPull(this.x, this.y, 200, 1.6);
        break;
    }
  }

  override modifyDamage(dmg: number, dtype: string) {
    const s = this.scene;
    if (this.learned === dtype) dmg *= 0.35;
    // BOSS 反射闪电：绝缘 Lv3
    if (dtype === 'lightning' && s.evolution.level('lightning') >= 3 && Math.random() < 0.12) {
      s.fx.bolt(this.x, this.y - 20, s.player.x, s.player.y, 0xfff27a, 3, 0.2);
      s.player.takeDamage(this.dmg * 0.2);
    }
    if (this.counterT > 0 && dtype === 'melee') {
      // 反击：针对近战玩家
      this.counterT = 0;
      const p = s.player;
      const d = Math.hypot(p.x - this.x, p.y - this.y) || 1;
      this.later(0.05, () => {
        s.fx.sprite('fx_slash_big', p.x, p.y, { rot: Math.atan2(p.y - this.y, p.x - this.x), scale: 2.2, life: 0.25, tint: 0xff8080 });
        s.fx.sfx.play('bossAttack');
        this.x = Phaser_clamp(p.x - ((p.x - this.x) / d) * 70, 20, s.worldSize - 20);
        this.y = Phaser_clamp(p.y - ((p.y - this.y) / d) * 70, 20, s.worldSize - 20);
        p.takeDamage(this.dmg * 0.8);
      });
      return dmg * 0.2;
    }
    return dmg;
  }

  override beforeDeath(): boolean {
    const s = this.scene;
    if (this.revivesLeft > 0) {
      // 多阶段复活
      this.revivesLeft--;
      this.hp = this.maxHp * (this.revivesLeft === 1 ? 0.6 : 0.4);
      this.invuln = true;
      this.phaseName = this.revivesLeft === 1 ? '第二形态' : '最终形态';
      s.fx.boom(this.x, this.y, 3);
      s.fx.flash(250, 180, 255, 180);
      s.fx.shake(0.015, 400);
      GameManager.emit('banner', { text: `${this.bossDef.name} 又长出来了！`, kind: 'boss', sub: '一茬一茬，生生不息' });
      this.later(1.2, () => {
        this.invuln = false;
        this.summon('leek_old', 10);
      });
      return true;
    }
    if (this.def.ai === 'chairman' && !this.hiding) {
      // 最终阶段：缩小混入起义军，玩家必须从人群中找出本体
      this.hiding = true;
      this.hp = this.maxHp * 0.3;
      this.phaseName = '混入人群';
      this.invuln = true;
      this.frames = ['boss_chairman_small_0', 'boss_chairman_small_1'];
      this.sprite.setFrame(this.frames[0]).setScale(1.4);
      this.radius = 14;
      this.speed = 66;
      this.skills = [
        { name: '起义军', cd: 5, t: 0.2, fn: () => this.summonRebelHorde() },
        { name: '浪潮', cd: 13, t: 7, fn: () => this.tide() },
      ];
      s.fx.boom(this.x, this.y, 3.5);
      s.fx.flash(350, 255, 80, 80);
      s.fx.shake(0.02, 600);
      GameManager.emit('banner', { text: '韭菜起义军全面进攻！', kind: 'boss', sub: '主席已混入人群——找到头戴小皇冠的那一根！' });
      this.summonRebelHorde();
      this.later(1.5, () => {
        this.invuln = false;
      });
      return true;
    }
    return false;
  }

  private summonRebelHorde() {
    const s = this.scene;
    for (let i = 0; i < 24; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 120 + Math.random() * 170;
      s.spawner.spawnAt('leek_rebel', this.x + Math.cos(a) * r, this.y + Math.sin(a) * r);
    }
  }

  protected override think(dt: number) {
    const s = this.scene;
    const p = s.player;
    this.life += dt;
    if (this.intro > 0) {
      this.intro -= dt;
      this.mx = this.my = 0;
      return;
    }
    if (!this.enraged && s.simTime >= 900) {
      this.enraged = true;
      this.dmg *= 1.5;
      this.speed *= 1.3;
      GameManager.emit('banner', { text: `${this.bossDef.name} 进入狂暴！`, kind: 'boss', sub: '收割期限已到' });
    }
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const q = this.queue[i];
      q.t -= dt;
      if (q.t <= 0) {
        this.queue[i] = this.queue[this.queue.length - 1];
        this.queue.pop();
        q.fn();
        if (!this.active) return;
      }
    }
    if (this.counterT > 0) this.counterT -= dt;
    this.dashDmgCd -= dt;
    if (this.dashT !== 0) {
      if (this.dashT < 0) {
        this.dashT = Math.min(0, this.dashT + dt);
        this.mx = this.my = 0;
        return;
      }
      this.dashT = Math.max(0, this.dashT - dt);
      this.x += this.dashX * dt;
      this.y += this.dashY * dt;
      this.mx = this.my = 0;
      if (this.dashDmgCd <= 0 && Math.hypot(p.x - this.x, p.y - this.y) < this.radius + 20) {
        this.dashDmgCd = 0.5;
        p.takeDamage(this.dmg * 1.2);
      }
      return;
    }
    this.globalCd -= dt;
    for (const sk of this.skills) sk.t -= dt;
    if (this.globalCd <= 0) {
      const ready = this.skills.filter((sk) => sk.t <= 0);
      if (ready.length) {
        const sk = ready[Math.floor(Math.random() * ready.length)];
        sk.t = sk.cd;
        this.globalCd = this.enraged ? 0.7 : 1.3;
        sk.fn();
        if (!this.active) return;
      }
    }
    const dist = Math.hypot(p.x - this.x, p.y - this.y);
    if (this.hiding) {
      // 混入人群后在玩家外围游走
      if (dist < 180) this.away(p.x, p.y, 1);
      else this.steer(p.x, p.y, 0.7);
    } else if (this.def.ai === 'king' || this.def.ai === 'chairman') {
      if (dist < 220) this.away(p.x, p.y, 0.8);
      else this.steer(p.x, p.y);
    } else {
      this.steer(p.x, p.y);
    }
  }

  override release() {
    super.release();
    this.queue.length = 0;
  }
}

function Phaser_clamp(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}
