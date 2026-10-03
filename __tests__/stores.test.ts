import { FakeServer, Post } from '../src/model';
import { OfflineFirstRepository } from '../src/repository';
import { SqliteStore } from '../src/sqliteStore';
import { MemoryStore, PostStore } from '../src/store';
import { nodeDb } from './nodeDb';

const server = () => new FakeServer(0);

const stores = async (): Promise<Array<[string, PostStore]>> => [
  ['memory', new MemoryStore()],
  ['disk', await SqliteStore.open(nodeDb())],
];

describe('both stores behave the same', () => {
  test('a refresh fills the store', async () => {
    for (const [name, store] of await stores()) {
      const repo = new OfflineFirstRepository(server(), store);
      await repo.refresh();
      expect((await repo.feed()).length).toBe(3);
      expect(name).toBeTruthy();
    }
  });

  test('the feed keeps its order', async () => {
    for (const [, store] of await stores()) {
      const repo = new OfflineFirstRepository(server(), store);
      await repo.refresh();
      expect((await repo.feed()).map((p: Post) => p.id)).toEqual(['1', '2', '3']);
    }
  });

  test('a like does not move the post', async () => {
    for (const [, store] of await stores()) {
      const repo = new OfflineFirstRepository(server(), store);
      await repo.refresh();

      await repo.setLiked('1', true);

      const after = await repo.feed();
      expect(after.map((p) => p.id)).toEqual(['1', '2', '3']);
      expect(after[0].likedByMe).toBe(true);
      expect(after[0].likeCount).toBe(1205);
    }
  });

  test('a failed refresh leaves the posts alone', async () => {
    for (const [, store] of await stores()) {
      const s = server();
      const repo = new OfflineFirstRepository(s, store);
      await repo.refresh();

      s.setReachable(false);
      await expect(repo.refresh()).rejects.toThrow('Could not reach the feed service');

      expect((await repo.feed()).length).toBe(3);
    }
  });

  test('a like reaches the store even with the server down', async () => {
    for (const [, store] of await stores()) {
      const s = server();
      const repo = new OfflineFirstRepository(s, store);
      await repo.refresh();

      s.setReachable(false);
      await expect(repo.setLiked('1', true)).rejects.toThrow();

      expect((await repo.feed())[0].likedByMe).toBe(true);
    }
  });
});

test('only the disk store survives a new store object', async () => {
  const db = nodeDb();
  await new OfflineFirstRepository(server(), await SqliteStore.open(db)).refresh();
  await new OfflineFirstRepository(server(), new MemoryStore()).refresh();

  expect((await new MemoryStore().getAll()).length).toBe(0);
  expect((await (await SqliteStore.open(db)).getAll()).length).toBe(3);
});
