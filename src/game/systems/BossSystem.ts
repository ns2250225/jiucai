import type { BattleScene } from '../scenes/BattleScene';
import { Boss } from '../entities/Boss';
import { BOSS_MAP } from '../data';
import { GameManager } from '../GameManager';
import { AudioService } from '../../services/AudioService';
import { ObjectPool } from './ObjectPool';

const MID_TIME = 300;
const FINAL_TIME = 600;
const ENDLESS_GAP = 240;

export class BossSystem {
  active: Boss | null = null;
  private alive: Boss[] = [];
  private pool: ObjectPool<Boss>;
  private queue: { t: number; id: string; scale: number; final: boolean; warned: boolean }[] = [];
  finalDown = false;
  private endlessN = 0;

  constructor(private scene: BattleScene) {
    this.pool = new ObjectPool(() => new Boss(scene));
    const m = scene.map;
    this.queue.push({ t: MID_TIME, id: m.bossMid, scale: m.bossMidScale, final: false, warned: false });
    this.queue.push({ t: FINAL_TIME, id: m.bossFinal, scale: 1, final: true, warned: false });
  }

  get isFinalFight() {
    return !!this.active?.isFinal;
  }

  private spawn(id: string, scale: number, final: boolean) {
    const s = this.scene;
    const def = BOSS_MAP[id];
    const b = this.pool.get();
    const p = s.spawner.edgePoint(100);
    b.initBoss(def, scale, final, p.x, p.y);
    s.spawner.register(b);
    this.alive.push(b);
    this.active = b;
    // 独立出场演出：屏幕变暗、镜头震动、名字与台词
    s.fx.darken(0.55, 1.6);
    s.fx.shake(0.012, 900);
    s.fx.ring(b.x, b.y, 20, 600, 0xff3030, 1, 8);
    s.fx.burst('smoke', b.x, b.y, 14);
    b.sprite.setScale(b.baseScale * 0.2);
    s.tweens.add({ targets: b.sprite, scale: b.baseScale, duration: 900, ease: 'Back.Out' });
    AudioService.play('bossIntro');
    AudioService.playBgm('boss');
    GameManager.emit('banner', { text: def.name, kind: 'boss', sub: def.quote });
    GameManager.emit('leekSeen', def.id);
  }

  onBossDead(b: Boss) {
    const s = this.scene;
    const st = s.stats;
    st.bossKills++;
    const x = b.x;
    const y = b.y;
    // BOSS 死亡演出：连环爆炸 + 金币喷发
    AudioService.play('bossDie');
    s.fx.flash(400, 255, 255, 255);
    s.fx.shake(0.02, 900);
    s.fx.darken(0.35, 1.2);
    for (let i = 0; i < 9; i++) {
      s.time.delayedCall(i * 120, () => {
        s.fx.boom(x + (Math.random() - 0.5) * 130, y + (Math.random() - 0.5) * 130, 1.6 + Math.random() * 1.2);
        s.fx.burst('coin', x, y, 16);
      });
    }
    s.drops.spawn('chest_boss', x, y);
    s.fx.ring(x, y, 10, 800, 0xffd23e, 1, 8);
    const isChair = b.def.ai === 'chairman' && b.isFinal;
    if (isChair) st.chairmanDead = true;
    this.alive = this.alive.filter((o) => o !== b);
    this.active = this.alive[this.alive.length - 1] ?? null;
    if (!this.active) AudioService.playBgm(s.map.id);
    GameManager.emit('banner', { text: `${b.bossDef.name} 已被收割`, kind: 'boss', sub: '恭喜，这很资本。' });
    this.pool.release(b);
    if (b.isFinal && !this.finalDown) {
      this.finalDown = true;
      if (s.config.endless) {
        st.won = true;
        GameManager.emit('banner', { text: '进入无尽收割', kind: 'event', sub: '韭菜是割不完的，你也是。' });
        this.queueEndless();
      } else {
        s.time.delayedCall(4500, () => s.victory());
      }
    } else if (b.isFinal && s.config.endless) {
      this.queueEndless();
    }
  }

  private queueEndless() {
    const s = this.scene;
    this.endlessN++;
    const ids = Object.keys(BOSS_MAP);
    const id = ids[(this.endlessN - 1) % ids.length];
    this.queue.push({ t: s.simTime + ENDLESS_GAP, id, scale: 1 + this.endlessN * 0.6, final: true, warned: false });
  }

  update(_dt: number) {
    const s = this.scene;
    for (let i = this.queue.length - 1; i >= 0; i--) {
      const q = this.queue[i];
      if (!q.warned && s.simTime >= q.t - 10) {
        q.warned = true;
        GameManager.emit('banner', { text: `警告：${BOSS_MAP[q.id].name} 将在 10 秒后抵达`, kind: 'warn' });
        AudioService.play('warn');
      }
      if (s.simTime >= q.t) {
        this.queue.splice(i, 1);
        this.spawn(q.id, q.scale, q.final);
      }
    }
  }
}
