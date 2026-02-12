import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFS_KEY = 'notification_prefs';

interface NotificationPrefsState {
  soundEnabled: boolean;
  isLoaded: boolean;
  setSoundEnabled: (enabled: boolean) => Promise<void>;
  loadPrefs: () => Promise<void>;
}

export const useNotificationPrefsStore = create<NotificationPrefsState>((set, get) => ({
  soundEnabled: true, // Default: sound enabled
  isLoaded: false,

  setSoundEnabled: async (enabled: boolean) => {
    try {
      const prefs = { soundEnabled: enabled };
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
      set({ soundEnabled: enabled });
    } catch (error) {
      console.error('Error saving notification prefs:', error);
    }
  },

  loadPrefs: async () => {
    try {
      const stored = await AsyncStorage.getItem(PREFS_KEY);
      if (stored) {
        const prefs = JSON.parse(stored);
        set({ soundEnabled: prefs.soundEnabled ?? true, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch (error) {
      console.error('Error loading notification prefs:', error);
      set({ isLoaded: true });
    }
  },
}));
