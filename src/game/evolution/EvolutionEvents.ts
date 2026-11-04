import { GameManager } from '../GameManager';
import { AudioService } from '../../services/AudioService';
import { EVO_CHATTER } from '../data';
import type { EvoLevelDef, EvoLineDef } from '../types';

/** 进化预警：把系统内部状态翻译成屏幕警告，让玩家有时间应对 */
export const EvolutionEvents = {
  research(line: EvoLineDef) {
    GameManager.emit('banner', { text: line.research, kind: 'warn' });
    AudioService.play('warn', 1);
  },
  evolved(line: EvoLineDef, lv: number, def: EvoLevelDef) {
    const chatter = EVO_CHATTER[Math.floor(Math.random() * EVO_CHATTER.length)];
    GameManager.emit('banner', { text: line.done, kind: 'evo', sub: `${line.name} Lv${lv}「${def.name}」· ${chatter}` });
    AudioService.play('warn', 0.5);
  },
  techBuilt(line: EvoLineDef) {
    GameManager.emit('banner', { text: '韭菜科技中心已建成！', kind: 'warn', sub: `正在加速研究「${line.name}」，沿箭头前往摧毁` });
    AudioService.play('warn', 0.5);
  },
  techDown(line: EvoLineDef) {
    GameManager.emit('banner', { text: '韭菜科技中心已摧毁', kind: 'result', sub: `「${line.name}」研究被冻结 2 分钟` });
  },
  coreUp(line: EvoLineDef) {
    GameManager.emit('banner', { text: '发现韭菜进化核心！', kind: 'warn', sub: `限时摧毁可让「${line.name}」降低 1 级` });
  },
  coreDown(line: EvoLineDef) {
    GameManager.emit('banner', { text: '进化核心已摧毁', kind: 'result', sub: `「${line.name}」倒退一级` });
  },
  scientist() {
    GameManager.emit('banner', { text: '科学家韭菜已被收割', kind: 'result', sub: '韭菜学术界痛失栋梁，研究进度下降' });
  },
};
