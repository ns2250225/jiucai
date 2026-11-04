import type { BattleScene } from '../scenes/BattleScene';
import { xpToNext } from '../../data/progression';

export class ExperienceSystem {
  level = 1;
  xp = 0;
  next = xpToNext(1);
  pending = 0;

  constructor(private scene: BattleScene) {}

  gain(v: number) {
    this.xp += v * this.scene.pstats.xp;
    while (this.xp >= this.next) {
      this.xp -= this.next;
      this.level++;
      this.pending++;
      this.next = xpToNext(this.level);
    }
    this.scene.stats.level = this.level;
  }
}
