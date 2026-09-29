// Procedural Web Audio API sound effects
// Instant, zero-latency, works across all browsers without external asset dependencies

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Explicit user-gesture trigger to unlock audio restrictions on iOS Safari and mobile Chrome
  public unlockAudio(): void {
    if (typeof window === "undefined") return;
    const ctx = this.getContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }

  public toggleSound(force?: boolean): boolean {
    this.enabled = force !== undefined ? force : !this.enabled;
    if (this.enabled) {
      this.unlockAudio();
    }
    return this.enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // Happy, eager tactile buzzer chime:
  // Bright upward bouncy two-tone (G5 -> E6) with crystal chime harmonics & snappy tactile punch
  public playBuzzer() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Layer 1: Tactile punch - warm rounded pop at finger-press moment
      const oscPop = ctx.createOscillator();
      const gainPop = ctx.createGain();
      oscPop.type = "sine";
      oscPop.frequency.setValueAtTime(320, now);
      oscPop.frequency.exponentialRampToValueAtTime(160, now + 0.04);

      gainPop.gain.setValueAtTime(0.35, now);
      gainPop.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      oscPop.connect(gainPop);
      gainPop.connect(ctx.destination);
      oscPop.start(now);
      oscPop.stop(now + 0.05);

      // Layer 2: Eager springboard chime (G5, 783.99 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(783.99, now);
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.06);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.4, now + 0.005);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.13);

      // Layer 3: Happy arrival chime (E6, 1318.51 Hz) - vibrant, uplifting, and eager
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      const t2 = now + 0.055;
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(1318.51, t2);
      osc2.frequency.exponentialRampToValueAtTime(1396.91, t2 + 0.08);

      gain2.gain.setValueAtTime(0, t2);
      gain2.gain.linearRampToValueAtTime(0.45, t2 + 0.008);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.28);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(t2);
      osc2.stop(t2 + 0.3);

      // Layer 4: Crystal bell harmonic (E7, 2637 Hz) for sparkling clarity
      const oscSparkle = ctx.createOscillator();
      const gainSparkle = ctx.createGain();
      oscSparkle.type = "sine";
      oscSparkle.frequency.setValueAtTime(2637, t2);

      gainSparkle.gain.setValueAtTime(0, t2);
      gainSparkle.gain.linearRampToValueAtTime(0.18, t2 + 0.005);
      gainSparkle.gain.exponentialRampToValueAtTime(0.001, t2 + 0.22);

      oscSparkle.connect(gainSparkle);
      gainSparkle.connect(ctx.destination);
      oscSparkle.start(t2);
      oscSparkle.stop(t2 + 0.23);
    } catch {
      // AudioContext policy suppression fallback
    }
  }

  // Correct Answer: Bright cheerful arpeggiated major triad
  public playCorrect() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      const now = ctx.currentTime;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * 0.08;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch {}
  }

  // Incorrect Answer: Low dual-tone buzzer buzz
  public playWrong() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [140, 147].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.46);
      });
    } catch {}
  }

  // Ticking sound for countdown clock
  public playTick() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  // Lock-In chime for first buzzer winner
  public playLockIn() {
    if (!this.enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {}
  }
}

export const sounds = new SoundManager();
