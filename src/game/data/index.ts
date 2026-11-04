import weaponsJson from './weapons.json';
import skillsJson from './skills.json';
import enemiesJson from './enemies.json';
import bossesJson from './bosses.json';
import mapsJson from './maps.json';
import eventsJson from './events.json';
import evolutionsJson from './evolutions.json';
import type {
  BossDef, ComboDef, EnemyDef, EventDef, EvoLevelDef, EvoLineDef, MapDef, PassiveDef, SpecialDef, StatDef, UltDef, WeaponDef, WeaponEvoDef,
} from '../types';

export const WEAPONS = weaponsJson as unknown as WeaponDef[];
export const WEAPON_MAP: Record<string, WeaponDef> = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
export const BASE_WEAPONS = WEAPONS.filter((w) => !w.evolved);
export const EVOLVED_WEAPONS = WEAPONS.filter((w) => w.evolved);

export const PASSIVES = skillsJson.passives as unknown as PassiveDef[];
export const PASSIVE_MAP: Record<string, PassiveDef> = Object.fromEntries(PASSIVES.map((p) => [p.id, p]));
export const STATS = skillsJson.stats as StatDef[];
export const SPECIALS = skillsJson.specials as SpecialDef[];
export const ULTS = skillsJson.ultimates as UltDef[];
export const ULT_MAP: Record<string, UltDef> = Object.fromEntries(ULTS.map((u) => [u.id, u]));

export const ENEMIES = enemiesJson as unknown as EnemyDef[];
export const ENEMY_MAP: Record<string, EnemyDef> = Object.fromEntries(ENEMIES.map((e) => [e.id, e]));
export const BOSSES = bossesJson as unknown as BossDef[];
export const BOSS_MAP: Record<string, BossDef> = Object.fromEntries(BOSSES.map((b) => [b.id, b]));

export const MAPS = mapsJson as unknown as MapDef[];
export const MAP_MAP: Record<string, MapDef> = Object.fromEntries(MAPS.map((m) => [m.id, m]));
export const EVENTS = eventsJson as unknown as EventDef[];

export const WEAPON_EVOS = evolutionsJson.weapons as WeaponEvoDef[];
export const COMBOS = evolutionsJson.combos as ComboDef[];
export const EVO_LEVELS = evolutionsJson.levels as EvoLevelDef[];
export const EVO_LINES = evolutionsJson.lines as unknown as EvoLineDef[];
export const EVO_CHATTER = evolutionsJson.chatter as string[];

export function mapsOfEnemy(id: string): string[] {
  return MAPS.filter((m) => m.flags.allKinds || m.phases.some((ph) => id in ph.pool)).map((m) => m.name);
}
