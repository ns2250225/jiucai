import Phaser from 'phaser';
import type { BattleScene } from '../scenes/BattleScene';
import type { EventDef, EventMods } from '../types';
import { EVENTS } from '../data';
import { GameManager } from '../GameManager';
import { AudioService } from '../../services/AudioService';

export interface Mods extends Required<EventMods> {}

export class EventSystem {
  active: EventDef | null = null;
  remain = 0;
  private nextT = 55;
  private market = 1;
  private marketTarget = 1;
  private marketT = 6;
  private rainT = 0;
  private rainActive = false;

  constructor(private scene: BattleScene) {}

  /** 大盘指数：牛市地图上下波动，熊市地图偶尔贬值 */
  get marketIndex() {
    return this.market;
  }
  get hasMarket() {
    const f = this.scene.map.flags;
    return !!(f.market || f.devalue);
  }
  goldMarket() {
    return this.hasMarket ? this.market : 1;
  }
  /** 炒股韭菜的个体行情：没有大盘的地图上自己瞎涨瞎跌 */
  marketFor(uid: number) {
    if (this.hasMarket) return this.market;
    return 1 + Math.sin(this.scene.simTime * 0.7 + uid) * 0.7;
  }

  private pick(): EventDef {
    const map = this.scene.map;
    const general = EVENTS.filter((e) => !e.exclusive);
    const exclusive = EVENTS.filter((e) => e.exclusive && map.events.includes(e.id));
    const pool: EventDef[] = [...general];
    // 地图专属事件权重更高
    for (const e of exclusive) pool.push(e, e, e);
    return Phaser.Math.RND.pick(pool.filter((e) => e !== this.lastEvent));
  }
  private lastEvent: EventDef | null = null;

  update(dt: number) {
    const s = this.scene;
    if (this.hasMarket) {
      this.marketT -= dt;
      if (this.marketT <= 0) {
        this.marketT = 5 + Math.random() * 7;
        const devalue = s.map.flags.devalue;
        this.marketTarget = devalue ? 0.55 + Math.random() * 0.6 : 0.6 + Math.random() * 1.3;
        if (Math.random() < 0.15) {
          const up = !devalue && Math.random() < 0.5;
          this.marketTarget = up ? 2.2 : 0.45;
          GameManager.emit('banner', { text: up ? '大盘暴涨！' : devalue ? '金币贬值！' : '大盘暴跌！', kind: 'info', sub: `金币价值 ×${this.marketTarget.toFixed(2)}` });
        }
      }
      this.market += (this.marketTarget - this.market) * Math.min(1, dt * 1.2);
    }

    if (this.active) {
      this.remain -= dt;
      if (this.rainActive) {
        this.rainT -= dt;
        if (this.rainT <= 0) {
          this.rainT = 0.14;
          const p = s.player;
          for (let i = 0; i < 3; i++) {
            const x = p.x + (Math.random() - 0.5) * 900;
            const y = p.y + (Math.random() - 0.5) * 600;
            s.drops.spawn(Math.random() < 0.1 ? 'coin_bag' : 'coin', x, y, 2 + Math.random() * 3);
          }
        }
      }
      if (this.remain <= 0) this.end();
      return;
    }
    this.nextT -= dt;
    if (this.nextT <= 0 && !s.bossSys.isFinalFight) this.start(this.pick());
  }

  start(ev: EventDef) {
    const s = this.scene;
    this.active = ev;
    this.lastEvent = ev;
    this.remain = ev.duration;
    this.rainActive = false;
    s.stats.events++;
    if (ev.mods) Object.assign(s.mods, ev.mods);
    GameManager.emit('banner', { text: ev.name, kind: 'event', sub: ev.announce });
    AudioService.play('warn', 0.5);
    if (ev.action) this.runAction(ev.action);
  }

  private end() {
    const s = this.scene;
    const ev = this.active!;
    this.active = null;
    this.rainActive = false;
    s.resetMods();
    this.nextT = 45 + Math.random() * 30;
    if (ev.reward > 0) s.drops.addGold(ev.reward);
    GameManager.emit('banner', { text: `${ev.name} 结束`, kind: 'result', sub: ev.result + (ev.reward ? `（收益 +${ev.reward}）` : '') });
  }

  private runAction(a: string) {
    const s = this.scene;
    const ev = s.evolution;
    const sp = s.spawner;
    switch (a) {
      case 'goldenWave':
        for (let i = 0; i < 10; i++) sp.spawnEdge('leek_gold');
        break;
      case 'uprising':
        s.stats.uprisings++;
        for (let i = 0; i < 30; i++) sp.spawnEdge('leek_rebel');
        break;
      case 'coinRain':
        this.rainActive = true;
        break;
      case 'crashWave':
        sp.ringWave('leek_basic', 60);
        sp.ringWave('leek_thin', 20);
        break;
      case 'banker':
        s.skills.bankerGift();
        break;
      case 'breakthrough':
        ev.breakthrough();
        break;
      case 'insider': {
        const p = s.player;
        const a2 = Math.random() * Math.PI * 2;
        const r = 500 + Math.random() * 400;
        const chest = s.drops.spawn('chest_rare', p.x + Math.cos(a2) * r, p.y + Math.sin(a2) * r, 7);
        if (chest) s.fx.ring(chest.x, chest.y, 10, 120, 0xffd23e, 1.2, 4);
        break;
      }
      case 'marketUp':
        this.marketTarget = 2.5;
        this.marketT = 15;
        break;
      case 'marketDown':
        this.marketTarget = 0.45;
        this.marketT = 15;
        break;
      case 'techCenter':
        ev.spawnTechCenter();
        break;
      case 'coreSpawn':
        ev.spawnCore();
        break;
      case 'guardWave':
        for (let i = 0; i < 5; i++) sp.spawnEdge('elite_guard', 0.45);
        for (let i = 0; i < 3; i++) sp.spawnEdge('leek_rich');
        break;
      case 'eliteWave':
        for (let i = 0; i < 4; i++) sp.spawnElite();
        break;
      case 'towerRing': {
        const p = s.player;
        for (let i = 0; i < 6; i++) {
          const a3 = (i / 6) * Math.PI * 2;
          sp.spawnAt('unit_tower', p.x + Math.cos(a3) * 280, p.y + Math.sin(a3) * 280);
        }
        break;
      }
    }
  }
}
