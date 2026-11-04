import Phaser from 'phaser';
import { Weapon } from './Weapon';

/** 双刃 / 旋风 / 电锯 / 万刃风暴 / 机械死神：围绕玩家的持续判定 */
export class OrbitWeapon extends Weapon {
  private blades: Phaser.GameObjects.Image[] = [];
  private blades2: Phaser.GameObjects.Image[] = [];
  private angle = Math.random() * 6;
  private pulseT = 0;
  private volleyT = 3;
  private whirlImg: Phaser.GameObjects.Image | null = null;
  private whirlImg2: Phaser.GameObjects.Image | null = null;
  private flameT = 0;

  protected fire() {
    if (this.def.behavior === 'whirl') return this.whirlPulse();
    return true;
  }

  private ensure(list: Phaser.GameObjects.Image[], n: number, frame: string, scale: number, tint?: number) {
    const s = this.scene;
    while (list.length < n) {
      const img = s.add.image(this.p.x, this.p.y, 'atlas', frame).setScale(scale).setDepth(400000);
      if (tint !== undefined) img.setTint(tint);
      list.push(img);
    }
    while (list.length > n) list.pop()!.destroy();
  }

  private whirlPulse() {
    const p = this.p;
    const s = this.scene;
    const r = this.range;
    const hits = s.spatial.query(p.x, p.y, r);
    if (hits.length === 0) return false;
    for (const l of hits) {
      this.hit(l, 1);
      if (this.combo('flame_storm')) l.ignite(this.stats.damage * 0.8, 2, this.def.id);
    }
    this.fx.sfx.play('swing', 0.15);
    return true;
  }

  protected override tick(dt: number) {
    switch (this.def.behavior) {
      case 'twin':
        return this.tickTwin(dt);
      case 'whirl':
        return this.tickWhirl(dt);
      case 'saw':
        return this.tickSaw(dt);
      case 'blades':
        return this.tickBlades(dt);
      case 'mech':
        return this.tickMech(dt);
    }
  }

  private contact(x: number, y: number, r: number, cd: number, knock = 60) {
    const s = this.scene;
    for (const l of s.spatial.query(x, y, r)) {
      if (!this.canHit(l, cd)) continue;
      const d = Math.hypot(l.x - x, l.y - y) || 1;
      this.hit(l, 1, { srcX: x, srcY: y, knock, knockX: (l.x - x) / d, knockY: (l.y - y) / d });
    }
  }

  private tickTwin(dt: number) {
    const p = this.p;
    const n = this.count;
    this.ensure(this.blades, n, 'fx_blade', 2);
    this.angle += dt * (this.stats.speed ?? 3) * this.scene.atkMul;
    let R = this.range;
    if (this.special) {
      // Lv7：环绕半径脉冲外扩
      this.pulseT += dt;
      R *= 1 + 0.45 * Math.max(0, Math.sin(this.pulseT * 2.2));
    }
    for (let i = 0; i < n; i++) {
      const a = this.angle + (i / n) * Math.PI * 2;
      const x = p.x + Math.cos(a) * R;
      const y = p.y + Math.sin(a) * R;
      const img = this.blades[i];
      img.setPosition(x, y).setRotation(a + 1.2);
      this.contact(x, y, 18, this.stats.interval);
      if (Math.random() < dt * 8) this.fx.sprite('fx_blade', x, y, { rot: a + 1.2, scale: 1.8, life: 0.12, alpha: 0.4 });
    }
  }

  private tickWhirl(dt: number) {
    const p = this.p;
    const s = this.scene;
    if (!this.whirlImg) {
      this.whirlImg = s.add.image(p.x, p.y, 'atlas', 'fx_whirl').setDepth(-20000).setAlpha(0.85);
      this.whirlImg2 = s.add.image(p.x, p.y, 'atlas', 'fx_whirl').setDepth(-20000).setAlpha(0.5);
    }
    const r = this.range;
    const flame = this.combo('flame_storm');
    this.angle += dt * 8;
    const scale = r / 30;
    this.whirlImg.setPosition(p.x, p.y).setRotation(this.angle).setScale(scale);
    this.whirlImg2!.setPosition(p.x, p.y).setRotation(-this.angle * 0.7).setScale(scale * 0.7);
    if (flame) {
      this.whirlImg.setTint(0xff9248);
      this.whirlImg2!.setTint(0xffd23e);
      this.flameT -= dt;
      if (this.flameT <= 0) {
        this.flameT = 0.8;
        const a = Math.random() * Math.PI * 2;
        s.weapons.spawnBurnZone(p.x + Math.cos(a) * r * 0.8, p.y + Math.sin(a) * r * 0.8, 56, this.stats.damage, 2.5, this.def.id);
      }
    } else {
      this.whirlImg.clearTint();
      this.whirlImg2!.clearTint();
    }
    const pull = (this.stats.pull ?? 40) * s.pstats.pull;
    this.pulseT -= dt;
    if (this.pulseT <= 0) {
      this.pulseT = 0.12;
      for (const l of s.spatial.query(p.x, p.y, r * 1.25)) l.pull(p.x, p.y, pull, 0.12);
    }
  }

  private tickSaw(dt: number) {
    const p = this.p;
    const s = this.scene;
    const n = this.count;
    this.ensure(this.blades, n, 'fx_saw0', 1.6);
    const sr = this.stats.sawRadius ?? 26;
    const scale = sr / 12;
    const t = s.aimTarget;
    const base = t ? Math.atan2(t.y - p.y, t.x - p.x) : Math.atan2(p.faceY, p.faceX);
    const frame = Math.floor(s.simTime * 30) % 2 ? 'fx_saw0' : 'fx_saw1';
    for (let i = 0; i < n; i++) {
      const a = base + (i / n) * Math.PI * 2;
      const x = p.x + Math.cos(a) * this.range;
      const y = p.y + Math.sin(a) * this.range;
      const img = this.blades[i];
      img.setFrame(frame).setPosition(x, y).setScale(scale);
      img.rotation += dt * 30;
      for (const l of s.spatial.query(x, y, sr)) {
        if (!this.canHit(l, this.cooldownFast)) continue;
        this.hit(l, 1, { srcX: x, srcY: y, knock: 16, numberChance: 0.25 });
        if (this.special) l.ignite(this.stats.damage * 2, 1.6, this.def.id);
        if (Math.random() < 0.2) this.fx.burst('spark', l.x, l.y, 2);
      }
    }
    if (Math.random() < dt * 4) this.fx.sfx.play('hit', 0.1);
  }
  private get cooldownFast() {
    return this.stats.interval / this.scene.atkMul;
  }

  private tickBlades(dt: number) {
    const p = this.p;
    const s = this.scene;
    const golden = this.combo('golden_blades');
    const frame = golden ? 'fx_blade_gold' : 'fx_blade';
    const n = this.count;
    this.ensure(this.blades, n, frame, 2);
    this.ensure(this.blades2, Math.floor(n * 0.7), frame, 1.7);
    this.angle += dt * (this.stats.speed ?? 3.6) * s.atkMul;
    const R = this.range;
    const update = (list: Phaser.GameObjects.Image[], rad: number, dir: number) => {
      for (let i = 0; i < list.length; i++) {
        const a = dir * this.angle + (i / list.length) * Math.PI * 2;
        const x = p.x + Math.cos(a) * rad;
        const y = p.y + Math.sin(a) * rad;
        const img = list[i];
        img.setFrame(frame).setPosition(x, y).setRotation(a + 1.2 * dir);
        this.contact(x, y, 18, this.stats.interval, 40);
      }
    };
    update(this.blades, R, 1);
    update(this.blades2, R * 0.58, -1);
    if (golden && Math.random() < dt * 6) this.fx.burst('coin', p.x + (Math.random() - 0.5) * R, p.y + (Math.random() - 0.5) * R, 1);
    this.volleyT -= dt;
    if (this.volleyT <= 0) {
      this.volleyT = 2.8 / s.atkMul;
      const m = 16;
      for (let i = 0; i < m; i++) {
        const a = (i / m) * Math.PI * 2;
        s.projectiles.fire(frame, p.x, p.y, Math.cos(a) * 420, Math.sin(a) * 420, {
          dmg: this.stats.damage * 0.8, life: 0.9, pierce: 4, radius: 13, scale: 1.8, spin: 18,
          weaponId: this.def.id, dtype: 'melee', critRate: this.stats.critRate, critDmg: this.stats.critDmg,
        });
      }
      this.fx.sfx.play('swing', 0.1);
    }
  }

  private tickMech(dt: number) {
    const p = this.p;
    const s = this.scene;
    const n = this.count;
    this.ensure(this.blades, n, 'fx_saw0', 2);
    this.angle += dt * (this.stats.speed ?? 9);
    const R = this.range;
    const sr = this.stats.sawRadius ?? 36;
    const scale = sr / 12;
    const frame = Math.floor(s.simTime * 30) % 2 ? 'fx_saw0' : 'fx_saw1';
    for (let i = 0; i < n; i++) {
      const a = this.angle + (i / n) * Math.PI * 2;
      const x = p.x + Math.cos(a) * R;
      const y = p.y + Math.sin(a) * R;
      const img = this.blades[i];
      img.setFrame(frame).setPosition(x, y).setScale(scale);
      img.rotation += dt * 40;
      // 机械臂
      this.fx.beam(p.x, p.y, x, y, 0x7c8894, 3, 0.03);
      for (const l of s.spatial.query(x, y, sr)) {
        if (!this.canHit(l, this.stats.interval * 2)) continue;
        this.hit(l, 1, { srcX: x, srcY: y, knock: 24, numberChance: 0.2 });
        if (Math.random() < 0.15) this.fx.burst('spark', l.x, l.y, 2);
      }
    }
    if (Math.random() < dt * 5) this.fx.sfx.play('hit', 0.08);
  }

  override destroy() {
    for (const o of this.blades) o.destroy();
    for (const o of this.blades2) o.destroy();
    this.blades.length = this.blades2.length = 0;
    this.whirlImg?.destroy();
    this.whirlImg2?.destroy();
    this.whirlImg = this.whirlImg2 = null;
  }
}
