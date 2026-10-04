import { FakeServer, liked, Post } from './model';
import { ALL, Settings } from './settings';
import { PostStore } from './store';

export type Layer = 'memory' | 'database' | 'network';

export type Answer = {
  layer: Layer;
  posts: Post[];
  millis: number;
  stale: boolean;
};

export const TTL_MS = 60_000;

export class FeedCascade {
  constructor(
    private readonly server: FakeServer,
    private readonly memory: PostStore,
    private readonly disk: PostStore,
    private readonly settings: Settings,
    private readonly now: () => number = Date.now,
  ) {}

  async read(): Promise<Answer> {
    const started = this.now();
    const fresh = this.now() - (await this.settings.syncedAt()) < TTL_MS;

    if (fresh) {
      const hot = await this.memory.getAll();
      if (hot.length > 0) return this.answer('memory', hot, started, false);

      const stored = await this.disk.getAll();
      if (stored.length > 0) {
        await this.memory.replaceAll(stored);
        return this.answer('database', stored, started, false);
      }
    }

    try {
      const live = await this.server.fetchFeed();
      await this.disk.replaceAll(live);
      await this.memory.replaceAll(live);
      await this.settings.markSynced(this.now());
      return this.answer('network', live, started, false);
    } catch (unreachable) {
      const kept = await this.disk.getAll();
      if (kept.length === 0) throw unreachable;
      await this.memory.replaceAll(kept);
      return this.answer('database', kept, started, true);
    }
  }

  async setLiked(id: string, value: boolean): Promise<void> {
    const change = (post: Post) => liked(post, value);
    await this.disk.update(id, change);
    await this.memory.update(id, change);
    await this.server.putLike(id, value);
  }

  filter(): Promise<string> {
    return this.settings.filter();
  }

  setFilter(value: string): Promise<void> {
    return this.settings.setFilter(value);
  }

  clearMemory(): Promise<void> {
    return this.memory.replaceAll([]);
  }

  wipeDisk(): Promise<void> {
    return this.disk.replaceAll([]);
  }

  expire(): Promise<void> {
    return this.settings.expire();
  }

  private async answer(
    layer: Layer,
    posts: Post[],
    started: number,
    stale: boolean,
  ): Promise<Answer> {
    const chosen = await this.settings.filter();
    const visible = chosen === ALL ? posts : posts.filter((post) => post.author === chosen);
    return { layer, posts: visible, millis: this.now() - started, stale };
  }
}
