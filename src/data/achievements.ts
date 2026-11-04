import type { SaveData } from '../services/SaveService';
import type { RunStats } from '../game/types';
import { BASE_WEAPONS, COMBOS, ENEMIES, EVOLVED_WEAPONS, MAPS, ULTS } from '../game/data';
import { CHARACTERS } from './characters';
import { SHOP_ITEMS } from './progression';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  hidden?: boolean;
  reward: number;
  /** p 是存档，r 是当前局（局外检查时为空） */
  test: (p: SaveData, r: RunStats | null) => boolean;
}

const kills = (p: SaveData, r: RunStats | null) => p.totalKills + (r && !p.runCommitted ? r.kills : 0);
const a = (id: string, name: string, desc: string, reward: number, test: AchievementDef['test'], hidden = false): AchievementDef => ({ id, name, desc, reward, test, hidden });
const killsOf = (p: SaveData, r: RunStats | null, id: string) => (p.leekBook[id]?.kills ?? 0) + (r && !p.runCommitted ? r.kindKills[id] ?? 0 : 0);

export const ACHIEVEMENTS: AchievementDef[] = [
  a('first_kill', '第一次收割', '击杀第一根韭菜', 10, (p, r) => kills(p, r) >= 1),
  a('kills_100', '初出茅庐', '累计收割 100 根', 30, (p, r) => kills(p, r) >= 100),
  a('kills_1000', '熟练工', '累计收割 1000 根', 60, (p, r) => kills(p, r) >= 1000),
  a('kills_5000', '职业收割', '累计收割 5000 根', 100, (p, r) => kills(p, r) >= 5000),
  a('kills_10000', '韭菜杀手', '累计收割 10000 根', 200, (p, r) => kills(p, r) >= 10000),
  a('kills_50000', '韭菜灭绝令', '累计收割 50000 根', 500, (p, r) => kills(p, r) >= 50000),
  a('run_1000', '千里挑一', '单局收割 1000 根', 80, (_, r) => !!r && r.kills >= 1000),
  a('run_3000', '三千烦恼根', '单局收割 3000 根', 150, (_, r) => !!r && r.kills >= 3000),
  a('run_10000', '镰刀艺术家', '单局收割 10000 根', 500, (_, r) => !!r && r.kills >= 10000),
  a('gold_1000', '第一桶金', '单局获得 1000 金币', 50, (_, r) => !!r && r.gold >= 1000),
  a('gold_10000', '黄金时代', '单局获得 10000 金币', 300, (_, r) => !!r && r.gold >= 10000),
  a('gold_50000', '资本大魔王', '单局获得 50000 金币', 800, (_, r) => !!r && r.gold >= 50000),
  a('total_gold_10000', '原始积累', '累计获得 10000 金币', 100, (p) => p.totalGoldEarned >= 10000),
  a('total_gold_100000', '财富自由', '累计获得 100000 金币', 500, (p) => p.totalGoldEarned >= 100000),
  a('golden_10', '点金手', '累计击杀 10 根黄金韭菜', 60, (p, r) => killsOf(p, r, 'leek_gold') >= 10),
  a('golden_100', '掏空高净值', '累计击杀 100 根黄金韭菜', 200, (p, r) => killsOf(p, r, 'leek_gold') >= 100),
  a('anti_evo_1', '惊动韭菜', '触发 1 次韭菜进化', 30, (p, r) => p.totalAntiEvos + (r && !p.runCommitted ? r.antiEvos : 0) >= 1),
  a('anti_evo_10', '进化专家', '触发 10 次韭菜进化', 120, (p, r) => p.totalAntiEvos + (r && !p.runCommitted ? r.antiEvos : 0) >= 10),
  a('anti_evo_lv4', '亲手养大', '让一条进化路线达到觉醒', 150, (_, r) => !!r && r.maxEvoLevel >= 4),
  a('tech_1', '断供', '摧毁 1 个韭菜科技中心', 50, (p, r) => p.totalTech + (r && !p.runCommitted ? r.techDestroyed : 0) >= 1),
  a('tech_10', '科技毁灭者', '摧毁 10 个韭菜科技中心', 200, (p, r) => p.totalTech + (r && !p.runCommitted ? r.techDestroyed : 0) >= 10),
  a('core_1', '釜底抽薪', '摧毁 1 个韭菜进化核心', 80, (p, r) => p.totalCores + (r && !p.runCommitted ? r.coresDestroyed : 0) >= 1),
  a('scientist_30', '学术打压', '累计击杀 30 根科学家韭菜', 80, (p, r) => killsOf(p, r, 'leek_scientist') >= 30),
  a('evolve_1', '技术迭代', '完成第一次武器进化', 80, (p, r) => p.totalWeaponEvos + (r && !p.runCommitted ? r.weaponEvos : 0) >= 1),
  a('evolve_run_2', '双线并行', '单局进化 2 把武器', 200, (_, r) => !!r && r.weaponEvos >= 2),
  a('evolve_all', '镰刀博物馆', '全部进化武器都使用过', 800, (p) => EVOLVED_WEAPONS.every((w) => p.weaponBook[w.id]?.uses)),
  a('weapons_all', '镰刀收藏家', '解锁全部基础镰刀', 300, (p) => BASE_WEAPONS.every((w) => p.unlockedWeapons.includes(w.id))),
  a('ults_all', '大招全家桶', '解锁全部大招', 300, (p) => ULTS.every((u) => p.unlockedUlts.includes(u.id))),
  a('maps_all', '巡回收割', '解锁全部地图', 400, (p) => MAPS.every((m) => p.unlockedMaps.includes(m.id))),
  a('chars_all', '全员恶人', '解锁全部角色', 500, (p) => CHARACTERS.every((c) => p.unlockedChars.includes(c.id))),
  a('combo_1', '偶然发现', '发现第一个隐藏组合', 100, (p) => p.combos.length >= 1),
  a('combo_all', '组合大师', '发现全部隐藏组合', 600, (p) => COMBOS.every((c) => p.combos.includes(c.id))),
  a('ult_100', '清盘', '单次大招击杀 100 根韭菜', 100, (_, r) => !!r && r.maxUltKills >= 100),
  a('ult_500', '万刃归宗', '单次大招击杀 500 根韭菜', 500, (_, r) => !!r && r.maxUltKills >= 500),
  a('ult_10', '不讲武德', '单局释放 10 次大招', 100, (_, r) => !!r && r.ultCasts >= 10),
  a('combo_100', '连环收割', '连续击杀 100 次', 60, (_, r) => !!r && r.maxCombo >= 100),
  a('combo_500', '一气呵成', '连续击杀 500 次', 200, (_, r) => !!r && r.maxCombo >= 500),
  a('burst_50', '一网打尽', '单次收割 50 根', 100, (_, r) => !!r && r.maxBurst >= 50),
  a('boss_1', '大佬也是韭菜', '击败第一个 BOSS', 100, (p, r) => p.totalBossKills + (r && !p.runCommitted ? r.bossKills : 0) >= 1),
  a('boss_10', '职业屠龙', '累计击败 10 个 BOSS', 300, (p, r) => p.totalBossKills + (r && !p.runCommitted ? r.bossKills : 0) >= 10),
  a('boss_final', '韭菜克星', '击败最终 BOSS', 1000, (p, r) => p.chairmanKills > 0 || !!r?.chairmanDead),
  a('clear_map1', '新手毕业', '通关新手韭菜田', 100, (p) => p.clearedMaps.includes('map1')),
  a('clear_map2', '牛市赢家', '通关牛市收割场', 200, (p) => p.clearedMaps.includes('map2')),
  a('clear_all', '资本之巅', '通关全部地图', 1500, (p) => MAPS.every((m) => p.clearedMaps.includes(m.id))),
  a('uprising', '韭菜公敌', '引发一次韭菜起义', 60, (_, r) => !!r && r.uprisings > 0),
  a('events_10', '市场观察员', '单局经历 8 次随机事件', 100, (_, r) => !!r && r.events >= 8),
  a('chest_10', '开箱上瘾', '单局开启 10 个宝箱', 100, (_, r) => !!r && r.chests >= 10),
  a('level_40', '高级收割工程师', '单局达到 40 级', 150, (_, r) => !!r && r.level >= 40),
  a('survive_15', '长期主义', '单局存活 15 分钟', 200, (_, r) => !!r && r.time >= 900),
  a('leek_book_half', '田野调查', '韭菜图鉴解锁过半', 150, (p) => Object.keys(p.leekBook).length >= Math.floor(ENEMIES.length / 2)),
  a('leek_book_all', '韭菜学家', '韭菜图鉴全部解锁', 600, (p) => ENEMIES.every((e) => p.leekBook[e.id]) ),
  a('shop_max', '氪金战士', '任意永久强化升到满级', 100, (p) => SHOP_ITEMS.some((it) => (p.shop[it.id] ?? 0) >= it.max)),
  a('reverse', '反向收割', '累计被韭菜击杀 3 次', 30, (p) => p.totalDeaths >= 3),
  a('hedge_used', '对冲成功', '触发一次风险对冲协议', 60, (_, r) => !!r && r.revivesUsed > 0),
  a('no_hit_5', '片叶不沾身', '存活 5 分钟时未受到任何伤害', 300, (_, r) => !!r && r.time >= 300 && r.damageTaken === 0, true),
  a('void_500', '黑洞财务', '单局吞噬 500 根韭菜', 200, (_, r) => !!r && r.voidEaten >= 500, true),
  a('poor_win', '白手起家', '通关时永久强化总等级为 0', 500, (p, r) => !!r?.won && Object.values(p.shop).every((v) => v === 0), true),
];
export const ACH_MAP = Object.fromEntries(ACHIEVEMENTS.map((x) => [x.id, x]));
