<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { usePlayerStore } from '../stores/playerStore';
import { BASE_WEAPONS, COMBOS, EVOLVED_WEAPONS, PASSIVE_MAP, WEAPON_EVOS, WEAPON_MAP } from '../game/data';
import type { WeaponDef } from '../game/types';
import { COMBO_FRAGMENT_COST } from '../data/progression';
import SpriteIcon from './SpriteIcon.vue';

const game = useGameStore();
const save = usePlayerStore().save;
const tab = ref<'base' | 'evo' | 'combo'>('base');
const seen = (id: string) => !!save.weaponBook[id] || save.unlockedWeapons.includes(id);
const evoOf = (w: WeaponDef) => WEAPON_EVOS.find((e) => e.base === w.id);
const fromOf = (w: WeaponDef) => WEAPON_EVOS.find((e) => e.result === w.id);
const num = (n: number | undefined) => Math.round(n ?? 0).toLocaleString();
const nameOf = (ids: string[]) => ids.map((i) => WEAPON_MAP[i]?.name ?? i).join(' / ');
const comboState = computed(() =>
  COMBOS.map((c) => ({ c, found: save.combos.includes(c.id), hinted: save.comboHints.includes(c.id) })),
);
</script>

<template>
  <div class="screen">
    <div class="screen-head">
      <button class="btn ghost small" @click="game.screen = 'menu'">返回</button>
      <h2>武器图鉴</h2>
      <div class="spacer"></div>
      <span class="muted">组合碎片 {{ save.fragments }}/{{ COMBO_FRAGMENT_COST }}</span>
    </div>
    <div class="tabs">
      <button class="btn small" :class="{ on: tab === 'base' }" @click="tab = 'base'">基础镰刀</button>
      <button class="btn small" :class="{ on: tab === 'evo' }" @click="tab = 'evo'">进化镰刀</button>
      <button class="btn small" :class="{ on: tab === 'combo' }" @click="tab = 'combo'">隐藏组合</button>
    </div>
    <div class="screen-body">
      <div v-if="tab === 'base'" class="book-grid">
        <div v-for="w in BASE_WEAPONS" :key="w.id" class="book-card">
          <div class="pic"><SpriteIcon :name="`w_${w.id}`" :silhouette="!seen(w.id)" :size="56" /></div>
          <div class="info">
            <h4>{{ seen(w.id) ? w.name : '？？？' }}</h4>
            <template v-if="seen(w.id)">
              <div>{{ w.kind }} · {{ w.desc }}</div>
              <div style="color: #7dfff0">{{ w.special }}</div>
              <div v-if="evoOf(w)">
                进化：Lv8 + {{ PASSIVE_MAP[evoOf(w)!.passive].name }} → <b>{{ save.weaponBook[evoOf(w)!.result] ? WEAPON_MAP[evoOf(w)!.result].name : '？？？' }}</b>
              </div>
              <div>使用 <b>{{ save.weaponBook[w.id]?.uses ?? 0 }}</b> 次 · 累计伤害 <b>{{ num(save.weaponBook[w.id]?.damage) }}</b> · 击杀 <b>{{ num(save.weaponBook[w.id]?.kills) }}</b></div>
            </template>
            <div v-else>在永久升级中解锁后可查看。</div>
          </div>
        </div>
      </div>
      <div v-if="tab === 'evo'" class="book-grid">
        <div v-for="w in EVOLVED_WEAPONS" :key="w.id" class="book-card">
          <div class="pic"><SpriteIcon :name="`w_${w.id}`" :silhouette="!save.weaponBook[w.id]" :size="56" /></div>
          <div class="info">
            <h4>{{ save.weaponBook[w.id] ? w.name : '？？？' }}</h4>
            <div v-if="fromOf(w)">路线：{{ WEAPON_MAP[fromOf(w)!.base].name }} Lv8 + {{ PASSIVE_MAP[fromOf(w)!.passive].name }}</div>
            <template v-if="save.weaponBook[w.id]">
              <div>{{ w.desc }}</div>
              <div>使用 <b>{{ save.weaponBook[w.id]?.uses ?? 0 }}</b> 次 · 累计伤害 <b>{{ num(save.weaponBook[w.id]?.damage) }}</b> · 击杀 <b>{{ num(save.weaponBook[w.id]?.kills) }}</b></div>
            </template>
            <div v-else>完成一次进化后解锁详情。</div>
          </div>
        </div>
      </div>
      <div v-if="tab === 'combo'" class="book-grid">
        <div v-for="s in comboState" :key="s.c.id" class="book-card">
          <div class="pic"><SpriteIcon name="i_sp_count" :silhouette="!s.found" :size="48" /></div>
          <div class="info">
            <h4>{{ s.found || s.hinted ? s.c.name : '未发现的组合' }}</h4>
            <div v-if="s.found || s.hinted">组合条件：{{ nameOf(s.c.a) }} ＋ {{ nameOf(s.c.b) }}</div>
            <div v-if="s.found">{{ s.c.desc }}</div>
            <div v-else-if="s.hinted" style="color: var(--orange)">已获得线索，尚未亲手触发。</div>
            <div v-else>同时持有特定的两把武器时自动触发。开宝箱获得碎片，集齐 {{ COMBO_FRAGMENT_COST }} 枚可揭示一个组合。</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
