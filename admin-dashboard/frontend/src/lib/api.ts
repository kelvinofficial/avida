import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api/admin';

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      if (this.accessToken) {
        config.headers.Authorization = `Bearer ${this.accessToken}`;
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          this.clearToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_token', token);
    }
  }

  clearToken() {
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('refresh_token');
    }
  }

  loadToken() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('admin_token');
    }
  }

  // Generic HTTP methods for custom endpoints
  async get(path: string, params?: Record<string, any>) {
    const { data } = await this.client.get(path, { params });
    return data;
  }

  async post(path: string, body?: Record<string, any>) {
    const { data } = await this.client.post(path, body);
    return data;
  }

  // Auth
  async login(email: string, password: string, totpCode?: string) {
    const { data } = await this.client.post('/auth/login', { email, password, totp_code: totpCode });
    this.setToken(data.access_token);
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', data.refresh_token);
    }
    return data;
  }

  async logout() {
    try {
      await this.client.post('/auth/logout');
    } catch {
      // Ignore errors on logout
    }
    this.clearToken();
  }

  async getMe() {
    const { data } = await this.client.get('/auth/me');
    return data;
  }

  // Categories
  async getCategories(includeHidden = true, flat = false) {
    const { data } = await this.client.get('/categories', { params: { include_hidden: includeHidden, flat } });
    return data;
  }

  async getCategory(id: string) {
    const { data } = await this.client.get(`/categories/${id}`);
    return data;
  }

  async createCategory(category: Partial<{
    name: string;
    slug: string;
    icon?: string;
    color?: string;
    parent_id?: string;
    description?: string;
    is_visible?: boolean;
    order?: number;
  }>) {
    const { data } = await this.client.post('/categories', category);
    return data;
  }

  async updateCategory(id: string, updates: Record<string, unknown>) {
    const { data } = await this.client.patch(`/categories/${id}`, updates);
    return data;
  }

  async deleteCategory(id: string, migrateTo?: string) {
    const { data } = await this.client.delete(`/categories/${id}`, { params: { migrate_to: migrateTo } });
    return data;
  }

  async reorderCategories(orders: { id: string; order: number }[]) {
    const { data } = await this.client.post('/categories/reorder', orders);
    return data;
  }

  // Attributes
  async getCategoryAttributes(categoryId: string) {
    const { data } = await this.client.get(`/categories/${categoryId}/attributes`);
    return data;
  }

  async getAllAttributes(includeInherited: boolean = true) {
    const { data } = await this.client.get('/attributes', { params: { include_inherited: includeInherited } });
    return data;
  }

  async getAttributeTemplates() {
    const { data } = await this.client.get('/attribute-templates');
    return data;
  }

  async getAttributeTemplate(templateId: string) {
    const { data } = await this.client.get(`/attribute-templates/${templateId}`);
    return data;
  }

  async applyAttributeTemplate(categoryId: string, templateId: string, merge: boolean = true) {
    const { data } = await this.client.post(`/categories/${categoryId}/apply-template`, { template_id: templateId, merge });
    return data;
  }

  async bulkAttributeAction(categoryId: string, attributeIds: string[], action: 'delete' | 'update' | 'copy', updateData?: Record<string, unknown>, targetCategoryId?: string) {
    const { data } = await this.client.post('/attributes/bulk', {
      category_id: categoryId,
      attribute_ids: attributeIds,
      action,
      update_data: updateData,
      target_category_id: targetCategoryId
    });
    return data;
  }

  async addAttribute(categoryId: string, attribute: {
    name: string;
    key: string;
    type: string;
    required?: boolean;
    options?: string[];
    order?: number;
    icon?: string;
    placeholder?: string;
    help_text?: string;
    min_length?: number;
    max_length?: number;
    min_value?: number;
    max_value?: number;
    default_value?: string;
    unit?: string;
    searchable?: boolean;
    filterable?: boolean;
    show_in_list?: boolean;
  }) {
    const { data } = await this.client.post(`/categories/${categoryId}/attributes`, {
      ...attribute,
      category_id: categoryId
    });
    return data;
  }

  async updateAttribute(categoryId: string, attributeId: string, updates: Record<string, unknown>) {
    const { data } = await this.client.patch(`/categories/${categoryId}/attributes/${attributeId}`, updates);
    return data;
  }

  async deleteAttribute(categoryId: string, attributeId: string) {
    const { data } = await this.client.delete(`/categories/${categoryId}/attributes/${attributeId}`);
    return data;
  }

  // Users
  async getUsers(params: { page?: number; limit?: number; search?: string; status?: string }) {
    const { data } = await this.client.get('/users', { params });
    return data;
  }

  async getUser(id: string) {
    const { data } = await this.client.get(`/users/${id}`);
    return data;
  }

  async banUser(id: string, reason: string, durationDays?: number) {
    const { data } = await this.client.post(`/users/${id}/ban`, { reason, duration_days: durationDays });
    return data;
  }

  async unbanUser(id: string) {
    const { data } = await this.client.post(`/users/${id}/unban`);
    return data;
  }

  // Listings
  async getListings(params: { page?: number; limit?: number; status?: string; category_id?: string; search?: string }) {
    const { data } = await this.client.get('/listings', { params });
    return data;
  }

  async getListing(id: string) {
    const { data } = await this.client.get(`/listings/${id}`);
    return data;
  }

  async updateListingStatus(id: string, status: string, reason?: string) {
    const { data } = await this.client.patch(`/listings/${id}/status`, { status, reason });
    return data;
  }

  async toggleListingFeature(id: string, featured: boolean) {
    const { data } = await this.client.post(`/listings/${id}/feature`, null, { params: { featured } });
    return data;
  }

  async bulkListingAction(listingIds: string[], action: string, categoryId?: string, reason?: string) {
    const { data } = await this.client.post('/listings/bulk', { listing_ids: listingIds, action, category_id: categoryId, reason });
    return data;
  }

  async updateListing(id: string, updates: {
    name?: string;
    description?: string;
    price?: number;
    currency?: string;
    category_id?: string;
    location?: string;
    condition?: string;
    status?: string;
    images?: string[];
    attributes?: Record<string, unknown>;
    contact_phone?: string;
    contact_email?: string;
    negotiable?: boolean;
  }) {
    const { data } = await this.client.put(`/listings/${id}`, updates);
    return data;
  }

  async uploadListingImages(id: string, files: File[]) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    const { data } = await this.client.post(`/listings/${id}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  }

  async deleteListingImage(id: string, imageIndex: number) {
    const { data } = await this.client.delete(`/listings/${id}/images/${imageIndex}`);
    return data;
  }

  // Reports
  async getReports(params: { page?: number; limit?: number; status?: string }) {
    const { data } = await this.client.get('/reports', { params });
    return data;
  }

  async updateReport(id: string, status: string, resolutionNotes?: string) {
    const { data } = await this.client.patch(`/reports/${id}`, { status, resolution_notes: resolutionNotes });
    return data;
  }

  // Tickets
  async getTickets(params: { page?: number; limit?: number; status?: string; priority?: string }) {
    const { data } = await this.client.get('/tickets', { params });
    return data;
  }

  async createTicket(ticket: { user_id: string; subject: string; description: string; priority?: string }) {
    const { data } = await this.client.post('/tickets', ticket);
    return data;
  }

  async updateTicket(id: string, updates: Record<string, unknown>) {
    const { data } = await this.client.patch(`/tickets/${id}`, updates);
    return data;
  }

  async respondToTicket(id: string, message: string, isInternal = false) {
    const { data } = await this.client.post(`/tickets/${id}/respond`, { message, is_internal: isInternal });
    return data;
  }

  // Analytics
  async getAnalyticsOverview() {
    const { data } = await this.client.get('/analytics/overview');
    return data;
  }

  async getListingsByCategory() {
    const { data } = await this.client.get('/analytics/listings-by-category');
    return data;
  }

  async getUsersGrowth(days = 30) {
    const { data } = await this.client.get('/analytics/users-growth', { params: { days } });
    return data;
  }

  // Audit Logs
  async getAuditLogs(params: { page?: number; limit?: number; admin_id?: string; action?: string; entity_type?: string }) {
    const { data } = await this.client.get('/audit-logs', { params });
    return data;
  }

  // Settings
  async getSettings() {
    const { data } = await this.client.get('/settings');
    return data;
  }

  async updateSettings(settings: Record<string, unknown>) {
    const { data } = await this.client.patch('/settings', settings);
    return data;
  }

  // Admin Users
  async getAdmins() {
    const { data } = await this.client.get('/admins');
    return data;
  }

  async createAdmin(admin: { email: string; name: string; password: string; role: string }) {
    const { data } = await this.client.post('/admins', admin);
    return data;
  }

  async updateAdmin(id: string, updates: Record<string, unknown>) {
    const { data } = await this.client.patch(`/admins/${id}`, updates);
    return data;
  }

  // Ads Management
  async getAds() {
    const { data } = await this.client.get('/ads');
    return data;
  }

  async createAd(ad: { name: string; platform: string; ad_type: string; placement_id: string; location: string; is_active?: boolean }) {
    const { data } = await this.client.post('/ads', ad);
    return data;
  }

  async updateAd(id: string, updates: Record<string, unknown>) {
    const { data } = await this.client.patch(`/ads/${id}`, updates);
    return data;
  }

  async deleteAd(id: string) {
    const { data } = await this.client.delete(`/ads/${id}`);
    return data;
  }

  async trackAdEvent(adId: string, eventType: 'impression' | 'click') {
    const { data } = await this.client.post(`/ads/${adId}/track?event_type=${eventType}`);
    return data;
  }

  // Notifications
  async getNotifications(params?: { page?: number; limit?: number; status?: string }) {
    const { data } = await this.client.get('/notifications', { params });
    return data;
  }

  async getNotificationTemplates(category?: string) {
    const { data } = await this.client.get('/notification-templates', { params: category ? { category } : {} });
    return data;
  }

  async getNotificationTemplate(templateId: string) {
    const { data } = await this.client.get(`/notification-templates/${templateId}`);
    return data;
  }

  async createNotification(notification: {
    title: string;
    message: string;
    type: string;
    target_type?: string;
    target_ids?: string[];
    scheduled_at?: string;
    recurring_enabled?: boolean;
    recurring_frequency?: string;
    recurring_time?: string;
    recurring_day_of_week?: number;
    recurring_day_of_month?: number;
    recurring_end_date?: string;
    target_filters?: Record<string, unknown>;
    ab_test_enabled?: boolean;
    ab_variant_b_title?: string;
    ab_variant_b_message?: string;
    ab_split_percentage?: number;
  }) {
    const { data } = await this.client.post('/notifications', notification);
    return data;
  }

  async updateNotification(id: string, updates: Record<string, unknown>) {
    const { data } = await this.client.patch(`/notifications/${id}`, updates);
    return data;
  }

  async sendNotification(id: string) {
    const { data } = await this.client.post(`/notifications/${id}/send`);
    return data;
  }

  async deleteNotification(id: string) {
    const { data } = await this.client.delete(`/notifications/${id}`);
    return data;
  }

  // Custom Templates
  async getCustomTemplates(params?: { page?: number; limit?: number }) {
    const { data } = await this.client.get('/custom-templates', { params });
    return data;
  }

  async createCustomTemplate(template: {
    name: string;
    category: string;
    title: string;
    message: string;
    icon?: string;
    recommended_type?: string;
    variables?: string[];
  }) {
    const { data } = await this.client.post('/custom-templates', template);
    return data;
  }

  async updateCustomTemplate(id: string, updates: Record<string, unknown>) {
    const { data } = await this.client.put(`/custom-templates/${id}`, updates);
    return data;
  }

  async deleteCustomTemplate(id: string) {
    const { data } = await this.client.delete(`/custom-templates/${id}`);
    return data;
  }

  // Template Analytics
  async getTemplateAnalytics() {
    const { data } = await this.client.get('/template-analytics');
    return data;
  }

  // User Segments
  async getUserSegments() {
    const { data } = await this.client.get('/user-segments');
    return data;
  }

  // CSV Import
  async importUsersCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await this.client.post('/users/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  }

  async importCategoriesCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await this.client.post('/categories/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  }

  async importListingsCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await this.client.post('/listings/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  }

  // Category Icon Upload
  async uploadCategoryIcon(categoryId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await this.client.post(`/categories/${categoryId}/icon`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  }

  async deleteCategoryIcon(categoryId: string) {
    const { data } = await this.client.delete(`/categories/${categoryId}/icon`);
    return data;
  }

  // Attribute Icon Upload
  async uploadAttributeIcon(categoryId: string, attributeId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await this.client.post(`/categories/${categoryId}/attributes/${attributeId}/icon`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  }

  async deleteAttributeIcon(categoryId: string, attributeId: string) {
    const { data } = await this.client.delete(`/categories/${categoryId}/attributes/${attributeId}/icon`);
    return data;
  }

  // Location Management
  async getLocations(params?: { page?: number; limit?: number; type?: string; parent_id?: string; search?: string; is_active?: boolean }) {
    const { data } = await this.client.get('/locations', { params });
    return data;
  }

  async createLocation(location: { name: string; type: string; parent_id?: string; country_code?: string; latitude?: number; longitude?: number; is_active?: boolean; is_featured?: boolean }) {
    const { data } = await this.client.post('/locations', location);
    return data;
  }

  async updateLocation(id: string, updates: Record<string, unknown>) {
    const { data } = await this.client.put(`/locations/${id}`, updates);
    return data;
  }

  async deleteLocation(id: string) {
    const { data } = await this.client.delete(`/locations/${id}`);
    return data;
  }

  async importLocationsCSV(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await this.client.post('/locations/bulk-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  }

  // User Edit
  async updateUser(userId: string, updates: { name?: string; email?: string; phone?: string; location?: string; bio?: string; is_verified?: boolean; is_active?: boolean; role?: string }) {
    const { data } = await this.client.put(`/users/${userId}`, updates);
    return data;
  }

  async uploadUserAvatar(userId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await this.client.post(`/users/${userId}/avatar`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return data;
  }

  // Auth Settings
  async getAuthSettings() {
    const { data } = await this.client.get('/settings/auth');
    return data;
  }

  async updateAuthSettings(settings: Record<string, unknown>) {
    const { data } = await this.client.put('/settings/auth', settings);
    return data;
  }

  // Deeplinks
  async getDeeplinks(params?: { page?: number; limit?: number; target_type?: string; is_active?: boolean }) {
    const { data } = await this.client.get('/deeplinks', { params });
    return data;
  }

  async createDeeplink(deeplink: { name: string; slug: string; target_type: string; target_id?: string; target_url?: string; fallback_url?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string; is_active?: boolean }) {
    const { data } = await this.client.post('/deeplinks', deeplink);
    return data;
  }

  async updateDeeplink(id: string, updates: Record<string, unknown>) {
    const { data } = await this.client.put(`/deeplinks/${id}`, updates);
    return data;
  }

  async deleteDeeplink(id: string) {
    const { data } = await this.client.delete(`/deeplinks/${id}`);
    return data;
  }

  async getDeeplinkStats(id: string) {
    const { data } = await this.client.get(`/deeplinks/${id}/stats`);
    return data;
  }

  // =========================================================================
  // BOOST SYSTEM
  // =========================================================================

  // Credit Packages (Admin)
  async getBoostPackages(activeOnly: boolean = true) {
    const endpoint = activeOnly ? '/boost/packages' : '/boost/admin/packages';
    const { data } = await this.client.get(endpoint);
    return data;
  }

  async createBoostPackage(pkg: { name: string; description?: string; price: number; credits: number; bonus_credits?: number; is_active?: boolean; is_popular?: boolean }) {
    const { data } = await this.client.post('/boost/admin/packages', pkg);
    return data;
  }

  async updateBoostPackage(id: string, updates: Record<string, unknown>) {
    const { data } = await this.client.put(`/boost/admin/packages/${id}`, updates);
    return data;
  }

  async deleteBoostPackage(id: string) {
    const { data } = await this.client.delete(`/boost/admin/packages/${id}`);
    return data;
  }

  // Boost Pricing (Admin)
  async getBoostPricing() {
    const { data } = await this.client.get('/boost/pricing');
    return data;
  }

  async getBoostPricingAdmin() {
    const { data } = await this.client.get('/boost/admin/pricing');
    return data;
  }

  async setBoostPricing(pricing: { boost_type: string; name: string; description?: string; credits_per_hour: number; credits_per_day: number; min_duration_hours?: number; max_duration_days?: number; is_enabled?: boolean; priority?: number }) {
    const { data } = await this.client.put('/boost/admin/pricing', pricing);
    return data;
  }

  async toggleBoostType(boostType: string, enabled: boolean) {
    const { data } = await this.client.put(`/boost/admin/pricing/${boostType}/toggle?enabled=${enabled}`);
    return data;
  }

  // Boost Analytics (Admin)
  async getBoostAnalytics() {
    const { data } = await this.client.get('/boost/admin/analytics');
    return data;
  }

  // Seller Credits (Admin)
  async getBoostSellers(page: number = 1, limit: number = 20) {
    const { data } = await this.client.get('/boost/admin/sellers', { params: { page, limit } });
    return data;
  }

  async adjustSellerCredits(sellerId: string, amount: number, reason: string) {
    const { data } = await this.client.post('/boost/admin/credits/adjust', { seller_id: sellerId, amount, reason });
    return data;
  }

  async expireBoosts() {
    const { data } = await this.client.post('/boost/admin/expire-boosts');
    return data;
  }

  // Payment Methods Management
  async getPaymentMethods() {
    const { data } = await this.client.get('/boost/admin/payment-methods');
    return data;
  }

  async getPaymentMethod(methodId: string) {
    const { data } = await this.client.get(`/boost/admin/payment-methods/${methodId}`);
    return data;
  }

  async updatePaymentMethod(methodId: string, updates: { name?: string; description?: string; is_enabled?: boolean; exchange_rate?: number; min_amount?: number; max_amount?: number; priority?: number }) {
    const { data } = await this.client.put(`/boost/admin/payment-methods/${methodId}`, updates);
    return data;
  }

  async togglePaymentMethod(methodId: string, enabled: boolean) {
    const { data } = await this.client.put(`/boost/admin/payment-methods/${methodId}/toggle`, null, { params: { enabled } });
    return data;
  }

  // Seller Credit Operations
  async getMyCredits() {
    const { data } = await this.client.get('/boost/credits/balance');
    return data;
  }

  async getMyCreditHistory(limit: number = 50) {
    const { data } = await this.client.get('/boost/credits/history', { params: { limit } });
    return data;
  }

  async purchaseCredits(packageId: string, originUrl: string, provider: string = 'stripe') {
    const { data } = await this.client.post('/boost/credits/purchase', { package_id: packageId, origin_url: originUrl, provider });
    return data;
  }

  async checkPaymentStatus(sessionId: string) {
    const { data } = await this.client.get(`/boost/credits/payment-status/${sessionId}`);
    return data;
  }

  // Boost Operations
  async calculateBoostCost(boostType: string, durationHours: number) {
    const { data } = await this.client.get('/boost/calculate', { params: { boost_type: boostType, duration_hours: durationHours } });
    return data;
  }

  async createBoost(boostData: { listing_id: string; boost_type: string; duration_hours: number; location_id?: string; category_id?: string }) {
    const { data } = await this.client.post('/boost/create', boostData);
    return data;
  }

  async getMyBoosts(activeOnly: boolean = false) {
    const { data } = await this.client.get('/boost/my-boosts', { params: { active_only: activeOnly } });
    return data;
  }

  async getListingBoosts(listingId: string) {
    const { data } = await this.client.get(`/boost/listing/${listingId}`);
    return data;
  }

  // =========================================================================
  // SELLER ANALYTICS (via Admin Backend Proxy)
  // =========================================================================

  async getSellerAnalytics(endpoint: string) {
    // Map main app endpoints to admin backend proxy endpoints
    const proxyMap: Record<string, string> = {
      '/analytics/admin/settings': '/seller-analytics/settings',
      '/analytics/admin/engagement-notification-config': '/seller-analytics/engagement-config',
      '/analytics/admin/platform-analytics': '/seller-analytics/platform-analytics',
    };
    
    const proxyEndpoint = proxyMap[endpoint] || endpoint;
    const { data } = await this.client.get(proxyEndpoint);
    return data;
  }

  async putSellerAnalytics(endpoint: string, body: Record<string, unknown>) {
    const proxyMap: Record<string, string> = {
      '/analytics/admin/settings': '/seller-analytics/settings',
      '/analytics/admin/engagement-notification-config': '/seller-analytics/engagement-config',
    };
    
    const proxyEndpoint = proxyMap[endpoint] || endpoint;
    const { data } = await this.client.put(proxyEndpoint, body);
    return data;
  }

  async post(endpoint: string, body?: Record<string, unknown>) {
    const proxyMap: Record<string, string> = {
      '/analytics/admin/trigger-engagement-check': '/seller-analytics/trigger-engagement-check',
    };
    
    const proxyEndpoint = proxyMap[endpoint] || endpoint;
    const { data } = await this.client.post(proxyEndpoint, body);
    return data;
  }

  // =========================================================================
  // BANNER MANAGEMENT
  // =========================================================================

  async getBannerSlots() {
    const { data } = await this.client.get('/banners/slots');
    return data;
  }

  async getBannerSizes() {
    const { data } = await this.client.get('/banners/sizes');
    return data;
  }

  async getBanners(page: number = 1, limit: number = 20, placement?: string, isActive?: boolean) {
    const params: Record<string, any> = { page, limit };
    if (placement) params.placement = placement;
    if (isActive !== undefined) params.is_active = isActive;
    const { data } = await this.client.get('/banners/admin/list', { params });
    return data;
  }

  async getBanner(bannerId: string) {
    const { data } = await this.client.get(`/banners/admin/${bannerId}`);
    return data;
  }

  async createBanner(bannerData: Record<string, any>) {
    const { data } = await this.client.post('/banners/admin/create', bannerData);
    return data;
  }

  async updateBanner(bannerId: string, bannerData: Record<string, any>) {
    const { data } = await this.client.put(`/banners/admin/${bannerId}`, bannerData);
    return data;
  }

  async deleteBanner(bannerId: string) {
    const { data } = await this.client.delete(`/banners/admin/${bannerId}`);
    return data;
  }

  async toggleBanner(bannerId: string, isActive: boolean) {
    const { data } = await this.client.post(`/banners/admin/${bannerId}/toggle`, { is_active: isActive });
    return data;
  }

  async getBannerAnalytics(bannerId?: string, startDate?: string, endDate?: string, groupBy: string = 'day') {
    const params: Record<string, any> = { group_by: groupBy };
    if (bannerId) params.banner_id = bannerId;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const { data } = await this.client.get('/banners/admin/analytics/overview', { params });
    return data;
  }

  async exportBannerAnalytics(bannerId?: string, startDate?: string, endDate?: string) {
    const params: Record<string, any> = {};
    if (bannerId) params.banner_id = bannerId;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    const response = await this.client.get('/banners/admin/analytics/export', { 
      params,
      responseType: 'blob'
    });
    
    // Download the file
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'banner_analytics.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async getPendingSellerBanners() {
    const { data } = await this.client.get('/banners/admin/seller-banners/pending');
    return data;
  }

  async approveSellerBanner(bannerId: string, approved: boolean) {
    const { data } = await this.client.post(`/banners/admin/seller-banners/${bannerId}/approve`, { approved });
    return data;
  }

  async getBannerPricing() {
    const { data } = await this.client.get('/banners/admin/pricing');
    return data;
  }

  async updateBannerPricing(pricingId: string, update: Record<string, any>) {
    const { data } = await this.client.put(`/banners/admin/pricing/${pricingId}`, update);
    return data;
  }
}

export const api = new ApiClient();
