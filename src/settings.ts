import { KeyValue } from './kv';

export const ALL = 'all';

const SYNCED_AT = 'feed.syncedAt';
const FILTER = 'feed.filter';

export class Settings {
  constructor(private readonly kv: KeyValue) {}

  async syncedAt(): Promise<number> {
    const raw = await this.kv.get(SYNCED_AT);
    return raw === null ? 0 : Number(raw);
  }

  async markSynced(at: number): Promise<void> {
    await this.kv.set(SYNCED_AT, String(at));
  }

  async expire(): Promise<void> {
    await this.kv.set(SYNCED_AT, '0');
  }

  async filter(): Promise<string> {
    return (await this.kv.get(FILTER)) ?? ALL;
  }

  async setFilter(value: string): Promise<void> {
    await this.kv.set(FILTER, value);
  }
}
