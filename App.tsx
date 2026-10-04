import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import * as SQLite from 'expo-sqlite';

import { FeedCascade, Layer } from './src/cascade';
import { expoDb } from './src/expoDb';
import { expoKv } from './src/expoKv';
import { AUTHORS, FakeServer } from './src/model';
import { ALL, Settings } from './src/settings';
import { SqliteStore } from './src/sqliteStore';
import { MemoryStore } from './src/store';
import { useFeed } from './src/useFeed';

const LAYER_COLOR: Record<Layer, string> = {
  memory: '#8E9BFF',
  database: '#3ED9A4',
  network: '#F5B84C',
};

export default function App() {
  const server = useMemo(() => new FakeServer(), []);
  const [cascade, setCascade] = useState<FeedCascade | null>(null);

  useEffect(() => {
    let alive = true;
    void SQLite.openDatabaseAsync('catalyst_feed.db')
      .then((db) => SqliteStore.open(expoDb(db)))
      .then((disk) => {
        if (alive) {
          setCascade(new FeedCascade(server, new MemoryStore(), disk, new Settings(expoKv())));
        }
      });
    return () => {
      alive = false;
    };
  }, [server]);

  const feed = useFeed(server, cascade);
  const layer = feed.answer?.layer;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" />

      <View style={styles.badge}>
        <Text style={styles.badgeLabel}>answered by</Text>
        <Text style={[styles.badgeLayer, layer && { color: LAYER_COLOR[layer] }]}>
          {feed.busy ? 'reading…' : (layer ?? '—').toUpperCase()}
        </Text>
        <Text style={styles.badgeTime}>
          {feed.answer ? `${feed.answer.millis} ms` : ''}
          {feed.answer?.stale ? '   · stale, the server is down' : ''}
        </Text>
      </View>

      <View style={styles.controls}>
        <View style={styles.row}>
          <Pressable style={styles.button} onPress={feed.read}>
            <Text style={styles.buttonText}>Read</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={feed.clearMemory}>
            <Text style={styles.buttonText}>Clear memory</Text>
          </Pressable>
        </View>
        <View style={styles.row}>
          <Pressable style={styles.button} onPress={feed.wipeDisk}>
            <Text style={styles.buttonText}>Wipe disk</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.amber]} onPress={feed.expire}>
            <Text style={styles.buttonText}>Make it stale</Text>
          </Pressable>
        </View>

        <View style={[styles.row, styles.serverRow]}>
          <Text style={[styles.serverText, !feed.serverUp && styles.serverDown]}>
            {feed.serverUp ? 'server: up' : 'server: down'}
          </Text>
          <Switch value={feed.serverUp} onValueChange={feed.setServerUp} />
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {[ALL, ...AUTHORS].map((name) => (
          <Pressable
            key={name}
            onPress={() => feed.setFilter(name)}
            style={[styles.chip, feed.filter === name && styles.chipOn]}
          >
            <Text style={[styles.chipText, feed.filter === name && styles.chipTextOn]}>
              {name === ALL ? 'Everyone' : name.split(' ')[0]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {feed.error !== null && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{feed.error}</Text>
        </View>
      )}

      <FlatList
        data={feed.answer?.posts ?? []}
        keyExtractor={(post) => post.id}
        ListEmptyComponent={<Text style={styles.empty}>Nothing in any layer.</Text>}
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
  badge: { backgroundColor: '#141845', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  badgeLabel: { color: '#6B70A0', fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  badgeLayer: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  badgeTime: { color: '#A6ABD1', fontSize: 12.5, marginTop: 2 },
  controls: { paddingHorizontal: 12, paddingTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  button: {
    flex: 1,
    paddingVertical: 10,
    marginRight: 6,
    marginBottom: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E2670',
    backgroundColor: '#0F1230',
    alignItems: 'center',
  },
  amber: { borderColor: '#F5B84C' },
  buttonText: { color: '#A6ABD1', fontWeight: '700', fontSize: 13 },
  serverRow: { justifyContent: 'space-between', marginTop: 2 },
  serverText: { color: '#A6ABD1', fontWeight: '700', fontSize: 13 },
  serverDown: { color: '#FF5C7A' },
  chips: { flexGrow: 0, paddingHorizontal: 12, paddingVertical: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginRight: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#1E2670',
  },
  chipOn: { backgroundColor: '#3B4FE8', borderColor: '#3B4FE8' },
  chipText: { color: '#A6ABD1', fontWeight: '600', fontSize: 13 },
  chipTextOn: { color: '#FFFFFF' },
  banner: { backgroundColor: 'rgba(255,92,122,0.16)', paddingHorizontal: 16, paddingVertical: 6 },
  bannerText: { color: '#FF5C7A', fontSize: 12.5 },
  empty: { color: '#A6ABD1', textAlign: 'center', marginTop: 30 },
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
