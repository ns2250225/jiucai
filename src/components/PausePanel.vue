<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePlayerStore } from '../stores/playerStore';
import { GameManager } from '../game/GameManager';
import { AudioService } from '../services/AudioService';

const player = usePlayerStore();
const s = computed(() => player.save.settings);
const confirmQuit = ref(false);
function resume() {
  AudioService.play('click');
  GameManager.setPaused(false);
}
function changed() {
  AudioService.configure(player.save.settings);
  player.persist();
  GameManager.settingsChanged();
}
function quit() {
  confirmQuit.value = false;
  GameManager.surrender();
}
</script>

<template>
  <div class="modal-wrap">
    <div class="modal pixel-box">
      <template v-if="!confirmQuit">
        <h3>暂停</h3>
        <p class="muted" style="text-align: center; margin: 0 0 10px">韭菜利用这段时间，又进修了一门课。</p>
        <div class="settings-list" style="gap: 8px">
          <label class="set-row">背景音乐 <input v-model="s.music" type="checkbox" @change="changed" /></label>
          <label class="set-row">音效 <input v-model="s.sfx" type="checkbox" @change="changed" /></label>
          <label class="set-row">显示伤害数字 <input v-model="s.showDamage" type="checkbox" @change="changed" /></label>
        </div>
        <div class="actions">
          <button class="btn gold" @click="resume">继续收割</button>
          <button class="btn red" @click="confirmQuit = true">结束本局</button>
        </div>
      </template>
      <template v-else>
        <h3>结束本局？</h3>
        <p style="text-align: center">将按当前进度结算，已获得的金币会保留。</p>
        <div class="actions">
          <button class="btn red" @click="quit">确认结算</button>
          <button class="btn ghost" @click="confirmQuit = false">再割一会儿</button>
        </div>
      </template>
    </div>
  </div>
</template>
