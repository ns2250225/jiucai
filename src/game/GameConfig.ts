import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { MenuScene } from './scenes/MenuScene';
import { BattleScene } from './scenes/BattleScene';
import { ResultScene } from './scenes/ResultScene';

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#10210f',
    pixelArt: true,
    antialias: false,
    roundPixels: false,
    powerPreference: 'high-performance',
    disableContextMenu: true,
    banner: false,
    audio: { noAudio: true },
    input: { keyboard: false, gamepad: false },
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: window.innerWidth,
      height: window.innerHeight,
      autoCenter: Phaser.Scale.NO_CENTER,
    },
    fps: { target: 60, min: 20, smoothStep: true },
    scene: [BootScene, PreloadScene, MenuScene, BattleScene, ResultScene],
  };
}

/** 视野高度保持约 560 世界单位，手机和桌面看到的战场范围接近 */
export function zoomFor(width: number, height: number) {
  const z = Math.min(width, height * 1.6) / 960;
  const byH = height / 560;
  return Math.max(0.5, Math.round(Math.min(Math.max(z, byH), 3) * 4) / 4);
}
