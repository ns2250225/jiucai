import Phaser from 'phaser';
import { buildAtlas, makeNumFont, NUM_CHARS } from '../art/Atlas';

/** 引导：生成图集并注册为 Phaser 纹理，避免任何运行时外部资源 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }
  create() {
    const { canvas, frames } = buildAtlas();
    const tex = this.textures.addCanvas('atlas', canvas)!;
    for (const [name, f] of Object.entries(frames)) tex.add(name, 0, f.x, f.y, f.w, f.h);
    this.textures.addCanvas('numfont', makeNumFont());
    this.cache.bitmapFont.add(
      'num',
      Phaser.GameObjects.RetroFont.Parse(this, {
        image: 'numfont',
        width: 7,
        height: 9,
        chars: NUM_CHARS,
        charsPerRow: NUM_CHARS.length,
        'offset.x': 0,
        'offset.y': 0,
        'spacing.x': 0,
        'spacing.y': 0,
        lineSpacing: 0,
      }),
    );
    this.scene.start('PreloadScene');
  }
}
