import Phaser from 'phaser';
import { makeTile } from '../art/Atlas';
import { TILE_STYLES } from '../art/itemArt';
import { GameManager } from '../GameManager';

/** 生成各地图的地面贴图，完成后进入主菜单 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }
  create() {
    TILE_STYLES.forEach((_, i) => {
      const key = `tile_${i}`;
      if (!this.textures.exists(key)) this.textures.addCanvas(key, makeTile(i));
    });
    GameManager.emit('sceneReady', 'preload');
    this.scene.start('MenuScene');
  }
}
