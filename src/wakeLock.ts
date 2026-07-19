/** Empêche l'écran de s'éteindre pendant la séance (best-effort, non bloquant si non supporté). */
export class WakeLockManager {
  private sentinel: WakeLockSentinel | null = null;

  async acquire(): Promise<void> {
    if (!('wakeLock' in navigator)) return;
    try {
      this.sentinel = await navigator.wakeLock.request('screen');
    } catch {
      // refusé (onglet en arrière-plan, batterie faible...) : on ignore
    }
  }

  async release(): Promise<void> {
    try {
      await this.sentinel?.release();
    } catch {
      // déjà relâché
    }
    this.sentinel = null;
  }
}
