// Auto/Motors specific types

export interface CarBrand {
  id: string;
  name: string;
  logo: string;
  listingsCount: number;
}

export interface CarModel {
  id: string;
  brandId: string;
  name: string;
}

export interface AutoFilters {
  // Vehicle Details
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  mileageMin?: number;
  mileageMax?: number;
  engineSize?: string;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  driveType?: string;
  color?: string;
  
  // Condition & Trust
  condition?: 'new' | 'used';
  accidentFree?: boolean;
  verifiedSeller?: boolean;
  inspectionAvailable?: boolean;
  importStatus?: string;
  
  // Pricing & Deals
  priceMin?: number;
  priceMax?: number;
  fixedPrice?: boolean;
  negotiable?: boolean;
  exchangePossible?: boolean;
  acceptsOffers?: boolean;
  financingAvailable?: boolean;
  
  // Seller Type
  sellerType?: 'individual' | 'dealer' | 'certified';
  
  // Location
  city?: string;
  radius?: number;
  nearMe?: boolean;
}

export interface AutoListing {
  id: string;
  user_id: string;
  title: string;
  description: string;
  price: number;
  negotiable: boolean;
  category_id: string;
  images: string[];
  location: string;
  city: string;
  distance?: number;
  status: string;
  featured: boolean;
  boosted: boolean;
  views: number;
  favorites_count: number;
  created_at: string;
  updated_at: string;
  
  // Auto-specific
  make: string;
  model: string;
  year: number;
  mileage: number;
  fuelType: string;
  transmission: string;
  bodyType: string;
  engineSize?: string;
  driveType?: string;
  color?: string;
  condition: 'new' | 'used';
  accidentFree: boolean;
  inspectionAvailable: boolean;
  exchangePossible: boolean;
  financingAvailable: boolean;
  
  // Seller info
  seller?: {
    user_id: string;
    name: string;
    picture?: string;
    rating: number;
    verified: boolean;
    sellerType: 'individual' | 'dealer' | 'certified';
    memberSince: string;
  };
  
  is_favorited?: boolean;
}

export interface ExploreCard {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  route: string;
}

export interface PopularSearch {
  id: string;
  term: string;
  count: number;
}

export interface RecentSearch {
  id: string;
  term: string;
  timestamp: string;
}
