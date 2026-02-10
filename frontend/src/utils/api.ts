import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
  // Don't use withCredentials as it requires specific CORS headers
  // We use Authorization header for auth instead
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors and log API errors to QA system
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 auth errors
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    
    // Log API errors to QA system (only for actual errors, not 401s which are handled separately)
    if (error.response?.status !== 401 && error.config?.url) {
      // Dynamic import to avoid circular dependency
      try {
        const { logApiError } = await import('./errorLogger');
        const userId = useAuthStore.getState().user?.user_id;
        logApiError(error.config.url, error, { userId });
      } catch (logErr) {
        // Silently fail if error logging fails
        console.error('Failed to log API error:', logErr);
      }
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
  // Email/Password login
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  // Email/Password registration
  register: async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name });
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
  },
  getSubcategories: async (categoryId: string) => {
    const response = await api.get(`/categories/${categoryId}/subcategories`);
    return response.data;
  },
  getSubcategoryCounts: async (categoryId: string) => {
    const response = await api.get(`/categories/${categoryId}/subcategory-counts`);
    return response.data;
  }
};

// Listings API
export const listingsApi = {
  getAll: async (params?: {
    category?: string;
    subcategory?: string;
    search?: string;
    min_price?: number;
    max_price?: number;
    condition?: string;
    location?: string;
    country_code?: string;
    region_code?: string;
    district_code?: string;
    city_code?: string;
    sort?: string;
    page?: number;
    limit?: number;
    filters?: string; // JSON string of attribute filters
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
  createDirect: async (userId: string) => {
    const response = await api.post('/conversations/direct', { user_id: userId });
    return response.data;
  },
  sendMessage: async (
    conversationId: string, 
    content: string,
    messageType: 'text' | 'audio' | 'image' | 'video' = 'text',
    mediaUrl?: string,
    mediaDuration?: number
  ) => {
    const response = await api.post(`/conversations/${conversationId}/messages`, { 
      content,
      message_type: messageType,
      media_url: mediaUrl,
      media_duration: mediaDuration
    });
    return response.data;
  },
  uploadMedia: async (file: FormData, mediaType: 'audio' | 'image' | 'video') => {
    const response = await api.post(`/messages/upload-media?media_type=${mediaType}`, file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
};

// Report API - User reporting system
export const reportApi = {
  getReasons: async () => {
    const response = await api.get('/report/reasons');
    return response.data;
  },
  reportMessage: async (
    conversationId: string,
    reason: string,
    messageId?: string,
    description?: string
  ) => {
    const response = await api.post('/report/message', {
      conversation_id: conversationId,
      message_id: messageId,
      reason,
      description
    });
    return response.data;
  }
};

// Users API
export const usersApi = {
  getOne: async (id: string) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  getPublicProfile: async (id: string) => {
    const response = await api.get(`/profile/public/${id}`);
    return response.data;
  },
  getListings: async (id: string, params?: { status?: string; limit?: number }) => {
    const response = await api.get(`/users/${id}/listings`, { params });
    return response.data;
  },
  getReviews: async (id: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/users/${id}/reviews`, { params });
    return response.data;
  },
  follow: async (id: string) => {
    const response = await api.post(`/users/${id}/follow`);
    return response.data;
  },
  unfollow: async (id: string) => {
    const response = await api.delete(`/users/${id}/follow`);
    return response.data;
  },
  createReview: async (id: string, data: { rating: number; comment?: string }) => {
    const response = await api.post(`/users/${id}/reviews`, data);
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
  },
  getStatus: async (userId: string) => {
    const response = await api.get(`/users/${userId}/status`);
    return response.data;
  },
  getStatusBatch: async (userIds: string[]) => {
    const response = await api.post('/users/status/batch', userIds);
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

// Notifications API
export const notificationsApi = {
  getAll: async (params?: { type?: string; unread_only?: boolean; page?: number; limit?: number }) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },
  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },
  markAsRead: async (notificationId: string) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },
  markAllAsRead: async () => {
    const response = await api.put('/notifications/mark-all-read');
    return response.data;
  },
  delete: async (notificationId: string) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },
  clearAll: async () => {
    const response = await api.delete('/notifications');
    return response.data;
  }
};

// Boost & Credits API
export const boostApi = {
  // Credit Packages
  getPackages: async () => {
    const response = await api.get('/boost/packages');
    return response.data;
  },
  
  // Payment Providers
  getPaymentProviders: async () => {
    const response = await api.get('/boost/payment-providers');
    return response.data;
  },
  
  // Boost Pricing
  getPricing: async () => {
    const response = await api.get('/boost/pricing');
    return response.data;
  },
  
  // Calculate Boost Cost
  calculateCost: async (boostType: string, durationHours: number) => {
    const response = await api.get('/boost/calculate', { params: { boost_type: boostType, duration_hours: durationHours } });
    return response.data;
  },
  
  // Seller Credits
  getMyCredits: async () => {
    const response = await api.get('/boost/credits/balance');
    return response.data;
  },
  
  getCreditHistory: async (limit: number = 50) => {
    const response = await api.get('/boost/credits/history', { params: { limit } });
    return response.data;
  },
  
  // Purchase Credits
  purchaseCredits: async (packageId: string, originUrl: string, provider: string = 'stripe', phoneNumber?: string, mobileNetwork?: string) => {
    const response = await api.post('/boost/credits/purchase', { 
      package_id: packageId, 
      origin_url: originUrl,
      provider,
      phone_number: phoneNumber,
      mobile_network: mobileNetwork
    });
    return response.data;
  },
  
  checkPaymentStatus: async (sessionId: string) => {
    const response = await api.get(`/boost/credits/payment-status/${sessionId}`);
    return response.data;
  },
  
  // Boosts
  createBoost: async (data: { 
    listing_id: string; 
    boost_type: string; 
    duration_hours: number;
    location_id?: string;
    category_id?: string;
  }) => {
    const response = await api.post('/boost/create', data);
    return response.data;
  },
  
  getMyBoosts: async (activeOnly: boolean = false) => {
    const response = await api.get('/boost/my-boosts', { params: { active_only: activeOnly } });
    return response.data;
  },
  
  getListingBoosts: async (listingId: string) => {
    const response = await api.get(`/boost/listing/${listingId}`);
    return response.data;
  }
};

// Locations API - Hierarchical location data
export const locationsApi = {
  // Get all countries
  getCountries: async () => {
    const response = await api.get('/locations/countries');
    return response.data;
  },
  
  // Get regions for a country
  getRegions: async (countryCode: string, search?: string) => {
    const response = await api.get('/locations/regions', { 
      params: { country_code: countryCode, search } 
    });
    return response.data;
  },
  
  // Get districts for a region
  getDistricts: async (countryCode: string, regionCode: string, search?: string) => {
    const response = await api.get('/locations/districts', { 
      params: { country_code: countryCode, region_code: regionCode, search } 
    });
    return response.data;
  },
  
  // Get cities for a district
  getCities: async (countryCode: string, regionCode: string, districtCode: string, search?: string) => {
    const response = await api.get('/locations/cities', { 
      params: { country_code: countryCode, region_code: regionCode, district_code: districtCode, search } 
    });
    return response.data;
  },
  
  // Search cities by name
  searchCities: async (countryCode: string, query: string, limit: number = 20) => {
    const response = await api.get('/locations/cities/search', { 
      params: { country_code: countryCode, q: query, limit } 
    });
    return response.data;
  },
  
  // Get specific city by codes
  getCity: async (countryCode: string, regionCode: string, districtCode: string, cityCode: string) => {
    const response = await api.get('/locations/city', { 
      params: { country_code: countryCode, region_code: regionCode, district_code: districtCode, city_code: cityCode } 
    });
    return response.data;
  },
  
  // Get location stats
  getStats: async () => {
    const response = await api.get('/locations/stats');
    return response.data;
  },
  
  // Get nearby listings
  getNearby: async (lat: number, lng: number, radiusKm: number = 50, limit: number = 20, page: number = 1, categoryId?: string) => {
    const response = await api.get('/locations/nearby', { 
      params: { lat, lng, radius_km: radiusKm, limit, page, category_id: categoryId } 
    });
    return response.data;
  }
};

// Default export for convenience
export default api;
