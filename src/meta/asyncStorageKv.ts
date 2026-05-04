import AsyncStorage from '@react-native-async-storage/async-storage';
import type { KeyValueStore } from '@/meta/SaveStore';

export const asyncStorageKv: KeyValueStore = {
  async getItem(k) { return AsyncStorage.getItem(k); },
  async setItem(k, v) { await AsyncStorage.setItem(k, v); },
  async removeItem(k) { await AsyncStorage.removeItem(k); },
};
