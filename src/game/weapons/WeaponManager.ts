import type { BattleScene } from '../scenes/BattleScene';
import { Weapon } from './Weapon';
import { MeleeWeapon } from './MeleeWeapon';
import { ProjectileWeapon } from './ProjectileWeapon';
import { OrbitWeapon } from './OrbitWeapon';
import { AreaWeapon } from './AreaWeapon';
import { BeamWeapon } from './BeamWeapon';
import { SummonWeapon } from './SummonWeapon';
import { WeaponEvolution } from './WeaponEvolution';
import { WEAPON_MAP } from '../data';
import type { WeaponDef } from '../types';
import { GameManager } from '../GameManager';

export const MAX_WEAPON_SLOTS = 6;
export const MAX_WEAPON_LEVEL = 8;

function create(scene: BattleScene, def: WeaponDef, level: number): Weapon {
  switch (def.behavior) {
    case 'swing':
    case 'giant':
    case 'golden':
      return new MeleeWeapon(scene, def, level);
    case 'boomerang':
    case 'frost':
    case 'eternal':
      return new ProjectileWeapon(scene, def, level);
    case 'twin':
    case 'whirl':
    case 'saw':
    case 'blades':
    case 'mech':
      return new OrbitWeapon(scene, def, level);
    case 'chain':
    case 'thor':
    case 'laser':
    case 'sun':
      return new BeamWeapon(scene, def, level);
    case 'clone':
      return new SummonWeapon(scene, def, level);
    default:
      return new AreaWeapon(scene, def, level);
  }
}

export class WeaponManager {
  owned: Weapon[] = [];
  evolution: WeaponEvolution;
  /** 独立于武器生命周期的火区（用于组合技） */
  private zoneHost: AreaWeapon | null = null;

  constructor(private scene: BattleScene) {
    this.evolution = new WeaponEvolution(scene);
  }

  get(id: string) {
    return this.owned.find((w) => w.def.id === id);
  }
  hasCombo(id: string) {
    return this.evolution.active.has(id);
  }

  add(id: string) {
    const def = WEAPON_MAP[id];
    if (!def || this.get(id)) return;
    const w = create(this.scene, def, 1);
    this.owned.push(w);
    this.scene.stats.weaponsUsed.push(id);
    GameManager.emit('weaponSeen', id);
    this.evolution.checkReady();
  }

  levelUp(id: string, times = 1) {
    const w = this.get(id);
    if (!w || w.def.evolved) return;
    w.level = Math.min(MAX_WEAPON_LEVEL, w.level + times);
    w.recalc();
    w.onLevelUp();
    this.evolution.checkReady();
  }

  /** 进化：旧武器销毁，换成攻击逻辑完全不同的新武器 */
  replace(oldId: string, newId: string) {
    const idx = this.owned.findIndex((w) => w.def.id === oldId);
    if (idx < 0) return;
    this.owned[idx].destroy();
    const w = create(this.scene, WEAPON_MAP[newId], MAX_WEAPON_LEVEL);
    this.owned[idx] = w;
    this.scene.stats.weaponsUsed.push(newId);
  }

  spawnBurnZone(x: number, y: number, r: number, dmg: number, life: number, _weaponId: string) {
    if (!this.zoneHost) {
      this.zoneHost = new AreaWeapon(this.scene, WEAPON_MAP.fire, 1);
    }
    this.zoneHost.stats.damage = dmg;
    this.zoneHost.addFireZone(x, y, r, life);
  }

  update(dt: number) {
    for (const w of this.owned) w.update(dt);
    if (this.zoneHost) (this.zoneHost as unknown as { tick(d: number): void }).tick(dt);
    this.evolution.update(dt);
  }

  destroy() {
    for (const w of this.owned) w.destroy();
    this.zoneHost?.destroy();
    this.owned.length = 0;
  }
}
