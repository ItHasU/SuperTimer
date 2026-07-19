/**
 * Bips générés en direct via Web Audio API (aucun fichier son externe) :
 * fonctionne hors-ligne et évite toute question de droits sur des .wav.
 */
export class Beeper {
  private ctx: AudioContext | null = null;
  private output: AudioNode | null = null;

  private context(): AudioContext {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      this.ctx = ctx;

      // Compresseur/limiteur : écrase la dynamique pour pouvoir pousser un gain de
      // rattrapage élevé sans écrêtage, ce qui rend les sons plus "forts" à volume
      // système égal.
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -28;
      compressor.knee.value = 6;
      compressor.ratio.value = 16;
      compressor.attack.value = 0.002;
      compressor.release.value = 0.12;

      const makeup = ctx.createGain();
      makeup.gain.value = 2.4;

      compressor.connect(makeup);
      makeup.connect(ctx.destination);
      this.output = compressor;
    }
    return this.ctx;
  }

  /** À appeler de manière synchrone dans un gestionnaire de geste utilisateur (requis par iOS Safari). */
  unlock(): void {
    // Force la catégorie "lecture" pour que le son sorte même si le bouton silencieux est activé (iOS 17+).
    const audioSession = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (audioSession) {
      audioSession.type = 'playback';
    }
    const ctx = this.context();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
  }

  private tone(freq: number, duration: number, startOffset = 0, volume = 0.5): void {
    const ctx = this.context();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(this.output as AudioNode);
    const t0 = ctx.currentTime + startOffset;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  /** Note jouée à chacune des 3 dernières secondes, avec une hauteur qui monte à l'approche de zéro. */
  tick(secondsLeft: number): void {
    const freq = { 3: 784, 2: 880, 1: 988 }[secondsLeft] ?? 880;
    this.tone(freq, 0.12, 0, 0.5);
  }

  /** Double bip joué au tout début, avec le décompte de préparation. */
  prepare(): void {
    this.tone(659, 0.12, 0, 0.5);
    this.tone(659, 0.12, 0.18, 0.5);
  }

  /** Mélodie descendante jouée quand un exercice se termine (repos ou pause de série qui suit). */
  exerciseEnd(): void {
    this.tone(784, 0.14, 0, 0.5);
    this.tone(659, 0.14, 0.13, 0.5);
    this.tone(523, 0.24, 0.26, 0.5);
  }

  /** Mélodie ascendante et rapide jouée quand une pause se termine (reprise d'un exercice). */
  restEnd(): void {
    this.tone(523, 0.1, 0, 0.5);
    this.tone(659, 0.1, 0.1, 0.5);
    this.tone(784, 0.2, 0.2, 0.5);
  }

  /** Petite fanfare jouée au démarrage d'une nouvelle série. */
  setStart(): void {
    this.tone(523, 0.12, 0, 0.55);
    this.tone(784, 0.12, 0.12, 0.55);
    this.tone(1047, 0.3, 0.24, 0.55);
  }

  /** Alarme de fin de séance : sonnerie insistante pour être audible même en poche. */
  finished(): void {
    const chime = (start: number) => [0, 0.16, 0.32, 0.52].forEach((t, i) => this.tone(659 + i * 110, 0.24, start + t, 0.6));
    chime(0);
    chime(0.9);
    this.tone(1318, 0.6, 1.8, 0.6);
  }
}
