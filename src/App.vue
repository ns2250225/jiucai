<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useGameStore } from './stores/gameStore';
import { usePlayerStore } from './stores/playerStore';
import { useAchievementStore } from './stores/achievementStore';
import { GameManager } from './game/GameManager';
import { bindKeyboard, inputState } from './game/systems/InputSystem';
import { AudioService } from './services/AudioService';
import MainMenu from './components/MainMenu.vue';
import CharacterSelect from './components/CharacterSelect.vue';
import GameHUD from './components/GameHUD.vue';
import UpgradePanel from './components/UpgradePanel.vue';
import ResultPanel from './components/ResultPanel.vue';
import WeaponBook from './components/WeaponBook.vue';
import LeekBook from './components/LeekBook.vue';
import ShopPanel from './components/ShopPanel.vue';
import SettingsPanel from './components/SettingsPanel.vue';
import AchievementPanel from './components/AchievementPanel.vue';
import PausePanel from './components/PausePanel.vue';
import BannerLayer from './components/BannerLayer.vue';
import TouchPad from './components/TouchPad.vue';

const game = useGameStore();
const player = usePlayerStore();
const ach = useAchievementStore();
const root = ref<HTMLElement | null>(null);
let unbindKeys: (() => void) | null = null;
let portraitPaused = false;

function checkOrientation() {
  const p = game.isTouch && window.innerHeight > window.innerWidth;
  game.portrait = p;
  // 竖屏时暂停战斗，转回横屏后恢复
  if (game.screen === 'battle' && !game.upgrade) {
    if (p && !game.paused) {
      portraitPaused = true;
      GameManager.setPaused(true);
    } else if (!p && portraitPaused) {
      portraitPaused = false;
      GameManager.setPaused(false);
    }
  }
}

function onVisibility() {
  if (document.hidden && game.screen === 'battle' && !game.paused && !game.upgrade) GameManager.setPaused(true);
}
const unlockAudio = () => AudioService.unlock();

onMounted(() => {
  const touch = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  game.isTouch = touch;
  GameManager.isTouch = touch;
  game.bind();
  GameManager.init(root.value!, player.save);
  AudioService.playBgm('menu');
  unbindKeys = bindKeyboard({
    ult: () => {
      if (game.screen === 'battle' && !game.paused && !game.upgrade) GameManager.castUltimate();
    },
    pause: () => {
      if (game.screen === 'battle') game.togglePause();
      else if (game.screen !== 'menu' && game.screen !== 'result') game.screen = 'menu';
    },
  });
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);
  checkOrientation();
});
onBeforeUnmount(() => {
  unbindKeys?.();
  window.removeEventListener('resize', checkOrientation);
  window.removeEventListener('orientationchange', checkOrientation);
  document.removeEventListener('visibilitychange', onVisibility);
  window.removeEventListener('pointerdown', unlockAudio);
  window.removeEventListener('keydown', unlockAudio);
});
watch(
  () => game.screen,
  (s) => {
    if (s !== 'battle') inputState.clear();
    checkOrientation();
    // 商店购买等局外操作可能达成成就或解锁角色
    if (s === 'menu') {
      player.refreshUnlocks();
      ach.evaluate(null);
    }
  },
);
</script>

<template>
  <div ref="root" class="game-root"></div>
  <div class="ui-root" :class="{ touch: game.isTouch }">
    <template v-if="game.screen === 'battle'">
      <TouchPad v-if="game.isTouch" />
      <GameHUD />
      <UpgradePanel v-if="game.upgrade" />
      <PausePanel v-if="game.paused && !game.portrait" />
    </template>
    <MainMenu v-if="game.screen === 'menu'" />
    <CharacterSelect v-else-if="game.screen === 'select'" />
    <ResultPanel v-else-if="game.screen === 'result'" />
    <WeaponBook v-else-if="game.screen === 'weaponBook'" />
    <LeekBook v-else-if="game.screen === 'leekBook'" />
    <ShopPanel v-else-if="game.screen === 'shop'" />
    <AchievementPanel v-else-if="game.screen === 'achievements'" />
    <SettingsPanel v-else-if="game.screen === 'settings'" />
    <BannerLayer />
    <div v-if="game.portrait" class="rotate-tip">
      <div class="rotate-icon">📱↻</div>
      <p>请旋转手机，将设备切换为横屏模式。</p>
    </div>
  </div>
</template>
