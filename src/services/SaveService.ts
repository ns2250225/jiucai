import { CHARACTERS } from '../data/characters';

export interface Settings {
  music: boolean;
  sfx: boolean;
  musicVol: number;
  sfxVol: number;
  showDamage: boolean;
  fxLevel: 'high' | 'low';
  shake: boolean;
  quips: boolean;
}
export interface LeekEntry {
  kills: number;
  first: number;
}
export interface WeaponEntry {
  uses: number;
  damage: number;
  kills: number;
}
export interface SaveData {
  version: number;
  gold: number;
  totalGoldEarned: number;
  totalKills: number;
  lightningKills: number;
  totalDeaths: number;
  totalWins: number;
  totalRuns: number;
  totalAntiEvos: number;
  totalWeaponEvos: number;
  totalTech: number;
  totalCores: number;
  totalBossKills: number;
  chairmanKills: number;
  unlockedChars: string[];
  unlockedWeapons: string[];
  unlockedMaps: string[];
  unlockedUlts: string[];
  unlockedSkins: string[];
  unlockedItems: string[];
  clearedMaps: string[];
  shop: Record<string, number>;
  leekBook: Record<string, LeekEntry>;
  weaponBook: Record<string, WeaponEntry>;
  combos: string[];
  comboHints: string[];
  fragments: number;
  achievements: Record<string, number>;
  settings: Settings;
  records: { time: number; kills: number; gold: number; combo: number; level: number; burst: number; rating: string };
  selected: { char: string; weapon: string; map: string; ult: string; skin: string; endless: boolean };
  /** 运行时标记：本局数据已写入累计值，成就检查时不能重复相加 */
  runCommitted?: boolean;
}

export function defaultSettings(): Settings {
  return { music: true, sfx: true, musicVol: 0.5, sfxVol: 0.7, showDamage: true, fxLevel: 'high', shake: true, quips: true };
}
export function defaultSave(): SaveData {
  return {
    version: 1,
    gold: 0,
    totalGoldEarned: 0,
    totalKills: 0,
    lightningKills: 0,
    totalDeaths: 0,
    totalWins: 0,
    totalRuns: 0,
    totalAntiEvos: 0,
    totalWeaponEvos: 0,
    totalTech: 0,
    totalCores: 0,
    totalBossKills: 0,
    chairmanKills: 0,
    unlockedChars: [CHARACTERS[0].id],
    unlockedWeapons: ['scythe', 'boomerang', 'twin', 'whirl'],
    unlockedMaps: ['map1'],
    unlockedUlts: ['reaper'],
    unlockedSkins: ['default'],
    unlockedItems: [],
    clearedMaps: [],
    shop: {},
    leekBook: {},
    weaponBook: {},
    combos: [],
    comboHints: [],
    fragments: 0,
    achievements: {},
    settings: defaultSettings(),
    records: { time: 0, kills: 0, gold: 0, combo: 0, level: 0, burst: 0, rating: '-' },
    selected: { char: 'reaper', weapon: 'scythe', map: 'map1', ult: 'reaper', skin: 'default', endless: false },
  };
}

const DB = 'leek-harvest';
const STORE = 'save';
const KEY = 'profile';
const LS_KEY = 'leek-harvest-save';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** 旧存档缺字段时用默认值补齐 */
function merge(raw: Partial<SaveData> | null | undefined): SaveData {
  const base = defaultSave();
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    settings: { ...base.settings, ...raw.settings },
    records: { ...base.records, ...raw.records },
    selected: { ...base.selected, ...raw.selected },
    runCommitted: false,
  };
}

export const SaveService = {
  /** 优先 IndexedDB，不可用时回退 LocalStorage */
  async load(): Promise<SaveData> {
    try {
      const db = await openDb();
      const data = await new Promise<SaveData | undefined>((resolve, reject) => {
        const req = db.transaction(STORE).objectStore(STORE).get(KEY);
        req.onsuccess = () => resolve(req.result as SaveData | undefined);
        req.onerror = () => reject(req.error);
      });
      db.close();
      if (data) return merge(data);
    } catch {
      /* 回退到 LocalStorage */
    }
    try {
      const raw = localStorage.getItem(LS_KEY);
      return merge(raw ? (JSON.parse(raw) as SaveData) : null);
    } catch {
      return defaultSave();
    }
  },
  async save(data: SaveData): Promise<void> {
    // 去掉 Vue 响应式代理，IndexedDB 无法克隆 Proxy
    const plain = JSON.parse(JSON.stringify(data)) as SaveData;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(plain));
    } catch {
      /* 配额不足时只写 IndexedDB */
    }
    try {
      const db = await openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(plain, KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch {
      /* LocalStorage 已写入 */
    }
  },
};
