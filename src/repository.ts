import { FakeServer, liked, Post } from './model';
import { PostStore } from './store';

/** network -> store -> screen. It never learns which store it was handed. */
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

  /** Writes only what came back, so a failure leaves the store alone. */
  async refresh(): Promise<void> {
    await this.store.replaceAll(await this.server.fetchFeed());
  }

  /** Store first, server second — the screen does not wait for a server that may never answer. */
  async setLiked(id: string, value: boolean): Promise<void> {
    await this.store.update(id, (post) => liked(post, value));
    await this.server.putLike(id, value);
  }
}
