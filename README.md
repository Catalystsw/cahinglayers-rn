# CatalystFeed RN — the layers lab

Three places a post can be read from, tried in order:

```
memory  →  database  →  network
```

A badge at the top of the screen says **which layer answered** and how long it took.
Buttons knock out layers one at a time so you can watch the next one take over.

Key-value is the fourth store, and it does **not** hold posts. It holds two things:
`lastSyncedAt` and the author filter you picked. That is the lesson — key-value is for
settings and metadata, not for data you will want to query.

```bash
npm install
npx expo start      # scan the QR with Expo Go
npm test            # 8 tests, green
npm run typecheck   # clean
```

The `starter` branch is the same app with the cascade, the settings and the SQLite
store hollowed out into numbered steps. `docs_AR.md` is the instructor guide.

## What to do with it

| Do this | Badge says | Why |
|---|---|---|
| Open it cold | `NETWORK · ~700 ms` | nothing in any layer yet |
| Press **Read** | `MEMORY · ~0 ms` | the network write filled memory on the way past |
| **Clear memory**, Read | `DATABASE · ~15 ms` | memory is gone, the rows are not |
| Read again | `MEMORY` | the database answer **promoted itself** into memory |
| **Wipe disk**, **Clear memory**, Read | `NETWORK` | every cache is empty |
| **Make it stale**, Read | `NETWORK` | **both caches are full and it still goes to the network** |
| Make it stale, server **down**, Read | `DATABASE · stale` | serve what we have, and say so |
| Pick a filter, kill the app, reopen | filter still set, `DATABASE` | the setting came from key-value, the posts from SQLite |

The sixth row is the one nobody expects. A cache is not "do I have it" — it is
"do I have it **and is it still allowed to answer**". The thing holding that permission
is a single number in a key-value store.

## The four stores

| | Holds | Survives the app closing | Can you query it |
|---|---|---|---|
| `MemoryStore` | an array | no | it is an array, so yes |
| `SqliteStore` | rows | yes | yes, that is the point |
| key-value (`Settings`) | `lastSyncedAt`, the filter | yes | **no — one key, one value** |
| `FakeServer` | the truth | — | — |

`FeedCascade` is the only file that knows all four exist. Each store knows nothing
about the others.

## Where the layers live in code

`src/cascade.ts`, in `read()`. The whole policy is about twenty lines: check freshness,
try memory, try the database, otherwise go to the network and fill both on the way back.

Two details worth reading twice:

**Promotion.** When the database answers, it writes what it found into memory. That is
why the badge flips to `MEMORY` on the next read, and why a cascade gets faster as you
use it.

**The emptiness check ignores the filter.** The caches always hold the whole feed; the
filter is applied on the way out. Filter to an author with no posts and the cache is
still full — otherwise picking a filter would hammer the network.

## Key-value in Expo

`import Storage from 'expo-sqlite/kv-store'` — no new dependency, and a drop-in
replacement for AsyncStorage, which was removed from React Native core. It is SQLite
underneath, which is a good thing to say out loud: the storage is a table, but the API
refuses to let you query it. That refusal is what makes it a key-value store.

`src/kv.ts` is three methods. `src/expoKv.ts` is the only file that imports it, and the
tests satisfy the same three methods with a table in `node:sqlite`.
