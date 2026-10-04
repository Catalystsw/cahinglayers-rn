import { FeedCascade } from '../src/cascade';
import { FakeServer } from '../src/model';
import { Settings } from '../src/settings';
import { SqlDb } from '../src/sql';
import { SqliteStore } from '../src/sqliteStore';
import { MemoryStore } from '../src/store';
import { nodeDb } from './nodeDb';
import { nodeKv } from './nodeKv';

const FROZEN = 1_700_000_000_000;
const clock = () => FROZEN;

const open = async (db: SqlDb, server: FakeServer) =>
  new FeedCascade(
    server,
    new MemoryStore(),
    await SqliteStore.open(db),
    new Settings(await nodeKv(db)),
    clock,
  );

const fresh = async () => {
  const db = nodeDb();
  const server = new FakeServer(0);
  return { db, server, cascade: await open(db, server) };
};

test('the first read has nowhere to go but the network', async () => {
  const { server, cascade } = await fresh();

  const answer = await cascade.read();

  expect(answer.layer).toBe('network');
  expect(answer.posts.length).toBe(3);
  expect(server.fetchCount()).toBe(1);
});

test('the second read is answered by memory, without touching the network', async () => {
  const { server, cascade } = await fresh();
  await cascade.read();

  expect((await cascade.read()).layer).toBe('memory');
  expect(server.fetchCount()).toBe(1);
});

test('with memory cleared the database answers, still without the network', async () => {
  const { server, cascade } = await fresh();
  await cascade.read();
  await cascade.clearMemory();

  expect((await cascade.read()).layer).toBe('database');
  expect(server.fetchCount()).toBe(1);
});

test('an answer from the database promotes itself into memory', async () => {
  const { cascade } = await fresh();
  await cascade.read();
  await cascade.clearMemory();

  expect((await cascade.read()).layer).toBe('database');
  expect((await cascade.read()).layer).toBe('memory');
});

test('stale key-value sends the read to the network even though both caches are full', async () => {
  const { server, cascade } = await fresh();
  await cascade.read();
  expect((await cascade.read()).layer).toBe('memory');

  await cascade.expire();

  expect((await cascade.read()).layer).toBe('network');
  expect(server.fetchCount()).toBe(2);
});

test('a stale read with the server down falls back to the database and admits it', async () => {
  const { server, cascade } = await fresh();
  await cascade.read();
  await cascade.expire();
  server.setReachable(false);

  const answer = await cascade.read();

  expect(answer.layer).toBe('database');
  expect(answer.stale).toBe(true);
  expect(answer.posts.length).toBe(3);
});

test('a like is written to both caches, not just the one that answered', async () => {
  const { cascade } = await fresh();
  await cascade.read();

  await cascade.setLiked('1', true);
  expect((await cascade.read()).posts[0].likedByMe).toBe(true);

  await cascade.clearMemory();
  const fromDisk = await cascade.read();

  expect(fromDisk.layer).toBe('database');
  expect(fromDisk.posts[0].likedByMe).toBe(true);
});

test('the chosen filter is a setting, so it survives a restart with no network call', async () => {
  const { db, server, cascade } = await fresh();
  await cascade.read();
  await cascade.setFilter('Nour Adel');

  const restarted = await open(db, server);

  expect(await restarted.filter()).toBe('Nour Adel');

  const answer = await restarted.read();

  expect(answer.layer).toBe('database');
  expect(answer.posts.length).toBe(1);
  expect(server.fetchCount()).toBe(1);
});
