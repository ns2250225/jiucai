<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { GameManager } from '../game/GameManager';
import { AudioService } from '../services/AudioService';
import type { UpgradeCard } from '../game/types';
import SpriteIcon from './SpriteIcon.vue';

const game = useGameStore();
const picked = ref<number | null>(null);
const RARITY = { common: '普通', rare: '稀有', epic: '史诗', legend: '传说' };

function choose(i: number, c: UpgradeCard) {
  if (picked.value !== null) return;
  picked.value = i;
  AudioService.play('pick');
  // 选中反馈短暂停留后再生效
  window.setTimeout(() => {
    picked.value = null;
    GameManager.chooseUpgrade(c);
  }, 170);
}
function onKey(e: KeyboardEvent) {
  const i = ['Digit1', 'Digit2', 'Digit3'].indexOf(e.code);
  const cards = game.upgrade?.cards;
  if (i >= 0 && cards?.[i]) choose(i, cards[i]);
}
onMounted(() => window.addEventListener('keydown', onKey));
onBeforeUnmount(() => window.removeEventListener('keydown', onKey));
watch(
  () => game.upgrade,
  () => {
    picked.value = null;
  },
);
</script>

<template>
  <div v-if="game.upgrade" class="upgrade">
    <h2>升级！选择一项强化{{ game.upgrade.pending > 1 ? `（还有 ${game.upgrade.pending - 1} 次）` : '' }}</h2>
    <div class="quip">{{ game.upgrade.quip }}</div>
    <div class="cards" :key="game.upgrade.cards.map((c) => c.id).join()">
      <button
        v-for="(c, i) in game.upgrade.cards" :key="c.id" class="card" :class="[c.rarity, { picked: picked === i, dim: picked !== null && picked !== i }]"
        @click="choose(i, c)" @pointerenter="AudioService.play('hover', 0.05)"
      >
        <span class="rarity">{{ RARITY[c.rarity] }}</span>
        <SpriteIcon :name="c.icon" />
        <span class="type">{{ c.typeName }}</span>
        <span class="cname">{{ c.name }}</span>
        <span class="lv">{{ c.type === 'stat' || c.type === 'fallback' ? '即时生效' : c.level === 0 ? `新获得 · Lv1/${c.maxLevel}` : `Lv${c.level} → Lv${c.nextLevel}（上限 ${c.maxLevel}）` }}</span>
        <span class="cdesc">{{ c.desc }}</span>
        <span v-if="c.hint" class="hint">{{ c.hint }}</span>
      </button>
    </div>
  </div>
</template>
