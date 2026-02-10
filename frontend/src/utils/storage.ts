/**
 * Cross-platform storage utility
 * Uses localStorage on web for better persistence and AsyncStorage on native
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const Storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.error('localStorage getItem error:', e);
        return null;
      }
    }
    return AsyncStorage.getItem(key);
  },
  
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.error('localStorage setItem error:', e);
      }
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
  
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.error('localStorage removeItem error:', e);
      }
      return;
    }
    return AsyncStorage.removeItem(key);
  }
};

export default Storage;
