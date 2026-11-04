import type { BattleScene } from '../scenes/BattleScene';
import { COMBOS, WEAPON_EVOS, WEAPON_MAP } from '../data';
import { GameManager } from '../GameManager';
import { AudioService } from '../../services/AudioService';

/** 武器进化与隐藏组合：判定条件、发放进化宝箱、激活组合 */
export class WeaponEvolution {
  private chestGiven = new Set<string>();
  active = new Set<string>();
  private cosmicT = 8;

  constructor(private scene: BattleScene) {}

  /** 满足条件的进化：主武器 8 级 + 拥有指定被动 */
  ready() {
    const s = this.scene;
    return WEAPON_EVOS.filter((e) => {
      const w = s.weapons.get(e.base);
      return w && w.level >= 8 && s.passives.level(e.passive) > 0;
    });
  }

  /** 升级后检查，达成条件就在玩家附近投放进化宝箱 */
  checkReady() {
    const s = this.scene;
    for (const e of this.ready()) {
      if (this.chestGiven.has(e.base)) continue;
      this.chestGiven.add(e.base);
      const a = Math.random() * Math.PI * 2;
      s.drops.spawn('chest_evo', s.player.x + Math.cos(a) * 130, s.player.y + Math.sin(a) * 130);
      GameManager.emit('banner', {
        text: `${WEAPON_MAP[e.base].name} 已达到进化条件！`, kind: 'info', sub: '开启附近的进化宝箱完成进化',
      });
    }
    this.checkCombos();
  }

  /** 执行一次进化；由进化宝箱或 BOSS 宝箱调用 */
  evolveOne(): boolean {
    const s = this.scene;
    const e = this.ready()[0];
    if (!e) return false;
    s.weapons.replace(e.base, e.result);
    s.stats.weaponEvos++;
    const def = WEAPON_MAP[e.result];
    AudioService.play('evolve');
    s.fx.flash(350, 255, 240, 180);
    s.fx.shake(0.01, 300);
    s.fx.ring(s.player.x, s.player.y, 10, 420, 0xffd23e, 0.7, 6);
    s.fx.burst('coin', s.player.x, s.player.y, 30);
    s.fx.burst('spark', s.player.x, s.player.y, 30);
    GameManager.emit('banner', { text: `武器进化：${def.name}`, kind: 'evo', sub: e.effect });
    GameManager.emit('weaponSeen', def.id);
    this.checkCombos();
    return true;
  }

  checkCombos() {
    const s = this.scene;
    for (const c of COMBOS) {
      if (this.active.has(c.id)) continue;
      const ok = c.a.some((id) => s.weapons.get(id)) && c.b.some((id) => s.weapons.get(id));
      if (ok) {
        this.active.add(c.id);
        if (!s.stats.combos.includes(c.id)) s.stats.combos.push(c.id);
        GameManager.emit('comboFound', c.id);
        GameManager.emit('banner', { text: `隐藏组合：${c.name}`, kind: 'evo', sub: c.desc });
        AudioService.play('evolve');
      }
    }
  }

  /** 黄金万刃、宇宙收割机这类全局组合的周期效果 */
  update(dt: number) {
    if (!this.active.has('cosmic')) return;
    this.cosmicT -= dt;
    if (this.cosmicT > 0) return;
    this.cosmicT = 9;
    const s = this.scene;
    const p = s.player;
    s.fx.darken(0.45, 0.8);
    s.fx.ring(p.x, p.y, 700, 10, 0xc27bff, 0.7, 8);
    s.fx.sprite('fx_bh0', p.x, p.y, { frames: ['fx_bh0', 'fx_bh1', 'fx_bh2', 'fx_bh0', 'fx_bh1', 'fx_bh2'], life: 0.8, scale: 6, endScale: 1, fade: false, spin: 6, depth: 450000 });
    AudioService.play('hole', 0.3);
    for (const l of s.spatial.query(p.x, p.y, 800)) {
      l.pull(p.x, p.y, 3000, 0.1);
      s.damage.hit(l, 60 + s.exp.level * 5, 'void_eater', 'void', { noKnock: true, numberChance: 0.5 });
    }
  }
}
