/**
 * The slice of a SQLite driver this app uses. expo-sqlite satisfies it on a device;
 * node:sqlite satisfies it in the tests. Neither one is mentioned below this line.
 */
export interface SqlDb {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: unknown[]): Promise<void>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction(task: () => Promise<void>): Promise<void>;
}
