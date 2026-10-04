import { Post } from './model';

export interface PostStore {
  getAll(): Promise<Post[]>;
  replaceAll(items: Post[]): Promise<void>;
  update(id: string, transform: (post: Post) => Post): Promise<void>;
}

export class MemoryStore implements PostStore {
  private posts: Post[] = [];

  async getAll(): Promise<Post[]> {
    return this.posts;
  }

  async replaceAll(items: Post[]): Promise<void> {
    this.posts = items;
  }

  async update(id: string, transform: (post: Post) => Post): Promise<void> {
    this.posts = this.posts.map((post) => (post.id === id ? transform(post) : post));
  }
}
