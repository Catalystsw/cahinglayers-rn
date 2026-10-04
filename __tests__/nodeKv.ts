import { KeyValue } from '../src/kv';
import { SqlDb } from '../src/sql';

export const nodeKv = async (db: SqlDb): Promise<KeyValue> => {
  await db.exec('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);');
  return {
    async get(key) {
      const rows = await db.all<{ value: string }>('SELECT value FROM kv WHERE key = ?', [key]);
      return rows.length === 0 ? null : rows[0].value;
    },
    async set(key, value) {
      await db.run('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', [key, value]);
    },
    async remove(key) {
      await db.run('DELETE FROM kv WHERE key = ?', [key]);
    },
  };
};
