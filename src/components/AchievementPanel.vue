<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { usePlayerStore } from '../stores/playerStore';
import { ACHIEVEMENTS } from '../data/achievements';

const game = useGameStore();
const save = usePlayerStore().save;
const done = computed(() => Object.keys(save.achievements).length);
const list = computed(() =>
  [...ACHIEVEMENTS].sort((a, b) => Number(!!save.achievements[b.id]) - Number(!!save.achievements[a.id])),
);
</script>

<template>
  <div class="screen">
    <div class="screen-head">
      <button class="btn ghost small" @click="game.screen = 'menu'">返回</button>
      <h2>成就系统</h2>
      <div class="spacer"></div>
      <span class="muted">{{ done }}/{{ ACHIEVEMENTS.length }}</span>
    </div>
    <div class="screen-body">
      <div class="ach-grid">
        <div v-for="a in list" :key="a.id" class="ach" :class="{ done: save.achievements[a.id] }">
          <h4>{{ a.hidden && !save.achievements[a.id] ? '隐藏成就' : a.name }}</h4>
          <div>{{ a.hidden && !save.achievements[a.id] ? '达成后揭晓' : a.desc }}</div>
          <div style="color: var(--gold)">奖励 {{ a.reward }} 金币<span v-if="save.achievements[a.id]"> · 已获得</span></div>
        </div>
      </div>
    </div>
  </div>
</template>
