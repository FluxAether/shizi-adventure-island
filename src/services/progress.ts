import type { SQLiteDatabase } from "expo-sqlite";

import { adventureLevelIndex, getAdventureLevel } from "@/content/adventure";
import { getDatabase, withDatabaseTransaction } from "@/db";
import {
  GAME_IDS,
  type AchievementState,
  type BuyOutfitResult,
  type CharacterProgress,
  type ClaimDailyRewardInput,
  type ClaimRewardResult,
  type CompleteCardsRoundInput,
  type CompleteCardsRoundResult,
  type CompleteStudyRoundInput,
  type CompleteStudyRoundResult,
  type GameId,
  type FeedPetResult,
  type LevelProgress,
  type ParentReport,
  type PetState,
  type ProgressSummary,
  type RecordAnswerInput,
  type RecordAnswerResult,
  type RecordCardResponseInput,
  type RewardSummary,
  type StartStudySessionInput,
  type StudyActivity,
  type UnlockAchievementInput,
} from "@/types/progress";

import {
  applyAttemptProgress,
  applyCardReviewProgress,
  calculateCardsRoundRewards,
  calculateRoundRewards,
  calculatePetFeed,
  idempotentReward,
  isAdventureLevelFullyPracticed,
  normalizeStars,
  PET_FEED_COST_STARS,
  requiredAdventureLevelCharacterIds,
} from "./progress.logic";

export {
  buildCardsRound,
  CARDS_ROUND_SIZE,
  isAdventureLevelFullyPracticed,
  requiredAdventureLevelCharacterIds,
} from "./progress.logic";

interface ProfileRow {
  total_stars: number;
  lifetime_stars: number;
  game_rounds_completed: number;
  total_active_ms: number;
  total_attempts: number;
  total_correct: number;
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
}

interface CharacterProgressRow {
  character_id: string;
  attempts: number;
  correct_count: number;
  mastery_score: number;
  correct_day_count: number;
  last_correct_date: string | null;
  stars: number;
  enabled: number;
  favorite: number;
}

const EMPTY_PROFILE: ProfileRow = {
  total_stars: 0,
  lifetime_stars: 0,
  game_rounds_completed: 0,
  total_active_ms: 0,
  total_attempts: 0,
  total_correct: 0,
  current_streak: 0,
  longest_streak: 0,
  last_study_date: null,
};

function requireText(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} is required`);
  }
  return trimmed;
}

function assertGameId(gameId: GameId): void {
  if (!(GAME_IDS as readonly string[]).includes(gameId)) {
    throw new Error(`Unsupported gameId: ${gameId}`);
  }
}

function assertStudyActivity(activity: StudyActivity): void {
  if (activity !== "cards" && !(GAME_IDS as readonly string[]).includes(activity)) {
    throw new Error(`Unsupported study activity: ${activity}`);
  }
}

function localDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function previousLocalDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  date.setDate(date.getDate() - 1);
  return localDateKey(date.getTime());
}

function startOfLocalDay(timestamp = Date.now()): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function endOfLocalDay(timestamp = Date.now()): number {
  const date = new Date(startOfLocalDay(timestamp));
  date.setDate(date.getDate() + 1);
  return date.getTime();
}

function createLocalId(now: number): string {
  return `${now.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readProfile(db: SQLiteDatabase): Promise<ProfileRow> {
  return (await db.getFirstAsync<ProfileRow>("SELECT * FROM profile_state WHERE id = 1"))
    ?? EMPTY_PROFILE;
}

export async function startStudySession(input: StartStudySessionInput): Promise<string> {
  const activity = input.activity ?? input.gameId;
  assertStudyActivity(activity);
  const characterId = input.characterId?.trim() || null;
  const levelId = input.levelId?.trim() || null;
  const now = Date.now();
  const sessionId = createLocalId(now);

  await withDatabaseTransaction(async (db) => {
    await db.runAsync(
      `INSERT INTO study_session
        (id, activity, character_id, level_id, started_at)
       VALUES (?, ?, ?, ?, ?)`,
      sessionId,
      activity,
      characterId,
      levelId,
      now,
    );

    const profile = await readProfile(db);
    const today = localDateKey(now);
    if (profile.last_study_date !== today) {
      const streak = profile.last_study_date === previousLocalDateKey(now)
        ? profile.current_streak + 1
        : 1;
      await db.runAsync(
        `UPDATE profile_state
         SET current_streak = ?, longest_streak = MAX(longest_streak, ?),
             last_study_date = ?, updated_at = ?
         WHERE id = 1`,
        streak,
        streak,
        today,
        now,
      );
    }
  });

  return sessionId;
}

export async function recordAnswer(input: RecordAnswerInput): Promise<RecordAnswerResult> {
  assertGameId(input.gameId);
  return recordActivityResponse({ ...input, activity: input.gameId });
}

export async function recordCardResponse(
  input: RecordCardResponseInput,
): Promise<RecordAnswerResult> {
  return recordActivityResponse({
    sessionId: input.sessionId,
    questionKey: input.questionKey,
    characterId: input.characterId,
    correct: input.known,
    answeredAt: input.answeredAt,
    rewardStars: input.rewardStars,
    activity: "cards",
    scored: input.known,
  });
}

type ActivityResponseInput = Omit<RecordAnswerInput, "gameId" | "activity"> & {
  activity: StudyActivity;
  gameId?: GameId;
  scored?: boolean;
};

async function recordActivityResponse(input: ActivityResponseInput): Promise<RecordAnswerResult> {
  assertStudyActivity(input.activity);
  const sessionId = requireText(input.sessionId, "sessionId");
  const questionKey = requireText(input.questionKey, "questionKey");
  const characterId = input.characterId?.trim() || null;
  const levelId = input.levelId?.trim() || null;
  const answeredAt = input.answeredAt ?? Date.now();
  const answeredDate = localDateKey(answeredAt);
  const possibleStars = input.correct ? normalizeStars(input.rewardStars, 1) : 0;

  return withDatabaseTransaction(async (db) => {
    const inserted = await db.runAsync(
      `INSERT OR IGNORE INTO attempt
        (session_id, question_key, activity, character_id, level_id, is_correct, is_scored,
         answered_at, stars_awarded)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      sessionId,
      questionKey,
      input.activity,
      characterId,
      levelId,
      input.correct ? 1 : 0,
      input.scored === false ? 0 : 1,
      answeredAt,
      possibleStars,
    );

    const profile = await readProfile(db);
    if (inserted.changes === 0) {
      const existing = await db.getFirstAsync<{ mastery_score: number | null }>(
        `SELECT cp.mastery_score
         FROM attempt a
         LEFT JOIN character_progress cp ON cp.character_id = a.character_id
         WHERE a.session_id = ? AND a.question_key = ?`,
        sessionId,
        questionKey,
      );
      return {
        duplicate: true,
        masteryScore: existing?.mastery_score ?? 0,
        starsEarned: 0,
        totalStars: profile.total_stars,
      };
    }

    const character = characterId
      ? await db.getFirstAsync<CharacterProgressRow>(
          "SELECT * FROM character_progress WHERE character_id = ?",
          characterId,
        )
      : null;
    const current = {
      attempts: character?.attempts ?? 0,
      correctCount: character?.correct_count ?? 0,
      masteryScore: character?.mastery_score ?? 0,
      correctDayCount: character?.correct_day_count ?? 0,
      lastCorrectDate: character?.last_correct_date ?? null,
      totalStars: profile.total_stars,
    };
    const next = input.scored === false
      ? applyCardReviewProgress(current)
      : applyAttemptProgress(
          current,
          { correct: input.correct, rewardStars: input.rewardStars, answeredDate },
          false,
        );

    await db.runAsync(
      `UPDATE study_session
       SET attempt_count = attempt_count + 1,
           correct_count = correct_count + ?,
           stars_earned = stars_earned + ?
       WHERE id = ?`,
      input.correct ? 1 : 0,
      next.starsEarned,
      sessionId,
    );

    if (characterId) {
      await db.runAsync(
        `INSERT INTO character_progress
          (character_id, attempts, correct_count, mastery_score, correct_day_count,
           last_correct_date, stars, enabled, favorite, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(character_id) DO UPDATE SET
           attempts = excluded.attempts,
           correct_count = excluded.correct_count,
           mastery_score = excluded.mastery_score,
           correct_day_count = excluded.correct_day_count,
           last_correct_date = excluded.last_correct_date,
           stars = excluded.stars,
           updated_at = excluded.updated_at`,
        characterId,
        next.attempts,
        next.correctCount,
        next.masteryScore,
        next.correctDayCount,
        next.lastCorrectDate,
        (character?.stars ?? 0) + next.starsEarned,
        character?.enabled ?? 1,
        character?.favorite ?? 0,
        answeredAt,
      );
    }

    if (levelId && input.gameId) {
      await db.runAsync(
        `INSERT INTO level_progress
          (level_id, game_id, attempts, correct_count, stars)
         VALUES (?, ?, 1, ?, ?)
         ON CONFLICT(level_id) DO UPDATE SET
           attempts = attempts + 1,
           correct_count = correct_count + excluded.correct_count,
           stars = stars + excluded.stars`,
        levelId,
        input.gameId,
        input.correct ? 1 : 0,
        next.starsEarned,
      );
    }

    await db.runAsync(
      `UPDATE profile_state
       SET total_stars = total_stars + ?,
           lifetime_stars = lifetime_stars + ?,
           total_attempts = total_attempts + ?,
           total_correct = total_correct + ?,
           updated_at = ?
       WHERE id = 1`,
      next.starsEarned,
      next.starsEarned,
      input.scored === false ? 0 : 1,
      input.scored !== false && input.correct ? 1 : 0,
      answeredAt,
    );

    return {
      duplicate: false,
      masteryScore: characterId ? next.masteryScore : 0,
      starsEarned: next.starsEarned,
      totalStars: next.totalStars,
    };
  });
}

async function updateActiveTime(
  db: SQLiteDatabase,
  sessionId: string,
  activeMs: number,
): Promise<void> {
  const row = await db.getFirstAsync<{ active_ms: number }>(
    "SELECT active_ms FROM study_session WHERE id = ?",
    sessionId,
  );
  if (!row) {
    throw new Error(`Unknown study session: ${sessionId}`);
  }

  const nextActiveMs = Math.max(row.active_ms, Math.max(0, Math.floor(activeMs)));
  const delta = nextActiveMs - row.active_ms;
  if (delta === 0) {
    return;
  }

  const now = Date.now();
  await db.runAsync("UPDATE study_session SET active_ms = ? WHERE id = ?", nextActiveMs, sessionId);
  await db.runAsync(
    "UPDATE profile_state SET total_active_ms = total_active_ms + ?, updated_at = ? WHERE id = 1",
    delta,
    now,
  );
}

export async function flushStudySession(sessionId: string, activeMs: number): Promise<void> {
  const id = requireText(sessionId, "sessionId");
  await withDatabaseTransaction((db) => updateActiveTime(db, id, activeMs));
}

export async function finishStudySession(sessionId: string, activeMs?: number): Promise<void> {
  const id = requireText(sessionId, "sessionId");
  await withDatabaseTransaction(async (db) => {
    if (activeMs !== undefined) {
      await updateActiveTime(db, id, activeMs);
    }
    const result = await db.runAsync(
      "UPDATE study_session SET ended_at = COALESCE(ended_at, ?) WHERE id = ?",
      Date.now(),
      id,
    );
    if (result.changes === 0) {
      throw new Error(`Unknown study session: ${id}`);
    }
  });
}

export async function completeStudyRound(
  input: CompleteStudyRoundInput,
): Promise<CompleteStudyRoundResult> {
  const sessionId = requireText(input.sessionId, "sessionId");
  const levelId = requireText(input.levelId, "levelId");
  assertGameId(input.gameId);
  if (
    !Number.isInteger(input.score) ||
    !Number.isInteger(input.total) ||
    input.score < 0 ||
    input.total < 0 ||
    input.score > input.total
  ) {
    throw new Error("score and total must be non-negative integers with score <= total");
  }
  if (!Number.isFinite(input.activeMs) || input.activeMs < 0) {
    throw new Error("activeMs must be non-negative");
  }

  return withDatabaseTransaction(async (db) => {
    const session = await db.getFirstAsync<{ activity: string; ended_at: number | null }>(
      "SELECT activity, ended_at FROM study_session WHERE id = ?",
      sessionId,
    );
    if (!session) {
      throw new Error(`Unknown study session: ${sessionId}`);
    }
    if (session.activity !== input.gameId) {
      throw new Error(`Study session ${sessionId} is not for ${input.gameId}`);
    }

    const profile = await readProfile(db);
    if (session.ended_at !== null) {
      return {
        duplicate: true,
        completionStars: 0,
        perfectStars: 0,
        dailyGoalStars: 0,
        starsEarned: 0,
        totalStars: profile.total_stars,
      };
    }

    const now = Date.now();
    const dateKey = localDateKey(now);
    const firstSeen = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM (
         SELECT character_id FROM attempt
         WHERE character_id IS NOT NULL
           AND is_correct = 1
           AND is_scored = 1
         GROUP BY character_id
         HAVING MIN(answered_at) >= ? AND MIN(answered_at) < ?
       )`,
      startOfLocalDay(now),
      endOfLocalDay(now),
    );
    const dailyGoal = await db.getFirstAsync<{ reward_date: string }>(
      "SELECT reward_date FROM daily_reward WHERE reward_date = ? AND reward_key = 'daily-goal'",
      dateKey,
    );
    const planned = calculateRoundRewards({
      score: input.score,
      total: input.total,
      newCharactersToday: firstSeen?.count ?? 0,
      dailyGoalAlreadyClaimed: dailyGoal !== null,
      roundAlreadyCompleted: false,
    });
    let dailyGoalStars = planned.dailyGoalStars;
    if (dailyGoalStars > 0) {
      const inserted = await db.runAsync(
        `INSERT OR IGNORE INTO daily_reward
          (reward_date, reward_key, stars_awarded, claimed_at)
         VALUES (?, 'daily-goal', ?, ?)`,
        dateKey,
        dailyGoalStars,
        now,
      );
      if (inserted.changes === 0) {
        dailyGoalStars = 0;
      }
    }
    const starsEarned = planned.completionStars + planned.perfectStars + dailyGoalStars;

    await updateActiveTime(db, sessionId, input.activeMs);
    await db.runAsync(
      `UPDATE study_session
       SET ended_at = ?, stars_earned = stars_earned + ?
       WHERE id = ? AND ended_at IS NULL`,
      now,
      starsEarned,
      sessionId,
    );
    await db.runAsync(
      "UPDATE profile_state SET total_stars = total_stars + ?, lifetime_stars = lifetime_stars + ?, game_rounds_completed = game_rounds_completed + 1, updated_at = ? WHERE id = 1",
      starsEarned,
      starsEarned,
      now,
    );

    if (input.gameId === "challenge" && input.passed) {
      await db.runAsync(
        `INSERT INTO level_progress (level_id, game_id, completed_at)
         VALUES (?, ?, ?)
         ON CONFLICT(level_id) DO UPDATE SET
           game_id = excluded.game_id,
           completed_at = COALESCE(completed_at, excluded.completed_at)`,
        levelId,
        input.gameId,
        now,
      );
    }

    return {
      duplicate: false,
      completionStars: planned.completionStars,
      perfectStars: planned.perfectStars,
      dailyGoalStars,
      starsEarned,
      totalStars: profile.total_stars + starsEarned,
    };
  });
}

export async function completeCardsRound(
  input: CompleteCardsRoundInput,
): Promise<CompleteCardsRoundResult> {
  const sessionId = requireText(input.sessionId, "sessionId");
  const levelId = requireText(input.levelId, "levelId");
  if (
    !Number.isInteger(input.score) ||
    !Number.isInteger(input.total) ||
    input.score < 0 ||
    input.total < 0 ||
    input.score > input.total
  ) {
    throw new Error("score and total must be non-negative integers with score <= total");
  }
  if (!Number.isFinite(input.activeMs) || input.activeMs < 0) {
    throw new Error("activeMs must be non-negative");
  }

  return withDatabaseTransaction(async (db) => {
    const session = await db.getFirstAsync<{ activity: string; ended_at: number | null; level_id: string | null }>(
      "SELECT activity, ended_at, level_id FROM study_session WHERE id = ?",
      sessionId,
    );
    if (!session) {
      throw new Error(`Unknown study session: ${sessionId}`);
    }
    if (session.activity !== "cards") {
      throw new Error(`Study session ${sessionId} is not for cards`);
    }
    if (session.level_id && session.level_id !== levelId) {
      throw new Error(`Study session ${sessionId} is not for ${levelId}`);
    }

    const profile = await readProfile(db);
    if (session.ended_at !== null) {
      return {
        duplicate: true,
        completionStars: 0,
        dailyGoalStars: 0,
        starsEarned: 0,
        totalStars: profile.total_stars,
        levelReadyForChallenge: false,
      };
    }

    const now = Date.now();
    const dateKey = localDateKey(now);
    const firstSeen = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM (
         SELECT character_id FROM attempt
         WHERE character_id IS NOT NULL
           AND is_correct = 1
           AND is_scored = 1
         GROUP BY character_id
         HAVING MIN(answered_at) >= ? AND MIN(answered_at) < ?
       )`,
      startOfLocalDay(now),
      endOfLocalDay(now),
    );
    const dailyGoal = await db.getFirstAsync<{ reward_date: string }>(
      "SELECT reward_date FROM daily_reward WHERE reward_date = ? AND reward_key = 'daily-goal'",
      dateKey,
    );
    const roundCompleted = input.total > 0 && input.score >= input.total;
    const planned = calculateCardsRoundRewards({
      completed: roundCompleted,
      newCharactersToday: firstSeen?.count ?? 0,
      dailyGoalAlreadyClaimed: dailyGoal !== null,
      roundAlreadyCompleted: false,
    });
    let dailyGoalStars = planned.dailyGoalStars;
    if (dailyGoalStars > 0) {
      const inserted = await db.runAsync(
        `INSERT OR IGNORE INTO daily_reward
          (reward_date, reward_key, stars_awarded, claimed_at)
         VALUES (?, 'daily-goal', ?, ?)`,
        dateKey,
        dailyGoalStars,
        now,
      );
      if (inserted.changes === 0) {
        dailyGoalStars = 0;
      }
    }
    const starsEarned = planned.completionStars + dailyGoalStars;

    await updateActiveTime(db, sessionId, input.activeMs);
    await db.runAsync(
      `UPDATE study_session
       SET ended_at = ?, stars_earned = stars_earned + ?
       WHERE id = ? AND ended_at IS NULL`,
      now,
      starsEarned,
      sessionId,
    );
    if (starsEarned > 0) {
      await db.runAsync(
        "UPDATE profile_state SET total_stars = total_stars + ?, lifetime_stars = lifetime_stars + ?, updated_at = ? WHERE id = 1",
        starsEarned,
        starsEarned,
        now,
      );
    }

    // Cards never auto-clear a level; challenge is the only gate.
    let levelReadyForChallenge = false;
    if (roundCompleted) {
      const levelIndex = adventureLevelIndex(levelId);
      if (levelIndex !== null) {
        const levelCharacterIds = getAdventureLevel(levelIndex).characterIds;
        if (levelCharacterIds.length > 0) {
          const placeholders = levelCharacterIds.map(() => "?").join(", ");
          const practiced = await db.getAllAsync<{
            character_id: string;
            attempts: number;
            enabled: number;
          }>(
            `SELECT character_id, attempts, enabled FROM character_progress
             WHERE character_id IN (${placeholders})`,
            [...levelCharacterIds],
          );
          const progressRows = practiced.map((row) => ({
            characterId: row.character_id,
            attempts: row.attempts,
            enabled: row.enabled === 1,
          }));
          levelReadyForChallenge = isAdventureLevelFullyPracticed(levelCharacterIds, progressRows);
        }
      }
    }

    return {
      duplicate: false,
      completionStars: planned.completionStars,
      dailyGoalStars,
      starsEarned,
      totalStars: profile.total_stars + starsEarned,
      levelReadyForChallenge,
    };
  });
}

export async function loadProgressSummary(): Promise<ProgressSummary> {
  const db = await getDatabase();
  const profile = await readProfile(db);
  const counts = await db.getFirstAsync<{
    total_seen: number;
    mastered_count: number;
    familiar_count: number;
    unfamiliar_count: number;
  }>(
    `SELECT
       COUNT(*) AS total_seen,
       COALESCE(SUM(CASE WHEN mastery_score >= 4 AND correct_day_count >= 2 THEN 1 ELSE 0 END), 0) AS mastered_count,
       COALESCE(SUM(CASE WHEN (mastery_score BETWEEN 2 AND 3)
                              OR (mastery_score >= 4 AND correct_day_count < 2)
                         THEN 1 ELSE 0 END), 0) AS familiar_count,
       COALESCE(SUM(CASE WHEN mastery_score <= 1 THEN 1 ELSE 0 END), 0) AS unfamiliar_count
     FROM character_progress
     WHERE attempts > 0`,
  );
  const today = await db.getFirstAsync<{ learned: number }>(
    `SELECT COUNT(DISTINCT character_id) AS learned
     FROM attempt
     WHERE answered_at >= ?
       AND character_id IS NOT NULL
       AND is_correct = 1
       AND is_scored = 1`,
    startOfLocalDay(),
  );
  const active = await db.getFirstAsync<{ active_ms: number }>(
    `SELECT COALESCE(SUM(active_ms), 0) AS active_ms
     FROM study_session WHERE started_at >= ? AND started_at < ?`,
    startOfLocalDay(),
    endOfLocalDay(),
  );
  const completedAdventureLevels = await db.getAllAsync<{ level_id: string }>(
    `SELECT level_id FROM level_progress
     WHERE completed_at IS NOT NULL
       AND game_id = 'challenge'
       AND level_id LIKE 'adventure-%'`,
  );
  const completedLevelIds = new Set(completedAdventureLevels.map((row) => row.level_id));
  let unlockedAdventureLevel = 0;
  while (unlockedAdventureLevel < 79) {
    const nextId = `adventure-${String(unlockedAdventureLevel + 1).padStart(2, "0")}`;
    if (!completedLevelIds.has(nextId)) break;
    unlockedAdventureLevel += 1;
  }

  const currentLevel = getAdventureLevel(unlockedAdventureLevel);
  const currentLevelIds = currentLevel.characterIds;
  let currentLevelLearned = 0;
  let currentLevelSize = currentLevelIds.length;
  if (currentLevelIds.length > 0) {
    const placeholders = currentLevelIds.map(() => "?").join(", ");
    const rows = await db.getAllAsync<{ character_id: string; attempts: number; enabled: number }>(
      `SELECT character_id, attempts, enabled FROM character_progress
       WHERE character_id IN (${placeholders})`,
      [...currentLevelIds],
    );
    const progressRows = rows.map((row) => ({
      characterId: row.character_id,
      attempts: row.attempts,
      enabled: row.enabled === 1,
    }));
    const requiredIds = requiredAdventureLevelCharacterIds(currentLevelIds, progressRows);
    currentLevelSize = requiredIds.length;
    const practiced = new Set(
      progressRows.filter((row) => row.attempts > 0).map((row) => row.characterId),
    );
    currentLevelLearned = requiredIds.filter((id) => practiced.has(id)).length;
  }

  return {
    todayLearned: today?.learned ?? 0,
    streakDays: profile.current_streak,
    masteredCount: counts?.mastered_count ?? 0,
    familiarCount: counts?.familiar_count ?? 0,
    unfamiliarCount: counts?.unfamiliar_count ?? 0,
    totalSeen: counts?.total_seen ?? 0,
    unlockedAdventureLevel,
    currentLevelLearned,
    currentLevelSize,
    activeSeconds: Math.floor((active?.active_ms ?? 0) / 1_000),
    lifetimeStars: profile.lifetime_stars,
    gameRoundsCompleted: profile.game_rounds_completed,
    correctRate: profile.total_attempts === 0
      ? 0
      : Math.round((profile.total_correct / profile.total_attempts) * 100),
  };
}

export async function remainingStudySeconds(limitMinutes = 12): Promise<number> {
  if (!Number.isFinite(limitMinutes) || limitMinutes <= 0) {
    throw new Error("limitMinutes must be positive");
  }
  const db = await getDatabase();
  const active = await db.getFirstAsync<{ active_ms: number }>(
    `SELECT COALESCE(SUM(active_ms), 0) AS active_ms
     FROM study_session WHERE started_at >= ? AND started_at < ?`,
    startOfLocalDay(),
    endOfLocalDay(),
  );
  return Math.max(0, Math.ceil(limitMinutes * 60 - (active?.active_ms ?? 0) / 1_000));
}

export async function loadCharacterProgress(characterId: string): Promise<CharacterProgress | null> {
  return (await loadCharacterProgresses([requireText(characterId, "characterId")]))[0] ?? null;
}

export async function loadCharacterProgresses(
  characterIds?: readonly string[],
): Promise<CharacterProgress[]> {
  const db = await getDatabase();
  if (!characterIds?.length) {
    const rows = await db.getAllAsync<CharacterProgressRow>(
      `SELECT * FROM character_progress
       ORDER BY mastery_score, correct_day_count, updated_at`,
    );
    return rows.map(mapCharacterProgress);
  }

  const ids = [...new Set(characterIds.map((id) => requireText(id, "characterId")))];
  const placeholders = ids.map(() => "?").join(", ");
  const rows = await db.getAllAsync<CharacterProgressRow>(
    `SELECT * FROM character_progress
     WHERE character_id IN (${placeholders})
     ORDER BY mastery_score, correct_day_count, updated_at`,
    ids,
  );
  return rows.map(mapCharacterProgress);
}

/** Character ids answered in the most recently completed cards session. */
export async function loadLastCardsRoundCharacterIds(): Promise<string[]> {
  const db = await getDatabase();
  const session = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM study_session
     WHERE activity = 'cards' AND ended_at IS NOT NULL
     ORDER BY ended_at DESC
     LIMIT 1`,
  );
  if (!session) return [];

  const rows = await db.getAllAsync<{ character_id: string }>(
    `SELECT character_id
     FROM attempt
     WHERE session_id = ?
       AND character_id IS NOT NULL
     GROUP BY character_id
     ORDER BY MIN(answered_at)`,
    session.id,
  );
  return rows.map((row) => row.character_id);
}

export async function loadLevelProgress(levelId: string): Promise<LevelProgress | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    level_id: string;
    game_id: GameId;
    attempts: number;
    correct_count: number;
    stars: number;
    completed_at: number | null;
  }>("SELECT * FROM level_progress WHERE level_id = ?", requireText(levelId, "levelId"));
  return row
    ? {
        levelId: row.level_id,
        gameId: row.game_id,
        attempts: row.attempts,
        correctCount: row.correct_count,
        stars: row.stars,
        completedAt: row.completed_at,
      }
    : null;
}

export async function selectCharacter(characterId: string): Promise<void> {
  const id = requireText(characterId, "characterId");
  await withDatabaseTransaction(async (db) => {
    await db.runAsync(
      `INSERT INTO character_selection (id, character_id, selected_at)
       VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET character_id = excluded.character_id, selected_at = excluded.selected_at`,
      id,
      Date.now(),
    );
  });
}

export async function getSelectedCharacter(): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ character_id: string }>(
    "SELECT character_id FROM character_selection WHERE id = 1",
  );
  return row?.character_id ?? null;
}

export async function setCharacterEnabled(characterId: string, enabled: boolean): Promise<void> {
  const id = requireText(characterId, "characterId");
  await withDatabaseTransaction(async (db) => {
    await db.runAsync(
      `INSERT INTO character_progress (character_id, enabled, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(character_id) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at`,
      id,
      enabled ? 1 : 0,
      Date.now(),
    );
  });
}

export async function isCharacterEnabled(characterId: string): Promise<boolean> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ enabled: number }>(
    "SELECT enabled FROM character_progress WHERE character_id = ?",
    requireText(characterId, "characterId"),
  );
  return row?.enabled !== 0;
}

export async function toggleFavorite(characterId: string): Promise<boolean> {
  const id = requireText(characterId, "characterId");
  return withDatabaseTransaction(async (db) => {
    const row = await db.getFirstAsync<{ favorite: number }>(
      "SELECT favorite FROM character_progress WHERE character_id = ?",
      id,
    );
    const favorite = row?.favorite !== 1;
    await db.runAsync(
      `INSERT INTO character_progress (character_id, favorite, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(character_id) DO UPDATE SET favorite = excluded.favorite, updated_at = excluded.updated_at`,
      id,
      favorite ? 1 : 0,
      Date.now(),
    );
    return favorite;
  });
}

function mapCharacterProgress(row: CharacterProgressRow): CharacterProgress {
  return {
    characterId: row.character_id,
    attempts: row.attempts,
    correctCount: row.correct_count,
    masteryScore: row.mastery_score,
    correctDayCount: row.correct_day_count,
    lastCorrectDate: row.last_correct_date,
    stars: row.stars,
    enabled: row.enabled === 1,
    favorite: row.favorite === 1,
  };
}

function parseStringArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function loadPetStates(): Promise<PetState[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    pet_id: string;
    name: string;
    stage: number;
    xp: number;
    selected: number;
    owned_outfit_ids: string;
    selected_outfit_id: string | null;
  }>("SELECT * FROM pet_state ORDER BY selected DESC, pet_id");
  return rows.map((row) => ({
    petId: row.pet_id,
    name: row.name,
    stage: row.stage,
    xp: row.xp,
    selected: row.selected === 1,
    ownedOutfitIds: parseStringArray(row.owned_outfit_ids),
    selectedOutfitId: row.selected_outfit_id,
  }));
}

export async function feedPet(petId: string, xp = 1): Promise<FeedPetResult> {
  const id = requireText(petId, "petId");
  return withDatabaseTransaction(async (db) => {
    const row = await db.getFirstAsync<{
      xp: number;
      stage: number;
    }>("SELECT xp, stage FROM pet_state WHERE pet_id = ?", id);
    if (!row) {
      throw new Error(`Unknown pet: ${id}`);
    }
    const profile = await readProfile(db);
    const next = calculatePetFeed(profile.total_stars, row.xp, row.stage, xp);
    if (!next.fed) {
      const states = await loadPetStatesFromDatabase(db);
      return {
        fed: false,
        reason: "insufficient-stars",
        totalStars: profile.total_stars,
        pet: states.find((pet) => pet.petId === id) as PetState,
      };
    }
    await db.runAsync(
      "UPDATE pet_state SET xp = ?, stage = ?, updated_at = ? WHERE pet_id = ?",
      next.xp,
      next.stage,
      Date.now(),
      id,
    );
    await db.runAsync(
      "UPDATE profile_state SET total_stars = total_stars - ?, updated_at = ? WHERE id = 1",
      PET_FEED_COST_STARS,
      Date.now(),
    );
    const states = await loadPetStatesFromDatabase(db);
    return {
      fed: true,
      reason: "fed",
      totalStars: next.totalStars,
      pet: states.find((pet) => pet.petId === id) as PetState,
    };
  });
}

async function loadPetStatesFromDatabase(db: SQLiteDatabase): Promise<PetState[]> {
  const rows = await db.getAllAsync<{
    pet_id: string;
    name: string;
    stage: number;
    xp: number;
    selected: number;
    owned_outfit_ids: string;
    selected_outfit_id: string | null;
  }>("SELECT * FROM pet_state ORDER BY selected DESC, pet_id");
  return rows.map((row) => ({
    petId: row.pet_id,
    name: row.name,
    stage: row.stage,
    xp: row.xp,
    selected: row.selected === 1,
    ownedOutfitIds: parseStringArray(row.owned_outfit_ids),
    selectedOutfitId: row.selected_outfit_id,
  }));
}

export async function buyOutfit(
  petId: string,
  outfitId: string,
  costStars: number,
): Promise<BuyOutfitResult> {
  const pet = requireText(petId, "petId");
  const outfit = requireText(outfitId, "outfitId");
  const cost = normalizeStars(costStars);

  return withDatabaseTransaction(async (db) => {
    const row = await db.getFirstAsync<{ owned_outfit_ids: string }>(
      "SELECT owned_outfit_ids FROM pet_state WHERE pet_id = ?",
      pet,
    );
    if (!row) {
      throw new Error(`Unknown pet: ${pet}`);
    }
    const profile = await readProfile(db);
    const owned = parseStringArray(row.owned_outfit_ids);
    if (owned.includes(outfit)) {
      return { purchased: false, reason: "owned", totalStars: profile.total_stars };
    }
    if (profile.total_stars < cost) {
      return { purchased: false, reason: "insufficient-stars", totalStars: profile.total_stars };
    }

    await db.runAsync(
      "UPDATE pet_state SET owned_outfit_ids = ?, updated_at = ? WHERE pet_id = ?",
      JSON.stringify([...owned, outfit]),
      Date.now(),
      pet,
    );
    await db.runAsync(
      "UPDATE profile_state SET total_stars = total_stars - ?, updated_at = ? WHERE id = 1",
      cost,
      Date.now(),
    );
    return { purchased: true, reason: "purchased", totalStars: profile.total_stars - cost };
  });
}

export async function selectPet(petId: string): Promise<void> {
  const id = requireText(petId, "petId");
  await withDatabaseTransaction(async (db) => {
    await db.runAsync("UPDATE pet_state SET selected = 0 WHERE selected = 1");
    const result = await db.runAsync(
      "UPDATE pet_state SET selected = 1, updated_at = ? WHERE pet_id = ?",
      Date.now(),
      id,
    );
    if (result.changes === 0) {
      throw new Error(`Unknown pet: ${id}`);
    }
  });
}

export async function unlockPet(petId: string, name: string): Promise<boolean> {
  const id = requireText(petId, "petId");
  const displayName = requireText(name, "name");
  return withDatabaseTransaction(async (db) => {
    const result = await db.runAsync(
      `INSERT OR IGNORE INTO pet_state (pet_id, name, selected, updated_at)
       VALUES (?, ?, 0, ?)`,
      id,
      displayName,
      Date.now(),
    );
    return result.changes === 1;
  });
}

export async function selectPetOutfit(petId: string, outfitId: string | null): Promise<boolean> {
  const id = requireText(petId, "petId");
  const outfit = outfitId === null ? null : requireText(outfitId, "outfitId");
  return withDatabaseTransaction(async (db) => {
    const row = await db.getFirstAsync<{ owned_outfit_ids: string }>(
      "SELECT owned_outfit_ids FROM pet_state WHERE pet_id = ?",
      id,
    );
    if (!row) {
      throw new Error(`Unknown pet: ${id}`);
    }
    if (outfit !== null && !parseStringArray(row.owned_outfit_ids).includes(outfit)) {
      return false;
    }
    await db.runAsync(
      "UPDATE pet_state SET selected_outfit_id = ?, updated_at = ? WHERE pet_id = ?",
      outfit,
      Date.now(),
      id,
    );
    return true;
  });
}

export async function unlockAchievement(input: UnlockAchievementInput): Promise<boolean> {
  const id = requireText(input.achievementId, "achievementId");
  return withDatabaseTransaction(async (db) => {
    const result = await db.runAsync(
      `INSERT OR IGNORE INTO achievement_state
        (achievement_id, unlocked_at, stars_awarded)
       VALUES (?, ?, ?)`,
      id,
      input.unlockedAt ?? Date.now(),
      normalizeStars(input.stars),
    );
    return result.changes === 1;
  });
}

export async function loadAchievementStates(): Promise<AchievementState[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    achievement_id: string;
    unlocked_at: number;
    stars_awarded: number;
    claimed_at: number | null;
  }>("SELECT * FROM achievement_state ORDER BY unlocked_at DESC");
  return rows.map((row) => ({
    achievementId: row.achievement_id,
    unlockedAt: row.unlocked_at,
    stars: row.stars_awarded,
    claimedAt: row.claimed_at,
  }));
}

export async function claimAchievement(achievementId: string): Promise<ClaimRewardResult> {
  const id = requireText(achievementId, "achievementId");
  return withDatabaseTransaction(async (db) => {
    const achievement = await db.getFirstAsync<{ stars_awarded: number; claimed_at: number | null }>(
      "SELECT stars_awarded, claimed_at FROM achievement_state WHERE achievement_id = ?",
      id,
    );
    const profile = await readProfile(db);
    if (!achievement || achievement.claimed_at !== null) {
      return { claimed: false, totalStars: profile.total_stars };
    }

    const claimed = await db.runAsync(
      "UPDATE achievement_state SET claimed_at = ? WHERE achievement_id = ? AND claimed_at IS NULL",
      Date.now(),
      id,
    );
    const awarded = idempotentReward(achievement.stars_awarded, claimed.changes === 0);
    if (awarded > 0) {
      await db.runAsync(
        "UPDATE profile_state SET total_stars = total_stars + ?, lifetime_stars = lifetime_stars + ?, updated_at = ? WHERE id = 1",
        awarded,
        awarded,
        Date.now(),
      );
    }
    return { claimed: claimed.changes === 1, totalStars: profile.total_stars + awarded };
  });
}

export async function claimDailyReward(input: ClaimDailyRewardInput): Promise<ClaimRewardResult> {
  const dateKey = requireText(input.dateKey, "dateKey");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error("dateKey must use YYYY-MM-DD");
  }
  const rewardKey = requireText(input.rewardKey, "rewardKey");
  const stars = normalizeStars(input.stars);

  return withDatabaseTransaction(async (db) => {
    const inserted = await db.runAsync(
      `INSERT OR IGNORE INTO daily_reward
        (reward_date, reward_key, stars_awarded, claimed_at)
       VALUES (?, ?, ?, ?)`,
      dateKey,
      rewardKey,
      stars,
      Date.now(),
    );
    const profile = await readProfile(db);
    const awarded = idempotentReward(stars, inserted.changes === 0);
    if (awarded > 0) {
      await db.runAsync(
        "UPDATE profile_state SET total_stars = total_stars + ?, lifetime_stars = lifetime_stars + ?, updated_at = ? WHERE id = 1",
        awarded,
        awarded,
        Date.now(),
      );
    }
    return { claimed: inserted.changes === 1, totalStars: profile.total_stars + awarded };
  });
}

export async function loadRewardSummary(): Promise<RewardSummary> {
  const db = await getDatabase();
  const profile = await readProfile(db);
  const selectedPet = await db.getFirstAsync<{ pet_id: string }>(
    "SELECT pet_id FROM pet_state WHERE selected = 1 LIMIT 1",
  );
  const daily = await db.getFirstAsync<{ reward_date: string }>(
    "SELECT reward_date FROM daily_reward ORDER BY reward_date DESC LIMIT 1",
  );
  const achievements = await db.getAllAsync<{ achievement_id: string }>(
    "SELECT achievement_id FROM achievement_state ORDER BY unlocked_at DESC",
  );
  return {
    stars: profile.total_stars,
    selectedPetId: selectedPet?.pet_id ?? "turtle",
    reward: {
      lastDailyRewardDate: daily?.reward_date ?? null,
      unlockedAchievementIds: achievements.map((row) => row.achievement_id),
    },
  };
}

export async function loadParentReport(days = 7): Promise<ParentReport> {
  const safeDays = Number.isFinite(days) ? Math.max(1, Math.floor(days)) : 7;
  const cutoffDate = new Date();
  cutoffDate.setHours(0, 0, 0, 0);
  cutoffDate.setDate(cutoffDate.getDate() - (safeDays - 1));
  const cutoff = cutoffDate.getTime();
  const db = await getDatabase();

  const sessions = await db.getAllAsync<{
    date: string;
    active_ms: number;
    stars: number;
  }>(
    `SELECT date(started_at / 1000, 'unixepoch', 'localtime') AS date,
            SUM(active_ms) AS active_ms, SUM(stars_earned) AS stars
     FROM study_session WHERE started_at >= ? GROUP BY date ORDER BY date`,
    cutoff,
  );
  const attempts = await db.getAllAsync<{
    date: string;
    attempts: number;
    correct: number;
  }>(
    `SELECT date(answered_at / 1000, 'unixepoch', 'localtime') AS date,
            COUNT(*) AS attempts, SUM(is_correct) AS correct
     FROM attempt WHERE answered_at >= ? AND is_scored = 1 GROUP BY date ORDER BY date`,
    cutoff,
  );
  const learned = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(DISTINCT character_id) AS count FROM attempt WHERE answered_at >= ? AND character_id IS NOT NULL",
    cutoff,
  );

  const daily = new Map<string, ParentReport["daily"][number]>();
  for (const row of sessions) {
    daily.set(row.date, {
      date: row.date,
      activeSeconds: Math.floor(row.active_ms / 1_000),
      attempts: 0,
      correctRate: 0,
      starsEarned: row.stars,
    });
  }
  for (const row of attempts) {
    const item = daily.get(row.date) ?? {
      date: row.date,
      activeSeconds: 0,
      attempts: 0,
      correctRate: 0,
      starsEarned: 0,
    };
    item.attempts = row.attempts;
    item.correctRate = row.attempts === 0 ? 0 : Math.round((row.correct / row.attempts) * 100);
    daily.set(row.date, item);
  }
  const rows = [...daily.values()].sort((a, b) => a.date.localeCompare(b.date));
  const totalAttempts = attempts.reduce((sum, row) => sum + row.attempts, 0);
  const totalCorrect = attempts.reduce((sum, row) => sum + row.correct, 0);

  return {
    days: safeDays,
    activeSeconds: sessions.reduce((sum, row) => sum + Math.floor(row.active_ms / 1_000), 0),
    attempts: totalAttempts,
    correctRate: totalAttempts === 0 ? 0 : Math.round((totalCorrect / totalAttempts) * 100),
    starsEarned: sessions.reduce((sum, row) => sum + row.stars, 0),
    learnedCharacters: learned?.count ?? 0,
    daily: rows,
  };
}
