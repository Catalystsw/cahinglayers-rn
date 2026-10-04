import { useEffect, useState } from 'react';

import { Answer, FeedCascade } from './cascade';
import { FakeServer } from './model';
import { ALL } from './settings';

export type Feed = {
  answer: Answer | null;
  busy: boolean;
  error: string | null;
  serverUp: boolean;
  filter: string;
  read: () => void;
  setFilter: (value: string) => void;
  setServerUp: (up: boolean) => void;
  clearMemory: () => void;
  wipeDisk: () => void;
  expire: () => void;
  toggleLike: (id: string) => void;
};

export function useFeed(server: FakeServer, cascade: FeedCascade | null): Feed {
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverUp, setServerUpState] = useState(true);
  const [filter, setFilterState] = useState(ALL);

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

  const after = (change: (ready: FeedCascade) => Promise<void>) => {
    if (!cascade) return;
    void run(async () => {
      await change(cascade);
      setAnswer(await cascade.read());
    });
  };

  useEffect(() => {
    if (!cascade) return;
    let alive = true;
    void cascade.filter().then((saved) => {
      if (!alive) return;
      setFilterState(saved);
      void run(async () => {
        const first = await cascade.read();
        if (alive) setAnswer(first);
      });
    });
    return () => {
      alive = false;
    };
  }, [cascade]);

  return {
    answer,
    busy,
    error,
    serverUp,
    filter,
    read: () => after(async () => {}),
    setFilter: (value) => {
      setFilterState(value);
      after((ready) => ready.setFilter(value));
    },
    setServerUp: (up) => {
      server.setReachable(up);
      setServerUpState(up);
    },
    clearMemory: () => after((ready) => ready.clearMemory()),
    wipeDisk: () => after((ready) => ready.wipeDisk()),
    expire: () => after((ready) => ready.expire()),
    toggleLike: (id) => {
      const post = answer?.posts.find((candidate) => candidate.id === id);
      if (post) after((ready) => ready.setLiked(id, !post.likedByMe));
    },
  };
}
