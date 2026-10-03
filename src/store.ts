import { Post } from './model';

/**
 * Where the posts live. The repository above only knows this shape, which is why
 * swapping memory for a disk changes nothing above it.
 */
export interface PostStore {
  getAll(): Promise<Post[]>;
  replaceAll(items: Post[]): Promise<void>;
  update(id: string, transform: (post: Post) => Post): Promise<void>;
  subscribe(listener: () => void): () => void;
}

/** Notifying listeners by hand is the part Room and drift do for you. */
export class Listeners {
  private readonly listeners = new Set<() => void>();

  add(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export class MemoryStore implements PostStore {
  private posts: Post[] = [];
  private readonly listeners = new Listeners();

  async getAll(): Promise<Post[]> {
    return this.posts;
  }

  async replaceAll(items: Post[]): Promise<void> {
    this.posts = items;
    this.listeners.notify();
  }

  async update(id: string, transform: (post: Post) => Post): Promise<void> {
    this.posts = this.posts.map((post) => (post.id === id ? transform(post) : post));
    this.listeners.notify();
  }

  subscribe(listener: () => void): () => void {
    return this.listeners.add(listener);
  }
}
