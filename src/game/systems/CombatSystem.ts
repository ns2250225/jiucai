import Phaser from 'phaser';
import type { BattleScene } from '../scenes/BattleScene';
import type { Leek } from '../entities/Leek';
import type { Boss } from '../entities/Boss';
import type { DType } from '../types';
import { GameManager } from '../GameManager';
import { QUIPS } from '../../data/progression';

export interface Obstacle {
  x: number;
  y: number;
  r: number;
}
const OB_CELL = 128;

export class CombatSystem {
  private obstacleGrid = new Map<number, Obstacle[]>();
  private barGfx: Phaser.GameObjects.Graphics;
  private arrowGfx: Phaser.GameObjects.Graphics;
  private sepCursor = 0;
  streak = 0;
  private streakT = 0;
  private burstCount = 0;
  private burstT = 0;
  wealthT = 0;
  private quipCd = 15;
  private seen = new Set<string>();
  private lastWealthAt = 0;

  constructor(private scene: BattleScene) {
    this.barGfx = scene.add.graphics().setDepth(550000);
    this.arrowGfx = scene.add.graphics().setDepth(560000);
  }

  addObstacle(o: Obstacle) {
    const x0 = Math.floor((o.x - o.r) / OB_CELL);
    const x1 = Math.floor((o.x + o.r) / OB_CELL);
    const y0 = Math.floor((o.y - o.r) / OB_CELL);
    const y1 = Math.floor((o.y + o.r) / OB_CELL);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const k = y * 4096 + x;
        const a = this.obstacleGrid.get(k);
        if (a) a.push(o);
        else this.obstacleGrid.set(k, [o]);
      }
    }
  }

  pushOutObstacle(e: { x: number; y: number; radius: number }) {
    const k = Math.floor(e.y / OB_CELL) * 4096 + Math.floor(e.x / OB_CELL);
    const list = this.obstacleGrid.get(k);
    if (!list) return;
    for (let i = 0; i < list.length; i++) {
      const o = list[i];
      const dx = e.x - o.x;
      const dy = e.y - o.y;
      const rr = o.r + e.radius * 0.6;
      const d2 = dx * dx + dy * dy;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 1;
        e.x = o.x + (dx / d) * rr;
        e.y = o.y + (dy / d) * rr;
      }
    }
  }

  /** 击杀结算：奖励、统计、连杀、特殊单位的反制效果 */
  kill(l: Leek, weaponId: string | null, dtype: DType, bonusGold: number) {
    if (!l.active) return;
    if (l.beforeDeath()) {
      if (l.hp <= 0) l.hp = 1;
      return;
    }
    // 先标记失活：后面的爆炸范围查询不能再次命中自己
    l.active = false;
    const s = this.scene;
    const st = s.stats;
    const def = l.def;
    const id = def.id;
    st.kills++;
    st.kindKills[id] = (st.kindKills[id] ?? 0) + 1;
    if (!this.seen.has(id)) {
      this.seen.add(id);
      GameManager.emit('leekSeen', id);
    }
    if (weaponId) {
      const e = st.byWeapon[weaponId];
      if (e) e.kills++;
    }
    if (dtype === 'lightning') st.lightningKills++;
    if (id === 'leek_gold') st.goldenKills++;
    if (l.isElite) st.eliteKills++;
    s.ult.onKill(l);
    if (s.ult.windowOpen) s.ult.windowKills++;

    // 连杀与单次最大收割
    this.streak++;
    this.streakT = 2.5;
    if (this.streak > st.maxCombo) st.maxCombo = this.streak;
    this.burstCount++;
    this.burstT = 0.25;
    if (this.burstCount > st.maxBurst) st.maxBurst = this.burstCount;

    // 财富流：连续收割触发金币爆炸
    const goldenOwned = s.weapons.get('golden_reaper');
    const every = goldenOwned ? 25 : 30;
    if ((goldenOwned || s.skills.flag('wealth') > 0) && this.streak - this.lastWealthAt >= every) {
      this.lastWealthAt = this.streak;
      this.goldExplosion();
    }

    if (s.skills.flag('vamp') > 0 && Math.random() < 0.04 * s.skills.flag('vamp')) s.player.heal(1);

    // 掉落
    if (!l.noDrop) s.drops.dropFor(l, bonusGold);

    // 特殊单位的反制效果
    if (def.ai === 'scientist') s.evolution.onScientistKilled();
    else if (def.ai === 'tech') s.evolution.onTechDestroyed(l);
    else if (def.ai === 'core') s.evolution.onCoreDestroyed(l);

    // 连锁爆炸：燃烧中的韭菜死亡时炸开
    if (l.burnT > 0 && this.burnExplodes()) {
      const r = 58;
      s.fx.boom(l.x, l.y, 0.9);
      for (const o of s.spatial.query(l.x, l.y, r)) {
        if (o === l) continue;
        o.ignite(l.burnDps * 0.7, 2, l.burnWeapon);
        s.damage.hit(o, l.burnDps * 1.4, l.burnWeapon, 'fire', { noCrit: true, numberChance: 0.5, color: 0xff9248 });
      }
      s.fx.sfx.play('boom', 0.12);
    }

    // 击杀反馈
    if (l.isBoss) {
      s.bossSys.onBossDead(l as Boss);
    } else if (l.isElite) {
      s.fx.boom(l.x, l.y, 1.4);
      s.fx.burst('coin', l.x, l.y, 14);
      s.fx.sfx.play('boom', 0.1);
    } else {
      s.fx.burst('leaf', l.x, l.y - 10, 4);
      s.fx.burst('root', l.x, l.y, 2);
      if (l.freezeT > 0) s.fx.burst('shard', l.x, l.y, 5);
      s.fx.sfx.play('kill', 0.06);
    }

    this.quipCd -= 1;
    if (this.quipCd <= 0) {
      this.quipCd = 60 + Math.random() * 80;
      if (s.settings.quips) GameManager.emit('banner', { text: Phaser.Math.RND.pick(QUIPS.kill), kind: 'quip' });
    }
    l.release();
  }

  private burnExplodes() {
    const s = this.scene;
    return s.skills.flag('chainBurn') > 0 || !!s.weapons.get('hell') || !!s.weapons.get('fire')?.special;
  }

  /** 金币爆炸：周围造成伤害 + 洒金币 + 短暂增伤 */
  goldExplosion() {
    const s = this.scene;
    const p = s.player;
    this.wealthT = 6;
    s.fx.ring(p.x, p.y, 20, 240, 0xffd23e, 0.45, 6);
    s.fx.burst('coin', p.x, p.y, 28);
    s.fx.sfx.play('coin', 0.05);
    for (const l of s.spatial.query(p.x, p.y, 240)) {
      s.damage.hit(l, 18 + s.exp.level * 2.5, 'golden_reaper', 'melee', { noCrit: true, numberChance: 0.4, color: 0xffd23e });
    }
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * 6.28;
      const r = 50 + Math.random() * 110;
      s.drops.spawn('coin', p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 2);
    }
    GameManager.emit('banner', { text: '财富暴击！', kind: 'info', sub: '金币爆炸，伤害临时提升' });
  }

  /** 不给奖励地移除：自爆、到时消失等 */
  removeSilently(l: Leek) {
    l.release();
  }

  update(dt: number) {
    const s = this.scene;
    if (this.streakT > 0) {
      this.streakT -= dt;
      if (this.streakT <= 0) {
        this.streak = 0;
        this.lastWealthAt = 0;
      }
    }
    if (this.burstT > 0) {
      this.burstT -= dt;
      if (this.burstT <= 0) this.burstCount = 0;
    }
    if (this.wealthT > 0) this.wealthT -= dt;

    // 接触伤害
    const p = s.player;
    if (!p.dead) {
      const near = s.spatial.query(p.x, p.y, p.radius);
      for (let i = 0; i < near.length; i++) {
        const l = near[i];
        if (l.dmg > 0 && !l.invuln && l.freezeT <= 0) {
          p.takeDamage(l.dmg);
          break;
        }
      }
    }

    // 敌人分离：每帧只处理一部分，防止堆成一个点
    const list = s.enemies;
    const n = list.length;
    if (n > 0) {
      const quota = Math.min(n, 70);
      for (let c = 0; c < quota; c++) {
        this.sepCursor = (this.sepCursor + 1) % n;
        const a = list[this.sepCursor];
        if (!a.active || a.speed <= 0) continue;
        const cell = s.spatial.neighbors(a.x, a.y);
        const lim = Math.min(cell.length, 6);
        for (let k = 0; k < lim; k++) {
          const b = cell[k];
          if (b === a || !b.active) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const min = (a.radius + b.radius) * 0.75;
          const d2 = dx * dx + dy * dy;
          if (d2 < min * min && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const push = (min - d) * 0.5;
            a.x += (dx / d) * push;
            a.y += (dy / d) * push;
          }
        }
      }
    }
    this.drawOverlays();
  }

  /** 精英血条与屏外重要目标的方向箭头 */
  private drawOverlays() {
    const s = this.scene;
    const g = this.barGfx;
    const ag = this.arrowGfx;
    g.clear();
    ag.clear();
    const view = s.cameras.main.worldView;
    for (const l of s.enemies) {
      if (!l.active || l.isBoss) continue;
      const showBar = l.isElite || l.def.ai === 'tech' || l.def.ai === 'core' || l.def.ai === 'tower';
      if (!showBar) continue;
      const inView = view.contains(l.x, l.y);
      if (inView && l.hp < l.maxHp) {
        const w = l.radius * 2.4;
        const x = l.x - w / 2;
        const y = l.y - l.radius * 2.6 - 6;
        g.fillStyle(0x000000, 0.75);
        g.fillRect(x - 1, y - 1, w + 2, 5);
        g.fillStyle(l.isElite ? 0xff5a4a : 0xffb338, 1);
        g.fillRect(x, y, w * Math.max(0, l.hp / l.maxHp), 3);
      }
      if (!inView && (l.def.ai === 'tech' || l.def.ai === 'core')) {
        this.drawArrow(l.x, l.y, l.def.ai === 'tech' ? 0x7dfff0 : 0xc27bff);
      }
    }
    const chest = s.drops.importantChest();
    if (chest && !view.contains(chest.x, chest.y)) this.drawArrow(chest.x, chest.y, 0xffd23e);
    if (s.bossSys.active && !view.contains(s.bossSys.active.x, s.bossSys.active.y) && s.bossSys.active.phaseName !== '混入人群') {
      this.drawArrow(s.bossSys.active.x, s.bossSys.active.y, 0xff3030);
    }
  }

  private drawArrow(tx: number, ty: number, color: number) {
    const s = this.scene;
    const v = s.cameras.main.worldView;
    const cx = v.centerX;
    const cy = v.centerY;
    const a = Math.atan2(ty - cy, tx - cx);
    const pad = 34;
    const halfW = v.width / 2 - pad;
    const halfH = v.height / 2 - pad;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const t = Math.min(Math.abs(c) > 1e-3 ? halfW / Math.abs(c) : 1e9, Math.abs(sn) > 1e-3 ? halfH / Math.abs(sn) : 1e9);
    const x = cx + c * t;
    const y = cy + sn * t;
    const g = this.arrowGfx;
    g.fillStyle(color, 0.92);
    g.fillTriangle(x + c * 13, y + sn * 13, x - sn * 8 - c * 6, y + c * 8 - sn * 6, x + sn * 8 - c * 6, y - c * 8 - sn * 6);
    g.lineStyle(2, 0x000000, 0.6);
    g.strokeTriangle(x + c * 13, y + sn * 13, x - sn * 8 - c * 6, y + c * 8 - sn * 6, x + sn * 8 - c * 6, y - c * 8 - sn * 6);
  }
}
