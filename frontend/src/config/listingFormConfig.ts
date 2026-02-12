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
export const HIDE_PRICE_SUBCATEGORIES: string[] = [];

// Categories that show salary range instead of price
export const SHOW_SALARY_SUBCATEGORIES = ['job_listings'];

// Categories that should only allow chat (no phone/whatsapp)
export const CHAT_ONLY_CATEGORIES = ['friendship_dating'];

// Categories that should hide condition (new/used)
export const HIDE_CONDITION_CATEGORIES = ['friendship_dating', 'community', 'jobs_services'];
export const HIDE_CONDITION_SUBCATEGORIES = ['job_listings', 'services_offered'];

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

// Category-specific listing tips for better photos and descriptions
export interface ListingTip {
  icon: string;
  title: string;
  description: string;
}

export interface CategoryListingTips {
  photoTips: ListingTip[];
  descriptionTips: ListingTip[];
}

export const CATEGORY_LISTING_TIPS: Record<string, CategoryListingTips> = {
  auto_vehicles: {
    photoTips: [
      { icon: 'car-outline', title: 'Exterior Shots', description: 'Take photos from all 4 corners, plus front and back' },
      { icon: 'speedometer-outline', title: 'Dashboard & Mileage', description: 'Show odometer clearly with engine running' },
      { icon: 'construct-outline', title: 'Engine Bay', description: 'Clean engine bay photo shows good maintenance' },
      { icon: 'warning-outline', title: 'Any Damage', description: 'Be transparent - show scratches, dents honestly' },
    ],
    descriptionTips: [
      { icon: 'document-text-outline', title: 'Service History', description: 'Mention recent services, oil changes, new parts' },
      { icon: 'shield-checkmark-outline', title: 'Ownership', description: 'Include number of owners, clean title status' },
    ],
  },
  properties: {
    photoTips: [
      { icon: 'home-outline', title: 'Wide Angles', description: 'Use corners of rooms to capture full space' },
      { icon: 'sunny-outline', title: 'Natural Light', description: 'Shoot during daytime with curtains open' },
      { icon: 'image-outline', title: 'Key Features', description: 'Highlight kitchen, bathrooms, views, balcony' },
      { icon: 'map-outline', title: 'Neighborhood', description: 'Include street view, nearby amenities' },
    ],
    descriptionTips: [
      { icon: 'resize-outline', title: 'Exact Measurements', description: 'Include square meters/feet, room dimensions' },
      { icon: 'cash-outline', title: 'Costs', description: 'Mention utilities, maintenance fees, deposits' },
    ],
  },
  electronics: {
    photoTips: [
      { icon: 'phone-portrait-outline', title: 'Clean Background', description: 'Use plain white/neutral background' },
      { icon: 'flash-outline', title: 'Good Lighting', description: 'Avoid harsh shadows, show true colors' },
      { icon: 'apps-outline', title: 'Screen On', description: 'For devices, show working screen' },
      { icon: 'cube-outline', title: 'Box & Accessories', description: 'Include original packaging, chargers, manuals' },
    ],
    descriptionTips: [
      { icon: 'hardware-chip-outline', title: 'Full Specs', description: 'Include model number, storage, RAM, year' },
      { icon: 'battery-charging-outline', title: 'Battery Health', description: 'Mention battery condition percentage' },
    ],
  },
  phones_tablets: {
    photoTips: [
      { icon: 'phone-portrait-outline', title: 'Screen Condition', description: 'Show screen clearly - any scratches or cracks' },
      { icon: 'camera-outline', title: 'Camera Quality', description: 'Include a sample photo taken with the device' },
      { icon: 'cube-outline', title: 'All Angles', description: 'Show front, back, sides, and corners' },
      { icon: 'gift-outline', title: 'Accessories', description: 'Photo all included items - case, charger, box' },
    ],
    descriptionTips: [
      { icon: 'battery-full-outline', title: 'Battery Health', description: 'Check and mention battery capacity percentage' },
      { icon: 'lock-closed-outline', title: 'Unlock Status', description: 'Confirm if unlocked for all carriers' },
    ],
  },
  home_furniture: {
    photoTips: [
      { icon: 'resize-outline', title: 'Scale Reference', description: 'Include common object for size comparison' },
      { icon: 'color-palette-outline', title: 'True Colors', description: 'Use natural light to show actual color' },
      { icon: 'eye-outline', title: 'Close-ups', description: 'Show material texture, patterns, details' },
      { icon: 'alert-circle-outline', title: 'Wear & Tear', description: 'Be honest about any scratches or stains' },
    ],
    descriptionTips: [
      { icon: 'cube-outline', title: 'Dimensions', description: 'Include height, width, depth measurements' },
      { icon: 'information-circle-outline', title: 'Material', description: 'Specify material type - wood, metal, fabric' },
    ],
  },
  fashion_beauty: {
    photoTips: [
      { icon: 'shirt-outline', title: 'Flat Lay or Hanger', description: 'Show full garment clearly laid out' },
      { icon: 'body-outline', title: 'Worn Photos', description: 'If possible, show item being worn' },
      { icon: 'pricetag-outline', title: 'Tags & Labels', description: 'Include brand tags, size labels, care instructions' },
      { icon: 'search-outline', title: 'Detail Shots', description: 'Show stitching, buttons, zippers, fabric texture' },
    ],
    descriptionTips: [
      { icon: 'resize-outline', title: 'Measurements', description: 'Include bust, waist, length - not just S/M/L' },
      { icon: 'sparkles-outline', title: 'Condition', description: 'Note if never worn, gently used, or has flaws' },
    ],
  },
  jobs_services: {
    photoTips: [
      { icon: 'briefcase-outline', title: 'Professional Photo', description: 'Use a clear, professional headshot' },
      { icon: 'albums-outline', title: 'Portfolio', description: 'Show examples of your work or projects' },
      { icon: 'ribbon-outline', title: 'Certifications', description: 'Include photos of relevant certificates' },
      { icon: 'build-outline', title: 'Equipment', description: 'For trades, show your professional tools' },
    ],
    descriptionTips: [
      { icon: 'time-outline', title: 'Availability', description: 'Be clear about your schedule and response time' },
      { icon: 'star-outline', title: 'Experience', description: 'Highlight years of experience and specializations' },
    ],
  },
  friendship_dating: {
    photoTips: [
      { icon: 'happy-outline', title: 'Genuine Smile', description: 'Use recent photos that show the real you' },
      { icon: 'people-outline', title: 'Activity Shots', description: 'Include photos doing hobbies you mentioned' },
      { icon: 'camera-outline', title: 'Quality Photos', description: 'Clear, well-lit photos make better impressions' },
      { icon: 'shield-checkmark-outline', title: 'Stay Safe', description: 'Avoid photos that reveal your exact location' },
    ],
    descriptionTips: [
      { icon: 'heart-outline', title: 'Be Authentic', description: 'Share genuine interests and what you\'re looking for' },
      { icon: 'chatbubbles-outline', title: 'Conversation Starters', description: 'Include specific hobbies others can relate to' },
    ],
  },
  pets: {
    photoTips: [
      { icon: 'paw-outline', title: 'Clear Pet Photo', description: 'Show pet clearly - face, body, markings' },
      { icon: 'medkit-outline', title: 'Health Records', description: 'Include vaccination cards, vet records' },
      { icon: 'home-outline', title: 'Living Space', description: 'Show where the pet currently lives' },
      { icon: 'heart-outline', title: 'Personality', description: 'Capture photos showing their temperament' },
    ],
    descriptionTips: [
      { icon: 'fitness-outline', title: 'Health Info', description: 'Include age, vaccinations, spay/neuter status' },
      { icon: 'happy-outline', title: 'Temperament', description: 'Describe personality - good with kids, other pets' },
    ],
  },
  sports_hobbies: {
    photoTips: [
      { icon: 'football-outline', title: 'Multiple Angles', description: 'Show item from different perspectives' },
      { icon: 'construct-outline', title: 'Working Condition', description: 'Demonstrate item in use if possible' },
      { icon: 'cube-outline', title: 'All Parts', description: 'Include all components and accessories' },
      { icon: 'alert-circle-outline', title: 'Wear Signs', description: 'Show any wear, scratches, or damage' },
    ],
    descriptionTips: [
      { icon: 'barcode-outline', title: 'Brand & Model', description: 'Include exact brand, model, and year' },
      { icon: 'time-outline', title: 'Usage', description: 'Mention how often and how long it was used' },
    ],
  },
  kids_baby: {
    photoTips: [
      { icon: 'shield-checkmark-outline', title: 'Safety Labels', description: 'Show safety certification labels' },
      { icon: 'sparkles-outline', title: 'Cleanliness', description: 'Clean items before photographing' },
      { icon: 'construct-outline', title: 'Working Parts', description: 'Demonstrate moving parts, buttons, etc.' },
      { icon: 'cube-outline', title: 'All Pieces', description: 'Include all parts, batteries, accessories' },
    ],
    descriptionTips: [
      { icon: 'calendar-outline', title: 'Age Range', description: 'Specify recommended age and weight limits' },
      { icon: 'checkmark-circle-outline', title: 'Safety', description: 'Confirm no recalls, all safety features intact' },
    ],
  },
  community: {
    photoTips: [
      { icon: 'image-outline', title: 'Clear Visual', description: 'Use a relevant, eye-catching image' },
      { icon: 'location-outline', title: 'Location', description: 'Include photos of venue or meeting spot' },
      { icon: 'people-outline', title: 'Past Events', description: 'Show photos from previous gatherings' },
      { icon: 'megaphone-outline', title: 'Branded Graphics', description: 'Use consistent graphics for recognition' },
    ],
    descriptionTips: [
      { icon: 'calendar-outline', title: 'Date & Time', description: 'Be specific about when and how long' },
      { icon: 'navigate-outline', title: 'Directions', description: 'Include clear directions or address' },
    ],
  },
  default: {
    photoTips: [
      { icon: 'camera-outline', title: 'Good Lighting', description: 'Use natural light or well-lit room' },
      { icon: 'images-outline', title: 'Multiple Angles', description: 'Take photos from different perspectives' },
      { icon: 'search-outline', title: 'Show Details', description: 'Include close-ups of important features' },
      { icon: 'checkmark-circle-outline', title: 'Be Honest', description: 'Show any flaws or wear honestly' },
    ],
    descriptionTips: [
      { icon: 'document-text-outline', title: 'Be Detailed', description: 'Include all relevant specifications' },
      { icon: 'cash-outline', title: 'Price Justification', description: 'Explain why your price is fair' },
    ],
  },
};

export const getListingTips = (categoryId: string): CategoryListingTips => {
  return CATEGORY_LISTING_TIPS[categoryId] || CATEGORY_LISTING_TIPS.default;
};
