<script setup lang="ts">
import { ref } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { usePlayerStore } from '../stores/playerStore';
import { AudioService } from '../services/AudioService';
import { GameManager } from '../game/GameManager';

const game = useGameStore();
const player = usePlayerStore();
const save = player.save;

type ResetKind = 'progress' | 'books' | 'achievements' | 'settings';
const RESET_TEXT: Record<ResetKind, string> = {
  progress: '重置全部游戏进度？金币、解锁、强化、图鉴和成就都会清空（设置保留）。',
  books: '重置韭菜图鉴和武器图鉴？',
  achievements: '重置全部成就？已领取的金币不会退回。',
  settings: '恢复默认设置？',
};
const confirming = ref<ResetKind | null>(null);

function changed() {
  AudioService.configure(save.settings);
  player.persist();
  GameManager.settingsChanged();
}
function doReset() {
  const k = confirming.value;
  if (k === 'progress') player.resetProgress();
  else if (k === 'books') player.resetBooks();
  else if (k === 'achievements') player.resetAchievements();
  else if (k === 'settings') player.resetSettings();
  confirming.value = null;
  AudioService.play('click');
}
</script>

<template>
  <div class="screen">
    <div class="screen-head">
      <button class="btn ghost small" @click="game.screen = 'menu'">返回</button>
      <h2>游戏设置</h2>
    </div>
    <div class="screen-body">
      <div class="settings-list">
        <label class="set-row">背景音乐 <input v-model="save.settings.music" type="checkbox" @change="changed" /></label>
        <label class="set-row">音乐音量 <input v-model.number="save.settings.musicVol" type="range" min="0" max="1" step="0.05" @change="changed" /></label>
        <label class="set-row">音效 <input v-model="save.settings.sfx" type="checkbox" @change="changed" /></label>
        <label class="set-row">音效音量 <input v-model.number="save.settings.sfxVol" type="range" min="0" max="1" step="0.05" @change="changed" /></label>
        <label class="set-row">显示伤害数字 <input v-model="save.settings.showDamage" type="checkbox" @change="changed" /></label>
        <label class="set-row">屏幕震动 <input v-model="save.settings.shake" type="checkbox" @change="changed" /></label>
        <label class="set-row">黑色幽默提示 <input v-model="save.settings.quips" type="checkbox" @change="changed" /></label>
        <div class="set-row">
          特效质量
          <span>
            <button class="btn small" :class="save.settings.fxLevel === 'high' ? '' : 'ghost'" @click="save.settings.fxLevel = 'high'; changed()">高</button>
            <button class="btn small" :class="save.settings.fxLevel === 'low' ? '' : 'ghost'" style="margin-left: 8px" @click="save.settings.fxLevel = 'low'; changed()">低</button>
          </span>
        </div>
        <div class="set-row" style="flex-wrap: wrap">
          数据重置
          <span style="display: flex; gap: 8px; flex-wrap: wrap">
            <button class="btn red small" @click="confirming = 'progress'">重置进度</button>
            <button class="btn red small" @click="confirming = 'books'">重置图鉴</button>
            <button class="btn red small" @click="confirming = 'achievements'">重置成就</button>
            <button class="btn ghost small" @click="confirming = 'settings'">恢复默认设置</button>
          </span>
        </div>
      </div>
    </div>
    <div v-if="confirming" class="modal-wrap">
      <div class="modal pixel-box">
        <h3>二次确认</h3>
        <p style="text-align: center">{{ RESET_TEXT[confirming] }}</p>
        <div class="actions">
          <button class="btn red" @click="doReset">确认</button>
          <button class="btn ghost" @click="confirming = null">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>
