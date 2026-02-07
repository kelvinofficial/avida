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

  async addAttribute(categoryId: string, attribute: Record<string, unknown>) {
    const { data } = await this.client.post(`/categories/${categoryId}/attributes`, attribute);
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
}

export const api = new ApiClient();
