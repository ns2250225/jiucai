import type { BattleScene } from '../scenes/BattleScene';
import { DTYPES } from '../types';
import type { DType } from '../types';

/** 玩家行为监测：只在当前局内统计。窗口值会衰减，换武器后判断能很快跟上 */
export class BehaviorMonitor {
  total: Record<DType, number> = { melee: 0, ranged: 0, fire: 0, lightning: 0, frost: 0, void: 0 };
  window: Record<DType, number> = { melee: 0, ranged: 0, fire: 0, lightning: 0, frost: 0, void: 0 };
  controlCount = 0;
  private moveEma = 0;
  private stayEma = 0;
  private anchorX: number;
  private anchorY: number;
  private stayT = 0;
  private decayT = 5;
  distance = 0;

  constructor(private scene: BattleScene) {
    this.anchorX = scene.player.x;
    this.anchorY = scene.player.y;
  }

  recordDamage(t: DType, d: number) {
    if (!Number.isFinite(d) || d > 1e6) return;
    this.total[t] += d;
    this.window[t] += d;
    const st = this.scene.stats.byType;
    st[t] = (st[t] ?? 0) + d;
  }
  recordControl() {
    this.controlCount++;
  }
  recordControlTick(_dt: number) {
    this.controlCount += 0.01;
  }

  /** 窗口内某种攻击方式的伤害占比 */
  share(t: DType) {
    let sum = 0;
    for (const k of DTYPES) sum += this.window[k];
    return sum > 0 ? this.window[t] / sum : 0;
  }
  topType(): DType {
    let best: DType = 'melee';
    for (const k of DTYPES) if (this.window[k] > this.window[best]) best = k;
    return best;
  }
  /** 高频移动占比（0~1） */
  get moveRatio() {
    return this.moveEma;
  }
  /** 长时间停留占比（0~1） */
  get stayRatio() {
    return this.stayEma;
  }

  update(dt: number) {
    const p = this.scene.player;
    const moving = p.vx !== 0 || p.vy !== 0 ? 1 : 0;
    this.moveEma += (moving - this.moveEma) * Math.min(1, dt * 0.08);
    const dx = p.x - this.anchorX;
    const dy = p.y - this.anchorY;
    if (dx * dx + dy * dy > 130 * 130) {
      this.anchorX = p.x;
      this.anchorY = p.y;
      this.stayT = 0;
    } else {
      this.stayT += dt;
    }
    this.stayEma += ((this.stayT > 8 ? 1 : 0) - this.stayEma) * Math.min(1, dt * 0.1);
    this.distance += Math.hypot(p.vx, p.vy) * dt;
    this.decayT -= dt;
    if (this.decayT <= 0) {
      this.decayT = 5;
      for (const k of DTYPES) this.window[k] *= 0.8;
    }
  }
}
