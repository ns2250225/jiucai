import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import { GameManager } from '../game/GameManager';
import type { BannerKind } from '../game/GameManager';
import type { HudState, RunStats, StartConfig, UpgradeCard } from '../game/types';
import { usePlayerStore } from './playerStore';
import { useAchievementStore } from './achievementStore';
import { AudioService } from '../services/AudioService';
import { ENEMY_MAP, BOSS_MAP } from '../game/data';

export type Screen = 'menu' | 'select' | 'battle' | 'result' | 'weaponBook' | 'leekBook' | 'shop' | 'achievements' | 'settings';
export interface Toast {
  id: number;
  kind: BannerKind | 'ach' | 'codex';
  title: string;
  sub?: string;
  icon?: string;
}
export interface BigBanner {
  id: number;
  kind: BannerKind;
  title: string;
  sub?: string;
}
const BIG_KINDS: BannerKind[] = ['event', 'boss', 'evo', 'ult', 'warn'];
const BIG_DURATION: Partial<Record<BannerKind, number>> = { event: 2600, boss: 2800, evo: 2800, ult: 1300, warn: 2300 };

export const useGameStore = defineStore('game', () => {
  const screen = ref<Screen>('menu');
  const hud = shallowRef<HudState | null>(null);
  const paused = ref(false);
  const upgrade = shallowRef<{ cards: UpgradeCard[]; quip: string; pending: number } | null>(null);
  const result = shallowRef<RunStats | null>(null);
  const toasts = ref<Toast[]>([]);
  const big = ref<BigBanner | null>(null);
  const portrait = ref(false);
  const isTouch = ref(false);
  const lastConfig = ref<StartConfig | null>(null);
  let toastId = 1;
  let bigTimer = 0;
  let bigQueue: BigBanner[] = [];

  function pushToast(t: Omit<Toast, 'id'>) {
    const item: Toast = { id: toastId++, ...t };
    toasts.value.push(item);
    if (toasts.value.length > 4) toasts.value.shift();
    window.setTimeout(() => {
      toasts.value = toasts.value.filter((x) => x.id !== item.id);
    }, t.kind === 'quip' ? 2600 : 3800);
  }

  function showBig(b: BigBanner) {
    big.value = b;
    window.clearTimeout(bigTimer);
    bigTimer = window.setTimeout(() => {
      big.value = null;
      const next = bigQueue.shift();
      if (next) showBig(next);
    }, BIG_DURATION[b.kind] ?? 2000);
  }

  function bind() {
    const player = usePlayerStore();
    const ach = useAchievementStore();
    GameManager.on('hud', (h) => {
      hud.value = h;
    });
    GameManager.on('banner', ({ text, kind, sub }) => {
      if (BIG_KINDS.includes(kind)) {
        const b: BigBanner = { id: toastId++, kind, title: text, sub };
        // 大招公告立刻显示；其余的排队，不互相遮挡
        if (kind === 'ult' || !big.value) showBig(b);
        else if (bigQueue.length < 3) bigQueue.push(b);
      } else {
        pushToast({ kind, title: text, sub });
      }
    });
    GameManager.on('upgrade', (u) => {
      upgrade.value = u;
    });
    GameManager.on('upgradeDone', () => {
      upgrade.value = null;
    });
    GameManager.on('pauseChanged', (p) => {
      paused.value = p;
    });
    GameManager.on('leekSeen', (id) => {
      if (player.markLeekSeen(id)) {
        const name = ENEMY_MAP[id]?.name ?? BOSS_MAP[id]?.name ?? id;
        pushToast({ kind: 'codex', title: `新韭菜：${name}`, sub: '已收录进韭菜图鉴', icon: `${id}_0` });
        AudioService.play('codex', 0.3);
      }
    });
    GameManager.on('weaponSeen', (id) => player.markWeaponSeen(id));
    GameManager.on('comboFound', (id) => player.markCombo(id));
    GameManager.on('runTick', (r) => ach.evaluate(r));
    GameManager.on('runEnd', (r) => {
      player.commitRun(r);
      // 累计值已写入，标记后成就检查不会重复计算本局
      player.save.runCommitted = true;
      ach.evaluate(r);
      player.save.runCommitted = false;
      r.newAchievements = [...ach.thisRun];
      player.persist();
      result.value = r;
      upgrade.value = null;
      paused.value = false;
      big.value = null;
      bigQueue = [];
      screen.value = 'result';
    });
  }

  function startRun(cfg: StartConfig) {
    const ach = useAchievementStore();
    ach.beginRun();
    lastConfig.value = cfg;
    hud.value = null;
    upgrade.value = null;
    paused.value = false;
    result.value = null;
    big.value = null;
    bigQueue = [];
    toasts.value = [];
    screen.value = 'battle';
    AudioService.unlock();
    tryLockLandscape();
    GameManager.startBattle(cfg);
  }

  function tryLockLandscape() {
    const so = window.screen.orientation as unknown as { lock?: (m: string) => Promise<void> } | undefined;
    so?.lock?.('landscape').catch(() => undefined);
  }

  function toMenu() {
    screen.value = 'menu';
    result.value = null;
    AudioService.playBgm('menu');
    GameManager.toMenu();
  }

  function togglePause() {
    if (screen.value !== 'battle' || upgrade.value) return;
    GameManager.setPaused(!paused.value);
  }

  return { screen, hud, paused, upgrade, result, toasts, big, portrait, isTouch, lastConfig, pushToast, bind, startRun, toMenu, togglePause };
});
