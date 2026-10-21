import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  loadProgressSummary,
  loadRewardSummary,
  remainingStudySeconds,
} from "@/services/progress";
import {
  createStudyTimer,
  DEFAULT_STUDY_DURATION_MINUTES,
  EMPTY_STUDY_TIMER,
  markStudyTimerFlushed,
  setStudyTimerForeground,
  stopStudyTimer,
  touchStudyTimer,
  type StudyTimerState,
} from "@/services/studyTimer";
import type { AppSettings, ProgressSummary, RewardSummary } from "@/types/progress";

export const DEFAULT_SETTINGS: AppSettings = {
  musicEnabled: true,
  soundEnabled: true,
  hapticsEnabled: true,
  musicVolume: 0.7,
  voiceVolume: 1,
  effectsVolume: 0.8,
  studyDurationMinutes: DEFAULT_STUDY_DURATION_MINUTES,
};

const EMPTY_PROGRESS: ProgressSummary = {
  todayLearned: 0,
  streakDays: 0,
  masteredCount: 0,
  familiarCount: 0,
  unfamiliarCount: 0,
  totalSeen: 0,
  unlockedAdventureLevel: 0,
  currentLevelLearned: 0,
  currentLevelSize: 10,
  activeSeconds: 0,
  correctRate: 0,
  lifetimeStars: 0,
  gameRoundsCompleted: 0,
};

const EMPTY_REWARDS: RewardSummary = {
  stars: 0,
  selectedPetId: "turtle",
  reward: { lastDailyRewardDate: null, unlockedAchievementIds: [] },
};

interface AppStore {
  hydrated: boolean;
  databaseHydrated: boolean;
  preferencesHydrated: boolean;
  settings: AppSettings;
  progress: ProgressSummary;
  rewards: RewardSummary;
  study: StudyTimerState;
  hydrateAppState: () => Promise<void>;
  refreshAppState: () => Promise<void>;
  setSettings: (settings: Partial<AppSettings>) => void;
  setProgressSummary: (progress: ProgressSummary) => void;
  setRewardSummary: (rewards: RewardSummary) => void;
  startStudy: (sessionId: string, nowMs?: number, durationMinutes?: number) => Promise<void>;
  markInteraction: (nowMs?: number) => void;
  setForeground: (foreground: boolean, nowMs?: number) => void;
  markStudyFlushed: (nowMs?: number, activeMs?: number) => void;
  stopStudy: (nowMs?: number) => StudyTimerState;
}

function clampVolume(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

function mergeSettings(current: AppSettings, update: Partial<AppSettings>): AppSettings {
  return {
    ...current,
    ...update,
    musicVolume: update.musicVolume === undefined
      ? current.musicVolume
      : clampVolume(update.musicVolume),
    voiceVolume: update.voiceVolume === undefined
      ? current.voiceVolume
      : clampVolume(update.voiceVolume),
    effectsVolume: update.effectsVolume === undefined
      ? current.effectsVolume
      : clampVolume(update.effectsVolume),
    studyDurationMinutes:
      update.studyDurationMinutes !== undefined && update.studyDurationMinutes > 0
        ? update.studyDurationMinutes
        : current.studyDurationMinutes,
  };
}

async function loadDatabaseState(): Promise<{
  progress: ProgressSummary;
  rewards: RewardSummary;
}> {
  const [progress, rewards] = await Promise.all([loadProgressSummary(), loadRewardSummary()]);
  return { progress, rewards };
}

const memoryStorage = {
  getItem: async () => null,
  setItem: async () => undefined,
  removeItem: async () => undefined,
};

function createPreferenceStorage() {
  // Web static/SSR render runs in Node and has no window/localStorage.
  if (typeof window === "undefined") {
    return memoryStorage;
  }
  return AsyncStorage;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      hydrated: false,
      databaseHydrated: false,
      preferencesHydrated: false,
      settings: DEFAULT_SETTINGS,
      progress: EMPTY_PROGRESS,
      rewards: EMPTY_REWARDS,
      study: EMPTY_STUDY_TIMER,
      hydrateAppState: async () => {
        const snapshot = await loadDatabaseState();
        set((state) => ({
          ...snapshot,
          databaseHydrated: true,
          hydrated: state.preferencesHydrated,
        }));
      },
      refreshAppState: async () => {
        set(await loadDatabaseState());
      },
      setSettings: (settings) => {
        set((state) => ({ settings: mergeSettings(state.settings, settings) }));
      },
      setProgressSummary: (progress) => set({ progress }),
      setRewardSummary: (rewards) => set({ rewards }),
      startStudy: async (sessionId, nowMs = Date.now(), durationMinutes) => {
        // Prefer an explicit remaining budget so callers can avoid the default full-day window race.
        const remainingSeconds = durationMinutes !== undefined
          ? Math.max(0, durationMinutes) * 60
          : await remainingStudySeconds(get().settings.studyDurationMinutes);
        set({ study: createStudyTimer(sessionId, nowMs, remainingSeconds / 60) });
      },
      markInteraction: (nowMs = Date.now()) => {
        set((state) => ({ study: touchStudyTimer(state.study, nowMs) }));
      },
      setForeground: (foreground, nowMs = Date.now()) => {
        set((state) => ({
          study: setStudyTimerForeground(state.study, foreground, nowMs),
        }));
      },
      markStudyFlushed: (nowMs = Date.now(), activeMs) => {
        set((state) => ({
          study: markStudyTimerFlushed(state.study, nowMs, activeMs),
        }));
      },
      stopStudy: (nowMs = Date.now()) => {
        const stopped = stopStudyTimer(get().study, nowMs);
        set({ study: stopped });
        return stopped;
      },
    }),
    {
      name: "character-adventure-preferences",
      storage: createJSONStorage(createPreferenceStorage),
      partialize: (state) => ({ settings: state.settings }),
      merge: (persisted, current) => {
        const saved = persisted as { settings?: Partial<AppSettings> };
        return {
          ...current,
          settings: mergeSettings(current.settings, saved.settings ?? {}),
        };
      },
      onRehydrateStorage: () => () => {
        useAppStore.setState((state) => ({
          preferencesHydrated: true,
          hydrated: state.databaseHydrated,
        }));
      },
    },
  ),
);

export const selectHydrated = (state: AppStore): boolean => state.hydrated;
export const selectSettings = (state: AppStore): AppSettings => state.settings;
export const selectProgress = (state: AppStore): ProgressSummary => state.progress;
export const selectRewards = (state: AppStore): RewardSummary => state.rewards;
export const selectStudyTimer = (state: AppStore): StudyTimerState => state.study;
