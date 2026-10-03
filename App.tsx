import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import * as SQLite from 'expo-sqlite';

import { expoDb } from './src/expoDb';
import { FakeServer } from './src/model';
import { SqliteStore } from './src/sqliteStore';
import { MemoryStore } from './src/store';
import { useFeed, Where } from './src/useFeed';

const ARROW: Record<Where, string> = {
  memory: 'network  →  memory  →  screen',
  disk: 'network  →  disk  →  screen',
};

export default function App() {
  const server = useMemo(() => new FakeServer(), []);
  const memory = useMemo(() => new MemoryStore(), []);
  const [disk, setDisk] = useState<SqliteStore | null>(null);

  useEffect(() => {
    let alive = true;
    void SQLite.openDatabaseAsync('catalyst_feed.db')
      .then((db) => SqliteStore.open(expoDb(db)))
      .then((store) => {
        if (alive) setDisk(store);
      });
    return () => {
      alive = false;
    };
  }, []);

  const feed = useFeed(server, memory, disk);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <View style={styles.bar}>
        <View style={styles.row}>
          {(['memory', 'disk'] as Where[]).map((option) => (
            <Pressable
              key={option}
              onPress={() => feed.setWhere(option)}
              style={[styles.chip, feed.where === option && styles.chipOn]}
            >
              <Text style={[styles.chipText, feed.where === option && styles.chipTextOn]}>
                {option === 'memory' ? 'Memory' : 'Disk'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.arrow, feed.where === 'disk' && styles.arrowDisk]}>
          {ARROW[feed.where]}
        </Text>

        <View style={[styles.row, styles.serverRow]}>
          <Text style={[styles.serverText, !feed.serverUp && styles.serverDown]}>
            {feed.serverUp ? 'server: up' : 'server: down'}
          </Text>
          <Switch value={feed.serverUp} onValueChange={feed.setServerUp} />
        </View>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Feed</Text>
        <Pressable onPress={feed.refresh}>
          <Text style={styles.refresh}>{feed.busy ? '…' : 'Refresh'}</Text>
        </Pressable>
      </View>

      {feed.error !== null && feed.posts.length > 0 && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{feed.error}</Text>
        </View>
      )}

      {feed.posts.length === 0 && feed.busy && (
        <ActivityIndicator color="#3B4FE8" style={styles.spinner} />
      )}

      {feed.posts.length === 0 && !feed.busy && (
        <View style={styles.spinner}>
          <Text style={styles.empty}>{feed.error ?? 'Nothing here yet.'}</Text>
        </View>
      )}

      <FlatList
        data={feed.posts}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: item.accent }]} />
              <Text style={styles.author}>{item.author}</Text>
            </View>
            <Text style={styles.caption}>{item.caption}</Text>
            <Pressable onPress={() => feed.toggleLike(item.id)}>
              <Text style={[styles.like, item.likedByMe && styles.liked]}>
                {item.likedByMe ? '♥' : '♡'}  {item.likeCount}
              </Text>
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0C0F30' },
  bar: { backgroundColor: '#141845', paddingHorizontal: 12, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  serverRow: { justifyContent: 'space-between', marginTop: 6 },
  chip: {
    flex: 1,
    paddingVertical: 10,
    marginRight: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E2670',
    alignItems: 'center',
  },
  chipOn: { backgroundColor: '#3B4FE8', borderColor: '#3B4FE8' },
  chipText: { color: '#A6ABD1', fontWeight: '700', fontSize: 13 },
  chipTextOn: { color: '#FFFFFF' },
  arrow: { color: '#F5B84C', fontWeight: '700', fontSize: 15, marginTop: 10 },
  arrowDisk: { color: '#3ED9A4' },
  serverText: { color: '#A6ABD1', fontWeight: '700', fontSize: 13 },
  serverDown: { color: '#FF5C7A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  refresh: { color: '#8E9BFF', fontSize: 15, fontWeight: '600' },
  banner: { backgroundColor: 'rgba(255,92,122,0.16)', paddingHorizontal: 16, paddingVertical: 6 },
  bannerText: { color: '#FF5C7A', fontSize: 12.5 },
  spinner: { paddingTop: 40, alignItems: 'center' },
  empty: { color: '#A6ABD1' },
  card: {
    backgroundColor: '#0F1230',
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 14,
    padding: 14,
  },
  avatar: { width: 30, height: 30, borderRadius: 15 },
  author: { color: '#FFFFFF', fontWeight: '600', fontSize: 14, marginLeft: 10 },
  caption: { color: '#FFFFFF', fontSize: 14, marginTop: 10 },
  like: { color: '#A6ABD1', fontSize: 14, marginTop: 10, paddingVertical: 4 },
  liked: { color: '#FF5C7A' },
});
