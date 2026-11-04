import Phaser from 'phaser';
import { createGameConfig } from './GameConfig';
import type { HudState, RunStats, StartConfig, UpgradeCard } from './types';
import type { SaveData } from '../services/SaveService';

export type BannerKind = 'quip' | 'event' | 'result' | 'warn' | 'evo' | 'boss' | 'info' | 'ult' | 'chest';
export interface GameEvents {
  hud: HudState;
  banner: { text: string; kind: BannerKind; sub?: string };
  upgrade: { cards: UpgradeCard[]; quip: string; pending: number };
  upgradeDone: void;
  pauseChanged: boolean;
  runEnd: RunStats;
  runTick: RunStats;
  leekSeen: string;
  weaponSeen: string;
  comboFound: string;
  fragment: number;
  sceneReady: string;
}
type Handler<T> = (payload: T) => void;

/** Vue 与 Phaser 之间的唯一桥梁：UI 只发指令、收事件，不直接操作游戏对象 */
class GameManagerImpl {
  game: Phaser.Game | null = null;
  profile: SaveData | null = null;
  config: StartConfig | null = null;
  isTouch = false;
  private handlers = new Map<string, Set<Handler<never>>>();

  on<K extends keyof GameEvents>(ev: K, fn: Handler<GameEvents[K]>) {
    let set = this.handlers.get(ev);
    if (!set) this.handlers.set(ev, (set = new Set()));
    set.add(fn as Handler<never>);
    return () => set!.delete(fn as Handler<never>);
  }
  emit<K extends keyof GameEvents>(ev: K, payload: GameEvents[K]) {
    this.handlers.get(ev)?.forEach((fn) => (fn as Handler<GameEvents[K]>)(payload));
  }

  init(parent: HTMLElement, profile: SaveData) {
    this.profile = profile;
    if (this.game) return;
    this.game = new Phaser.Game(createGameConfig(parent));
  }

  private get battle(): BattleControl | null {
    const sc = this.game?.scene.getScene('BattleScene') as unknown as BattleControl | null;
    return sc && this.game!.scene.isActive('BattleScene') ? sc : null;
  }
  private get battlePaused(): BattleControl | null {
    const sc = this.game?.scene.getScene('BattleScene') as unknown as BattleControl | null;
    return sc && (this.game!.scene.isActive('BattleScene') || this.game!.scene.isPaused('BattleScene')) ? sc : null;
  }

  startBattle(cfg: StartConfig) {
    this.config = cfg;
    const g = this.game;
    if (!g) return;
    for (const key of ['MenuScene', 'ResultScene', 'BattleScene']) {
      if (g.scene.isActive(key) || g.scene.isPaused(key)) g.scene.stop(key);
    }
    g.scene.start('BattleScene', cfg);
  }
  toMenu() {
    const g = this.game;
    if (!g) return;
    for (const key of ['ResultScene', 'BattleScene']) {
      if (g.scene.isActive(key) || g.scene.isPaused(key)) g.scene.stop(key);
    }
    if (!g.scene.isActive('MenuScene')) g.scene.start('MenuScene');
  }
  setPaused(paused: boolean) {
    this.battlePaused?.setUserPaused(paused);
  }
  chooseUpgrade(card: UpgradeCard) {
    this.battlePaused?.chooseUpgrade(card);
  }
  castUltimate() {
    this.battle?.castUltimate();
  }
  /** 放弃本局：照常结算已获得的收益 */
  surrender() {
    this.battlePaused?.surrender();
  }
  settingsChanged() {
    this.battlePaused?.onSettingsChanged();
  }
}

export interface BattleControl {
  setUserPaused(p: boolean): void;
  chooseUpgrade(c: UpgradeCard): void;
  castUltimate(): void;
  surrender(): void;
  onSettingsChanged(): void;
}

export const GameManager = new GameManagerImpl();
