import type { BattleScene } from '../scenes/BattleScene';
import type { Leek } from '../entities/Leek';
import type { DType, EvoLineId } from '../types';
import { EVO_LEVELS, EVO_LINES } from '../data';

export const LINE_BIT: Record<EvoLineId, number> = { melee: 1, ranged: 2, fire: 4, lightning: 8, frost: 16, void: 32, moving: 64, camping: 128 };

/** 抗性结算：群体学习进度 → 具体到每根韭菜的减伤和弱点 */
export class ResistanceSystem {
  constructor(private scene: BattleScene) {}

  factor(l: Leek, dtype: DType): number {
    if (l.immune === dtype) return 0.05;
    const ev = this.scene.evolution;
    let f = 1;
    const lv = ev.level(dtype);
    if (lv > 0) {
      const base = EVO_LEVELS[lv - 1].resist;
      const mutated = (l.mutMask & LINE_BIT[dtype]) !== 0;
      // 没变异的个体也共享一部分群体抗性；BOSS 减半避免打不动
      let r = mutated ? base : base * 0.4;
      if (l.isBoss) r *= 0.5;
      f *= 1 - r;
    }
    // 弱点：不同抗性之间存在克制，玩家可以靠切换武器反制
    if (l.mutMask !== 0) {
      for (const line of EVO_LINES) {
        if (line.weak === dtype && (l.mutMask & LINE_BIT[line.id]) !== 0) f *= 1 + 0.14 * ev.level(line.id);
      }
    }
    return f;
  }
}
