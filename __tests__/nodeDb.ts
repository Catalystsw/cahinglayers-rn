import { DatabaseSync } from 'node:sqlite';
import { SqlDb } from '../src/sql';

export const nodeDb = (): SqlDb => {
  const db = new DatabaseSync(':memory:');
  return {
    async exec(sql) {
      db.exec(sql);
    },
    async run(sql, params = []) {
      db.prepare(sql).run(...(params as any[]));
    },
    async all<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...(params as any[])) as T[];
    },
    async transaction(task) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
};
