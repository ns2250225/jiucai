<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { usePlayerStore } from '../stores/playerStore';
import { CHAR_MAP } from '../data/characters';
import { QUIPS } from '../data/progression';
import { MAP_MAP, WEAPON_MAP, ENEMY_MAP, BOSS_MAP, EVO_LINES, COMBOS } from '../game/data';
import { DTYPE_NAMES, DTYPES } from '../game/types';
import SpriteIcon from './SpriteIcon.vue';

const game = useGameStore();
const player = usePlayerStore();
const r = computed(() => game.result);
const detail = ref(false);
const quip = computed(() => {
  const list = r.value?.won ? QUIPS.win : QUIPS.death;
  return list[Math.floor((r.value?.kills ?? 0) % list.length)];
});
const fmt = (t: number) => `${Math.floor(t / 60)}分${String(Math.floor(t % 60)).padStart(2, '0')}秒`;
const usedWeapons = computed(() => [...new Set(r.value?.weaponsUsed ?? [])].map((id) => WEAPON_MAP[id]?.name ?? id));
const weaponRows = computed(() => {
  const by = r.value?.byWeapon ?? {};
  const rows = Object.entries(by).map(([id, e]) => ({ id, ...e }));
  rows.sort((a, b) => b.damage - a.damage);
  const max = rows[0]?.damage || 1;
  return rows.map((row) => ({ ...row, pct: (row.damage / max) * 100 }));
});
const typeRows = computed(() => {
  const by = r.value?.byType ?? {};
  let sum = 0;
  for (const k of DTYPES) sum += by[k] ?? 0;
  return DTYPES.map((k) => ({ k, name: DTYPE_NAMES[k], pct: sum ? ((by[k] ?? 0) / sum) * 100 : 0 })).filter((x) => x.pct > 0).sort((a, b) => b.pct - a.pct);
});
const kindRows = computed(() =>
  Object.entries(r.value?.kindKills ?? {})
    .map(([id, n]) => ({ id, n, name: ENEMY_MAP[id]?.name ?? BOSS_MAP[id]?.name ?? id }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 12),
);
const evoRows = computed(() =>
  EVO_LINES.filter((l) => (r.value?.evoLevels[l.id] ?? 0) > 0).map((l) => ({ name: l.name, lv: r.value!.evoLevels[l.id] })),
);
const comboNames = computed(() => (r.value?.combos ?? []).map((id) => COMBOS.find((c) => c.id === id)?.name ?? id));
function again() {
  if (game.lastConfig) game.startRun({ ...game.lastConfig });
}
</script>

<template>
  <div v-if="r" class="screen result">
    <div class="sheet pixel-box">
      <h2 :class="r.won ? 'win' : 'lose'">{{ r.won ? '收割完成' : '反被收割' }}</h2>
      <div class="line">{{ quip }}</div>
      <div class="result-main">
        <div class="rating">{{ r.rating }}</div>
        <div style="flex: 1; min-width: 260px">
          <div class="titles">
            <span v-for="t in r.titles" :key="t">{{ t }}</span>
          </div>
          <div class="kv">
            <div>生存时间 <b>{{ fmt(r.time) }}</b></div>
            <div>总击杀 <b>{{ r.kills }}</b></div>
            <div>总金币 <b>{{ r.gold }}</b></div>
            <div>黄金韭菜 <b>{{ r.goldenKills }}</b></div>
            <div>击杀精英 <b>{{ r.eliteKills }}</b></div>
            <div>击败 BOSS <b>{{ r.bossKills }}</b></div>
            <div>武器进化 <b>{{ r.weaponEvos }}</b></div>
            <div>反进化次数 <b>{{ r.antiEvos }}</b></div>
            <div>最高连杀 <b>{{ r.maxCombo }}</b></div>
            <div>单次最大收割 <b>{{ r.maxBurst }}</b></div>
            <div>最终等级 <b>{{ r.level }}</b></div>
            <div>地图 <b>{{ MAP_MAP[r.mapId]?.name }}</b></div>
          </div>
        </div>
      </div>
      <div class="result-list">
        <span class="muted">使用武器：</span>
        <span v-for="w in usedWeapons" :key="w">{{ w }}</span>
      </div>
      <div v-if="comboNames.length" class="result-list">
        <span class="muted">隐藏组合：</span>
        <span v-for="c in comboNames" :key="c" style="color: #7dfff0">{{ c }}</span>
      </div>
      <div v-if="r.newAchievements?.length" class="result-list">
        <span class="muted">获得成就：</span>
        <span v-for="a in r.newAchievements" :key="a" style="color: var(--gold)"><SpriteIcon name="i_sp_wealth" :size="14" /> {{ a }}</span>
      </div>
      <div v-if="player.newUnlocks.length" class="result-list">
        <span class="muted">新解锁：</span>
        <span v-for="u in player.newUnlocks" :key="u" style="color: #7dff9a">{{ u }}</span>
      </div>

      <div v-if="detail">
        <table class="detail-table">
          <tr><th>武器</th><th>伤害占比</th><th class="num">累计伤害</th><th class="num">击杀</th></tr>
          <tr v-for="w in weaponRows" :key="w.id">
            <td>{{ w.name }}</td>
            <td style="width: 34%"><div class="mini-bar"><i :style="{ width: `${w.pct}%` }"></i></div></td>
            <td class="num">{{ Math.round(w.damage) }}</td>
            <td class="num">{{ w.kills }}</td>
          </tr>
        </table>
        <div class="result-list">
          <span class="muted">攻击方式占比：</span>
          <span v-for="t in typeRows" :key="t.k">{{ t.name }} {{ t.pct.toFixed(0) }}%</span>
        </div>
        <div class="result-list">
          <span class="muted">韭菜进化路线：</span>
          <span v-for="e in evoRows" :key="e.name">{{ e.name }} Lv{{ e.lv }}</span>
          <span v-if="!evoRows.length">韭菜尚未产生针对性进化</span>
        </div>
        <div class="result-list">
          <span class="muted">收割明细：</span>
          <span v-for="k in kindRows" :key="k.id">{{ k.name }} ×{{ k.n }}</span>
        </div>
        <div class="result-list">
          <span class="muted">其他：</span>
          <span>科技中心 {{ r.techDestroyed }}</span><span>进化核心 {{ r.coresDestroyed }}</span><span>随机事件 {{ r.events }}</span>
          <span>宝箱 {{ r.chests }}</span><span>大招 {{ r.ultCasts }}</span><span>受到伤害 {{ Math.round(r.damageTaken) }}</span>
          <span>角色 {{ CHAR_MAP[r.charId]?.name }}</span>
        </div>
      </div>

      <div class="modal" style="width: 100%; padding: 10px 0 0; animation: none">
        <div class="actions" style="margin-top: 0">
          <button class="btn gold" @click="again">再来一局</button>
          <button class="btn" @click="game.toMenu()">返回主菜单</button>
          <button class="btn ghost" @click="detail = !detail">{{ detail ? '收起统计' : '查看详细统计' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
