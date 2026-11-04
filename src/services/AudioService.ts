import type { Settings } from './SaveService';

export type SfxName =
  | 'swing' | 'hit' | 'kill' | 'coin' | 'xp' | 'levelup' | 'chest' | 'evolve' | 'bossIntro' | 'bossAttack' | 'bossDie' | 'playerHurt' | 'playerDie'
  | 'zap' | 'fire' | 'ice' | 'hole' | 'laser' | 'ult' | 'warn' | 'click' | 'hover' | 'buy' | 'boom' | 'achievement' | 'codex' | 'pick';

// 每张地图一套调式、节奏与音色，全部由 Web Audio 实时合成，不依赖音频文件
interface Track {
  bpm: number;
  scale: number[];
  bass: number[];
  lead: number[];
  wave: OscillatorType;
  root: number;
  drums: boolean;
}
const TRACKS: Record<string, Track> = {
  menu: { bpm: 96, root: 57, scale: [0, 3, 5, 7, 10], bass: [0, 0, 3, 2], lead: [4, -1, 3, 2, -1, 1, 2, -1, 0, -1, 2, 3, 4, -1, 3, -1], wave: 'triangle', drums: false },
  map1: { bpm: 118, root: 60, scale: [0, 2, 4, 7, 9], bass: [0, 3, 4, 3], lead: [2, 3, 4, 3, 2, -1, 1, 2, 0, 1, 2, 4, 3, -1, 2, -1], wave: 'square', drums: true },
  map2: { bpm: 136, root: 62, scale: [0, 2, 4, 7, 9], bass: [0, 0, 4, 3], lead: [4, 4, 3, 4, 2, 3, 4, -1, 2, 2, 1, 2, 0, 1, 2, -1], wave: 'sawtooth', drums: true },
  map3: { bpm: 104, root: 52, scale: [0, 1, 3, 5, 8], bass: [0, 1, 0, 3], lead: [0, -1, 1, 0, 3, -1, 2, 1, 0, -1, -1, 1, 4, 3, 1, -1], wave: 'sawtooth', drums: true },
  map4: { bpm: 142, root: 57, scale: [0, 3, 5, 6, 10], bass: [0, 2, 0, 3], lead: [0, 2, 4, 2, 3, 1, 4, 3, 0, 4, 2, 4, 1, 3, 2, 4], wave: 'square', drums: true },
  map5: { bpm: 124, root: 65, scale: [0, 4, 5, 7, 11], bass: [0, 2, 3, 4], lead: [4, 3, 2, 3, 4, -1, 4, -1, 2, 1, 0, 1, 2, -1, 3, -1], wave: 'triangle', drums: true },
  map6: { bpm: 150, root: 50, scale: [0, 3, 5, 7, 10], bass: [0, 0, 2, 3], lead: [0, 0, 3, 0, 4, 3, 2, 0, 0, 0, 3, 0, 2, 3, 4, 3], wave: 'sawtooth', drums: true },
  map7: { bpm: 158, root: 53, scale: [0, 1, 4, 5, 7], bass: [0, 1, 3, 1], lead: [4, 2, 0, 2, 4, 3, 1, 3, 4, 2, 0, 2, 1, 3, 4, -1], wave: 'square', drums: true },
  boss: { bpm: 166, root: 52, scale: [0, 1, 3, 6, 7], bass: [0, 0, 1, 3], lead: [0, 3, 1, 3, 0, 4, 2, 4, 0, 3, 1, 3, 4, 2, 1, 2], wave: 'sawtooth', drums: true },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class AudioServiceImpl {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private settings: Settings | null = null;
  private lastPlay = new Map<string, number>();
  private track: Track | null = null;
  private trackId = '';
  private step = 0;
  private nextNote = 0;
  private timer: number | null = null;

  configure(s: Settings) {
    this.settings = s;
    this.applyVolumes();
    if (this.ctx && !s.music) this.haltSequencer();
    else if (this.ctx && s.music && this.trackId && this.timer === null) this.playBgm(this.trackId);
  }

  /** 浏览器要求用户手势后才能启动音频 */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.musicBus = this.ctx.createGain();
      this.sfxBus.connect(this.master);
      this.musicBus.connect(this.master);
      const len = this.ctx.sampleRate;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.applyVolumes();
      if (this.trackId) this.playBgm(this.trackId);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private applyVolumes() {
    if (!this.settings || !this.sfxBus || !this.musicBus) return;
    this.sfxBus.gain.value = this.settings.sfx ? this.settings.sfxVol : 0;
    this.musicBus.gain.value = this.settings.music ? this.settings.musicVol * 0.5 : 0;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, when = 0, bus: GainNode | null = this.sfxBus) {
    if (!this.ctx || !bus) return;
    const t = this.ctx.currentTime + when;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, filterFreq: number, when = 0, bus: GainNode | null = this.sfxBus, type: BiquadFilterType = 'lowpass') {
    if (!this.ctx || !bus || !this.noiseBuf) return;
    const t = this.ctx.currentTime + when;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = filterFreq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f).connect(g).connect(bus);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  /** 同名音效限频，几百个敌人同时受击也不会爆音 */
  play(name: SfxName, minGap = 0.05) {
    if (!this.ctx || !this.settings?.sfx) return;
    const now = this.ctx.currentTime;
    if (now - (this.lastPlay.get(name) ?? -1) < minGap) return;
    this.lastPlay.set(name, now);
    switch (name) {
      case 'swing': this.noise(0.13, 0.22, 2400, 0, this.sfxBus, 'bandpass'); this.tone(620, 0.09, 'triangle', 0.05, 240); break;
      case 'hit': this.tone(320, 0.05, 'square', 0.035, 170); break;
      case 'kill': this.noise(0.07, 0.11, 3200); this.tone(520, 0.06, 'square', 0.04, 880); break;
      case 'coin': this.tone(988, 0.05, 'square', 0.035); this.tone(1319, 0.09, 'square', 0.035, undefined, 0.045); break;
      case 'xp': this.tone(1200 + Math.random() * 300, 0.04, 'sine', 0.035); break;
      case 'pick': this.tone(660, 0.07, 'triangle', 0.08, 990); break;
      case 'levelup': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'square', 0.07, undefined, i * 0.07)); break;
      case 'chest': [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.09, undefined, i * 0.06)); break;
      case 'evolve':
        [262, 330, 392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.28, 'sawtooth', 0.055, undefined, i * 0.07));
        this.noise(0.8, 0.14, 5000, 0.2);
        break;
      case 'bossIntro': this.tone(70, 1.1, 'sawtooth', 0.2, 42); this.tone(110, 1, 'square', 0.08, 55, 0.2); this.noise(1, 0.2, 400); break;
      case 'bossAttack': this.tone(150, 0.3, 'sawtooth', 0.13, 60); this.noise(0.2, 0.14, 900); break;
      case 'bossDie':
        for (let i = 0; i < 6; i++) this.noise(0.42, 0.26, 900, i * 0.18);
        [784, 659, 523, 392, 262].forEach((f, i) => this.tone(f, 0.35, 'square', 0.07, undefined, 0.5 + i * 0.13));
        break;
      case 'playerHurt': this.tone(190, 0.15, 'sawtooth', 0.13, 90); break;
      case 'playerDie': [392, 330, 262, 196, 131].forEach((f, i) => this.tone(f, 0.34, 'square', 0.09, undefined, i * 0.17)); break;
      case 'zap': this.noise(0.09, 0.14, 6000, 0, this.sfxBus, 'highpass'); this.tone(1500, 0.08, 'sawtooth', 0.045, 300); break;
      case 'fire': this.noise(0.28, 0.13, 900); break;
      case 'ice': this.tone(1760, 0.11, 'sine', 0.07, 2600); this.noise(0.08, 0.06, 7000, 0, this.sfxBus, 'highpass'); break;
      case 'hole': this.tone(220, 0.55, 'sine', 0.13, 50); break;
      case 'laser': this.tone(1800, 0.3, 'sawtooth', 0.05, 500); break;
      case 'boom': this.noise(0.3, 0.26, 700); this.tone(100, 0.26, 'sine', 0.2, 40); break;
      case 'ult':
        this.tone(55, 1.2, 'sawtooth', 0.18, 220);
        this.noise(1.2, 0.2, 2200);
        [523, 784, 1047].forEach((f, i) => this.tone(f, 0.5, 'square', 0.06, undefined, 0.25 + i * 0.08));
        break;
      case 'warn': [880, 660, 880, 660].forEach((f, i) => this.tone(f, 0.12, 'square', 0.07, undefined, i * 0.14)); break;
      case 'click': this.tone(880, 0.05, 'square', 0.06); break;
      case 'hover': this.tone(1320, 0.025, 'sine', 0.025); break;
      case 'buy': this.tone(784, 0.07, 'square', 0.07); this.tone(1175, 0.15, 'square', 0.07, undefined, 0.07); break;
      case 'achievement': [659, 784, 988, 1319].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.1, undefined, i * 0.09)); break;
      case 'codex': [988, 1319].forEach((f, i) => this.tone(f, 0.12, 'sine', 0.09, undefined, i * 0.08)); break;
    }
  }

  playBgm(id: string) {
    const changed = id !== this.trackId || this.timer === null;
    this.trackId = id;
    if (!this.ctx || !this.settings?.music || !changed) return;
    this.haltSequencer();
    this.track = TRACKS[id] ?? TRACKS.menu;
    this.step = 0;
    this.nextNote = this.ctx.currentTime + 0.05;
    this.timer = window.setInterval(() => this.schedule(), 60);
  }
  stopBgm() {
    this.haltSequencer();
    this.trackId = '';
  }
  private haltSequencer() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  private schedule() {
    if (!this.ctx || !this.track) return;
    const tr = this.track;
    const stepDur = 60 / tr.bpm / 2;
    while (this.nextNote < this.ctx.currentTime + 0.2) {
      const when = this.nextNote - this.ctx.currentTime;
      const s = this.step;
      if (s % 8 === 0 || s % 8 === 3 || s % 8 === 6) {
        const b = tr.bass[Math.floor(s / 8) % tr.bass.length];
        this.tone(midi(tr.root - 24 + tr.scale[b % tr.scale.length]), stepDur * 1.6, 'triangle', 0.2, undefined, when, this.musicBus);
      }
      const n = tr.lead[s % tr.lead.length];
      if (n >= 0) {
        const octave = Math.floor(s / 32) % 2 === 1 ? 12 : 0;
        this.tone(midi(tr.root + tr.scale[n % tr.scale.length] + octave), stepDur * 0.9, tr.wave, 0.05, undefined, when, this.musicBus);
      }
      if (tr.drums) {
        if (s % 4 === 0) this.tone(120, 0.12, 'sine', 0.26, 40, when, this.musicBus);
        if (s % 4 === 2) this.noise(0.08, 0.13, 3000, when, this.musicBus, 'highpass');
        if (s % 2 === 1) this.noise(0.03, 0.05, 8000, when, this.musicBus, 'highpass');
      }
      this.nextNote += stepDur;
      this.step++;
    }
  }
}
export const AudioService = new AudioServiceImpl();
