export interface SqlDb {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: unknown[]): Promise<void>;
  all<T>(sql: string, params?: unknown[]): Promise<T[]>;
  transaction(task: () => Promise<void>): Promise<void>;
}
