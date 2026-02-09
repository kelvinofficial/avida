/**
 * Sandbox-Aware API Utilities
 * 
 * When sandbox mode is active, these functions route API calls to sandbox
 * proxy endpoints to return sandbox data instead of production data.
 */

import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SANDBOX_SESSION_KEY = 'sandbox_session';

// Check if sandbox mode is active
async function isSandboxActive(): Promise<boolean> {
  try {
    const session = await AsyncStorage.getItem(SANDBOX_SESSION_KEY);
    if (session) {
      const parsed = JSON.parse(session);
      return parsed?.status === 'active';
    }
    return false;
  } catch {
    return false;
  }
}

// Get current sandbox session
async function getSandboxSession(): Promise<any | null> {
  try {
    const session = await AsyncStorage.getItem(SANDBOX_SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
}

// Sandbox-aware listings API
export const sandboxAwareListingsApi = {
  getAll: async (params?: {
    category?: string;
    subcategory?: string;
    search?: string;
    min_price?: number;
    max_price?: number;
    condition?: string;
    location?: string;
    sort?: string;
    page?: number;
    limit?: number;
  }) => {
    const sandboxActive = await isSandboxActive();
    
    if (sandboxActive) {
      // Route to sandbox proxy
      const response = await api.get('/sandbox/proxy/listings', {
        params: {
          category: params?.category,
          search: params?.search,
          limit: params?.limit || 20,
          skip: ((params?.page || 1) - 1) * (params?.limit || 20)
        }
      });
      return {
        ...response.data,
        sandbox_mode: true
      };
    }
    
    // Normal production API call
    const response = await api.get('/listings', { params });
    return response.data;
  },

  getOne: async (id: string) => {
    const sandboxActive = await isSandboxActive();
    
    if (sandboxActive) {
      const response = await api.get(`/sandbox/proxy/listings/${id}`);
      return {
        ...response.data,
        sandbox_mode: true
      };
    }
    
    const response = await api.get(`/listings/${id}`);
    return response.data;
  }
};

// Sandbox-aware orders API
export const sandboxAwareOrdersApi = {
  getMy: async () => {
    const sandboxActive = await isSandboxActive();
    
    if (sandboxActive) {
      const session = await getSandboxSession();
      if (session?.sandbox_user_id) {
        const response = await api.get(`/sandbox/proxy/orders/${session.sandbox_user_id}`);
        return response.data;
      }
      return [];
    }
    
    const response = await api.get('/orders/my');
    return response.data;
  },

  create: async (listingId: string, shippingAddress: any) => {
    const sandboxActive = await isSandboxActive();
    
    if (sandboxActive) {
      const session = await getSandboxSession();
      const response = await api.post('/sandbox/proxy/order', {
        session_id: session?.id,
        listing_id: listingId,
        shipping_address: shippingAddress
      });
      return response.data;
    }
    
    const response = await api.post('/orders', { listing_id: listingId, shipping_address: shippingAddress });
    return response.data;
  }
};

// Sandbox-aware conversations API
export const sandboxAwareConversationsApi = {
  getAll: async () => {
    const sandboxActive = await isSandboxActive();
    
    if (sandboxActive) {
      const session = await getSandboxSession();
      if (session?.sandbox_user_id) {
        const response = await api.get(`/sandbox/proxy/conversations/${session.sandbox_user_id}`);
        return response.data;
      }
      return [];
    }
    
    const response = await api.get('/conversations');
    return response.data;
  },

  sendMessage: async (recipientId: string, message: string) => {
    const sandboxActive = await isSandboxActive();
    
    if (sandboxActive) {
      const session = await getSandboxSession();
      const response = await api.post('/sandbox/proxy/message', {
        session_id: session?.id,
        recipient_id: recipientId,
        message
      });
      return response.data;
    }
    
    // For production, you'd need to implement the proper conversation flow
    return null;
  }
};

// Sandbox-aware notifications API  
export const sandboxAwareNotificationsApi = {
  getAll: async () => {
    const sandboxActive = await isSandboxActive();
    
    if (sandboxActive) {
      const session = await getSandboxSession();
      if (session?.sandbox_user_id) {
        const response = await api.get(`/sandbox/proxy/notifications/${session.sandbox_user_id}`);
        return {
          notifications: response.data,
          sandbox_mode: true
        };
      }
      return { notifications: [], sandbox_mode: true };
    }
    
    const response = await api.get('/notifications');
    return response.data;
  }
};

// Sandbox-aware categories API
export const sandboxAwareCategoriesApi = {
  getAll: async () => {
    const sandboxActive = await isSandboxActive();
    
    if (sandboxActive) {
      const response = await api.get('/sandbox/proxy/categories');
      return response.data;
    }
    
    const response = await api.get('/categories');
    return response.data;
  }
};

// Helper to check sandbox status
export const sandboxUtils = {
  isActive: isSandboxActive,
  getSession: getSandboxSession,
  
  // Add sandbox badge to data
  tagAsSandbox: (data: any) => {
    if (Array.isArray(data)) {
      return data.map(item => ({ ...item, sandbox_mode: true }));
    }
    return { ...data, sandbox_mode: true };
  }
};

export default {
  listings: sandboxAwareListingsApi,
  orders: sandboxAwareOrdersApi,
  conversations: sandboxAwareConversationsApi,
  notifications: sandboxAwareNotificationsApi,
  categories: sandboxAwareCategoriesApi,
  utils: sandboxUtils
};
