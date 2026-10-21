import type { SQLiteDatabase } from "expo-sqlite";

import { getAdventureLevel } from "../../src/content/adventure";
import { migrateDatabase } from "../../src/db/migrations";
import {
  claimDailyReward,
  completeCardsRound,
  completeStudyRound,
  feedPet,
  loadLevelProgress,
  loadProgressSummary,
  recordAnswer,
  recordCardResponse,
  startStudySession,
} from "../../src/services/progress";

type SQLInputValue = null | number | bigint | string | Uint8Array;

interface TestStatement {
  run(...parameters: SQLInputValue[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  get(...parameters: SQLInputValue[]): unknown;
  all(...parameters: SQLInputValue[]): unknown[];
}

interface NodeDatabase {
  exec(source: string): void;
  prepare(source: string): TestStatement;
  close(): void;
}

const { DatabaseSync } = jest.requireActual<{
  DatabaseSync: new (filename: string) => NodeDatabase;
}>("node:sqlite");

let mockDatabase: SQLiteDatabase;

jest.mock("@/db", () => ({
  getDatabase: () => Promise.resolve(mockDatabase),
  withDatabaseTransaction: (task: (db: SQLiteDatabase) => Promise<unknown>) =>
    task(mockDatabase),
}));

function bindings(parameters: readonly unknown[]): SQLInputValue[] {
  const values = parameters.length === 1 && Array.isArray(parameters[0])
    ? parameters[0]
    : parameters;
  return values as SQLInputValue[];
}

class TestDatabase {
  readonly sqlite = new DatabaseSync(":memory:");

  async execAsync(source: string): Promise<void> {
    this.sqlite.exec(source);
  }

  async runAsync(source: string, ...parameters: unknown[]) {
    const result = this.sqlite.prepare(source).run(...bindings(parameters));
    return {
      changes: Number(result.changes),
      lastInsertRowId: Number(result.lastInsertRowid),
    };
  }

  async getFirstAsync<T>(source: string, ...parameters: unknown[]): Promise<T | null> {
    return (this.sqlite.prepare(source).get(...bindings(parameters)) as T | undefined) ?? null;
  }

  async getAllAsync<T>(source: string, ...parameters: unknown[]): Promise<T[]> {
    return this.sqlite.prepare(source).all(...bindings(parameters)) as T[];
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    this.sqlite.exec("BEGIN");
    try {
      await task();
      this.sqlite.exec("COMMIT");
    } catch (error) {
      this.sqlite.exec("ROLLBACK");
      throw error;
    }
  }

  close(): void {
    this.sqlite.close();
  }
}

describe("progress service trust counters", () => {
  let database: TestDatabase;

  beforeEach(async () => {
    database = new TestDatabase();
    mockDatabase = database as unknown as SQLiteDatabase;
    await migrateDatabase(mockDatabase);
  });

  afterEach(() => {
    database.close();
  });

  test("only a passed challenge clears an adventure level", async () => {
    const level = getAdventureLevel(0);
    const levelId = level.id;
    const cardsSession = await startStudySession({ activity: "cards", levelId });
    for (const [index, characterId] of level.characterIds.entries()) {
      await recordCardResponse({
        sessionId: cardsSession,
        questionKey: `card-${index}`,
        characterId,
        known: false,
      });
    }
    const cardsResult = await completeCardsRound({
      sessionId: cardsSession,
      levelId,
      score: 8,
      total: 8,
      activeMs: 1_000,
    });

    expect(cardsResult.levelReadyForChallenge).toBe(true);
    expect(await loadLevelProgress(levelId)).toBeNull();

    const memorySession = await startStudySession({ activity: "memory", levelId });
    await recordAnswer({
      sessionId: memorySession,
      questionKey: "memory-1",
      gameId: "memory",
      levelId,
      characterId: level.characterIds[0],
      correct: true,
    });
    await completeStudyRound({
      sessionId: memorySession,
      gameId: "memory",
      levelId,
      score: 1,
      total: 1,
      passed: true,
      activeMs: 1_000,
    });
    expect(await loadLevelProgress(levelId)).toEqual(expect.objectContaining({
      gameId: "memory",
      completedAt: null,
    }));
    expect((await loadProgressSummary()).unlockedAdventureLevel).toBe(0);

    const failedChallenge = await startStudySession({ activity: "challenge", levelId });
    await completeStudyRound({
      sessionId: failedChallenge,
      gameId: "challenge",
      levelId,
      score: 6,
      total: 10,
      passed: false,
      activeMs: 1_000,
    });
    expect(await loadLevelProgress(levelId)).toEqual(expect.objectContaining({ completedAt: null }));
    expect((await loadProgressSummary()).unlockedAdventureLevel).toBe(0);

    const passedChallenge = await startStudySession({ activity: "challenge", levelId });
    await completeStudyRound({
      sessionId: passedChallenge,
      gameId: "challenge",
      levelId,
      score: 7,
      total: 10,
      passed: true,
      activeMs: 1_000,
    });

    expect(await loadLevelProgress(levelId)).toEqual(expect.objectContaining({
      levelId,
      gameId: "challenge",
      completedAt: expect.any(Number),
    }));
    expect((await loadProgressSummary()).unlockedAdventureLevel).toBe(1);
  });

  test("counts each completed game session once", async () => {
    const sessionId = await startStudySession({ activity: "memory", levelId: "adventure-01" });
    const round = {
      sessionId,
      gameId: "memory" as const,
      levelId: "adventure-01",
      score: 1,
      total: 1,
      passed: true,
      activeMs: 1_000,
    };

    await completeStudyRound(round);
    expect((await loadProgressSummary()).gameRoundsCompleted).toBe(1);

    expect((await completeStudyRound(round)).duplicate).toBe(true);
    expect((await loadProgressSummary()).gameRoundsCompleted).toBe(1);

    const secondSessionId = await startStudySession({ activity: "listen", levelId: "adventure-01" });
    await completeStudyRound({ ...round, sessionId: secondSessionId, gameId: "listen" });
    expect((await loadProgressSummary()).gameRoundsCompleted).toBe(2);
  });

  test("spending wallet stars does not reduce lifetime stars", async () => {
    const reward = await claimDailyReward({
      dateKey: "2026-08-24",
      rewardKey: "test-reward",
      stars: 12,
    });
    expect(reward.totalStars).toBe(12);
    expect((await loadProgressSummary()).lifetimeStars).toBe(12);

    const feed = await feedPet("turtle");
    expect(feed.totalStars).toBe(2);
    expect((await loadProgressSummary()).lifetimeStars).toBe(12);
  });
});

test("migration v2 rebuilds trust counters and removes cards-only clears", async () => {
  const database = new TestDatabase();
  try {
    database.sqlite.exec(`
      CREATE TABLE profile_state (
        id INTEGER PRIMARY KEY,
        total_stars INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE study_session (
        id TEXT PRIMARY KEY,
        activity TEXT NOT NULL,
        level_id TEXT,
        ended_at INTEGER,
        correct_count INTEGER NOT NULL DEFAULT 0,
        stars_earned INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE achievement_state (
        achievement_id TEXT PRIMARY KEY,
        stars_awarded INTEGER NOT NULL DEFAULT 0,
        claimed_at INTEGER
      );
      CREATE TABLE daily_reward (
        reward_date TEXT NOT NULL,
        reward_key TEXT NOT NULL,
        stars_awarded INTEGER NOT NULL DEFAULT 0,
        claimed_at INTEGER NOT NULL,
        PRIMARY KEY (reward_date, reward_key)
      );
      CREATE TABLE level_progress (
        level_id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL,
        completed_at INTEGER
      );
      INSERT INTO profile_state (id, total_stars, updated_at) VALUES (1, 2, 0);
      INSERT INTO study_session
        (id, activity, level_id, ended_at, correct_count, stars_earned)
      VALUES
        ('memory-done', 'memory', 'adventure-04', 1, 2, 4),
        ('challenge-done', 'challenge', 'adventure-01', 2, 7, 19),
        ('cards-done', 'cards', 'adventure-02', 3, 2, 4),
        ('listen-open', 'listen', 'adventure-04', NULL, 1, 1),
        ('word-drag-exit', 'word-drag', 'adventure-04', 4, 3, 3),
        ('challenge-exit', 'challenge', 'adventure-03', 5, 7, 7);
      INSERT INTO achievement_state (achievement_id, stars_awarded, claimed_at) VALUES
        ('claimed', 5, 1),
        ('unclaimed', 7, NULL);
      INSERT INTO daily_reward (reward_date, reward_key, stars_awarded, claimed_at) VALUES
        ('2026-08-23', 'daily-goal', 10, 1),
        ('2026-08-24', 'daily-login', 3, 1);
      INSERT INTO level_progress (level_id, game_id, completed_at) VALUES
        ('adventure-01', 'memory', 100),
        ('adventure-02', 'cards', 200),
        ('adventure-03', 'challenge', 300);
      PRAGMA user_version = 1;
    `);

    await migrateDatabase(database as unknown as SQLiteDatabase);

    expect(await database.getFirstAsync(
      "SELECT total_stars, lifetime_stars, game_rounds_completed FROM profile_state WHERE id = 1",
    )).toEqual(expect.objectContaining({
      total_stars: 2,
      lifetime_stars: 46,
      game_rounds_completed: 2,
    }));
    expect(await database.getFirstAsync(
      "SELECT game_id, completed_at FROM level_progress WHERE level_id = 'adventure-01'",
    )).toEqual({ game_id: "challenge", completed_at: 100 });
    expect(await database.getFirstAsync(
      "SELECT completed_at FROM level_progress WHERE level_id = 'adventure-02'",
    )).toEqual({ completed_at: null });
    expect(await database.getFirstAsync(
      "SELECT completed_at FROM level_progress WHERE level_id = 'adventure-03'",
    )).toEqual({ completed_at: null });
    expect(await database.getFirstAsync("PRAGMA user_version"))
      .toEqual(expect.objectContaining({ user_version: 2 }));
  } finally {
    database.close();
  }
});
