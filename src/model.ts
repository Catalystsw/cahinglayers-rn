export type Post = {
  id: string;
  author: string;
  caption: string;
  likeCount: number;
  likedByMe: boolean;
  accent: string;
};

export const liked = (post: Post, value: boolean): Post => ({
  ...post,
  likedByMe: value,
  likeCount: post.likeCount + (value ? 1 : -1),
});

const SEED: Post[] = [
  {
    id: '1',
    author: 'Nour Adel',
    caption: 'Shipped the offline cache today. Cold start on the metro finally works.',
    likeCount: 1204,
    likedByMe: false,
    accent: '#3B4FE8',
  },
  {
    id: '2',
    author: 'Sara Mostafa',
    caption: 'Profiled the feed: 40% of our jank was one un-keyed list item.',
    likeCount: 318,
    likedByMe: true,
    accent: '#8E9BFF',
  },
  {
    id: '3',
    author: 'Omar Hassan',
    caption: 'Reminder that the simulator will never tell you about thermal throttling.',
    likeCount: 87,
    likedByMe: false,
    accent: '#F5B84C',
  },
];

export class FakeServer {
  private reachable = true;

  constructor(private readonly latencyMs = 700) {}

  isReachable(): boolean {
    return this.reachable;
  }

  setReachable(value: boolean): void {
    this.reachable = value;
  }

  async fetchFeed(): Promise<Post[]> {
    await this.wait();
    this.assertReachable();
    return SEED.map((post) => ({ ...post }));
  }

  async putLike(_id: string, _value: boolean): Promise<void> {
    await this.wait();
    this.assertReachable();
  }

  private assertReachable(): void {
    if (!this.reachable) throw new Error('Could not reach the feed service');
  }

  private wait(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.latencyMs));
  }
}
