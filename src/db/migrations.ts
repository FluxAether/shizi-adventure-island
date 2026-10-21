import type { SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";

export const DATABASE_VERSION = 2;

const MIGRATION_1 = `
CREATE TABLE IF NOT EXISTS study_session (
  id TEXT PRIMARY KEY NOT NULL,
  activity TEXT NOT NULL,
  character_id TEXT,
  level_id TEXT,
  started_at INTEGER NOT NULL,
  ended_at INTEGER,
  active_ms INTEGER NOT NULL DEFAULT 0 CHECK (active_ms >= 0),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  stars_earned INTEGER NOT NULL DEFAULT 0 CHECK (stars_earned >= 0)
);

CREATE TABLE IF NOT EXISTS attempt (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES study_session(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  activity TEXT NOT NULL,
  character_id TEXT,
  level_id TEXT,
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  is_scored INTEGER NOT NULL DEFAULT 1 CHECK (is_scored IN (0, 1)),
  answered_at INTEGER NOT NULL,
  stars_awarded INTEGER NOT NULL DEFAULT 0 CHECK (stars_awarded >= 0),
  UNIQUE (session_id, question_key)
);

CREATE TABLE IF NOT EXISTS character_progress (
  character_id TEXT PRIMARY KEY NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  mastery_score INTEGER NOT NULL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 5),
  correct_day_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_day_count >= 0),
  last_correct_date TEXT,
  stars INTEGER NOT NULL DEFAULT 0 CHECK (stars >= 0),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  favorite INTEGER NOT NULL DEFAULT 0 CHECK (favorite IN (0, 1)),
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS level_progress (
  level_id TEXT PRIMARY KEY NOT NULL,
  game_id TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  correct_count INTEGER NOT NULL DEFAULT 0 CHECK (correct_count >= 0),
  stars INTEGER NOT NULL DEFAULT 0 CHECK (stars >= 0),
  completed_at INTEGER
);

CREATE TABLE IF NOT EXISTS profile_state (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  total_stars INTEGER NOT NULL DEFAULT 0 CHECK (total_stars >= 0),
  total_active_ms INTEGER NOT NULL DEFAULT 0 CHECK (total_active_ms >= 0),
  total_attempts INTEGER NOT NULL DEFAULT 0 CHECK (total_attempts >= 0),
  total_correct INTEGER NOT NULL DEFAULT 0 CHECK (total_correct >= 0),
  current_streak INTEGER NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
  longest_streak INTEGER NOT NULL DEFAULT 0 CHECK (longest_streak >= 0),
  last_study_date TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pet_state (
  pet_id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  stage INTEGER NOT NULL DEFAULT 1 CHECK (stage >= 1),
  xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  selected INTEGER NOT NULL DEFAULT 0 CHECK (selected IN (0, 1)),
  owned_outfit_ids TEXT NOT NULL DEFAULT '[]',
  selected_outfit_id TEXT,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS achievement_state (
  achievement_id TEXT PRIMARY KEY NOT NULL,
  unlocked_at INTEGER NOT NULL,
  stars_awarded INTEGER NOT NULL DEFAULT 0 CHECK (stars_awarded >= 0),
  claimed_at INTEGER
);

CREATE TABLE IF NOT EXISTS character_selection (
  id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
  character_id TEXT NOT NULL,
  selected_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_reward (
  reward_date TEXT NOT NULL,
  reward_key TEXT NOT NULL,
  stars_awarded INTEGER NOT NULL DEFAULT 0 CHECK (stars_awarded >= 0),
  claimed_at INTEGER NOT NULL,
  PRIMARY KEY (reward_date, reward_key)
);

CREATE INDEX IF NOT EXISTS idx_attempt_character ON attempt(character_id);
CREATE INDEX IF NOT EXISTS idx_attempt_level ON attempt(level_id);
CREATE INDEX IF NOT EXISTS idx_study_session_started ON study_session(started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_selected_pet ON pet_state(selected) WHERE selected = 1;
`;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion > DATABASE_VERSION) {
    throw new Error(`Database version ${currentVersion} is newer than supported ${DATABASE_VERSION}`);
  }

  if (currentVersion < 1) {
    const migrate = async () => {
      await db.execAsync(MIGRATION_1);
      const now = Date.now();
      await db.runAsync(
        "INSERT OR IGNORE INTO profile_state (id, updated_at) VALUES (1, ?)",
        now,
      );
      await db.runAsync(
        "INSERT OR IGNORE INTO pet_state (pet_id, name, selected, owned_outfit_ids, selected_outfit_id, updated_at) VALUES ('turtle', '小舟龟', 1, '[\"default\"]', 'default', ?)",
        now,
      );
      await db.execAsync("PRAGMA user_version = 1");
    };

    if (Platform.OS === "web") {
      await db.withTransactionAsync(migrate);
    } else {
      await db.execAsync("BEGIN IMMEDIATE");
      try {
        await migrate();
        await db.execAsync("COMMIT");
      } catch (error) {
        await db.execAsync("ROLLBACK");
        throw error;
      }
    }
  }

  if (currentVersion < 2) {
    const migrateV2 = async () => {
      // ponytail: v1 has no round-completed flag; stars_earned > correct_count is its settlement marker.
      await db.execAsync(`ALTER TABLE profile_state ADD COLUMN lifetime_stars INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_stars >= 0);
ALTER TABLE profile_state ADD COLUMN game_rounds_completed INTEGER NOT NULL DEFAULT 0 CHECK (game_rounds_completed >= 0);
UPDATE profile_state
   SET lifetime_stars = MAX(
         total_stars,
         (SELECT COALESCE(SUM(stars_earned), 0) FROM study_session)
           + (SELECT COALESCE(SUM(stars_awarded), 0) FROM achievement_state WHERE claimed_at IS NOT NULL)
           + (SELECT COALESCE(SUM(stars_awarded), 0) FROM daily_reward WHERE reward_key <> 'daily-goal')
       ),
       game_rounds_completed = (
         SELECT COUNT(*) FROM study_session
         WHERE ended_at IS NOT NULL
           AND activity IN ('memory', 'listen', 'word-drag', 'challenge')
           AND stars_earned > correct_count
       )
 WHERE id = 1;
UPDATE level_progress
   SET completed_at = NULL
 WHERE completed_at IS NOT NULL
   AND level_id LIKE 'adventure-%'
   AND NOT EXISTS (
     SELECT 1 FROM study_session
      WHERE study_session.level_id = level_progress.level_id
        AND activity = 'challenge'
        AND ended_at IS NOT NULL
        AND correct_count >= 7
        AND stars_earned > correct_count
   );
UPDATE level_progress
   SET game_id = 'challenge'
 WHERE completed_at IS NOT NULL
   AND level_id LIKE 'adventure-%'
   AND EXISTS (
     SELECT 1 FROM study_session
      WHERE study_session.level_id = level_progress.level_id
        AND activity = 'challenge'
        AND ended_at IS NOT NULL
        AND correct_count >= 7
        AND stars_earned > correct_count
   );`);
      await db.execAsync("PRAGMA user_version = 2");
    };

    if (Platform.OS === "web") {
      await db.withTransactionAsync(migrateV2);
    } else {
      await db.execAsync("BEGIN IMMEDIATE");
      try {
        await migrateV2();
        await db.execAsync("COMMIT");
      } catch (error) {
        await db.execAsync("ROLLBACK");
        throw error;
      }
    }
  }

  await db.execAsync("PRAGMA foreign_keys = ON");
}
