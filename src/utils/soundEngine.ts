/**
 * MTL Football Intelligence Hub - Synthesized Tactical Audio Engine
 * Pure Web Audio API: 100% autonomous, zero external mp3 dependencies,
 * responsive mechanical touch clicks, dial feedback, mechanical loader music & app opening chords.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private loaderLoopTimer: number | null = null;
  private isLoaderPlaying: boolean = false;
  private initialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mtl_sound_enabled');
      this.isMuted = saved === 'false';

      // Unlock AudioContext on first user interaction
      const unlock = () => {
        this.initContext();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
    }
  }

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.initialized = true;
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('mtl_sound_enabled', String(!this.isMuted));
    }
    if (!this.isMuted) {
      this.playTactileClick();
    }
    return !this.isMuted;
  }

  public getSoundEnabled(): boolean {
    return !this.isMuted;
  }

  /**
   * 1. Tactical Mechanical Click Sound
   * Crisp relay switch click for buttons, dials, tabs, and toggles
   */
  public playTactileClick() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // High transient snap
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1400, now);
      osc1.frequency.exponentialRampToValueAtTime(280, now + 0.025);

      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      // Low mechanical thud
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(180, now);
      osc2.frequency.exponentialRampToValueAtTime(50, now + 0.035);

      gain2.gain.setValueAtTime(0.15, now);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.03);
      osc2.start(now);
      osc2.stop(now + 0.04);
    } catch {}
  }

  /**
   * 2. Rotary / Touch Dial Beep
   * Used for incrementing values, slider dragging, selecting players & dial pads
   */
  public playDialBeep(freq: number = 720) {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.15, now + 0.04);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  /**
   * 3. App Opening Music & Harmonic Chime
   * Celestial sci-fi harmonic chord announcing app readiness
   */
  public playAppOpeningSound() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [
        { freq: 220.0, time: 0.0, dur: 1.2, gain: 0.12 }, // A3 foundation
        { freq: 329.63, time: 0.1, dur: 1.4, gain: 0.10 }, // E4
        { freq: 440.0, time: 0.2, dur: 1.6, gain: 0.12 }, // A4
        { freq: 554.37, time: 0.35, dur: 1.8, gain: 0.14 }, // C#5
        { freq: 659.25, time: 0.5, dur: 2.0, gain: 0.12 }, // E5
        { freq: 880.0, time: 0.65, dur: 2.2, gain: 0.15 }, // A5 high shimmer
      ];

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.freq, now + n.time);

        gain.gain.setValueAtTime(0.001, now + n.time);
        gain.gain.linearRampToValueAtTime(n.gain, now + n.time + 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + n.time);
        osc.stop(now + n.time + n.dur);
      });

      // Sub-bass sweep
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(75, now);
      sub.frequency.exponentialRampToValueAtTime(110, now + 0.8);

      subGain.gain.setValueAtTime(0.15, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      sub.connect(subGain);
      subGain.connect(ctx.destination);
      sub.start(now);
      sub.stop(now + 1.2);
    } catch {}
  }

  /**
   * 4. Mechanical Loader Music & Tactical Pulse
   * Sci-fi mechanical telemetry loop with gears, clicks and pulse
   */
  public startMechanicalLoaderMusic() {
    if (this.isMuted || this.isLoaderPlaying) return;
    const ctx = this.initContext();
    if (!ctx) return;

    this.isLoaderPlaying = true;
    let step = 0;

    const playMechanicalBeat = () => {
      if (!this.isLoaderPlaying || this.isMuted) return;
      const now = ctx.currentTime;

      // 1. Mechanical ticking gear
      const tick = ctx.createOscillator();
      const tickGain = ctx.createGain();
      tick.type = 'square';
      const tickFreq = (step % 2 === 0) ? 1800 : 2200;
      tick.frequency.setValueAtTime(tickFreq, now);

      tickGain.gain.setValueAtTime(0.04, now);
      tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      tick.connect(tickGain);
      tickGain.connect(ctx.destination);
      tick.start(now);
      tick.stop(now + 0.035);

      // 2. Sub computing hum on quarter beats
      if (step % 4 === 0) {
        const hum = ctx.createOscillator();
        const humGain = ctx.createGain();
        hum.type = 'sawtooth';
        // Cyber harmonic frequencies
        const freqs = [110, 130.81, 146.83, 164.81];
        hum.frequency.setValueAtTime(freqs[(step / 4) % freqs.length], now);

        // Low-pass filter for rich muffled mechanical rumble
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.2);

        humGain.gain.setValueAtTime(0.06, now);
        humGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        hum.connect(filter);
        filter.connect(humGain);
        humGain.connect(ctx.destination);

        hum.start(now);
        hum.stop(now + 0.25);
      }

      step++;
      this.loaderLoopTimer = window.setTimeout(playMechanicalBeat, 180);
    };

    playMechanicalBeat();
  }

  public stopMechanicalLoaderMusic() {
    this.isLoaderPlaying = false;
    if (this.loaderLoopTimer !== null) {
      clearTimeout(this.loaderLoopTimer);
      this.loaderLoopTimer = null;
    }
  }

  /**
   * 5. Success / Verified Chime
   */
  public playSuccess() {
    if (this.isMuted) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.12, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.3);
      });
    } catch {}
  }
}

export const soundEngine = new SoundEngine();
export default soundEngine;
