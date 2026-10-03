import type { SQLiteDatabase } from 'expo-sqlite';
import { SqlDb } from './sql';

/** The only file in the project that mentions expo-sqlite. */
export const expoDb = (db: SQLiteDatabase): SqlDb => ({
  exec: (sql) => db.execAsync(sql),
  run: async (sql, params = []) => {
    await db.runAsync(sql, params as any[]);
  },
  all: <T>(sql: string, params: unknown[] = []) => db.getAllAsync<T>(sql, params as any[]),
  transaction: (task) => db.withTransactionAsync(task),
});
