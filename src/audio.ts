import type { Phase } from './timer';

/**
 * Bips générés en direct via Web Audio API (aucun fichier son externe) :
 * fonctionne hors-ligne et évite toute question de droits sur des .wav.
 */
export class Beeper {
  private ctx: AudioContext | null = null;

  private context(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  /** À appeler de manière synchrone dans un gestionnaire de geste utilisateur (requis par iOS Safari). */
  unlock(): void {
    const ctx = this.context();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
  }

  private tone(freq: number, duration: number, startOffset = 0, volume = 0.25): void {
    const ctx = this.context();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const t0 = ctx.currentTime + startOffset;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  tick(): void {
    this.tone(880, 0.07, 0, 0.15);
  }

  phaseStart(phase: Phase): void {
    if (phase === 'exercise') {
      this.tone(988, 0.1, 0);
      this.tone(1319, 0.14, 0.12);
    } else {
      this.tone(587, 0.2, 0);
    }
  }

  finished(): void {
    [0, 0.16, 0.32, 0.52].forEach((t, i) => this.tone(659 + i * 110, 0.22, t));
  }
}
