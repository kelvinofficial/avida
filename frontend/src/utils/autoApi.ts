import { api } from './api';
import { AutoFilters, AutoListing, CarBrand, CarModel } from '../types/auto';

// Auto/Motors API endpoints
export const autoApi = {
  // Get all car brands with listing counts
  getBrands: async (): Promise<CarBrand[]> => {
    const response = await api.get('/auto/brands');
    return response.data;
  },

  // Get models for a brand
  getModels: async (brandId: string): Promise<CarModel[]> => {
    const response = await api.get(`/auto/brands/${brandId}/models`);
    return response.data;
  },

  // Get auto listings with filters
  getListings: async (filters: AutoFilters & { page?: number; limit?: number; sort?: string }): Promise<{
    listings: AutoListing[];
    total: number;
    page: number;
    pages: number;
  }> => {
    const response = await api.get('/auto/listings', { params: filters });
    return response.data;
  },

  // Get single auto listing
  getListing: async (id: string): Promise<AutoListing> => {
    const response = await api.get(`/auto/listings/${id}`);
    return response.data;
  },

  // Get featured/boosted listings
  getFeatured: async (limit?: number): Promise<AutoListing[]> => {
    const response = await api.get('/auto/featured', { params: { limit } });
    return response.data;
  },

  // Get recommended listings (personalized)
  getRecommended: async (limit?: number): Promise<AutoListing[]> => {
    const response = await api.get('/auto/recommended', { params: { limit } });
    return response.data;
  },

  // Get popular searches
  getPopularSearches: async (): Promise<{ term: string; count: number }[]> => {
    const response = await api.get('/auto/popular-searches');
    return response.data;
  },

  // Track search
  trackSearch: async (term: string): Promise<void> => {
    await api.post('/auto/track-search', { term });
  },

  // Get filter options (dynamic based on available data)
  getFilterOptions: async (): Promise<{
    fuelTypes: string[];
    transmissions: string[];
    bodyTypes: string[];
    driveTypes: string[];
    colors: string[];
    cities: string[];
  }> => {
    const response = await api.get('/auto/filter-options');
    return response.data;
  },
};
