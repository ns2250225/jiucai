import Phaser from 'phaser';
import { GameManager } from '../GameManager';
import { zoomFor } from '../GameConfig';

/** 结算背景：胜利时金币雨，失败时韭菜围观 */
export class ResultScene extends Phaser.Scene {
  private items: { img: Phaser.GameObjects.Image; vy: number; spin: number }[] = [];
  constructor() {
    super('ResultScene');
  }
  create(data: { won: boolean; mapIndex: number }) {
    this.items = [];
    const cam = this.cameras.main;
    cam.setZoom(zoomFor(this.scale.width, this.scale.height));
    cam.centerOn(0, 0);
    const tile = `tile_${data?.mapIndex ?? 0}`;
    this.add.tileSprite(0, 0, 2400, 1600, tile).setDepth(-100).setTint(data?.won ? 0xffffff : 0x8a7070);
    this.add.rectangle(0, 0, 2400, 1600, 0x000000, 0.42).setDepth(-50);
    if (data?.won) {
      for (let i = 0; i < 70; i++) {
        const img = this.add.image((Math.random() - 0.5) * 1300, -500 - Math.random() * 800, 'atlas', 'p_coin').setScale(1.4 + Math.random());
        this.items.push({ img, vy: 90 + Math.random() * 160, spin: (Math.random() - 0.5) * 6 });
      }
    } else {
      const kinds = ['leek_basic', 'leek_old', 'leek_rebel', 'leek_suit', 'leek_fat', 'leek_shield', 'leek_rich'];
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const id = kinds[i % kinds.length];
        const y = Math.sin(a) * 240;
        const img = this.add.image(Math.cos(a) * 420, y, 'atlas', `${id}_${i % 2}`).setScale(1.9).setDepth(y).setFlipX(Math.cos(a) > 0);
        this.tweens.add({ targets: img, y: y - 8, duration: 200 + (i % 5) * 40, yoyo: true, repeat: -1 });
      }
      this.add.image(0, 0, 'atlas', 'player_reaper_dead2').setScale(3);
    }
    GameManager.emit('sceneReady', 'result');
  }
  override update(_t: number, delta: number) {
    const dt = delta / 1000;
    for (const it of this.items) {
      it.img.y += it.vy * dt;
      it.img.rotation += it.spin * dt;
      if (it.img.y > 520) it.img.y = -520;
    }
  }
}
