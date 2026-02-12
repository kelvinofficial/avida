/**
 * Category-specific configurations for listing creation
 * These can be managed by admin in the future
 */

// Category-specific title and description placeholders
export interface CategoryPlaceholders {
  title: string;
  titleLabel?: string;
  description: string;
  descriptionLabel?: string;
}

export const CATEGORY_PLACEHOLDERS: Record<string, CategoryPlaceholders> = {
  // Default for goods/products
  default: {
    title: 'What are you selling?',
    titleLabel: 'Title',
    description: 'Include details like condition, features, reason for selling...',
    descriptionLabel: 'Description',
  },
  // Auto & Vehicles
  auto_vehicles: {
    title: 'e.g., 2020 BMW 320i - Low Mileage',
    titleLabel: 'Vehicle Title',
    description: 'Include make, model, year, mileage, condition, features, service history...',
    descriptionLabel: 'Vehicle Description',
  },
  // Properties
  properties: {
    title: 'e.g., 3 Bedroom Apartment in City Center',
    titleLabel: 'Property Title',
    description: 'Include property type, size, number of rooms, amenities, location details...',
    descriptionLabel: 'Property Description',
  },
  // Jobs & Services
  jobs_services: {
    title: 'e.g., Experienced Web Developer Available',
    titleLabel: 'Job/Service Title',
    description: 'Include your skills, experience, availability, and what you can offer...',
    descriptionLabel: 'Job/Service Description',
  },
  // Friendship & Dating
  friendship_dating: {
    title: 'e.g., Looking for hiking buddies',
    titleLabel: 'Post Title',
    description: 'Introduce yourself, your interests, and what you are looking for...',
    descriptionLabel: 'About You',
  },
  // Community
  community: {
    title: 'e.g., Weekend Cleanup Event',
    titleLabel: 'Post Title',
    description: 'Describe your post, event, or announcement details...',
    descriptionLabel: 'Details',
  },
  // Electronics
  electronics: {
    title: 'e.g., MacBook Pro 2023 - Excellent Condition',
    titleLabel: 'Item Title',
    description: 'Include brand, model, specifications, condition, and accessories included...',
    descriptionLabel: 'Item Description',
  },
  // Phones & Tablets
  phones_tablets: {
    title: 'e.g., iPhone 15 Pro Max 256GB',
    titleLabel: 'Device Title',
    description: 'Include model, storage capacity, condition, battery health, accessories...',
    descriptionLabel: 'Device Description',
  },
};

// Subcategory-specific placeholders (overrides category)
export const SUBCATEGORY_PLACEHOLDERS: Record<string, CategoryPlaceholders> = {
  // Job seekers
  job_seekers: {
    title: 'e.g., Marketing Professional Seeking Opportunities',
    titleLabel: 'Your Profile Title',
    description: 'Describe your skills, experience, qualifications, and the type of job you are looking for...',
    descriptionLabel: 'Your Professional Profile',
  },
  // Job offers
  job_offers: {
    title: 'e.g., Hiring: Senior Software Engineer',
    titleLabel: 'Job Position',
    description: 'Include job requirements, responsibilities, company info, and benefits...',
    descriptionLabel: 'Job Description',
  },
  // Services offered
  services_offered: {
    title: 'e.g., Professional Photography Services',
    titleLabel: 'Service Title',
    description: 'Describe your service, experience, pricing, and availability...',
    descriptionLabel: 'Service Details',
  },
  // Dating subcategories
  dating_relationships: {
    title: 'e.g., Genuine connection sought',
    titleLabel: 'About You',
    description: 'Introduce yourself, your interests, values, and what you are looking for in a partner...',
    descriptionLabel: 'Your Introduction',
  },
  friendship_social: {
    title: 'e.g., Looking for coffee chat partners',
    titleLabel: 'What are you looking for?',
    description: 'Describe yourself, your interests, and the kind of friendship you seek...',
    descriptionLabel: 'About You & Your Interests',
  },
};

// Category-specific seller types (renamed to "Listed by")
export interface SellerTypeConfig {
  label: string;
  options: string[];
}

export const SELLER_TYPE_CONFIG: Record<string, SellerTypeConfig> = {
  default: {
    label: 'Listed by',
    options: ['Individual', 'Owner', 'Company', 'Dealer', 'Broker'],
  },
  properties: {
    label: 'Listed by',
    options: ['Landlord', 'Landlady', 'Owner', 'Broker', 'Individual', 'Company'],
  },
  auto_vehicles: {
    label: 'Listed by',
    options: ['Owner', 'Broker', 'Individual', 'Company', 'Dealer'],
  },
  friendship_dating: {
    label: 'Listed by',
    options: ['Individual'],
  },
  jobs_services: {
    label: 'Listed by',
    options: ['Individual', 'Company', 'Recruiter'],
  },
  community: {
    label: 'Posted by',
    options: ['Individual', 'Organization', 'Community Group'],
  },
};

// Categories that should hide price
export const HIDE_PRICE_CATEGORIES = ['friendship_dating'];
export const HIDE_PRICE_SUBCATEGORIES = ['job_seekers'];

// Categories that show salary range instead of price
export const SHOW_SALARY_SUBCATEGORIES = ['job_offers', 'job_seekers'];

// Categories that should only allow chat (no phone/whatsapp)
export const CHAT_ONLY_CATEGORIES = ['friendship_dating'];

// Categories that should hide condition (new/used)
export const HIDE_CONDITION_CATEGORIES = ['friendship_dating', 'community'];
export const HIDE_CONDITION_SUBCATEGORIES = ['job_seekers', 'job_offers', 'services_offered'];

// Category-specific preferences
export interface PreferenceConfig {
  acceptsOffers: boolean;
  acceptsExchanges: boolean;
  negotiable: boolean;
  showSalaryRange?: boolean;
}

export const CATEGORY_PREFERENCES: Record<string, Partial<PreferenceConfig>> = {
  friendship_dating: {
    acceptsOffers: false,
    acceptsExchanges: false,
    negotiable: false,
  },
  jobs_services: {
    acceptsExchanges: false,
  },
};

// Helper functions
export const getPlaceholders = (categoryId: string, subcategoryId?: string): CategoryPlaceholders => {
  // Check subcategory first
  if (subcategoryId && SUBCATEGORY_PLACEHOLDERS[subcategoryId]) {
    return SUBCATEGORY_PLACEHOLDERS[subcategoryId];
  }
  // Then category
  if (CATEGORY_PLACEHOLDERS[categoryId]) {
    return CATEGORY_PLACEHOLDERS[categoryId];
  }
  // Default
  return CATEGORY_PLACEHOLDERS.default;
};

export const getSellerTypes = (categoryId: string): SellerTypeConfig => {
  return SELLER_TYPE_CONFIG[categoryId] || SELLER_TYPE_CONFIG.default;
};

export const shouldHidePrice = (categoryId: string, subcategoryId?: string): boolean => {
  if (HIDE_PRICE_CATEGORIES.includes(categoryId)) return true;
  if (subcategoryId && HIDE_PRICE_SUBCATEGORIES.includes(subcategoryId)) return true;
  return false;
};

export const shouldShowSalaryRange = (subcategoryId?: string): boolean => {
  return subcategoryId ? SHOW_SALARY_SUBCATEGORIES.includes(subcategoryId) : false;
};

export const shouldHideCondition = (categoryId: string, subcategoryId?: string): boolean => {
  if (HIDE_CONDITION_CATEGORIES.includes(categoryId)) return true;
  if (subcategoryId && HIDE_CONDITION_SUBCATEGORIES.includes(subcategoryId)) return true;
  return false;
};

export const isChatOnlyCategory = (categoryId: string): boolean => {
  return CHAT_ONLY_CATEGORIES.includes(categoryId);
};
