// Property Types for Real Estate Category

export type PropertyPurpose = 'buy' | 'rent';

export type PropertyType = 
  | 'house'
  | 'apartment'
  | 'portion'
  | 'short_let'
  | 'residential_plot'
  | 'agricultural_land'
  | 'industrial_land'
  | 'commercial_plot'
  | 'office'
  | 'shop'
  | 'warehouse'
  | 'event_center'
  | 'factory'
  | 'building';

export type FurnishingType = 'furnished' | 'semi_furnished' | 'unfurnished';
export type ConditionType = 'new' | 'renovated' | 'old';

export interface PropertyLocation {
  country: string;
  city: string;
  area: string;
  estate?: string;
  address?: string;
  landmark?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface PropertyFacilities {
  // Utilities
  electricity24hr?: boolean;
  waterSupply?: boolean;
  generator?: boolean;
  // Interior
  furnished?: boolean;
  airConditioning?: boolean;
  wardrobe?: boolean;
  kitchenCabinets?: boolean;
  // Security
  security?: boolean;
  cctv?: boolean;
  gatedEstate?: boolean;
  // Outdoor
  parking?: boolean;
  balcony?: boolean;
  swimmingPool?: boolean;
  gym?: boolean;
  elevator?: boolean;
  wifi?: boolean;
}

export interface PropertyVerification {
  isVerified: boolean;
  docsChecked?: boolean;
  addressConfirmed?: boolean;
  ownerVerified?: boolean;
  agentVerified?: boolean;
  verifiedAt?: string;
}

export interface PropertyHighlight {
  id: string;
  icon: string;
  label: string;
}

export interface PropertySeller {
  id: string;
  name: string;
  type: 'owner' | 'agent';
  phone?: string;
  whatsapp?: string;
  isVerified: boolean;
  rating?: number;
  listingsCount?: number;
  memberSince?: string;
  responseTime?: string;
}

export interface Property {
  id: string;
  title: string;
  description: string;
  purpose: PropertyPurpose;
  type: PropertyType;
  price: number;
  currency: string;
  priceNegotiable: boolean;
  pricePerMonth?: boolean; // For rent
  
  location: PropertyLocation;
  
  bedrooms?: number;
  bathrooms?: number;
  toilets?: number;
  size?: number; // sqm
  sizeUnit?: 'sqm' | 'sqft';
  floorNumber?: number;
  totalFloors?: number;
  yearBuilt?: number;
  
  furnishing: FurnishingType;
  condition: ConditionType;
  
  facilities: PropertyFacilities;
  highlights: PropertyHighlight[];
  
  images: string[];
  videoUrl?: string;
  virtualTourUrl?: string;
  
  verification: PropertyVerification;
  seller: PropertySeller;
  
  featured: boolean;
  sponsored: boolean;
  boosted: boolean;
  
  views: number;
  favorites: number;
  inquiries: number;
  
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'pending' | 'sold' | 'rented' | 'inactive';
}

export interface PropertyFilters {
  purpose?: PropertyPurpose;
  type?: PropertyType;
  city?: string;
  area?: string;
  priceMin?: number;
  priceMax?: number;
  bedroomsMin?: number;
  bedroomsMax?: number;
  bathroomsMin?: number;
  bathroomsMax?: number;
  sizeMin?: number;
  sizeMax?: number;
  furnishing?: FurnishingType;
  condition?: ConditionType;
  verifiedOnly?: boolean;
  facilities?: (keyof PropertyFacilities)[];
}

export interface PropertyOffer {
  id: string;
  propertyId: string;
  buyerId: string;
  buyerName: string;
  offeredPrice: number;
  message?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
  counterPrice?: number;
  createdAt: string;
}

// Property Type Categories for Grid Display
export const PROPERTY_TYPE_CATEGORIES = {
  residential: [
    { id: 'house', name: 'Houses', icon: 'home' },
    { id: 'apartment', name: 'Apartments', icon: 'business' },
    { id: 'portion', name: 'Portions', icon: 'layers' },
    { id: 'short_let', name: 'Short Let', icon: 'calendar' },
  ],
  land: [
    { id: 'residential_plot', name: 'Residential Plots', icon: 'map' },
    { id: 'agricultural_land', name: 'Agricultural', icon: 'leaf' },
    { id: 'industrial_land', name: 'Industrial Land', icon: 'construct' },
    { id: 'commercial_plot', name: 'Commercial Plots', icon: 'storefront' },
  ],
  commercial: [
    { id: 'office', name: 'Offices', icon: 'briefcase' },
    { id: 'shop', name: 'Shops', icon: 'cart' },
    { id: 'warehouse', name: 'Warehouses', icon: 'cube' },
    { id: 'event_center', name: 'Event Centers', icon: 'people' },
    { id: 'factory', name: 'Factories', icon: 'cog' },
    { id: 'building', name: 'Buildings', icon: 'business' },
  ],
};

// Facilities for filter chips
export const FACILITIES_LIST = [
  { id: 'electricity24hr', label: '24hr Power', icon: 'flash', category: 'utilities' },
  { id: 'waterSupply', label: 'Water Supply', icon: 'water', category: 'utilities' },
  { id: 'generator', label: 'Generator', icon: 'flash-outline', category: 'utilities' },
  { id: 'airConditioning', label: 'AC', icon: 'snow', category: 'interior' },
  { id: 'wardrobe', label: 'Wardrobe', icon: 'shirt', category: 'interior' },
  { id: 'kitchenCabinets', label: 'Kitchen Cabinets', icon: 'restaurant', category: 'interior' },
  { id: 'security', label: 'Security', icon: 'shield-checkmark', category: 'security' },
  { id: 'cctv', label: 'CCTV', icon: 'videocam', category: 'security' },
  { id: 'gatedEstate', label: 'Gated Estate', icon: 'lock-closed', category: 'security' },
  { id: 'parking', label: 'Parking', icon: 'car', category: 'outdoor' },
  { id: 'balcony', label: 'Balcony', icon: 'sunny', category: 'outdoor' },
  { id: 'swimmingPool', label: 'Pool', icon: 'water', category: 'outdoor' },
  { id: 'gym', label: 'Gym', icon: 'fitness', category: 'outdoor' },
  { id: 'elevator', label: 'Elevator', icon: 'arrow-up', category: 'outdoor' },
  { id: 'wifi', label: 'Wi-Fi', icon: 'wifi', category: 'utilities' },
];
