<script setup lang="ts">
import { useGameStore } from '../stores/gameStore';
import SpriteIcon from './SpriteIcon.vue';

const game = useGameStore();
</script>

<template>
  <div class="banner-layer">
    <div v-if="game.big" :key="game.big.id" class="big-banner" :class="game.big.kind">
      <div class="t">{{ game.big.title }}</div>
      <div v-if="game.big.sub" class="s">{{ game.big.sub }}</div>
    </div>
    <div class="toasts">
      <div v-for="t in game.toasts" :key="t.id" class="toast" :class="t.kind">
        <SpriteIcon v-if="t.icon" :name="t.icon" />
        <div>
          <div class="tt">{{ t.title }}</div>
          <div v-if="t.sub" class="ts">{{ t.sub }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
