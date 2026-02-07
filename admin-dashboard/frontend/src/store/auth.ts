import { create } from 'zustand';
import { Admin } from '@/types';
import { api } from '@/lib/api';

interface AuthState {
  admin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  admin: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email: string, password: string) => {
    const response = await api.login(email, password);
    set({ admin: response.admin, isAuthenticated: true });
  },

  logout: async () => {
    await api.logout();
    set({ admin: null, isAuthenticated: false });
  },

  loadSession: async () => {
    try {
      api.loadToken();
      const admin = await api.getMe();
      set({ admin, isAuthenticated: true, isLoading: false });
    } catch {
      set({ admin: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
