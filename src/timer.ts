import type { Settings } from './storage';

export type Phase = 'exercise' | 'rest' | 'set-rest';

export interface Step {
  phase: Phase;
  duration: number;
  exerciseIndex: number;
  setIndex: number;
}

export function buildPlan(settings: Settings): Step[] {
  const plan: Step[] = [];
  for (let set = 1; set <= settings.sets; set++) {
    for (let ex = 1; ex <= settings.exercises; ex++) {
      plan.push({ phase: 'exercise', duration: settings.exerciseTime, exerciseIndex: ex, setIndex: set });
      if (ex < settings.exercises) {
        plan.push({ phase: 'rest', duration: settings.restTime, exerciseIndex: ex, setIndex: set });
      }
    }
    if (set < settings.sets) {
      plan.push({
        phase: 'set-rest',
        duration: settings.setRestTime,
        exerciseIndex: settings.exercises,
        setIndex: set,
      });
    }
  }
  return plan;
}

export interface PhaseDetail {
  step: Step;
  stepIndex: number;
}

export interface TickDetail {
  step: Step;
  stepIndex: number;
  remaining: number;
}

/**
 * Minuteur piloté par horodatage (endAt = Date.now() + durée) plutôt que par
 * comptage de ticks, pour rester juste même si setInterval est retardé
 * (onglet en arrière-plan, throttling mobile...).
 */
export class WorkoutTimer extends EventTarget {
  private plan: Step[] = [];
  private stepIndex = -1;
  private endAt = 0;
  private remainingMsAtPause: number | null = null;
  private intervalId: number | null = null;
  private lastEmittedRemaining = -1;

  start(settings: Settings): void {
    this.plan = buildPlan(settings);
    this.stepIndex = -1;
    this.remainingMsAtPause = null;
    this.advance();
  }

  pause(): void {
    if (this.remainingMsAtPause !== null || this.intervalId === null) return;
    this.remainingMsAtPause = this.endAt - Date.now();
    this.clearTimer();
    this.dispatchEvent(new Event('pause'));
  }

  resume(): void {
    if (this.remainingMsAtPause === null) return;
    this.endAt = Date.now() + this.remainingMsAtPause;
    this.remainingMsAtPause = null;
    this.runInterval();
    this.dispatchEvent(new Event('resume'));
  }

  get isPaused(): boolean {
    return this.remainingMsAtPause !== null;
  }

  stop(): void {
    this.clearTimer();
    this.plan = [];
    this.stepIndex = -1;
    this.remainingMsAtPause = null;
  }

  private advance(): void {
    this.stepIndex++;
    if (this.stepIndex >= this.plan.length) {
      this.clearTimer();
      this.dispatchEvent(new Event('finished'));
      return;
    }
    const step = this.plan[this.stepIndex];
    this.endAt = Date.now() + step.duration * 1000;
    this.lastEmittedRemaining = -1;
    const detail: PhaseDetail = { step, stepIndex: this.stepIndex };
    this.dispatchEvent(new CustomEvent('phase', { detail }));
    this.runInterval();
    this.tick();
  }

  private runInterval(): void {
    this.clearTimer();
    this.intervalId = window.setInterval(() => this.tick(), 200);
  }

  private clearTimer(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick(): void {
    const step = this.plan[this.stepIndex];
    const remaining = Math.max(0, Math.ceil((this.endAt - Date.now()) / 1000));
    if (remaining !== this.lastEmittedRemaining) {
      this.lastEmittedRemaining = remaining;
      const detail: TickDetail = { step, stepIndex: this.stepIndex, remaining };
      this.dispatchEvent(new CustomEvent('tick', { detail }));
    }
    if (remaining <= 0) {
      this.advance();
    }
  }
}
