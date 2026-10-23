import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateStorage } from 'zustand/middleware';

// 内存后备存储，确保在任何情况下（例如原生模块未就绪、Web 端或热重载时）均不抛出异常崩溃
const memoryStorage = new Map<string, string>();

export const safeAsyncStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
        const value = await AsyncStorage.getItem(name).catch(() => null);
        if (value !== null && value !== undefined) return value;
      }
    } catch {
      // 容错处理：若原生存储异常，安全回退到内存
    }
    return memoryStorage.get(name) ?? null;
  },

  setItem: async (name: string, value: string): Promise<void> => {
    try {
      if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
        await AsyncStorage.setItem(name, value).catch(() => {});
      }
    } catch {
      // 容错处理
    }
    memoryStorage.set(name, value);
  },

  removeItem: async (name: string): Promise<void> => {
    try {
      if (AsyncStorage && typeof AsyncStorage.removeItem === 'function') {
        await AsyncStorage.removeItem(name).catch(() => {});
      }
    } catch {
      // 容错处理
    }
    memoryStorage.delete(name);
  },
};
