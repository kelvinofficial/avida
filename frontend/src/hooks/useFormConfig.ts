/**
 * Hook to fetch and use form configurations from API
 * Falls back to static config if API is unavailable
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import {
  CATEGORY_PLACEHOLDERS,
  SUBCATEGORY_PLACEHOLDERS,
  SELLER_TYPE_CONFIG,
  CATEGORY_PREFERENCES,
  HIDE_PRICE_CATEGORIES,
  HIDE_PRICE_SUBCATEGORIES,
  SHOW_SALARY_SUBCATEGORIES,
  CHAT_ONLY_CATEGORIES,
  HIDE_CONDITION_CATEGORIES,
  HIDE_CONDITION_SUBCATEGORIES,
  CategoryPlaceholders,
  SellerTypeConfig,
  PreferenceConfig,
} from '../config/listingFormConfig';

interface FormConfigData {
  placeholders: Record<string, CategoryPlaceholders>;
  subcategory_placeholders: Record<string, CategoryPlaceholders>;
  seller_types: Record<string, SellerTypeConfig>;
  preferences: Record<string, Partial<PreferenceConfig>>;
  visibility_rules: {
    hide_price_categories?: string[];
    hide_price_subcategories?: string[];
    show_salary_subcategories?: string[];
    chat_only_categories?: string[];
    hide_condition_categories?: string[];
    hide_condition_subcategories?: string[];
  };
}

// Cache for API configs
let cachedConfig: FormConfigData | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const useFormConfig = () => {
  const [apiConfig, setApiConfig] = useState<FormConfigData | null>(cachedConfig);
  const [loading, setLoading] = useState(!cachedConfig);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    // Check cache first
    if (cachedConfig && Date.now() - cacheTimestamp < CACHE_TTL) {
      setApiConfig(cachedConfig);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/api/form-config/public');
      const data = response.data as FormConfigData;
      
      // Update cache
      cachedConfig = data;
      cacheTimestamp = Date.now();
      
      setApiConfig(data);
      setError(null);
    } catch (err) {
      console.warn('Failed to fetch form config from API, using static config:', err);
      setError('Using static configuration');
      setApiConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Helper functions that use API config with static fallback
  const getPlaceholders = useCallback((categoryId: string, subcategoryId?: string): CategoryPlaceholders => {
    // Try API config first
    if (apiConfig) {
      // Check subcategory first
      if (subcategoryId && apiConfig.subcategory_placeholders?.[subcategoryId]) {
        return apiConfig.subcategory_placeholders[subcategoryId];
      }
      // Then category
      if (apiConfig.placeholders?.[categoryId]) {
        return apiConfig.placeholders[categoryId];
      }
      // Then default from API
      if (apiConfig.placeholders?.['default']) {
        return apiConfig.placeholders['default'];
      }
    }

    // Fall back to static config
    if (subcategoryId && SUBCATEGORY_PLACEHOLDERS[subcategoryId]) {
      return SUBCATEGORY_PLACEHOLDERS[subcategoryId];
    }
    if (CATEGORY_PLACEHOLDERS[categoryId]) {
      return CATEGORY_PLACEHOLDERS[categoryId];
    }
    return CATEGORY_PLACEHOLDERS.default;
  }, [apiConfig]);

  const getSellerTypes = useCallback((categoryId: string): SellerTypeConfig => {
    // Try API config first
    if (apiConfig?.seller_types?.[categoryId]) {
      return apiConfig.seller_types[categoryId];
    }
    if (apiConfig?.seller_types?.['default']) {
      return apiConfig.seller_types['default'];
    }
    
    // Fall back to static config
    return SELLER_TYPE_CONFIG[categoryId] || SELLER_TYPE_CONFIG.default;
  }, [apiConfig]);

  const shouldHidePrice = useCallback((categoryId: string, subcategoryId?: string): boolean => {
    // Try API config first
    if (apiConfig?.visibility_rules) {
      const rules = apiConfig.visibility_rules;
      if (rules.hide_price_categories?.includes(categoryId)) return true;
      if (subcategoryId && rules.hide_price_subcategories?.includes(subcategoryId)) return true;
    }
    
    // Fall back to static config
    if (HIDE_PRICE_CATEGORIES.includes(categoryId)) return true;
    if (subcategoryId && HIDE_PRICE_SUBCATEGORIES.includes(subcategoryId)) return true;
    return false;
  }, [apiConfig]);

  const shouldShowSalaryRange = useCallback((subcategoryId?: string): boolean => {
    if (!subcategoryId) return false;
    
    // Try API config first
    if (apiConfig?.visibility_rules?.show_salary_subcategories) {
      return apiConfig.visibility_rules.show_salary_subcategories.includes(subcategoryId);
    }
    
    // Fall back to static config
    return SHOW_SALARY_SUBCATEGORIES.includes(subcategoryId);
  }, [apiConfig]);

  const isChatOnlyCategory = useCallback((categoryId: string): boolean => {
    // Try API config first
    if (apiConfig?.visibility_rules?.chat_only_categories) {
      return apiConfig.visibility_rules.chat_only_categories.includes(categoryId);
    }
    
    // Fall back to static config
    return CHAT_ONLY_CATEGORIES.includes(categoryId);
  }, [apiConfig]);

  const shouldHideCondition = useCallback((categoryId: string, subcategoryId?: string): boolean => {
    // Try API config first
    if (apiConfig?.visibility_rules) {
      const rules = apiConfig.visibility_rules;
      if (rules.hide_condition_categories?.includes(categoryId)) return true;
      if (subcategoryId && rules.hide_condition_subcategories?.includes(subcategoryId)) return true;
    }
    
    // Fall back to static config
    if (HIDE_CONDITION_CATEGORIES.includes(categoryId)) return true;
    if (subcategoryId && HIDE_CONDITION_SUBCATEGORIES.includes(subcategoryId)) return true;
    return false;
  }, [apiConfig]);

  const getCategoryPreferences = useCallback((categoryId: string): Partial<PreferenceConfig> => {
    // Try API config first
    if (apiConfig?.preferences?.[categoryId]) {
      return apiConfig.preferences[categoryId];
    }
    
    // Fall back to static config
    return CATEGORY_PREFERENCES[categoryId] || {};
  }, [apiConfig]);

  return {
    loading,
    error,
    isUsingApiConfig: apiConfig !== null && Object.keys(apiConfig.placeholders || {}).length > 0,
    getPlaceholders,
    getSellerTypes,
    shouldHidePrice,
    shouldShowSalaryRange,
    isChatOnlyCategory,
    shouldHideCondition,
    getCategoryPreferences,
    refreshConfig: fetchConfig,
  };
};

// Re-export the static configs for backwards compatibility
export {
  CATEGORY_PLACEHOLDERS,
  SUBCATEGORY_PLACEHOLDERS,
  SELLER_TYPE_CONFIG,
  CATEGORY_PREFERENCES,
  HIDE_PRICE_CATEGORIES,
  HIDE_PRICE_SUBCATEGORIES,
  SHOW_SALARY_SUBCATEGORIES,
  CHAT_ONLY_CATEGORIES,
  HIDE_CONDITION_CATEGORIES,
  HIDE_CONDITION_SUBCATEGORIES,
};
