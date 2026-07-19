export interface Settings {
  exercises: number;
  exerciseTime: number;
  restTime: number;
  sets: number;
  setRestTime: number;
}

export const DEFAULT_SETTINGS: Settings = {
  exercises: 8,
  exerciseTime: 30,
  restTime: 10,
  sets: 3,
  setRestTime: 60,
};

const STORAGE_KEY = 'supertimer.settings.v1';

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage indisponible (navigation privée, quota dépassé...) : on ignore
  }
}
