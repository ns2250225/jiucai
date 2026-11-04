import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ACHIEVEMENTS } from '../data/achievements';
import type { RunStats } from '../game/types';
import { usePlayerStore } from './playerStore';
import { useGameStore } from './gameStore';
import { AudioService } from '../services/AudioService';

export const useAchievementStore = defineStore('achievement', () => {
  /** 本局内解锁的成就名，结算页展示 */
  const thisRun = ref<string[]>([]);

  function beginRun() {
    thisRun.value = [];
  }

  function evaluate(run: RunStats | null) {
    const player = usePlayerStore();
    const game = useGameStore();
    const s = player.save;
    let changed = false;
    for (const a of ACHIEVEMENTS) {
      if (s.achievements[a.id]) continue;
      let ok = false;
      try {
        ok = a.test(s, run);
      } catch {
        ok = false;
      }
      if (!ok) continue;
      s.achievements[a.id] = Date.now();
      s.gold += a.reward;
      changed = true;
      if (run) thisRun.value.push(a.name);
      game.pushToast({ kind: 'ach', title: `成就解锁：${a.name}`, sub: `${a.desc} · 奖励 ${a.reward} 金币` });
      AudioService.play('achievement', 0.3);
    }
    if (changed) player.persist();
  }

  return { thisRun, beginRun, evaluate };
});
