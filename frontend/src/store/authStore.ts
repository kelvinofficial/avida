import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

const TOKEN_KEY = 'session_token';
const USER_KEY = 'user_data';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => Promise<void>;
  loadStoredAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      return AsyncStorage.setItem(key, value);
    }
    return SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      return AsyncStorage.removeItem(key);
    }
    return SecureStore.deleteItemAsync(key);
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setToken: async (token) => {
    if (token) {
      await storage.setItem(TOKEN_KEY, token);
    } else {
      await storage.removeItem(TOKEN_KEY);
    }
    set({ token });
  },

  loadStoredAuth: async () => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 3000)
      );
      
      const loadPromise = async () => {
        const token = await storage.getItem(TOKEN_KEY);
        const userJson = await storage.getItem(USER_KEY);
        
        if (token && userJson) {
          const user = JSON.parse(userJson);
          set({ user, token, isAuthenticated: true, isLoading: false });
        } else {
          set({ isLoading: false });
        }
      };
      
      await Promise.race([loadPromise(), timeoutPromise]);
    } catch (error) {
      console.error('Error loading auth:', error);
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await storage.removeItem(TOKEN_KEY);
    await storage.removeItem(USER_KEY);
    set({ user: null, token: null, isAuthenticated: false });
  }
}));

export const saveUserData = async (user: User) => {
  await storage.setItem(USER_KEY, JSON.stringify(user));
};
