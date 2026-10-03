# CatalystFeed RN — storage lab

The same lesson as the Kotlin one, in React Native. A switch at the top: **Memory** or
**Disk**. Both fully written. No `TODO`, nothing throws.

**Expo, so you need no Xcode and no Android Studio.**

```bash
npm install
npx expo start      # then scan the QR with Expo Go
npm test            # 6 tests, green
npm run typecheck   # clean
```

The `starter` branch is the same app with the store, the repository and the view model
hollowed out into ten numbered steps — that is the one you teach from. `docs_AR.md` is
the instructor guide.

```bash
git checkout starter
```

## What to do with it

| # | Do this | Memory | Disk |
|---|---|---|---|
| 1 | Open it, let the feed load | 3 posts | 3 posts |
| 2 | Server **down**, press Refresh | posts stay, red banner | same |
| 3 | Tap a heart, still offline | fills instantly | same |
| 4 | **Close the app. Reopen. Server down.** | **empty** | **3 posts** |

Only row 4 differs, because only row 4 is about the disk.

## Where the difference lives

`src/store.ts` declares the shape:

```ts
export interface PostStore {
  getAll(): Promise<Post[]>;
  replaceAll(items: Post[]): Promise<void>;
  update(id: string, transform: (post: Post) => Post): Promise<void>;
  subscribe(listener: () => void): () => void;
}
```

`MemoryStore` is an array. `SqliteStore` is the same four methods over SQLite.
`OfflineFirstRepository` takes a `PostStore` and never learns which one it got.

## The three things that catch people

**1. You write the reactivity yourself.** Room gives you `Flow`, drift gives you
`watch()`. expo-sqlite gives you `addDatabaseChangeListener` — a table name and a row
id. So `Listeners` in `src/store.ts` exists because nothing hands it to you. That is a
real difference between stacks, not a detail.

**2. `position`.** An array remembers its order. A table does not, and
`INSERT OR REPLACE` deletes the row and re-inserts it at the end — so without that
column a post jumps to the bottom **the first time somebody likes it**, not on refresh.

**3. One transaction.** `replaceAll` deletes and re-inserts inside `transaction()`,
because subscribers re-read on every notify. Without it the feed flickers empty.

## Why the driver is behind an interface

`src/sql.ts` is four methods. `src/expoDb.ts` is the only file that mentions
expo-sqlite; `__tests__/nodeDb.ts` satisfies the same four with Node's built-in
`node:sqlite`.

That is why `npm test` runs the **real SQL** against **real SQLite** with no device and
no mocking — the same reason the Kotlin lab uses a JVM driver for its unit tests.

## Files

```
src/model.ts        Post + FakeServer (with a reachable switch)
src/store.ts        PostStore, Listeners, MemoryStore
src/sqliteStore.ts  the same interface over SQLite — the lesson
src/sql.ts          the 4-method driver interface
src/expoDb.ts       expo-sqlite adapter (device)
src/repository.ts   unchanged whichever store it gets
App.tsx             the screen
__tests__/          6 tests, both stores, real SQLite via node:sqlite
```
