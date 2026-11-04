import Phaser from 'phaser';
import type { BattleScene } from '../scenes/BattleScene';
import type { Leek } from '../entities/Leek';
import { ObjectPool } from './ObjectPool';
import { AudioService } from '../../services/AudioService';
import { GameManager } from '../GameManager';

export type PickupType = 'xp_small' | 'xp_big' | 'coin' | 'coin_bag' | 'potion' | 'bomb' | 'magnet' | 'shield' | 'rage' | 'reset' | 'fragment'
  | 'chest_normal' | 'chest_gold' | 'chest_rare' | 'chest_boss' | 'chest_evo';

export class Pickup {
  img: Phaser.GameObjects.Image;
  active = false;
  type: PickupType = 'coin';
  x = 0;
  y = 0;
  value = 1;
  magnet = false;
  speed = 0;
  bob = 0;
  sx = 0;
  sy = 0;
  popT = 0;
  constructor(scene: Phaser.Scene) {
    this.img = scene.add.image(0, 0, 'atlas', 'p_coin').setVisible(false);
  }
}
const MAX_PICKUPS = 340;
const MAG_BASE = 72;

export class DropSystem {
  list: Pickup[] = [];
  private pool: ObjectPool<Pickup>;
  private coinSfx = 0;

  constructor(private scene: BattleScene) {
    this.pool = new ObjectPool(() => new Pickup(scene), (p) => {
      p.active = false;
      p.img.setVisible(false);
    });
  }

  spawn(type: PickupType, x: number, y: number, value = 1): Pickup | null {
    const s = this.scene;
    x = Phaser.Math.Clamp(x, 20, s.worldSize - 20);
    y = Phaser.Math.Clamp(y, 20, s.worldSize - 20);
    // 超出上限时经验、金币直接入账，保证不丢收益
    if (this.list.length >= MAX_PICKUPS) {
      if (type === 'xp_small' || type === 'xp_big') {
        s.exp.gain(value);
        return null;
      }
      if (type === 'coin' || type === 'coin_bag') {
        this.addGold(value);
        return null;
      }
    }
    const p = this.pool.get();
    p.active = true;
    p.type = type;
    p.x = x;
    p.y = y;
    p.sx = x;
    p.sy = y;
    p.value = value;
    p.magnet = false;
    p.speed = 0;
    p.bob = Math.random() * 6;
    p.popT = 0.22;
    const chest = type.startsWith('chest');
    p.img
      .setFrame(`p_${type}`)
      .setPosition(x, y)
      .setScale(chest ? 1.8 : type === 'xp_small' ? 1.1 : 1.4)
      .setVisible(true)
      .setDepth(chest ? y : -5000);
    this.list.push(p);
    return p;
  }

  /** 按敌人配置掉落经验、金币和低概率道具 */
  dropFor(l: Leek, bonusGold: number) {
    const s = this.scene;
    const def = l.def;
    const luck = s.pstats.luck;
    const dropMul = s.mods.drop;
    const xp = def.xp * l.xpMul;
    if (xp > 0) {
      const v = xp * Math.max(0.5, dropMul);
      s.drops.spawn(v >= 5 ? 'xp_big' : 'xp_small', l.x + (Math.random() - 0.5) * 8, l.y + (Math.random() - 0.5) * 8, v);
    }
    let gold = 0;
    if (Math.random() < def.goldChance * Math.min(1.5, luck)) gold = def.gold * l.goldMul;
    if (def.ai === 'stock') gold *= Math.max(0.2, l.value) * 1.4;
    if (l.isElite) gold *= s.pstats.eliteGold;
    gold = (gold + bonusGold) * dropMul;
    if (gold > 0) {
      if (gold >= 20) this.spawn('coin_bag', l.x + 8, l.y, gold);
      else this.spawn('coin', l.x - 6, l.y + 4, gold);
    }
    if (l.isBoss) return;
    if (l.isElite) {
      const r = Math.random() / luck;
      if (r < 0.06) this.spawn('chest_rare', l.x, l.y);
      else if (r < 0.2) this.spawn('chest_gold', l.x, l.y);
      else if (r < 0.65) this.spawn('chest_normal', l.x, l.y);
      if (Math.random() < 0.12 * luck) this.spawn('potion', l.x + 12, l.y + 8);
      if (Math.random() < 0.05 * luck) this.spawn('reset', l.x - 12, l.y + 8);
      return;
    }
    // 普通韭菜极低概率掉落功能道具
    const r = Math.random() / luck;
    if (r < 0.0015) this.spawn('bomb', l.x, l.y);
    else if (r < 0.0035) this.spawn('magnet', l.x, l.y);
    else if (r < 0.0085) this.spawn('potion', l.x, l.y);
    else if (r < 0.01) this.spawn('shield', l.x, l.y);
    else if (r < 0.0125) this.spawn('rage', l.x, l.y);
    else if (r < 0.0132) this.spawn('chest_normal', l.x, l.y);
    if (def.id === 'leek_gold' && Math.random() < 0.15 * luck) this.spawn('chest_gold', l.x, l.y);
  }

  addGold(v: number) {
    const s = this.scene;
    const val = v * s.pstats.gold * s.mods.gold * s.map.goldMul * s.eventSys.goldMarket();
    s.stats.gold += val;
    this.coinSfx -= 1;
    if (this.coinSfx <= 0) {
      this.coinSfx = 3;
      AudioService.play('coin', 0.09);
    }
  }

  /** 全图经验吸收 */
  magnetAll() {
    for (const p of this.list) if (p.type === 'xp_small' || p.type === 'xp_big' || p.type === 'coin' || p.type === 'coin_bag') p.magnet = true;
  }

  /** 屏外需要指示方向的宝箱 */
  importantChest(): Pickup | null {
    for (const p of this.list) if (p.type === 'chest_boss' || p.type === 'chest_evo' || (p.type === 'chest_rare' && p.value === 7)) return p;
    return null;
  }

  private collect(p: Pickup) {
    const s = this.scene;
    switch (p.type) {
      case 'xp_small':
      case 'xp_big':
        s.exp.gain(p.value);
        AudioService.play('xp', 0.07);
        break;
      case 'coin':
      case 'coin_bag':
        this.addGold(p.value);
        break;
      case 'potion':
        s.player.heal(s.pstats.maxHp * 0.3);
        s.fx.burst('spark', s.player.x, s.player.y, 6);
        s.fx.text(s.player.x, s.player.y - 28, '生命恢复', '#7dff9a');
        AudioService.play('pick');
        break;
      case 'bomb':
        this.detonate();
        break;
      case 'magnet':
        this.magnetAll();
        s.fx.ring(s.player.x, s.player.y, 40, 500, 0xff6060, 0.5, 3);
        s.fx.text(s.player.x, s.player.y - 28, '资金虹吸', '#ff9a9a');
        AudioService.play('pick');
        break;
      case 'shield':
        s.player.shieldT = 6;
        s.fx.text(s.player.x, s.player.y - 28, '临时护盾', '#7dd0ff');
        AudioService.play('pick');
        break;
      case 'rage':
        s.player.rageT = 9;
        s.fx.text(s.player.x, s.player.y - 28, '狂暴！', '#ffb368');
        AudioService.play('pick');
        break;
      case 'reset':
        s.evolution.resetAll(1, '抗性重置剂生效：韭菜技术倒退一代！');
        AudioService.play('pick');
        break;
      case 'fragment':
        s.stats.fragments++;
        GameManager.emit('fragment', 1);
        GameManager.emit('banner', { text: '获得隐藏组合碎片', kind: 'chest', sub: '集齐 3 枚可在武器图鉴揭示一个隐藏组合' });
        AudioService.play('pick');
        break;
      default:
        this.openChest(p.type);
    }
  }

  /** 炸弹：清理屏幕内普通敌人 */
  private detonate() {
    const s = this.scene;
    const v = s.cameras.main.worldView;
    s.fx.flash(160, 255, 255, 220);
    s.fx.shake(0.01, 240);
    AudioService.play('boom');
    s.fx.boom(s.player.x, s.player.y, 3);
    for (const l of s.enemies.slice()) {
      if (!l.active || l.isBoss || l.isElite || l.def.group === 'unit') continue;
      if (!v.contains(l.x, l.y)) continue;
      s.damage.hit(l, 1e7, null, 'fire', { pure: true, noNumber: true });
    }
  }

  private openChest(type: PickupType) {
    const s = this.scene;
    s.stats.chests++;
    AudioService.play('chest');
    const p = s.player;
    s.fx.burst('coin', p.x, p.y, 14);
    s.fx.ring(p.x, p.y, 10, 120, 0xffd23e, 0.35, 3);
    const rewards: string[] = [];

    // 优先完成武器进化
    const canEvolve = s.weapons.evolution.ready().length > 0;
    if (canEvolve && (type === 'chest_evo' || type === 'chest_boss' || type === 'chest_rare' || type === 'chest_gold')) {
      if (s.weapons.evolution.evolveOne()) rewards.push('武器进化');
    }

    const giveGold = (n: number) => {
      this.addGold(n);
      rewards.push(`金币 +${Math.round(n)}`);
    };
    const giveUps = (n: number) => {
      for (let i = 0; i < n; i++) {
        const name = s.skills.grantRandomUpgrade();
        if (name) rewards.push(name);
      }
    };
    switch (type) {
      case 'chest_normal':
        if (Math.random() < 0.5) giveGold(20 + s.simTime / 8);
        else giveUps(1);
        break;
      case 'chest_gold':
        giveGold(50 + s.simTime / 5);
        giveUps(2);
        break;
      case 'chest_rare': {
        const name = s.skills.grantRarePassive();
        if (name) rewards.push(name);
        giveUps(1);
        if (Math.random() < 0.45) this.spawn('fragment', p.x + 40, p.y + 20);
        break;
      }
      case 'chest_boss': {
        giveGold(200 + s.simTime / 3);
        giveUps(3);
        const name = s.skills.grantRarePassive();
        if (name) rewards.push(name);
        this.spawn('fragment', p.x + 40, p.y + 20);
        break;
      }
      case 'chest_evo':
        if (!canEvolve) giveUps(2);
        break;
    }
    const titles: Record<string, string> = { chest_normal: '普通宝箱', chest_gold: '黄金宝箱', chest_rare: '稀有宝箱', chest_boss: 'BOSS 宝箱', chest_evo: '进化宝箱' };
    GameManager.emit('banner', { text: titles[type] ?? '宝箱', kind: 'chest', sub: rewards.join(' · ') });
  }

  update(dt: number) {
    const s = this.scene;
    const pl = s.player;
    const mag = MAG_BASE * s.pstats.magnet;
    const mag2 = mag * mag;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      const chest = p.type.startsWith('chest');
      p.bob += dt * 5;
      if (p.popT > 0) p.popT -= dt;
      const dx = pl.x - p.x;
      const dy = pl.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (!chest && !p.magnet && d2 < mag2) p.magnet = true;
      if (p.magnet && !pl.dead) {
        p.speed = Math.min(620, p.speed + dt * 1100);
        const d = Math.sqrt(d2) || 1;
        p.x += (dx / d) * p.speed * dt;
        p.y += (dy / d) * p.speed * dt;
      }
      p.img.x = p.x;
      p.img.y = p.y + (p.magnet ? 0 : Math.sin(p.bob) * 2) - p.popT * 60;
      const reach = chest ? 34 : 24;
      if (d2 < reach * reach && !pl.dead) {
        this.collect(p);
        this.list[i] = this.list[this.list.length - 1];
        this.list.pop();
        this.pool.release(p);
      }
    }
  }
}
