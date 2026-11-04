<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { usePlayerStore } from '../stores/playerStore';
import { CHARACTERS } from '../data/characters';
import type { CharacterDef } from '../data/characters';
import { SKINS } from '../data/progression';
import { BASE_WEAPONS, MAPS, ULTS } from '../game/data';
import { AudioService } from '../services/AudioService';
import SpriteIcon from './SpriteIcon.vue';

const game = useGameStore();
const player = usePlayerStore();
const save = player.save;
const sel = save.selected;
const step = ref<'char' | 'weapon' | 'map' | 'ult'>('char');
const STEPS = [
  { id: 'char', label: '① 收割者' },
  { id: 'weapon', label: '② 初始镰刀' },
  { id: 'ult', label: '③ 大招' },
  { id: 'map', label: '④ 韭菜田' },
] as const;

const canEndless = computed(() => save.clearedMaps.length > 0);
const skins = computed(() => SKINS.filter((s) => save.unlockedSkins.includes(s.id)));
const pct = (v: number) => `${Math.round(v * 100)}%`;
const charFrame = (c: CharacterDef) => `player_${sel.skin !== 'default' ? sel.skin : c.id}_idle0`;

function pickChar(c: CharacterDef) {
  if (!save.unlockedChars.includes(c.id)) return;
  sel.char = c.id;
  // 角色的招牌武器和大招已解锁时自动带上
  if (save.unlockedWeapons.includes(c.startWeapon)) sel.weapon = c.startWeapon;
  if (save.unlockedUlts.includes(c.ult)) sel.ult = c.ult;
  AudioService.play('click');
  player.persist();
}
function pick(key: 'weapon' | 'map' | 'ult', id: string, unlocked: boolean) {
  if (!unlocked) return;
  sel[key] = id;
  AudioService.play('click');
  player.persist();
}
function buyChar(c: CharacterDef) {
  if (player.buyChar(c.id)) pickChar(c);
}
function start() {
  player.persist();
  game.startRun({
    charId: sel.char, weaponId: sel.weapon, mapId: sel.map, ultId: sel.ult, skin: sel.skin,
    endless: sel.endless && canEndless.value,
  });
}
</script>

<template>
  <div class="screen">
    <div class="screen-head">
      <button class="btn ghost small" @click="game.screen = 'menu'">返回</button>
      <h2>出战准备</h2>
      <div class="spacer"></div>
      <span class="gold-tag"><SpriteIcon name="p_coin" :size="18" />{{ Math.floor(save.gold) }}</span>
    </div>
    <div class="tabs">
      <button v-for="s in STEPS" :key="s.id" class="btn small" :class="{ on: step === s.id }" @click="step = s.id">{{ s.label }}</button>
    </div>
    <div class="screen-body">
      <div v-if="step === 'char'" class="select-grid">
        <div
          v-for="c in CHARACTERS" :key="c.id" class="opt-card"
          :class="{ on: sel.char === c.id, locked: !save.unlockedChars.includes(c.id) }"
          @click="pickChar(c)"
        >
          <div class="row">
            <SpriteIcon :name="charFrame(c)" :size="48" :silhouette="!save.unlockedChars.includes(c.id)" />
            <div>
              <div class="name">{{ c.name }}</div>
              <div class="desc">{{ c.title }}</div>
            </div>
          </div>
          <div class="desc">{{ c.ability }}</div>
          <div class="stat-line">
            <span>生命 {{ c.hp }}</span><span>移速 {{ pct(c.speed) }}</span><span>伤害 {{ pct(c.damage) }}</span>
            <span>范围 {{ pct(c.range) }}</span><span>攻速 {{ pct(c.atkSpeed) }}</span><span>幸运 {{ pct(c.luck) }}</span>
            <span>金币 {{ pct(c.gold) }}</span><span>经验 {{ pct(c.xp) }}</span>
          </div>
          <template v-if="!save.unlockedChars.includes(c.id)">
            <div class="lock-tip">解锁：{{ c.unlockText }}</div>
            <button v-if="c.price !== null" class="btn gold small" :disabled="save.gold < c.price" @click.stop="buyChar(c)">
              金币买断 {{ c.price }}
            </button>
          </template>
        </div>
      </div>
      <div v-if="step === 'char'">
        <div class="step-title">外观皮肤</div>
        <div class="tabs">
          <button v-for="s in skins" :key="s.id" class="btn small" :class="{ on: sel.skin === s.id }" @click="sel.skin = s.id; player.persist()">{{ s.name }}</button>
        </div>
      </div>

      <div v-if="step === 'weapon'" class="select-grid">
        <div
          v-for="w in BASE_WEAPONS" :key="w.id" class="opt-card"
          :class="{ on: sel.weapon === w.id, locked: !save.unlockedWeapons.includes(w.id) }"
          @click="pick('weapon', w.id, save.unlockedWeapons.includes(w.id))"
        >
          <div class="row">
            <SpriteIcon :name="`w_${w.id}`" :size="40" :silhouette="!save.unlockedWeapons.includes(w.id)" />
            <div>
              <div class="name">{{ w.name }}</div>
              <div class="desc">{{ w.kind }}</div>
            </div>
          </div>
          <div class="desc">{{ w.desc }}</div>
          <div v-if="!save.unlockedWeapons.includes(w.id)" class="lock-tip">在永久升级中解锁（{{ w.price }} 金币）</div>
        </div>
      </div>

      <div v-if="step === 'ult'" class="select-grid">
        <div
          v-for="u in ULTS" :key="u.id" class="opt-card"
          :class="{ on: sel.ult === u.id, locked: !save.unlockedUlts.includes(u.id) }"
          @click="pick('ult', u.id, save.unlockedUlts.includes(u.id))"
        >
          <div class="row">
            <SpriteIcon :name="`i_u_${u.id}`" :size="40" :silhouette="!save.unlockedUlts.includes(u.id)" />
            <div class="name">{{ u.name }}</div>
          </div>
          <div class="desc">{{ u.desc }}</div>
          <div v-if="!save.unlockedUlts.includes(u.id)" class="lock-tip">在永久升级中解锁（{{ u.price }} 金币）</div>
        </div>
      </div>

      <div v-if="step === 'map'" class="select-grid">
        <div
          v-for="m in MAPS" :key="m.id" class="opt-card"
          :class="{ on: sel.map === m.id, locked: !save.unlockedMaps.includes(m.id) }"
          @click="pick('map', m.id, save.unlockedMaps.includes(m.id))"
        >
          <div class="name">{{ m.name }}<span v-if="save.clearedMaps.includes(m.id)" style="color: var(--gold)"> ★</span></div>
          <div class="desc">{{ m.desc }}</div>
          <div class="desc" style="color: #7dfff0">{{ m.mechanic }}</div>
          <div v-if="!save.unlockedMaps.includes(m.id)" class="lock-tip">通关上一张地图，或花费 {{ m.price }} 金币解锁</div>
        </div>
      </div>
    </div>
    <div class="start-bar">
      <label class="check" :style="{ opacity: canEndless ? 1 : 0.5 }">
        <input v-model="sel.endless" type="checkbox" :disabled="!canEndless" />
        无尽模式{{ canEndless ? '' : '（通关任意地图后解锁）' }}
      </label>
      <div style="flex: 1"></div>
      <button class="btn gold" style="font-size: 20px; min-width: 180px" @click="start">进入韭菜田</button>
    </div>
  </div>
</template>
