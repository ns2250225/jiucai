<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { usePlayerStore } from '../stores/playerStore';
import { ACHIEVEMENTS } from '../data/achievements';
import { AudioService } from '../services/AudioService';
import type { Screen } from '../stores/gameStore';

const game = useGameStore();
const player = usePlayerStore();
const achDone = computed(() => Object.keys(player.save.achievements).length);
const go = (s: Screen) => {
  AudioService.unlock();
  AudioService.play('click');
  game.screen = s;
};
const fmtTime = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
</script>

<template>
  <div class="menu">
    <div class="logo">
      <h1>韭菜收割者</h1>
      <div class="en">THE GREAT LEEK HARVEST</div>
      <div class="slogan">你以为你在收割韭菜，其实韭菜一直在研究怎么收割你。</div>
    </div>
    <div>
      <div class="menu-actions">
        <button class="btn primary" @click="go('select')">开始游戏</button>
        <button class="btn" @click="go('select')">角色选择</button>
        <button class="btn" @click="go('weaponBook')">武器图鉴</button>
        <button class="btn" @click="go('leekBook')">韭菜图鉴</button>
        <button class="btn gold" @click="go('shop')">永久升级</button>
        <button class="btn" @click="go('achievements')">成就系统</button>
        <button class="btn ghost" @click="go('settings')">游戏设置</button>
      </div>
      <div class="menu-foot">
        <span>金币 {{ Math.floor(player.save.gold) }}</span>
        <span>累计收割 {{ player.save.totalKills }}</span>
        <span>最佳存活 {{ fmtTime(player.save.records.time) }}</span>
        <span>最高评级 {{ player.save.records.rating }}</span>
        <span>成就 {{ achDone }}/{{ ACHIEVEMENTS.length }}</span>
      </div>
    </div>
  </div>
</template>
