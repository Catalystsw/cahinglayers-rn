import { FakeServer, liked, Post } from './model';
import { PostStore } from './store';

export class OfflineFirstRepository {
  constructor(
    private readonly server: FakeServer,
    private readonly store: PostStore,
  ) {}

  feed(): Promise<Post[]> {
    return this.store.getAll();
  }

  subscribe(listener: () => void): () => void {
    return this.store.subscribe(listener);
  }

  async refresh(): Promise<void> {
    await this.store.replaceAll(await this.server.fetchFeed());
  }

  async setLiked(id: string, value: boolean): Promise<void> {
    await this.store.update(id, (post) => liked(post, value));
    await this.server.putLike(id, value);
  }
}
