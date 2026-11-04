<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { GameManager } from '../game/GameManager';
import { AudioService } from '../services/AudioService';
import { frameUrl } from '../game/art/Atlas';

const game = useGameStore();
const h = computed(() => game.hud);
const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const pct = (a: number, b: number) => `${Math.max(0, Math.min(100, (a / (b || 1)) * 100))}%`;
function ult() {
  GameManager.castUltimate();
}
function pause() {
  AudioService.play('click');
  game.togglePause();
}
</script>

<template>
  <div v-if="h" class="hud">
    <div class="hud-top">
      <div class="hud-stats">
        <span class="hud-time">{{ fmt(h.time) }}</span>
        <span>波次 <b>{{ h.wave }}</b></span>
        <span>击杀 <b>{{ h.kills }}</b></span>
        <span>金币 <b>{{ h.gold }}</b></span>
        <span>等级 <b>{{ h.level }}</b></span>
        <span v-if="h.market !== null" class="market" :class="h.market >= 1 ? 'up' : 'down'">
          大盘 {{ h.market >= 1 ? '▲' : '▼' }}{{ h.market.toFixed(2) }}
        </span>
      </div>
      <div v-if="h.boss" class="boss-bar">
        <div class="fill" :style="{ width: pct(h.boss.hp, h.boss.max) }"></div>
        <span>{{ h.boss.name }}{{ h.boss.phase ? ` · ${h.boss.phase}` : '' }}</span>
      </div>
      <div v-if="h.event" class="event-chip">{{ h.event.name }} {{ Math.ceil(h.event.remain) }}s</div>
    </div>

    <div class="hud-left">
      <div class="bar hp">
        <div class="fill" :style="{ width: pct(h.hp, h.hpMax) }"></div>
        <span>{{ Math.ceil(h.hp) }} / {{ Math.round(h.hpMax) }}</span>
      </div>
      <div class="bar xp">
        <div class="fill" :style="{ width: pct(h.xp, h.xpMax) }"></div>
        <span>Lv {{ h.level }}</span>
      </div>
      <div class="bar ult" :class="{ ready: h.ultReady }">
        <div class="fill" :style="{ width: pct(h.ult, h.ultMax) }"></div>
        <span>{{ h.ultName }} {{ h.ultCd > 0 ? `${Math.ceil(h.ultCd)}s` : `${Math.floor(h.ult)}%` }}</span>
      </div>
      <div class="status-row">
        <span class="tag">{{ h.phase }}</span>
        <span v-if="h.combo >= 5" class="tag" style="color: var(--orange)">连杀 {{ h.combo }}</span>
        <span v-if="h.shield > 0" class="tag" style="color: var(--blue)">护盾 {{ Math.ceil(h.shield) }}s</span>
        <span v-if="h.rage > 0" class="tag" style="color: var(--orange)">狂暴 {{ Math.ceil(h.rage) }}s</span>
        <span v-if="h.revives > 0" class="tag" style="color: #7dfff0">对冲 ×{{ h.revives }}</span>
        <span v-if="h.endless" class="tag" style="color: var(--purple)">无尽</span>
      </div>
    </div>

    <div class="hud-right">
      <div class="chips">
        <div v-for="w in h.weapons" :key="w.id" class="chip" :class="{ evolved: w.evolved, ready: w.ready }" :title="w.name">
          <img :src="frameUrl(w.icon)" alt="" />
          <em>{{ w.evolved ? '★' : w.level }}</em>
        </div>
      </div>
      <div class="chips">
        <div v-for="p in h.passives" :key="p.id" class="chip small" :title="p.name">
          <img :src="frameUrl(p.icon)" alt="" />
          <em>{{ p.level }}</em>
        </div>
      </div>
      <div v-if="h.evo.length" class="evo-list">
        <div v-for="e in h.evo" :key="e.id" class="evo-item" :class="{ blocked: e.blocked }">
          <span :style="{ color: e.color }">{{ e.name }}</span> Lv{{ e.level }}{{ e.blocked ? ' 冻结' : '' }}
          <div class="evo-bar"><i :style="{ width: `${e.progress}%`, background: e.color }"></i></div>
        </div>
      </div>
    </div>

    <div class="hud-bottom">
      <button class="btn ult-btn" :class="{ ready: h.ultReady }" :disabled="!h.ultReady" @pointerdown.stop="ult">
        {{ h.ultReady ? (game.isTouch ? '大招' : '大招 [Space]') : h.ultCd > 0 ? `冷却 ${Math.ceil(h.ultCd)}s` : `${Math.floor(h.ult)}%` }}
      </button>
      <button class="btn ghost small pause-btn" @pointerdown.stop="pause">{{ game.isTouch ? 'II' : '暂停 [ESC]' }}</button>
    </div>
  </div>
</template>
