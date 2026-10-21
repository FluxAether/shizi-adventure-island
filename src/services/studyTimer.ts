export const DEFAULT_STUDY_DURATION_MINUTES = 12;
export const STUDY_IDLE_TIMEOUT_MS = 30_000;
export const STUDY_FLUSH_INTERVAL_MS = 15_000;

export interface StudyTimerState {
  sessionId: string | null;
  running: boolean;
  foreground: boolean;
  targetDurationMs: number;
  accumulatedActiveMs: number;
  lastFlushedActiveMs: number;
  lastInteractionAtMs: number | null;
  lastAccountedAtMs: number | null;
}

export const EMPTY_STUDY_TIMER: StudyTimerState = {
  sessionId: null,
  running: false,
  foreground: true,
  targetDurationMs: DEFAULT_STUDY_DURATION_MINUTES * 60_000,
  accumulatedActiveMs: 0,
  lastFlushedActiveMs: 0,
  lastInteractionAtMs: null,
  lastAccountedAtMs: null,
};

export function createStudyTimer(
  sessionId: string,
  nowMs: number,
  durationMinutes = DEFAULT_STUDY_DURATION_MINUTES,
): StudyTimerState {
  const safeDuration = Number.isFinite(durationMinutes) && durationMinutes >= 0
    ? durationMinutes
    : DEFAULT_STUDY_DURATION_MINUTES;

  return {
    sessionId,
    running: true,
    foreground: true,
    targetDurationMs: safeDuration * 60_000,
    accumulatedActiveMs: 0,
    lastFlushedActiveMs: 0,
    lastInteractionAtMs: nowMs,
    lastAccountedAtMs: nowMs,
  };
}

export function getEffectiveActiveMs(state: StudyTimerState, nowMs: number): number {
  if (
    !state.running ||
    !state.foreground ||
    state.lastAccountedAtMs === null ||
    state.lastInteractionAtMs === null
  ) {
    return state.accumulatedActiveMs;
  }

  const now = Math.max(nowMs, state.lastAccountedAtMs);
  const idleAt = state.lastInteractionAtMs + STUDY_IDLE_TIMEOUT_MS;
  const countedUntil = Math.max(state.lastAccountedAtMs, Math.min(now, idleAt));
  return state.accumulatedActiveMs + countedUntil - state.lastAccountedAtMs;
}

export function settleStudyTimer(state: StudyTimerState, nowMs: number): StudyTimerState {
  const now = Math.max(nowMs, state.lastAccountedAtMs ?? nowMs);
  const stillActive =
    state.running &&
    state.foreground &&
    state.lastInteractionAtMs !== null &&
    now < state.lastInteractionAtMs + STUDY_IDLE_TIMEOUT_MS;

  return {
    ...state,
    accumulatedActiveMs: getEffectiveActiveMs(state, now),
    lastAccountedAtMs: stillActive ? now : null,
  };
}

export function touchStudyTimer(state: StudyTimerState, nowMs: number): StudyTimerState {
  const settled = settleStudyTimer(state, nowMs);
  if (!settled.running) {
    return settled;
  }

  return {
    ...settled,
    lastInteractionAtMs: nowMs,
    lastAccountedAtMs: settled.foreground ? nowMs : null,
  };
}

export function setStudyTimerForeground(
  state: StudyTimerState,
  foreground: boolean,
  nowMs: number,
): StudyTimerState {
  const settled = settleStudyTimer(state, nowMs);
  if (settled.foreground === foreground) {
    return settled;
  }

  return {
    ...settled,
    foreground,
    lastInteractionAtMs: foreground && settled.running ? nowMs : settled.lastInteractionAtMs,
    lastAccountedAtMs: foreground && settled.running ? nowMs : null,
  };
}

export function shouldFlushStudyTimer(state: StudyTimerState, nowMs: number): boolean {
  return getEffectiveActiveMs(state, nowMs) - state.lastFlushedActiveMs >= STUDY_FLUSH_INTERVAL_MS;
}

export function markStudyTimerFlushed(
  state: StudyTimerState,
  nowMs: number,
  flushedActiveMs?: number,
): StudyTimerState {
  if (flushedActiveMs !== undefined) {
    return {
      ...state,
      lastFlushedActiveMs: Math.max(
        state.lastFlushedActiveMs,
        Math.min(flushedActiveMs, getEffectiveActiveMs(state, nowMs)),
      ),
    };
  }
  const settled = settleStudyTimer(state, nowMs);
  return { ...settled, lastFlushedActiveMs: settled.accumulatedActiveMs };
}

export function stopStudyTimer(state: StudyTimerState, nowMs: number): StudyTimerState {
  const settled = settleStudyTimer(state, nowMs);
  return { ...settled, running: false, lastAccountedAtMs: null };
}

export function getRemainingStudyMs(state: StudyTimerState, nowMs: number): number {
  return Math.max(0, state.targetDurationMs - getEffectiveActiveMs(state, nowMs));
}
