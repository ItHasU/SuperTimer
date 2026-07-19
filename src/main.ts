import './style.css';
import { loadSettings, saveSettings, type Settings } from './storage';
import { WorkoutTimer, type TickDetail, type PhaseDetail, type Step, type Phase } from './timer';
import { Beeper } from './audio';
import { WakeLockManager } from './wakeLock';

interface FieldDef {
  key: keyof Settings;
  suffix: string;
  min: number;
  max: number;
  step: number;
}

const FIELDS: FieldDef[] = [
  { key: 'exercises', suffix: '', min: 1, max: 30, step: 1 },
  { key: 'exerciseTime', suffix: ' s', min: 5, max: 600, step: 5 },
  { key: 'restTime', suffix: ' s', min: 0, max: 300, step: 5 },
  { key: 'sets', suffix: '', min: 1, max: 20, step: 1 },
  { key: 'setRestTime', suffix: ' s', min: 0, max: 900, step: 15 },
];

const PHASE_INFO: Record<Phase, { label: string; className: string }> = {
  exercise: { label: 'EXERCICE', className: 'phase-exercise' },
  rest: { label: 'PAUSE', className: 'phase-rest' },
  'set-rest': { label: 'PAUSE SÉRIE', className: 'phase-setrest' },
};

const settings: Settings = loadSettings();
const timer = new WorkoutTimer();
const beeper = new Beeper();
const wakeLock = new WakeLockManager();

const screenSetup = document.getElementById('screen-setup') as HTMLElement;
const screenRunning = document.getElementById('screen-running') as HTMLElement;
const screenDone = document.getElementById('screen-done') as HTMLElement;
const setupForm = document.getElementById('setup-form') as HTMLFormElement;
const setupSummary = document.getElementById('setup-summary') as HTMLElement;
const runningPhaseLabel = document.getElementById('running-phase-label') as HTMLElement;
const runningProgress = document.getElementById('running-progress') as HTMLElement;
const runningTime = document.getElementById('running-time') as HTMLElement;
const progressBarFill = document.getElementById('progress-bar-fill') as HTMLElement;
const btnPause = document.getElementById('btn-pause') as HTMLButtonElement;
const btnStop = document.getElementById('btn-stop') as HTMLButtonElement;
const btnRestart = document.getElementById('btn-restart') as HTMLButtonElement;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatBigTime(totalSeconds: number): string {
  if (totalSeconds < 60) return String(totalSeconds);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatSummaryDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s} s`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s} s`;
}

function totalWorkoutSeconds(s: Settings): number {
  return (
    s.sets * (s.exercises * s.exerciseTime + (s.exercises - 1) * s.restTime) +
    (s.sets - 1) * s.setRestTime
  );
}

function renderSetup(): void {
  for (const field of FIELDS) {
    const row = setupForm.querySelector(`[data-field="${field.key}"]`);
    if (!row) continue;
    const output = row.querySelector('[data-value]') as HTMLElement;
    output.textContent = `${settings[field.key]}${field.suffix}`;
    const decBtn = row.querySelector('[data-action="dec"]') as HTMLButtonElement;
    const incBtn = row.querySelector('[data-action="inc"]') as HTMLButtonElement;
    decBtn.disabled = settings[field.key] <= field.min;
    incBtn.disabled = settings[field.key] >= field.max;
  }
  setupSummary.textContent = `Durée totale estimée : ${formatSummaryDuration(totalWorkoutSeconds(settings))}`;
}

function bindStepper(button: HTMLButtonElement, apply: () => void): void {
  let holdTimeout: number | undefined;
  let holdInterval: number | undefined;
  const clearHold = () => {
    if (holdTimeout) window.clearTimeout(holdTimeout);
    if (holdInterval) window.clearInterval(holdInterval);
    holdTimeout = undefined;
    holdInterval = undefined;
  };
  button.addEventListener('click', apply);
  button.addEventListener('pointerdown', () => {
    clearHold();
    holdTimeout = window.setTimeout(() => {
      holdInterval = window.setInterval(apply, 90);
    }, 450);
  });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((evt) =>
    button.addEventListener(evt, clearHold)
  );
}

for (const field of FIELDS) {
  const row = setupForm.querySelector(`[data-field="${field.key}"]`);
  if (!row) continue;
  const decBtn = row.querySelector('[data-action="dec"]') as HTMLButtonElement;
  const incBtn = row.querySelector('[data-action="inc"]') as HTMLButtonElement;
  bindStepper(decBtn, () => {
    settings[field.key] = clamp(settings[field.key] - field.step, field.min, field.max);
    saveSettings(settings);
    renderSetup();
  });
  bindStepper(incBtn, () => {
    settings[field.key] = clamp(settings[field.key] + field.step, field.min, field.max);
    saveSettings(settings);
    renderSetup();
  });
}

function showScreen(screen: HTMLElement): void {
  for (const s of [screenSetup, screenRunning, screenDone]) {
    s.hidden = s !== screen;
  }
}

function progressLabelFor(step: Step): string {
  if (step.phase === 'set-rest') {
    return `Série ${step.setIndex}/${settings.sets} terminée`;
  }
  return `Exercice ${step.exerciseIndex}/${settings.exercises} · Série ${step.setIndex}/${settings.sets}`;
}

timer.addEventListener('phase', (event) => {
  const { step } = (event as CustomEvent<PhaseDetail>).detail;
  const info = PHASE_INFO[step.phase];
  screenRunning.classList.remove('phase-exercise', 'phase-rest', 'phase-setrest');
  screenRunning.classList.add(info.className);
  runningPhaseLabel.textContent = info.label;
  runningProgress.textContent = progressLabelFor(step);
  btnPause.textContent = '⏸';
  progressBarFill.style.width = '0%';
  beeper.phaseStart(step.phase);
  if (navigator.vibrate) navigator.vibrate(step.phase === 'exercise' ? 200 : 80);
});

timer.addEventListener('tick', (event) => {
  const { step, remaining } = (event as CustomEvent<TickDetail>).detail;
  runningTime.textContent = formatBigTime(remaining);
  const elapsed = step.duration - remaining;
  progressBarFill.style.width = `${step.duration > 0 ? clamp((elapsed / step.duration) * 100, 0, 100) : 100}%`;
  if (remaining > 0 && remaining <= 3) {
    beeper.tick();
    if (navigator.vibrate) navigator.vibrate(40);
  }
});

timer.addEventListener('finished', () => {
  void wakeLock.release();
  beeper.finished();
  if (navigator.vibrate) navigator.vibrate([120, 60, 120, 60, 200]);
  showScreen(screenDone);
});

setupForm.addEventListener('submit', (event) => {
  event.preventDefault();
  beeper.unlock();
  void wakeLock.acquire();
  showScreen(screenRunning);
  timer.start(settings);
});

btnPause.addEventListener('click', () => {
  if (timer.isPaused) {
    timer.resume();
    btnPause.textContent = '⏸';
    void wakeLock.acquire();
  } else {
    timer.pause();
    btnPause.textContent = '▶';
    void wakeLock.release();
  }
});

btnStop.addEventListener('click', () => {
  if (!confirm('Arrêter la séance en cours ?')) return;
  timer.stop();
  void wakeLock.release();
  showScreen(screenSetup);
  renderSetup();
});

btnRestart.addEventListener('click', () => {
  showScreen(screenSetup);
  renderSetup();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !screenRunning.hidden && !timer.isPaused) {
    void wakeLock.acquire();
  }
});

renderSetup();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // enregistrement du service worker impossible (hors ligne, non supporté...) : on ignore
    });
  });
}
