<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { usePlayerStore } from '../stores/playerStore';
import { BOSSES, ENEMIES, mapsOfEnemy, MAPS } from '../game/data';
import SpriteIcon from './SpriteIcon.vue';

const game = useGameStore();
const save = usePlayerStore().save;
const tab = ref<'normal' | 'special' | 'elite' | 'unit' | 'boss'>('normal');
const TABS = [
  { id: 'normal', label: '普通韭菜' },
  { id: 'special', label: '特殊韭菜' },
  { id: 'elite', label: '精英韭菜' },
  { id: 'unit', label: '韭菜设施' },
  { id: 'boss', label: 'BOSS' },
] as const;
const list = computed(() => ENEMIES.filter((e) => e.group === tab.value));
const total = ENEMIES.length + BOSSES.length;
const found = computed(() => Object.keys(save.leekBook).length);
const fmtDate = (t: number | undefined) => (t ? new Date(t).toLocaleDateString() : '-');
const mapsOf = (id: string) => mapsOfEnemy(id).join('、') || '随事件或召唤出现';
const bossMaps = (id: string) => MAPS.filter((m) => m.bossFinal === id || m.bossMid === id).map((m) => m.name).join('、');
</script>

<template>
  <div class="screen">
    <div class="screen-head">
      <button class="btn ghost small" @click="game.screen = 'menu'">返回</button>
      <h2>韭菜图鉴</h2>
      <div class="spacer"></div>
      <span class="muted">已发现 {{ found }}/{{ total }}</span>
    </div>
    <div class="tabs">
      <button v-for="t in TABS" :key="t.id" class="btn small" :class="{ on: tab === t.id }" @click="tab = t.id">{{ t.label }}</button>
    </div>
    <div class="screen-body">
      <div v-if="tab !== 'boss'" class="book-grid">
        <div v-for="e in list" :key="e.id" class="book-card">
          <div class="pic"><SpriteIcon :name="`${e.id}_0`" :silhouette="!save.leekBook[e.id]" /></div>
          <div class="info">
            <template v-if="save.leekBook[e.id]">
              <h4>{{ e.name }}</h4>
              <div>血量 <b>{{ e.hp }}</b> · 攻击方式：{{ e.attack }}</div>
              <div>{{ e.ability }}</div>
              <div style="color: #7dfff0">{{ e.react }}</div>
              <div>出现地图：{{ mapsOf(e.id) }}</div>
              <div>收割 <b>{{ save.leekBook[e.id].kills }}</b> 根 · 首次发现 <b>{{ fmtDate(save.leekBook[e.id].first) }}</b></div>
            </template>
            <template v-else>
              <h4>？？？</h4>
              <div>尚未收割。出现地图：{{ mapsOf(e.id) }}</div>
            </template>
          </div>
        </div>
      </div>
      <div v-else class="book-grid">
        <div v-for="b in BOSSES" :key="b.id" class="book-card">
          <div class="pic"><SpriteIcon :name="`${b.id}_0`" :silhouette="!save.leekBook[b.id]" /></div>
          <div class="info">
            <template v-if="save.leekBook[b.id]">
              <h4>{{ b.name }}</h4>
              <div>血量 <b>{{ b.hp }}</b> · {{ b.trait }}</div>
              <div>技能：{{ b.skills.join('、') }}</div>
              <div style="color: #7dfff0">「{{ b.quote }}」</div>
              <div>出现地图：{{ bossMaps(b.id) }}</div>
              <div>收割 <b>{{ save.leekBook[b.id].kills }}</b> 次 · 首次发现 <b>{{ fmtDate(save.leekBook[b.id].first) }}</b></div>
            </template>
            <template v-else>
              <h4>？？？</h4>
              <div>{{ b.look }}。出现地图：{{ bossMaps(b.id) || '-' }}</div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
