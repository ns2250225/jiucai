import Phaser from 'phaser';
import { GameManager } from '../GameManager';
import { zoomFor } from '../GameConfig';

interface Runner {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  frames: string[];
  t: number;
  f: number;
}

/** 主菜单背景：韭菜田，收割者站在中央，周围几根韭菜正在逃跑 */
export class MenuScene extends Phaser.Scene {
  private runners: Runner[] = [];
  private hero!: Phaser.GameObjects.Image;
  private scythe!: Phaser.GameObjects.Image;
  private heroT = 0;
  private heroF = 0;

  constructor() {
    super('MenuScene');
  }

  private spawnRunner(cx: number, cy: number) {
    const kinds = ['leek_basic', 'leek_newbie', 'leek_runner', 'leek_thin', 'leek_suit', 'leek_old', 'leek_gold'];
    const id = kinds[Math.floor(Math.random() * kinds.length)];
    const a = Math.random() * Math.PI * 2;
    const r = 120 + Math.random() * 90;
    const img = this.add.image(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 'atlas', `${id}_0`).setScale(1.5);
    const sp = 34 + Math.random() * 40;
    img.setFlipX(Math.cos(a) < 0);
    this.runners.push({ img, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, frames: [`${id}_0`, `${id}_1`], t: 0, f: 0 });
  }

  create() {
    this.runners = [];
    const cam = this.cameras.main;
    const layout = () => {
      cam.setZoom(zoomFor(this.scale.width, this.scale.height));
      cam.centerOn(0, 30);
    };
    layout();
    this.scale.on('resize', layout, this);
    this.events.once('shutdown', () => this.scale.off('resize', layout, this));

    this.add.tileSprite(0, 0, 2400, 1800, 'tile_0').setOrigin(0.5).setDepth(-1000);
    // 田垄与韭菜丛
    for (let i = 0; i < 90; i++) {
      const x = (Math.random() - 0.5) * 1500;
      const y = (Math.random() - 0.5) * 1000;
      if (Math.abs(x) < 110 && Math.abs(y) < 90) continue;
      const frame = Math.random() < 0.55 ? 'prop_grass' : 'prop_flower';
      this.add.image(x, y, 'atlas', frame).setScale(1.6).setDepth(-900);
    }
    for (let i = 0; i < 14; i++) {
      this.add.image(-700 + i * 108, -260, 'atlas', 'prop_fence').setScale(1.8).setDepth(-260);
    }
    this.add.image(-290, -150, 'atlas', 'prop_scarecrow').setScale(1.9).setDepth(-150);
    this.add.image(330, -190, 'atlas', 'prop_shed').setScale(1.9).setDepth(-190);

    this.add.image(0, 44, 'atlas', 'fx_shadow').setScale(2.6).setDepth(-800);
    this.hero = this.add.image(0, 0, 'atlas', 'player_reaper_idle0').setScale(3).setDepth(100);
    this.scythe = this.add.image(38, -14, 'atlas', 'w_scythe').setScale(2.6).setDepth(101).setRotation(0.5);
    for (let i = 0; i < 9; i++) this.spawnRunner(0, 20);
    GameManager.emit('sceneReady', 'menu');
  }

  override update(_t: number, delta: number) {
    const dt = delta / 1000;
    this.heroT += dt * 2.4;
    if (this.heroT >= 1) {
      this.heroT = 0;
      this.heroF = 1 - this.heroF;
      this.hero.setFrame(`player_reaper_idle${this.heroF}`);
      this.scythe.setRotation(this.heroF ? 0.55 : 0.45);
    }
    for (const r of this.runners) {
      r.img.x += r.vx * dt;
      r.img.y += r.vy * dt;
      r.img.setDepth(r.img.y);
      r.t += dt * 7;
      if (r.t >= 1) {
        r.t = 0;
        r.f = 1 - r.f;
        r.img.setFrame(r.frames[r.f]);
      }
      if (Math.abs(r.img.x) > 720 || Math.abs(r.img.y) > 480) {
        // 跑出屏幕后从角色身边重新“惊恐逃离”
        const a = Math.random() * Math.PI * 2;
        const sp = 34 + Math.random() * 40;
        r.img.setPosition(Math.cos(a) * 120, 20 + Math.sin(a) * 90);
        r.vx = Math.cos(a) * sp;
        r.vy = Math.sin(a) * sp;
        r.img.setFlipX(r.vx < 0);
      }
    }
  }
}
