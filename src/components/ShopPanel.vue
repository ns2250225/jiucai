<script setup lang="ts">
import { ref } from 'vue';
import { useGameStore } from '../stores/gameStore';
import { usePlayerStore } from '../stores/playerStore';
import { SHOP_ITEMS, SKINS, shopPrice } from '../data/progression';
import type { ShopItem } from '../data/progression';
import { BASE_WEAPONS, MAPS, PASSIVES, ULTS } from '../game/data';
import SpriteIcon from './SpriteIcon.vue';

const game = useGameStore();
const player = usePlayerStore();
const save = player.save;
const tab = ref<'stat' | 'weapon' | 'ult' | 'item' | 'map' | 'skin'>('stat');
const TABS = [
  { id: 'stat', label: '永久强化' },
  { id: 'weapon', label: '解锁武器' },
  { id: 'ult', label: '解锁大招' },
  { id: 'item', label: '特殊道具' },
  { id: 'map', label: '解锁地图' },
  { id: 'skin', label: '外观皮肤' },
] as const;
const lockedItems = PASSIVES.filter((p) => p.locked);
const lockedWeapons = BASE_WEAPONS.filter((w) => (w.price ?? 0) > 0);
const lockedUlts = ULTS.filter((u) => u.price > 0);
const lockedMaps = MAPS.filter((m) => m.price > 0);
const lockedSkins = SKINS.filter((s) => s.price > 0);
const effect = (i: ShopItem, lv: number) => (i.unit === '%' ? `+${Math.round(i.perLevel * lv * 100)}%` : `+${i.perLevel * lv}`);
</script>

<template>
  <div class="screen">
    <div class="screen-head">
      <button class="btn ghost small" @click="game.screen = 'menu'">返回</button>
      <h2>永久升级</h2>
      <div class="spacer"></div>
      <span class="gold-tag"><SpriteIcon name="p_coin" :size="18" />{{ Math.floor(save.gold) }}</span>
    </div>
    <div class="tabs">
      <button v-for="t in TABS" :key="t.id" class="btn small" :class="{ on: tab === t.id }" @click="tab = t.id">{{ t.label }}</button>
    </div>
    <div class="screen-body">
      <div v-if="tab === 'stat'" class="shop-grid">
        <div v-for="i in SHOP_ITEMS" :key="i.id" class="shop-card">
          <div class="top">
            <SpriteIcon :name="i.icon" />
            <div>
              <div class="name">{{ i.name }}</div>
              <div class="desc">{{ i.desc }} {{ effect(i, save.shop[i.id] ?? 0) }}（每级 {{ effect(i, 1) }}）</div>
            </div>
          </div>
          <div class="pips"><i v-for="n in i.max" :key="n" :class="{ on: n <= (save.shop[i.id] ?? 0) }"></i></div>
          <button v-if="(save.shop[i.id] ?? 0) < i.max" class="btn gold small" :disabled="save.gold < shopPrice(i, save.shop[i.id] ?? 0)" @click="player.buyShop(i.id)">
            升级 {{ shopPrice(i, save.shop[i.id] ?? 0) }}
          </button>
          <button v-else class="btn ghost small" disabled>已满级</button>
        </div>
      </div>
      <div v-if="tab === 'weapon'" class="shop-grid">
        <div v-for="w in lockedWeapons" :key="w.id" class="shop-card">
          <div class="top">
            <SpriteIcon :name="`w_${w.id}`" />
            <div>
              <div class="name">{{ w.name }}</div>
              <div class="desc">{{ w.kind }} · {{ w.desc }}</div>
            </div>
          </div>
          <button v-if="!save.unlockedWeapons.includes(w.id)" class="btn gold small" :disabled="save.gold < (w.price ?? 0)" @click="player.buyWeapon(w.id)">解锁 {{ w.price }}</button>
          <button v-else class="btn ghost small" disabled>已解锁</button>
        </div>
      </div>
      <div v-if="tab === 'ult'" class="shop-grid">
        <div v-for="u in lockedUlts" :key="u.id" class="shop-card">
          <div class="top">
            <SpriteIcon :name="`i_u_${u.id}`" />
            <div>
              <div class="name">{{ u.name }}</div>
              <div class="desc">{{ u.desc }}</div>
            </div>
          </div>
          <button v-if="!save.unlockedUlts.includes(u.id)" class="btn gold small" :disabled="save.gold < u.price" @click="player.buyUlt(u.id)">解锁 {{ u.price }}</button>
          <button v-else class="btn ghost small" disabled>已解锁</button>
        </div>
      </div>
      <div v-if="tab === 'item'" class="shop-grid">
        <div v-for="p in lockedItems" :key="p.id" class="shop-card">
          <div class="top">
            <SpriteIcon :name="`i_${p.id}`" />
            <div>
              <div class="name">{{ p.name }}</div>
              <div class="desc">{{ p.desc }}。解锁后可在升级时抽到。</div>
            </div>
          </div>
          <button v-if="!save.unlockedItems.includes(p.id)" class="btn gold small" :disabled="save.gold < (p.price ?? 0)" @click="player.buyItem(p.id)">解锁 {{ p.price }}</button>
          <button v-else class="btn ghost small" disabled>已解锁</button>
        </div>
      </div>
      <div v-if="tab === 'map'" class="shop-grid">
        <div v-for="m in lockedMaps" :key="m.id" class="shop-card">
          <div class="name">{{ m.name }}</div>
          <div class="desc">{{ m.mechanic }}</div>
          <button v-if="!save.unlockedMaps.includes(m.id)" class="btn gold small" :disabled="save.gold < m.price" @click="player.buyMap(m.id)">解锁 {{ m.price }}</button>
          <button v-else class="btn ghost small" disabled>已解锁</button>
        </div>
      </div>
      <div v-if="tab === 'skin'" class="shop-grid">
        <div v-for="s in lockedSkins" :key="s.id" class="shop-card">
          <div class="top">
            <SpriteIcon :name="`player_${s.id}_idle0`" :size="48" />
            <div>
              <div class="name">{{ s.name }}</div>
              <div class="desc">{{ s.desc }}</div>
            </div>
          </div>
          <button v-if="!save.unlockedSkins.includes(s.id)" class="btn gold small" :disabled="save.gold < s.price" @click="player.buySkin(s.id, s.price)">购买 {{ s.price }}</button>
          <button v-else class="btn ghost small" disabled>已拥有</button>
        </div>
      </div>
    </div>
  </div>
</template>
