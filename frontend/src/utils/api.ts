import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  exchangeSession: async (sessionId: string) => {
    const response = await api.post('/auth/session', { session_id: sessionId });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  }
};

// Categories API
export const categoriesApi = {
  getAll: async () => {
    const response = await api.get('/categories');
    return response.data;
  },
  getOne: async (id: string) => {
    const response = await api.get(`/categories/${id}`);
    return response.data;
  }
};

// Listings API
export const listingsApi = {
  getAll: async (params?: {
    category?: string;
    search?: string;
    min_price?: number;
    max_price?: number;
    condition?: string;
    location?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await api.get('/listings', { params });
    return response.data;
  },
  getOne: async (id: string) => {
    const response = await api.get(`/listings/${id}`);
    return response.data;
  },
  getMy: async (status?: string) => {
    const response = await api.get('/listings/my', { params: { status } });
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/listings', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/listings/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/listings/${id}`);
    return response.data;
  }
};

// Favorites API
export const favoritesApi = {
  getAll: async () => {
    const response = await api.get('/favorites');
    return response.data;
  },
  add: async (listingId: string) => {
    const response = await api.post(`/favorites/${listingId}`);
    return response.data;
  },
  remove: async (listingId: string) => {
    const response = await api.delete(`/favorites/${listingId}`);
    return response.data;
  }
};

// Conversations API
export const conversationsApi = {
  getAll: async () => {
    const response = await api.get('/conversations');
    return response.data;
  },
  getOne: async (id: string) => {
    const response = await api.get(`/conversations/${id}`);
    return response.data;
  },
  create: async (listingId: string) => {
    const response = await api.post(`/conversations?listing_id=${listingId}`);
    return response.data;
  },
  sendMessage: async (conversationId: string, content: string) => {
    const response = await api.post(`/conversations/${conversationId}/messages`, { content });
    return response.data;
  }
};

// Users API
export const usersApi = {
  getOne: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  updateMe: async (data: any) => {
    const response = await api.put('/users/me', data);
    return response.data;
  },
  block: async (userId: string) => {
    const response = await api.post(`/users/block/${userId}`);
    return response.data;
  },
  unblock: async (userId: string) => {
    const response = await api.post(`/users/unblock/${userId}`);
    return response.data;
  }
};

// Reports API
export const reportsApi = {
  create: async (data: {
    reported_user_id?: string;
    listing_id?: string;
    reason: string;
    description: string;
  }) => {
    const response = await api.post('/reports', data);
    return response.data;
  }
};
