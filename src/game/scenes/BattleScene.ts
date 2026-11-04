import Phaser from 'phaser';
import { GameManager } from '../GameManager';
import type { BattleControl } from '../GameManager';
import { zoomFor } from '../GameConfig';
import { MAP_MAP, PASSIVE_MAP } from '../data';
import { CHAR_MAP } from '../../data/characters';
import { QUIPS, computeRating, computeTitles } from '../../data/progression';
import { AudioService } from '../../services/AudioService';
import type { SaveData } from '../../services/SaveService';
import { PROPS } from '../art/itemArt';
import type { HudState, MapDef, PlayerStats, RunStats, StartConfig, UpgradeCard } from '../types';
import { WORLD_SIZE } from '../types';
import { Player } from '../entities/Player';
import { Leek } from '../entities/Leek';
import { ProjectileSystem } from '../entities/Projectile';
import { SpatialHash } from '../systems/ObjectPool';
import { FxSystem } from '../systems/FxSystem';
import { DamageSystem } from '../systems/DamageSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { DropSystem } from '../systems/DropSystem';
import { ExperienceSystem } from '../systems/ExperienceSystem';
import { EventSystem } from '../systems/EventSystem';
import type { Mods } from '../systems/EventSystem';
import { BossSystem } from '../systems/BossSystem';
import { EnemySpawner } from '../systems/EnemySpawner';
import { BehaviorMonitor } from '../evolution/BehaviorMonitor';
import { LeekEvolution } from '../evolution/LeekEvolution';
import { ResistanceSystem } from '../evolution/ResistanceSystem';
import { WeaponManager } from '../weapons/WeaponManager';
import { SkillManager } from '../skills/SkillManager';
import { PassiveManager } from '../skills/PassiveManager';
import { UltimateManager } from '../skills/UltimateManager';
import { seeded } from '../art/Pen';

const defaultMods = (): Mods => ({ spawn: 1, drop: 1, flee: 0, aggro: 1, playerDmg: 1, enemyDmg: 1, gold: 1 });

export class BattleScene extends Phaser.Scene implements BattleControl {
  worldSize = WORLD_SIZE;
  config!: StartConfig;
  map!: MapDef;
  profile!: SaveData;
  isMobile = false;
  simTime = 0;
  mods: Mods = defaultMods();
  stats!: RunStats;
  pstats!: PlayerStats;
  enemies: Leek[] = [];
  aimTarget: Leek | null = null;

  player!: Player;
  spatial!: SpatialHash<Leek>;
  fx!: FxSystem;
  damage!: DamageSystem;
  combat!: CombatSystem;
  drops!: DropSystem;
  exp!: ExperienceSystem;
  bossSys!: BossSystem;
  spawner!: EnemySpawner;
  monitor!: BehaviorMonitor;
  evolution!: LeekEvolution;
  resist!: ResistanceSystem;
  weapons!: WeaponManager;
  skills!: SkillManager;
  passives!: PassiveManager;
  ult!: UltimateManager;
  projectiles!: ProjectileSystem;
  eventSys!: EventSystem;

  private hudT = 0;
  private tickT = 0;
  private adaptT = 0;
  private frameNo = 0;
  private ended = false;
  private userPaused = false;
  private inUpgrade = false;
  private resizeFn: (() => void) | null = null;

  constructor() {
    super('BattleScene');
  }

  get settings() {
    return this.profile.settings;
  }
  get atkMul() {
    return this.pstats.atkSpeed * (this.player.rageT > 0 ? 1.5 : 1);
  }
  resetMods() {
    this.mods = defaultMods();
  }

  create(cfg: StartConfig) {
    this.config = cfg;
    this.map = MAP_MAP[cfg.mapId] ?? MAP_MAP.map1;
    this.profile = GameManager.profile!;
    this.isMobile = GameManager.isTouch;
    this.simTime = 0;
    this.mods = defaultMods();
    this.enemies = [];
    this.aimTarget = null;
    this.ended = false;
    this.userPaused = false;
    this.inUpgrade = false;
    this.hudT = this.tickT = this.adaptT = this.frameNo = 0;

    this.stats = {
      mapId: this.map.id, charId: cfg.charId, endless: cfg.endless, won: false, time: 0, level: 1, kills: 0, gold: 0,
      goldenKills: 0, eliteKills: 0, bossKills: 0, maxCombo: 0, maxBurst: 0, weaponEvos: 0, antiEvos: 0, techDestroyed: 0,
      coresDestroyed: 0, scientistKills: 0, events: 0, uprisings: 0, chests: 0, ultCasts: 0, maxUltKills: 0, lightningKills: 0,
      voidEaten: 0, frozen: 0, damageTaken: 0, revivesUsed: 0, chairmanDead: false, byType: {}, byWeapon: {}, kindKills: {},
      weaponsUsed: [], passivesUsed: [], combos: [], evoLevels: {}, maxEvoLevel: 0, fragments: 0,
    };

    this.buildWorld();

    const char = CHAR_MAP[cfg.charId] ?? CHAR_MAP.reaper;
    this.skills = new SkillManager(this);
    this.passives = new PassiveManager(this, char);
    this.passives.recalc();

    const skinKey = cfg.skin && cfg.skin !== 'default' ? cfg.skin : char.id;
    this.player = new Player(this, this.worldSize / 2, this.worldSize / 2, skinKey);
    this.fx = new FxSystem(this);
    this.fx.low = this.settings.fxLevel === 'low' || this.isMobile;
    this.fx.showNumbers = this.settings.showDamage;
    this.fx.shakeOn = this.settings.shake;
    this.spatial = new SpatialHash<Leek>(this.worldSize, 64);
    this.damage = new DamageSystem(this);
    this.combat = new CombatSystem(this);
    for (const o of this.pendingObstacles) this.combat.addObstacle(o);
    this.drops = new DropSystem(this);
    this.exp = new ExperienceSystem(this);
    this.eventSys = new EventSystem(this);
    this.spawner = new EnemySpawner(this);
    this.bossSys = new BossSystem(this);
    this.monitor = new BehaviorMonitor(this);
    this.resist = new ResistanceSystem(this);
    this.evolution = new LeekEvolution(this);
    this.projectiles = new ProjectileSystem(this);
    if (this.isMobile) {
      this.projectiles.maxPlayer = 110;
      this.projectiles.maxEnemy = 70;
    }
    this.weapons = new WeaponManager(this);
    this.ult = new UltimateManager(this, cfg.ultId);

    if (char.skill === 'reap') this.skills.reapLevel = 1;
    this.weapons.add(cfg.weaponId);
    this.passives.recalc();
    this.player.hp = this.pstats.maxHp;

    const cam = this.cameras.main;
    const applyZoom = () => cam.setZoom(zoomFor(this.scale.width, this.scale.height));
    applyZoom();
    cam.setBounds(0, 0, this.worldSize, this.worldSize);
    cam.startFollow(this.player.sprite, true, 0.14, 0.14);
    cam.setBackgroundColor(0x000000);
    this.resizeFn = applyZoom;
    this.scale.on('resize', applyZoom);
    this.events.once('shutdown', () => this.cleanup());

    AudioService.playBgm(this.map.id);
    this.pushHud();
    GameManager.emit('banner', { text: this.map.name, kind: 'event', sub: this.map.mechanic });
  }

  private pendingObstacles: { x: number; y: number; r: number }[] = [];

  private buildWorld() {
    const m = this.map;
    const idx = Number(m.id.slice(3)) - 1;
    this.add.tileSprite(0, 0, this.worldSize, this.worldSize, `tile_${idx}`).setOrigin(0).setDepth(-100000);
    // 世界边界
    const border = this.add.graphics().setDepth(-90000);
    border.lineStyle(14, 0x000000, 0.65);
    border.strokeRect(4, 4, this.worldSize - 8, this.worldSize - 8);
    border.lineStyle(4, 0xffd23e, 0.5);
    border.strokeRect(12, 12, this.worldSize - 24, this.worldSize - 24);

    // 物件按地图配置摆放，中心留空
    this.pendingObstacles = [];
    const rnd = seeded(idx * 91 + Math.floor(Math.random() * 1000));
    const c = this.worldSize / 2;
    for (const [name, count] of m.props) {
      const art = PROPS[name];
      if (!art) continue;
      for (let i = 0; i < count; i++) {
        const x = 40 + rnd() * (this.worldSize - 80);
        const y = 40 + rnd() * (this.worldSize - 80);
        if (art.solid && Math.hypot(x - c, y - c) < 240) continue;
        const scale = 1.5;
        const img = this.add.image(x, y, 'atlas', `prop_${name}`).setScale(scale).setOrigin(0.5, 0.8);
        if (art.ground) {
          img.setDepth(-80000);
        } else {
          img.setDepth(y);
        }
        if (art.solid) this.pendingObstacles.push({ x, y, r: art.solid * scale * 0.7 });
      }
    }
    // 地图氛围：熊市更暗，巅峰带暗色天幕
    const tints: Record<string, [number, number]> = { map3: [0x200008, 0.28], map4: [0x001a20, 0.12], map6: [0x201000, 0.14], map7: [0x05030f, 0.32] };
    const t = tints[m.id];
    if (t) {
      this.add.rectangle(this.scale.width / 2, this.scale.height / 2, 8000, 8000, t[0], t[1]).setScrollFactor(0).setDepth(540000);
    }
  }

  private cleanup() {
    if (this.resizeFn) this.scale.off('resize', this.resizeFn);
    this.resizeFn = null;
    this.weapons?.destroy();
  }

  // ---- BattleControl ----
  setUserPaused(p: boolean) {
    if (this.ended || this.inUpgrade || this.userPaused === p) return;
    this.userPaused = p;
    if (p) this.scene.pause();
    else this.scene.resume();
    GameManager.emit('pauseChanged', p);
  }

  private openUpgrade() {
    this.inUpgrade = true;
    AudioService.play('levelup');
    this.scene.pause();
    this.emitCards();
  }
  private emitCards() {
    GameManager.emit('upgrade', { cards: this.skills.roll(), quip: Phaser.Math.RND.pick(QUIPS.level), pending: this.exp.pending });
  }
  chooseUpgrade(card: UpgradeCard) {
    if (!this.inUpgrade) return;
    this.skills.apply(card);
    this.exp.pending = Math.max(0, this.exp.pending - 1);
    if (this.exp.pending > 0) {
      this.emitCards();
      return;
    }
    this.inUpgrade = false;
    GameManager.emit('upgradeDone', undefined);
    this.pushHud();
    this.scene.resume();
  }
  castUltimate() {
    this.ult?.cast();
  }
  surrender() {
    if (this.ended) return;
    this.finish(false);
  }
  onSettingsChanged() {
    const st = this.settings;
    this.fx.low = st.fxLevel === 'low' || this.isMobile;
    this.fx.showNumbers = st.showDamage;
    this.fx.shakeOn = st.shake;
  }

  // ---- 结束流程 ----
  onPlayerDead() {
    if (this.ended) return;
    this.ended = true;
    this.fx.darken(0.5, 1.5);
    GameManager.emit('banner', { text: Phaser.Math.RND.pick(QUIPS.death), kind: 'boss' });
    this.time.delayedCall(1700, () => this.finish(this.stats.won));
  }
  victory() {
    if (this.ended) return;
    this.ended = true;
    this.stats.won = true;
    GameManager.emit('banner', { text: '收割完成', kind: 'event', sub: Phaser.Math.RND.pick(QUIPS.win) });
    this.time.delayedCall(1800, () => this.finish(true));
  }

  private finish(won: boolean) {
    this.ended = true;
    const st = this.stats;
    st.won = won || st.won;
    st.time = this.simTime;
    st.level = this.exp.level;
    st.gold = Math.floor(st.gold);
    st.titles = computeTitles(st);
    st.title = st.titles[0];
    st.rating = computeRating(st);
    const idx = Number(this.map.id.slice(3)) - 1;
    const data = { won: st.won, mapIndex: idx };
    this.scene.start('ResultScene', data);
    AudioService.playBgm(st.won ? 'map5' : 'menu');
    GameManager.emit('runEnd', st);
  }

  private fpsTrack() {
    this.adaptT = 0;
    this.spawner.adapt(this.game.loop.actualFps);
  }

  // ---- 主循环 ----
  override update(_time: number, delta: number) {
    // 帧时间封顶：卡顿时宁可慢动作，也不让实体穿透
    const dt = Math.min(delta, 50) / 1000;
    this.frameNo++;
    const p = this.player;
    this.simTime += this.ended ? 0 : dt;
    this.stats.time = this.simTime;

    if (!this.ended) {
      p.update(dt);
      this.monitor.update(dt);
    }
    this.spatial.rebuild(this.enemies);
    this.aimTarget = this.spatial.nearest(p.x, p.y, 420);

    if (!this.ended) {
      this.spawner.update(dt);
      this.evolution.update(dt);
      this.eventSys.update(dt);
      this.bossSys.update(dt);
      this.ult.update(dt);
    }

    // 敌人更新：屏幕外远处的敌人隔帧计算；太远的直接拉回视野外围
    const list = this.enemies;
    const px = p.x;
    const py = p.y;
    for (let i = 0; i < list.length; i++) {
      const l = list[i];
      if (!l.active) continue;
      const dx = l.x - px;
      const dy = l.y - py;
      const d2 = dx * dx + dy * dy;
      if (d2 > 1500 * 1500 && !l.isBoss && l.speed > 0 && l.def.ai !== 'tide') {
        if (l.def.ai === 'gold') {
          l.update(dt);
        } else {
          const e = this.spawner.edgePoint();
          l.x = e.x;
          l.y = e.y;
        }
        continue;
      }
      if (d2 > 900 * 900 && !l.isBoss) {
        if ((l.uid + this.frameNo) % 3 === 0) l.update(dt * 3);
      } else {
        l.update(dt);
      }
    }
    this.spatial.rebuild(list);

    if (!this.ended) this.weapons.update(dt);
    this.projectiles.update(dt);
    this.drops.update(dt);
    if (!this.ended) this.combat.update(dt);
    this.fx.update(dt);

    // 回收死亡实体
    for (let i = list.length - 1; i >= 0; i--) {
      const l = list[i];
      if (!l.active) {
        this.spawner.release(l);
        list[i] = list[list.length - 1];
        list.pop();
      }
    }

    this.adaptT += dt;
    if (this.adaptT > 3) this.fpsTrack();

    this.hudT -= dt;
    if (this.hudT <= 0) {
      this.hudT = 0.12;
      this.pushHud();
    }
    this.tickT -= dt;
    if (this.tickT <= 0) {
      this.tickT = 2;
      if (!this.ended) GameManager.emit('runTick', this.stats);
    }

    if (!this.ended && this.exp.pending > 0 && !this.inUpgrade && !p.dead) this.openUpgrade();
  }

  private pushHud() {
    const p = this.player;
    const ev = this.eventSys;
    const boss = this.bossSys.active;
    const weapons = this.weapons.owned.map((w) => ({
      id: w.def.id, name: w.def.name, icon: `w_${w.def.id}`, level: w.level, max: 8, evolved: !!w.def.evolved,
      ready: this.weapons.evolution.ready().some((e) => e.base === w.def.id),
    }));
    const passives = [...this.passives.owned].map(([id, level]) => ({
      id, name: PASSIVE_MAP[id].name, icon: `i_${id}`, level, max: PASSIVE_MAP[id].max,
    }));
    const hud: HudState = {
      time: this.simTime,
      wave: Math.floor(this.simTime / 30) + 1,
      kills: this.stats.kills,
      gold: Math.floor(this.stats.gold),
      level: this.exp.level,
      xp: this.exp.xp,
      xpMax: this.exp.next,
      hp: Math.max(0, p.hp),
      hpMax: this.pstats.maxHp,
      ult: this.ult.energy,
      ultMax: this.ult.max,
      ultName: this.ult.name,
      ultReady: this.ult.ready,
      ultCd: Math.max(0, this.ult.cd),
      boss: boss && boss.active ? { name: boss.bossDef.name, hp: Math.max(0, boss.hp), max: boss.maxHp, phase: boss.phaseName } : null,
      weapons,
      passives,
      evo: this.evolution.hud(),
      market: ev.hasMarket ? ev.marketIndex : null,
      shield: p.shieldT,
      rage: p.rageT,
      combo: this.combat.streak,
      event: ev.active ? { name: ev.active.name, remain: ev.remain } : null,
      phase: this.spawner.phase.name,
      revives: p.revives,
      endless: this.config.endless,
    };
    GameManager.emit('hud', hud);
  }
}

