import Storage from 'expo-sqlite/kv-store';
import { KeyValue } from './kv';

export const expoKv = (): KeyValue => ({
  get: (key) => Storage.getItemAsync(key),
  set: (key, value) => Storage.setItemAsync(key, value),
  remove: async (key) => {
    await Storage.removeItemAsync(key);
  },
});
