import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";

import { migrateDatabase } from "./migrations";

const DATABASE_NAME = "character-adventure.db";

let databasePromise: Promise<SQLiteDatabase> | null = null;
let writeDatabasePromise: Promise<SQLiteDatabase> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

export function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DATABASE_NAME)
      .then(async (db) => {
        await migrateDatabase(db);
        return db;
      })
      .catch((error) => {
        databasePromise = null;
        throw error;
      });
  }

  return databasePromise;
}

async function getWriteDatabase(): Promise<SQLiteDatabase> {
  if (Platform.OS === "web") {
    return getDatabase();
  }
  if (!writeDatabasePromise) {
    writeDatabasePromise = getDatabase()
      .then(async () => {
        const db = await openDatabaseAsync(DATABASE_NAME, { useNewConnection: true });
        await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
        return db;
      })
      .catch((error) => {
        writeDatabasePromise = null;
        throw error;
      });
  }
  return writeDatabasePromise;
}

export function withDatabaseTransaction<T>(
  task: (db: SQLiteDatabase) => Promise<T>,
): Promise<T> {
  const queued = writeQueue.then(async () => {
    const db = await getWriteDatabase();
    let result: T | undefined;

    if (Platform.OS === "web") {
      await db.withTransactionAsync(async () => {
        result = await task(db);
      });
    } else {
      try {
        await db.execAsync("BEGIN IMMEDIATE");
        result = await task(db);
        await db.execAsync("COMMIT");
      } catch (error) {
        try {
          await db.execAsync("ROLLBACK");
        } catch {
          // Ignore rollback error so original error is not masked
        }
        throw error;
      }
    }

    return result as T;
  });

  writeQueue = queued.then(
    () => undefined,
    () => undefined,
  );

  return queued;
}
