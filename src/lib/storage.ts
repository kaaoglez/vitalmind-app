'use client';

const PREFIX = 'zenvida-';

export function getStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(PREFIX + key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export function setStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable
  }
}

export interface MoodLog {
  date: string;
  mood: string;
  emotions: string[];
  note?: string;
}

export interface WellnessData {
  waterGlasses: number;
  waterDate: string;
  moodLogs: MoodLog[];
  stressLevel: number;
  sleepAnswers: boolean[];
  completedChallenges: string[];
  challengeStreak: number;
  selfCareChecked: string[];
  exerciseMinutes: number;
  exerciseWeek: string;
}

const defaultWellnessData: WellnessData = {
  waterGlasses: 0,
  waterDate: '',
  moodLogs: [],
  stressLevel: 5,
  sleepAnswers: [],
  completedChallenges: [],
  challengeStreak: 0,
  selfCareChecked: [],
  exerciseMinutes: 0,
  exerciseWeek: '',
};

export function getWellnessData(): WellnessData {
  return getStorage<WellnessData>('wellness', defaultWellnessData);
}

export function setWellnessData(data: WellnessData): void {
  setStorage('wellness', data);
}

export function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function getWeekStr(): string {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - now.getDay() + 1);
  return start.toISOString().split('T')[0];
}

// --- Server Sync Functions ---

/**
 * Sync wellness data to the server (background).
 * localStorage is the source of truth for UI; server is the backup.
 */
export async function syncToServer(data: WellnessData): Promise<void> {
  try {
    const res = await fetch('/api/wellness', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      console.warn('Failed to sync wellness data to server');
    }
  } catch {
    console.warn('Failed to sync wellness data to server (network error)');
  }
}

/**
 * Sync wellness data from the server and merge with local data.
 * Server wins on conflicts. Returns the merged data.
 */
export async function syncFromServer(): Promise<WellnessData | null> {
  try {
    const res = await fetch('/api/wellness', {
      method: 'GET',
    });
    if (!res.ok) return null;

    const { data: serverData } = await res.json() as { data: WellnessData };
    if (!serverData) return null;

    const localData = getWellnessData();

    // Merge: server wins conflicts
    const merged: WellnessData = {
      // Water: use whichever has the more recent date, or server if same date
      waterGlasses: serverData.waterDate >= localData.waterDate ? serverData.waterGlasses : localData.waterGlasses,
      waterDate: serverData.waterDate >= localData.waterDate ? serverData.waterDate : localData.waterDate,
      // Mood logs: merge by date, server wins on same date
      moodLogs: mergeMoodLogs(localData.moodLogs, serverData.moodLogs),
      // Stress level: use server value (most recently synced)
      stressLevel: serverData.stressLevel,
      // Sleep answers: use server value
      sleepAnswers: serverData.sleepAnswers.length > 0 ? serverData.sleepAnswers : localData.sleepAnswers,
      // Challenges: union of both, server is source of truth
      completedChallenges: [...new Set([...serverData.completedChallenges, ...localData.completedChallenges])],
      challengeStreak: serverData.challengeStreak || localData.challengeStreak,
      // Self care: merge
      selfCareChecked: [...new Set([...serverData.selfCareChecked, ...localData.selfCareChecked])],
      // Exercise: use whichever has the more recent week
      exerciseMinutes: serverData.exerciseWeek >= localData.exerciseWeek ? serverData.exerciseMinutes : localData.exerciseMinutes,
      exerciseWeek: serverData.exerciseWeek >= localData.exerciseWeek ? serverData.exerciseWeek : localData.exerciseWeek,
    };

    // Save merged data locally
    setWellnessData(merged);
    return merged;
  } catch {
    console.warn('Failed to sync wellness data from server');
    return null;
  }
}

/**
 * Sync a single mood log to the server.
 */
export async function syncMoodLog(log: MoodLog): Promise<void> {
  try {
    const res = await fetch('/api/wellness/mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(log),
    });
    if (!res.ok) {
      console.warn('Failed to sync mood log to server');
    }
  } catch {
    console.warn('Failed to sync mood log to server (network error)');
  }
}

/**
 * Merge local and server mood logs. Server wins on same date.
 */
function mergeMoodLogs(local: MoodLog[], server: MoodLog[]): MoodLog[] {
  const logMap = new Map<string, MoodLog>();

  // Add local logs first
  for (const log of local) {
    logMap.set(log.date, log);
  }

  // Server overwrites on same date
  for (const log of server) {
    logMap.set(log.date, log);
  }

  return Array.from(logMap.values()).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Custom hook-like helper: wraps getWellnessData/setWellnessData
 * with automatic background sync to server.
 */
export function createWellnessSync() {
  let syncTimeout: ReturnType<typeof setTimeout> | null = null;

  const get = getWellnessData;

  const set = (data: WellnessData, sync = true) => {
    setWellnessData(data);
    if (sync) {
      // Debounce server sync by 1 second
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        syncToServer(data);
      }, 1000);
    }
  };

  const loadFromServer = async (): Promise<WellnessData | null> => {
    return syncFromServer();
  };

  const logMood = (log: MoodLog) => {
    syncMoodLog(log);
  };

  return { get, set, loadFromServer, logMood };
}
