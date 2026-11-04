import { defineStore } from 'pinia';
import { reactive, ref } from 'vue';
import { SaveService, defaultSave, defaultSettings } from '../services/SaveService';
import type { SaveData } from '../services/SaveService';
import { CHARACTERS } from '../data/characters';
import { COMBO_FRAGMENT_COST, SHOP_ITEMS, shopPrice } from '../data/progression';
import { COMBOS, MAPS, PASSIVE_MAP, ULT_MAP, WEAPON_MAP } from '../game/data';
import type { RunStats } from '../game/types';
import { AudioService } from '../services/AudioService';

export const usePlayerStore = defineStore('player', () => {
  const save = reactive<SaveData>(defaultSave());
  const loaded = ref(false);
  /** 本次结算新解锁的内容，用于结算页展示 */
  const newUnlocks = ref<string[]>([]);

  async function load() {
    Object.assign(save, await SaveService.load());
    refreshUnlocks();
    loaded.value = true;
  }
  function persist() {
    void SaveService.save(save);
  }

  /** 角色解锁条件是累计数据，任何数据变化后都要重算 */
  function refreshUnlocks(): string[] {
    const fresh: string[] = [];
    for (const c of CHARACTERS) {
      if (!save.unlockedChars.includes(c.id) && c.unlocked(save)) {
        save.unlockedChars.push(c.id);
        fresh.push(`角色：${c.name}`);
      }
    }
    return fresh;
  }

  function spend(price: number) {
    if (save.gold < price) return false;
    save.gold -= price;
    AudioService.play('buy');
    return true;
  }
  function buyShop(id: string) {
    const item = SHOP_ITEMS.find((i) => i.id === id);
    if (!item) return false;
    const lv = save.shop[id] ?? 0;
    if (lv >= item.max || !spend(shopPrice(item, lv))) return false;
    save.shop[id] = lv + 1;
    persist();
    return true;
  }
  function buyWeapon(id: string) {
    const w = WEAPON_MAP[id];
    if (!w || save.unlockedWeapons.includes(id) || !spend(w.price ?? 0)) return false;
    save.unlockedWeapons.push(id);
    refreshUnlocks();
    persist();
    return true;
  }
  function buyMap(id: string) {
    const m = MAPS.find((x) => x.id === id);
    if (!m || save.unlockedMaps.includes(id) || !spend(m.price)) return false;
    save.unlockedMaps.push(id);
    persist();
    return true;
  }
  function buyUlt(id: string) {
    const u = ULT_MAP[id];
    if (!u || save.unlockedUlts.includes(id) || !spend(u.price)) return false;
    save.unlockedUlts.push(id);
    persist();
    return true;
  }
  function buyItem(id: string) {
    const p = PASSIVE_MAP[id];
    if (!p || save.unlockedItems.includes(id) || !spend(p.price ?? 0)) return false;
    save.unlockedItems.push(id);
    persist();
    return true;
  }
  function buySkin(id: string, price: number) {
    if (save.unlockedSkins.includes(id) || !spend(price)) return false;
    save.unlockedSkins.push(id);
    persist();
    return true;
  }
  function buyChar(id: string) {
    const c = CHARACTERS.find((x) => x.id === id);
    if (!c || c.price === null || save.unlockedChars.includes(id) || !spend(c.price)) return false;
    save.unlockedChars.push(id);
    persist();
    return true;
  }

  function markLeekSeen(id: string): boolean {
    if (save.leekBook[id]) return false;
    save.leekBook[id] = { kills: 0, first: Date.now() };
    persist();
    return true;
  }
  function markWeaponSeen(id: string) {
    if (!save.weaponBook[id]) save.weaponBook[id] = { uses: 0, damage: 0, kills: 0 };
  }
  function markCombo(id: string) {
    if (!save.combos.includes(id)) {
      save.combos.push(id);
      persist();
    }
  }

  /** 把一局的成果写入累计数据，结算时调用一次 */
  function commitRun(r: RunStats) {
    const fresh: string[] = [];
    save.gold += r.gold;
    save.totalGoldEarned += r.gold;
    save.totalKills += r.kills;
    save.lightningKills += r.lightningKills;
    save.totalRuns++;
    if (r.won) save.totalWins++;
    else save.totalDeaths++;
    save.totalAntiEvos += r.antiEvos;
    save.totalWeaponEvos += r.weaponEvos;
    save.totalTech += r.techDestroyed;
    save.totalCores += r.coresDestroyed;
    save.totalBossKills += r.bossKills;
    if (r.chairmanDead) save.chairmanKills++;
    for (const [id, n] of Object.entries(r.kindKills)) {
      const e = save.leekBook[id] ?? (save.leekBook[id] = { kills: 0, first: Date.now() });
      e.kills += n;
    }
    for (const id of new Set(r.weaponsUsed)) {
      markWeaponSeen(id);
      save.weaponBook[id].uses++;
    }
    for (const [id, e] of Object.entries(r.byWeapon)) {
      markWeaponSeen(id);
      save.weaponBook[id].damage += Math.round(e.damage);
      save.weaponBook[id].kills += e.kills;
    }
    for (const c of r.combos) if (!save.combos.includes(c)) save.combos.push(c);

    // 碎片：集齐后在图鉴中揭示一个还不知道的隐藏组合
    save.fragments += r.fragments;
    while (save.fragments >= COMBO_FRAGMENT_COST) {
      const unknown = COMBOS.filter((c) => !save.comboHints.includes(c.id) && !save.combos.includes(c.id));
      if (!unknown.length) break;
      save.fragments -= COMBO_FRAGMENT_COST;
      const c = unknown[Math.floor(Math.random() * unknown.length)];
      save.comboHints.push(c.id);
      fresh.push(`组合线索：${c.name}`);
    }

    const rec = save.records;
    rec.time = Math.max(rec.time, r.time);
    rec.kills = Math.max(rec.kills, r.kills);
    rec.gold = Math.max(rec.gold, r.gold);
    rec.combo = Math.max(rec.combo, r.maxCombo);
    rec.level = Math.max(rec.level, r.level);
    rec.burst = Math.max(rec.burst, r.maxBurst);
    const order = ['-', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
    if (order.indexOf(r.rating ?? '-') > order.indexOf(rec.rating)) rec.rating = r.rating ?? '-';

    if (r.won) {
      if (!save.clearedMaps.includes(r.mapId)) save.clearedMaps.push(r.mapId);
      // 通关免费解锁下一张地图
      const i = MAPS.findIndex((m) => m.id === r.mapId);
      const next = MAPS[i + 1];
      if (next && !save.unlockedMaps.includes(next.id)) {
        save.unlockedMaps.push(next.id);
        fresh.push(`地图：${next.name}`);
      }
    }
    fresh.push(...refreshUnlocks());
    newUnlocks.value = fresh;
    persist();
  }

  function resetProgress() {
    const settings = { ...save.settings };
    Object.assign(save, defaultSave(), { settings });
    persist();
  }
  function resetBooks() {
    save.leekBook = {};
    save.weaponBook = {};
    save.combos = [];
    save.comboHints = [];
    save.fragments = 0;
    persist();
  }
  function resetAchievements() {
    save.achievements = {};
    persist();
  }
  function resetSettings() {
    save.settings = defaultSettings();
    AudioService.configure(save.settings);
    persist();
  }

  return {
    save, loaded, newUnlocks, load, persist, refreshUnlocks, buyShop, buyWeapon, buyMap, buyUlt, buyItem, buySkin, buyChar,
    markLeekSeen, markWeaponSeen, markCombo, commitRun, resetProgress, resetBooks, resetAchievements, resetSettings,
  };
});
