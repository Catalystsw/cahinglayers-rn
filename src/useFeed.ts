import { useEffect, useMemo, useState } from 'react';

import { FakeServer, Post } from './model';
import { OfflineFirstRepository } from './repository';
import { PostStore } from './store';

export type Where = 'memory' | 'disk';

export type Feed = {
  where: Where;
  posts: Post[];
  busy: boolean;
  error: string | null;
  serverUp: boolean;
  setWhere: (where: Where) => void;
  setServerUp: (up: boolean) => void;
  refresh: () => void;
  toggleLike: (id: string) => void;
};

/**
 * The view model. React has no ViewModel class, so this hook is the thing that owns
 * state and talks to the repository — and the screen below it only reads [Feed].
 */
export function useFeed(server: FakeServer, memory: PostStore, disk: PostStore | null): Feed {
  const [where, setWhere] = useState<Where>('memory');
  const [serverUp, setServerUpState] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const store = where === 'disk' ? disk : memory;

  const repository = useMemo(
    () => (store ? new OfflineFirstRepository(server, store) : null),
    [server, store],
  );

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!repository) return;
    let alive = true;
    const read = () => {
      void repository.feed().then((next) => {
        if (alive) setPosts(next);
      });
    };
    const unsubscribe = repository.subscribe(read);
    read();
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [repository]);

  // Only fetch when this store has nothing. Switching to a disk that already has rows
  // shows them without touching the network — which is the whole lesson.
  useEffect(() => {
    if (!repository) return;
    void repository.feed().then((existing) => {
      if (existing.length === 0) void run(() => repository.refresh());
    });
  }, [repository]);

  return {
    where,
    posts,
    busy,
    error,
    serverUp,
    setWhere,
    setServerUp: (up) => {
      server.setReachable(up);
      setServerUpState(up);
    },
    refresh: () => {
      if (repository) void run(() => repository.refresh());
    },
    toggleLike: (id) => {
      const post = posts.find((candidate) => candidate.id === id);
      if (repository && post) void run(() => repository.setLiked(id, !post.likedByMe));
    },
  };
}
