import type { BattleScene } from '../scenes/BattleScene';
import type { Leek } from '../entities/Leek';
import type { DType, EvoLineDef, EvoLineId, HudEvo } from '../types';
import { DTYPES } from '../types';
import { EVO_LEVELS, EVO_LINES } from '../data';
import { EvolutionEvents } from './EvolutionEvents';
import { LINE_BIT } from './ResistanceSystem';
import { GameManager } from '../GameManager';

interface LineState {
  def: EvoLineDef;
  tint: number;
  level: number;
  progress: number;
  warned: boolean;
  blockedT: number;
  bias: number;
  techBoost: number;
}
const TICK = 5;
const MAX_LEVEL = 4;

/** 韭菜反进化核心：读取行为数据 → 累计研究进度 → 升级 → 改变后续韭菜的属性和行为 */
export class LeekEvolution {
  lines = new Map<EvoLineId, LineState>();
  private timer = TICK;
  private threshold: number;
  private bonus = 0;
  private chatterDone = false;

  constructor(private scene: BattleScene) {
    for (const def of EVO_LINES) {
      this.lines.set(def.id, {
        def, tint: Number(def.tint), level: 0, progress: 0, warned: false, blockedT: 0,
        // 每局随机的研究倾向，让进化路线不会每次都一样
        bias: 0.72 + Math.random() * 0.6, techBoost: 0,
      });
    }
    this.threshold = 0.38 + Math.random() * 0.06;
  }

  level(id: EvoLineId) {
    return this.lines.get(id)!.level;
  }

  /** 教授讲课等外部因素：研究提速 */
  boostResearch(v: number) {
    this.bonus += v;
  }

  private shareOf(id: EvoLineId): number {
    const m = this.scene.monitor;
    if (id === 'moving') return m.moveRatio > 0.72 ? 0.42 + (m.moveRatio - 0.72) : 0;
    if (id === 'camping') return m.stayRatio > 0.35 ? 0.42 + (m.stayRatio - 0.35) : 0;
    return m.share(id as DType);
  }

  update(dt: number) {
    const s = this.scene;
    for (const st of this.lines.values()) if (st.blockedT > 0) st.blockedT -= dt;
    if (s.simTime < s.map.evoStart) return;
    if (!this.chatterDone) {
      this.chatterDone = true;
      EvolutionEvents.research({ ...EVO_LINES[0], research: '你的收割行为已经引起韭菜社会高度关注。' });
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = TICK;
    const analyst = 1 - 0.25 * s.skills.flag('analyst');
    for (const st of this.lines.values()) {
      if (st.level >= MAX_LEVEL || st.blockedT > 0) continue;
      const share = this.shareOf(st.def.id);
      if (share < this.threshold && st.techBoost <= 0) continue;
      const base = Math.max(0.1, share - this.threshold + 0.3);
      let gain = base * 15 * st.bias * s.map.evoSpeed * analyst + (st.techBoost > 0 ? 3.5 : 0);
      gain += this.bonus * 0.6;
      st.progress += gain;
      if (!st.warned && st.progress >= 45) {
        st.warned = true;
        EvolutionEvents.research(st.def);
      }
      if (st.progress >= 100) this.evolve(st);
    }
    this.bonus = 0;
  }

  private evolve(st: LineState) {
    const s = this.scene;
    st.level++;
    st.progress = 0;
    st.warned = false;
    s.stats.antiEvos++;
    s.stats.evoLevels[st.def.id] = st.level;
    s.stats.maxEvoLevel = Math.max(s.stats.maxEvoLevel, st.level);
    EvolutionEvents.evolved(st.def, st.level, EVO_LEVELS[st.level - 1]);
    s.fx.flash(160, (st.tint >> 16) & 255, (st.tint >> 8) & 255, st.tint & 255);
    // 群体学习：场上已有韭菜也会立即产生变异
    for (const l of s.enemies) if (l.active && !l.isBoss) this.mutate(l, st);
    if (st.level >= 2 && Math.random() < 0.6) this.spawnCore(st.def.id);
  }

  private mutate(l: Leek, st: LineState) {
    if (l.def.group === 'unit' && l.def.ai !== 'tower') return;
    const bit = LINE_BIT[st.def.id];
    if ((l.mutMask & bit) !== 0) return;
    if (Math.random() >= EVO_LEVELS[st.level - 1].mutChance) return;
    l.mutMask |= bit;
    l.mutLine = st.def.id;
    l.setBaseTint(st.tint);
    const hpBonus = EVO_LEVELS[st.level - 1].hp;
    if (hpBonus > 0) {
      const r = l.hp / l.maxHp;
      l.maxHp *= 1 + hpBonus;
      l.hp = l.maxHp * r;
    }
    // Lv3 变异：外观上多一个标识，行为改变在各个判定函数里
    if (st.level >= 3) l.showBadge(st.tint);
  }

  applyToSpawn(l: Leek) {
    if (l.isBoss) return;
    for (const st of this.lines.values()) if (st.level > 0) this.mutate(l, st);
  }

  /** 冰霜路线：削弱减速和冻结 */
  ctrlFactor(l: Leek) {
    const lv = this.level('frost');
    if (lv === 0) return 1;
    const mut = (l.mutMask & LINE_BIT.frost) !== 0;
    if (mut && lv >= 3) return 0;
    return mut ? 1 - 0.25 * lv : 1 - 0.1 * lv;
  }
  /** 黑洞路线：削弱引力，Lv3 起挣脱 */
  pullFactor(l: Leek) {
    const lv = this.level('void');
    if (lv === 0) return 1;
    return (l.mutMask & LINE_BIT.void) !== 0 ? Math.max(0.2, 1 - 0.25 * lv) : 1 - 0.08 * lv;
  }
  burnImmune(l: Leek) {
    return this.level('fire') >= 3 && (l.mutMask & LINE_BIT.fire) !== 0;
  }
  knockImmune(l: Leek) {
    return this.level('melee') >= 3 && (l.mutMask & LINE_BIT.melee) !== 0;
  }
  thorns(l: Leek) {
    return this.level('melee') >= 3 && (l.mutMask & LINE_BIT.melee) !== 0;
  }
  /** 预判路线：变异个体提前量随等级增加 */
  predictLead(l: Leek) {
    const lv = this.level('moving');
    if (lv === 0 || (l.mutMask & LINE_BIT.moving) === 0) return 0;
    return 0.22 * lv;
  }
  bomberRadius() {
    return this.level('camping') >= 3 ? 110 : 72;
  }

  /** Lv4 觉醒：返回一条已觉醒的路线 */
  awakenedLine(): EvoLineId | null {
    const list = [...this.lines.values()].filter((st) => st.level >= MAX_LEVEL);
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)].def.id;
  }
  applyAwaken(l: Leek, line: EvoLineId) {
    const st = this.lines.get(line)!;
    if ((DTYPES as string[]).includes(line)) l.immune = line;
    l.mutMask |= LINE_BIT[line];
    l.mutLine = line;
    l.setBaseTint(st.tint);
    l.showBadge(st.tint);
  }

  /** 科学家韭菜被杀：降低研究中路线的进度 */
  onScientistKilled() {
    const s = this.scene;
    s.stats.scientistKills = (s.stats.scientistKills ?? 0) + 1;
    let best: LineState | null = null;
    for (const st of this.lines.values()) if (st.progress > 0 && (!best || st.progress > best.progress)) best = st;
    if (best) {
      best.progress = Math.max(0, best.progress - 18);
      if (best.progress < 45) best.warned = false;
      if (s.stats.scientistKills % 5 === 1) EvolutionEvents.scientist();
    }
  }

  private topLine(): LineState {
    let best: LineState | null = null;
    let bestV = -1;
    for (const st of this.lines.values()) {
      const v = this.shareOf(st.def.id) + st.level * 0.02;
      if (v > bestV && st.level < MAX_LEVEL) {
        bestV = v;
        best = st;
      }
    }
    return best ?? [...this.lines.values()][0];
  }

  spawnTechCenter() {
    const s = this.scene;
    const st = this.topLine();
    const p = s.player;
    const a = Math.random() * Math.PI * 2;
    const r = 520 + Math.random() * 160;
    const l = s.spawner.spawnAt('unit_tech', p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1, 1);
    if (!l) return;
    l.evoLine = st.def.id;
    l.setBaseTint(st.tint);
    st.techBoost++;
    EvolutionEvents.techBuilt(st.def);
  }
  onTechDestroyed(l: Leek) {
    const s = this.scene;
    s.stats.techDestroyed++;
    const st = l.evoLine ? this.lines.get(l.evoLine) : null;
    s.fx.boom(l.x, l.y, 3);
    s.fx.shake(0.012, 300);
    if (st) {
      st.techBoost = Math.max(0, st.techBoost - 1);
      st.blockedT = 120;
      st.progress = Math.max(0, st.progress - 40);
      EvolutionEvents.techDown(st.def);
    }
  }

  spawnCore(line?: EvoLineId) {
    const s = this.scene;
    const st = line ? this.lines.get(line)! : this.topLine();
    const p = s.player;
    const a = Math.random() * Math.PI * 2;
    const r = 420 + Math.random() * 120;
    const l = s.spawner.spawnAt('unit_core', p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
    if (!l) return;
    l.evoLine = st.def.id;
    l.setBaseTint(st.tint);
    EvolutionEvents.coreUp(st.def);
  }
  onCoreDestroyed(l: Leek) {
    const s = this.scene;
    s.stats.coresDestroyed++;
    const st = l.evoLine ? this.lines.get(l.evoLine) : null;
    s.fx.boom(l.x, l.y, 2.2);
    if (st && st.level > 0) {
      st.level--;
      st.progress = 0;
      st.warned = false;
      s.stats.evoLevels[st.def.id] = st.level;
      EvolutionEvents.coreDown(st.def);
    }
  }

  /** 特殊道具 / 技能：所有路线下降 */
  resetAll(n: number, msg: string) {
    const s = this.scene;
    for (const st of this.lines.values()) {
      st.level = Math.max(0, st.level - n);
      st.progress = 0;
      st.warned = false;
      s.stats.evoLevels[st.def.id] = st.level;
    }
    s.fx.flash(200, 190, 130, 255);
    s.fx.text(s.player.x, s.player.y - 34, '韭菜抗性已重置', '#d6b3ff', 18);
    GameManager.emit('banner', { text: msg, kind: 'result' });
  }

  /** 科技突破事件：选一条路线直接升一级 */
  breakthrough() {
    const st = this.topLine();
    if (st.level < MAX_LEVEL) this.evolve(st);
  }

  hud(): HudEvo[] {
    const out: HudEvo[] = [];
    for (const st of this.lines.values()) {
      if (st.level === 0 && st.progress <= 0) continue;
      out.push({
        id: st.def.id, name: st.def.name, level: st.level, progress: Math.min(100, st.progress),
        color: `#${st.tint.toString(16).padStart(6, '0')}`, blocked: st.blockedT > 0,
      });
    }
    return out;
  }
}
