import Phaser from 'phaser';
import type { BattleScene } from '../scenes/BattleScene';
import { Leek } from '../entities/Leek';
import { EliteLeek } from '../entities/EliteLeek';
import { ENEMIES, ENEMY_MAP } from '../data';
import { ObjectPool } from './ObjectPool';

export const PHASES = [
  { until: 120, name: '初级收割', mul: 1 },
  { until: 240, name: '财富积累', mul: 1.5 },
  { until: 360, name: '韭菜反抗', mul: 1.9 },
  { until: 480, name: '市场动荡', mul: 2.3 },
  { until: 600, name: '全面战争', mul: 2.7 },
  { until: Infinity, name: '终极收割', mul: 3.1 },
];
const ELITE_ORDER = ['elite_guard', 'elite_manager', 'elite_prof', 'elite_engineer', 'elite_commander', 'elite_prophet'];
const ALL_KINDS = ENEMIES.filter((e) => (e.group === 'normal' || e.group === 'special') && e.ai !== 'bomber' && e.ai !== 'predict').map((e) => e.id);

export class EnemySpawner {
  maxEnemies: number;
  private acc = 0;
  private leekPool: ObjectPool<Leek>;
  private elitePool: ObjectPool<EliteLeek>;
  private waveT = 60;
  private eliteT: number;
  private towerT: number;
  private techT: number;
  private evoUnitT = 4;
  private awakenT = 30;

  constructor(private scene: BattleScene) {
    this.maxEnemies = scene.isMobile ? 170 : 300;
    this.leekPool = new ObjectPool(() => new Leek(scene));
    this.elitePool = new ObjectPool(() => new EliteLeek(scene));
    const m = scene.map;
    this.eliteT = Math.min(120, m.eliteEvery + 45);
    this.towerT = m.towerEvery ?? Infinity;
    this.techT = m.evoStart + (m.techEvery ?? 90);
  }

  get phase() {
    const t = this.scene.simTime;
    return PHASES.find((p) => t < p.until) ?? PHASES[PHASES.length - 1];
  }

  private hpScale() {
    const m = this.scene.simTime / 60;
    return (1 + m * 0.12) * this.scene.map.difficulty;
  }
  private dmgScale() {
    const m = this.scene.simTime / 60;
    return (1 + m * 0.08) * (1 + (this.scene.map.difficulty - 1) * 0.55);
  }

  register(l: Leek) {
    this.scene.enemies.push(l);
  }

  release(l: Leek) {
    if (l.isBoss) return;
    if (l.isElite) this.elitePool.release(l as EliteLeek);
    else this.leekPool.release(l);
  }

  /** 视野边缘外的随机点；被地图边界截断时换一条边 */
  edgePoint(margin = 60) {
    const s = this.scene;
    const v = s.cameras.main.worldView;
    const w = s.worldSize;
    for (let tries = 0; tries < 6; tries++) {
      const side = Math.floor(Math.random() * 4);
      let x: number;
      let y: number;
      if (side === 0) {
        x = v.x - margin;
        y = v.y + Math.random() * v.height;
      } else if (side === 1) {
        x = v.right + margin;
        y = v.y + Math.random() * v.height;
      } else if (side === 2) {
        x = v.x + Math.random() * v.width;
        y = v.y - margin;
      } else {
        x = v.x + Math.random() * v.width;
        y = v.bottom + margin;
      }
      if (x > 10 && y > 10 && x < w - 10 && y < w - 10) return { x, y };
    }
    return { x: Phaser.Math.Clamp(s.player.x + 500, 20, w - 20), y: Phaser.Math.Clamp(s.player.y + 300, 20, w - 20) };
  }

  /** 基础生成：按配置选对象池，应用时间强度和当前的反进化状态 */
  spawnAt(id: string, x: number, y: number, hpMul = 1, dmgMul = 1): Leek | null {
    const s = this.scene;
    const def = ENEMY_MAP[id];
    if (!def) return null;
    const hardCap = this.maxEnemies + 80;
    if (s.enemies.length >= hardCap) return null;
    const elite = def.group === 'elite';
    const l: Leek = elite ? this.elitePool.get() : this.leekPool.get();
    x = Phaser.Math.Clamp(x, 10, s.worldSize - 10);
    y = Phaser.Math.Clamp(y, 10, s.worldSize - 10);
    l.spawn(def, x, y, this.hpScale() * hpMul, this.dmgScale() * dmgMul);
    s.evolution.applyToSpawn(l);
    this.register(l);
    return l;
  }
  spawnNear(id: string, x: number, y: number, r: number, hpMul = 1, dmgMul = 1) {
    const a = Math.random() * Math.PI * 2;
    return this.spawnAt(id, x + Math.cos(a) * r, y + Math.sin(a) * r, hpMul, dmgMul);
  }
  spawnEdge(id: string, hpMul = 1, dmgMul = 1) {
    const p = this.edgePoint();
    return this.spawnAt(id, p.x, p.y, hpMul, dmgMul);
  }

  /** 按配置成群入场（新手韭菜、抱团韭菜） */
  private spawnPack(id: string) {
    const def = ENEMY_MAP[id];
    const n = def.pack ?? 1;
    const p = this.edgePoint();
    if (n <= 1) {
      this.spawnAt(id, p.x, p.y);
      return;
    }
    let leader: Leek | null = null;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = i === 0 ? 0 : 22 + Math.random() * 24;
      const l = this.spawnAt(id, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
      if (!l) break;
      if (def.ai === 'cluster') {
        if (!leader) leader = l;
        else {
          l.leader = leader;
          l.offX = Math.cos(a) * r;
          l.offY = Math.sin(a) * r;
        }
      }
    }
  }

  private pickFromPool(): string {
    const s = this.scene;
    const t = s.simTime;
    if (s.map.flags.allKinds && Math.random() < 0.3) return Phaser.Math.RND.pick(ALL_KINDS);
    const ph = s.map.phases.find((p) => t < p.until) ?? s.map.phases[s.map.phases.length - 1];
    const entries = Object.entries(ph.pool);
    let sum = 0;
    for (const [, w] of entries) sum += w;
    let r = Math.random() * sum;
    for (const [id, w] of entries) {
      r -= w;
      if (r <= 0) return id;
    }
    return entries[0][0];
  }

  /** 固定波次：一圈敌人从四面八方包围 */
  ringWave(id: string, n: number) {
    const s = this.scene;
    const v = s.cameras.main.worldView;
    const r = Math.max(v.width, v.height) * 0.58 + 40;
    const p = s.player;
    const off = Math.random() * 6.28;
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * Math.PI * 2;
      this.spawnAt(id, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
    }
  }

  spawnElite() {
    const s = this.scene;
    const t = s.simTime;
    const unlocked = Math.min(ELITE_ORDER.length, 1 + Math.floor(t / 90));
    let id = ELITE_ORDER[Math.floor(Math.random() * unlocked)];
    if (s.map.flags.organized && Math.random() < 0.4) id = Math.random() < 0.5 ? 'elite_commander' : 'elite_engineer';
    return this.spawnEdge(id);
  }

  update(dt: number) {
    const s = this.scene;
    const t = s.simTime;
    const m = t / 60;
    const count = s.enemies.length;
    const rate = s.map.spawnRate * (1 + m * 0.15) * this.phase.mul * s.mods.spawn;
    this.acc += rate * dt;
    while (this.acc >= 1) {
      this.acc -= 1;
      if (count + this.acc < this.maxEnemies) this.spawnPack(this.pickFromPool());
    }

    this.waveT -= dt;
    if (this.waveT <= 0) {
      this.waveT = 45;
      const n = Math.min(70, Math.floor(14 + m * 6));
      this.ringWave(this.pickFromPool(), n);
    }

    this.eliteT -= dt;
    if (this.eliteT <= 0) {
      this.eliteT = s.map.eliteEvery * (t > 480 ? 0.7 : 1);
      this.spawnElite();
      if (t > 480) this.spawnElite();
    }

    this.towerT -= dt;
    if (this.towerT <= 0) {
      this.towerT = s.map.towerEvery ?? Infinity;
      this.spawnEdge('unit_tower');
    }

    this.techT -= dt;
    if (this.techT <= 0) {
      this.techT = s.map.techEvery ?? 170;
      s.evolution.spawnTechCenter();
    }

    // 反进化特殊单位：针对玩家走位习惯的韭菜
    this.evoUnitT -= dt;
    if (this.evoUnitT <= 0) {
      this.evoUnitT = 4;
      const lvM = s.evolution.level('moving');
      const lvC = s.evolution.level('camping');
      for (let i = 0; i < lvM; i++) this.spawnPredictor();
      for (let i = 0; i < lvC; i++) this.spawnEdge('leek_bomber');
    }

    this.awakenT -= dt;
    if (this.awakenT <= 0) {
      this.awakenT = 40;
      const line = s.evolution.awakenedLine();
      if (line) {
        const l = this.spawnEdge('elite_awaken');
        if (l) s.evolution.applyAwaken(l, line);
      }
    }
  }

  /** 预判韭菜：Lv3 起直接从玩家前进方向包抄 */
  private spawnPredictor() {
    const s = this.scene;
    const p = s.player;
    const lv = s.evolution.level('moving');
    if (lv >= 3 && (p.vx !== 0 || p.vy !== 0)) {
      const v = s.cameras.main.worldView;
      const d = Math.hypot(p.vx, p.vy) || 1;
      const r = Math.max(v.width, v.height) * 0.6;
      const side = (Math.random() - 0.5) * 300;
      const x = p.x + (p.vx / d) * r - (p.vy / d) * side;
      const y = p.y + (p.vy / d) * r + (p.vx / d) * side;
      this.spawnAt('leek_predict', x, y);
    } else {
      this.spawnEdge('leek_predict');
    }
  }

  /** 根据帧率动态收紧实体上限 */
  adapt(fps: number) {
    const base = this.scene.isMobile ? 170 : 300;
    if (fps < 38) this.maxEnemies = Math.max(90, this.maxEnemies - 20);
    else if (fps > 52) this.maxEnemies = Math.min(base, this.maxEnemies + 10);
  }
}
