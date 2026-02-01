import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../src/utils/theme';
import { AutoFilters, AutoListing } from '../../src/types/auto';
import { CAR_BRANDS, EXPLORE_CARDS, CITIES } from '../../src/data/autoData';

// Components
import { SegmentedTabs } from '../../src/components/auto/SegmentedTabs';
import { SmartSearchBar } from '../../src/components/auto/SmartSearchBar';
import { LocationControls } from '../../src/components/auto/LocationControls';
import { BrandGrid } from '../../src/components/auto/BrandGrid';
import { FilterTabs } from '../../src/components/auto/FilterTabs';
import { ExploreCards } from '../../src/components/auto/ExploreCards';
import { AutoListingCard } from '../../src/components/auto/AutoListingCard';
import { HorizontalListingCard } from '../../src/components/auto/HorizontalListingCard';
import { AdvancedFiltersSheet } from '../../src/components/auto/AdvancedFiltersSheet';
import { NativeAdCard } from '../../src/components/auto/NativeAdCard';
import { RecommendationSection } from '../../src/components/auto/RecommendationSection';
import { CityPickerModal } from '../../src/components/auto/CityPickerModal';
import { PriceRangeModal } from '../../src/components/auto/PriceRangeModal';
import { SortModal } from '../../src/components/auto/SortModal';
import { MakeModelModal } from '../../src/components/auto/MakeModelModal';

// Real car images from Unsplash
const CAR_IMAGES = [
  'https://images.unsplash.com/photo-1765171103306-44c89d9808a1?w=400&q=80', // BMW
  'https://images.unsplash.com/photo-1636378182990-3bc1fd5c8307?w=400&q=80', // Mercedes white
  'https://images.unsplash.com/photo-1638731042137-4569fadabc3d?w=400&q=80', // Mercedes black
  'https://images.unsplash.com/photo-1627855660287-98188dab870f?w=400&q=80', // Porsche white
  'https://images.unsplash.com/photo-1603395626261-8811305660e8?w=400&q=80', // Porsche 911
  'https://images.unsplash.com/photo-1654425210135-78ab49d8507a?w=400&q=80', // BMW i8
  'https://images.unsplash.com/photo-1600872254796-9ee1791c2b87?w=400&q=80', // Porsche road
  'https://images.unsplash.com/photo-1636378182946-a5e6a2726503?w=400&q=80', // Mercedes forest
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=400&q=80', // BMW M4
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=400&q=80', // Classic car
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=400&q=80', // Ferrari
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400&q=80', // Lamborghini
  'https://images.unsplash.com/photo-1542362567-b07e54358753?w=400&q=80', // Tesla
  'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=400&q=80', // Audi
  'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=400&q=80', // VW Golf
];

const { width } = Dimensions.get('window');

// Mock data for demo - 15 sample car listings with real images
const MOCK_AUTO_LISTINGS: AutoListing[] = [
  {
    id: 'auto_1',
    user_id: 'seller_1',
    title: 'BMW 320i M Sport - Full Service History',
    description: 'Excellent condition BMW 3 Series with full service history',
    price: 28500,
    negotiable: true,
    category_id: 'vehicles',
    images: [CAR_IMAGES[0], CAR_IMAGES[8]],
    location: 'Berlin, Germany',
    city: 'Berlin',
    distance: 5,
    status: 'active',
    featured: true,
    boosted: false,
    views: 237,
    favorites_count: 45,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    make: 'BMW',
    model: '320i',
    year: 2021,
    mileage: 35000,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    bodyType: 'Sedan',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: true,
    exchangePossible: false,
    financingAvailable: true,
    seller: {
      user_id: 'seller_1',
      name: 'AutoHaus Berlin',
      rating: 4.8,
      verified: true,
      sellerType: 'dealer',
      memberSince: '2020-01-15',
    },
  },
  {
    id: 'auto_2',
    user_id: 'seller_2',
    title: 'Mercedes-Benz C200 AMG Line',
    description: 'Stunning C-Class with AMG styling package',
    price: 32900,
    negotiable: true,
    category_id: 'vehicles',
    images: [CAR_IMAGES[1], CAR_IMAGES[2], CAR_IMAGES[7]],
    location: 'Munich, Germany',
    city: 'Munich',
    distance: 12,
    status: 'active',
    featured: false,
    boosted: true,
    views: 189,
    favorites_count: 32,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
    make: 'Mercedes',
    model: 'C200',
    year: 2022,
    mileage: 18000,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    bodyType: 'Sedan',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: true,
    exchangePossible: true,
    financingAvailable: true,
    seller: {
      user_id: 'seller_2',
      name: 'Premium Cars Munich',
      rating: 4.9,
      verified: true,
      sellerType: 'certified',
      memberSince: '2019-05-20',
    },
  },
  {
    id: 'auto_3',
    user_id: 'seller_3',
    title: 'Volkswagen Golf GTI - Low Mileage',
    description: 'Hot hatch with performance upgrades',
    price: 24500,
    negotiable: false,
    category_id: 'vehicles',
    images: [CAR_IMAGES[14]],
    location: 'Hamburg, Germany',
    city: 'Hamburg',
    distance: 8,
    status: 'active',
    featured: false,
    boosted: false,
    views: 156,
    favorites_count: 28,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
    make: 'Volkswagen',
    model: 'Golf GTI',
    year: 2020,
    mileage: 28000,
    fuelType: 'Petrol',
    transmission: 'Manual',
    bodyType: 'Hatchback',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: false,
    exchangePossible: false,
    financingAvailable: false,
    seller: {
      user_id: 'seller_3',
      name: 'Max M.',
      rating: 4.5,
      verified: false,
      sellerType: 'individual',
      memberSince: '2022-03-10',
    },
  },
  {
    id: 'auto_4',
    user_id: 'seller_4',
    title: 'Audi Q5 S-Line Quattro - Full Options',
    description: 'Luxury SUV with all-wheel drive',
    price: 45900,
    negotiable: true,
    category_id: 'vehicles',
    images: [CAR_IMAGES[13]],
    location: 'Frankfurt, Germany',
    city: 'Frankfurt',
    distance: 15,
    status: 'active',
    featured: true,
    boosted: false,
    views: 312,
    favorites_count: 67,
    created_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date(Date.now() - 10800000).toISOString(),
    make: 'Audi',
    model: 'Q5',
    year: 2023,
    mileage: 12000,
    fuelType: 'Diesel',
    transmission: 'Automatic',
    bodyType: 'SUV',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: true,
    exchangePossible: true,
    financingAvailable: true,
    seller: {
      user_id: 'seller_4',
      name: 'Audi Zentrum Frankfurt',
      rating: 5.0,
      verified: true,
      sellerType: 'certified',
      memberSince: '2018-09-01',
    },
  },
  {
    id: 'auto_5',
    user_id: 'seller_5',
    title: 'Toyota Camry Hybrid - Eco Champion',
    description: 'Fuel-efficient hybrid sedan',
    price: 26800,
    negotiable: true,
    category_id: 'vehicles',
    images: [CAR_IMAGES[9]],
    location: 'Cologne, Germany',
    city: 'Cologne',
    distance: 20,
    status: 'active',
    featured: false,
    boosted: false,
    views: 98,
    favorites_count: 15,
    created_at: new Date(Date.now() - 14400000).toISOString(),
    updated_at: new Date(Date.now() - 14400000).toISOString(),
    make: 'Toyota',
    model: 'Camry',
    year: 2022,
    mileage: 22000,
    fuelType: 'Hybrid',
    transmission: 'Automatic',
    bodyType: 'Sedan',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: false,
    exchangePossible: false,
    financingAvailable: true,
    seller: {
      user_id: 'seller_5',
      name: 'Sarah K.',
      rating: 4.7,
      verified: true,
      sellerType: 'individual',
      memberSince: '2021-11-05',
    },
  },
  {
    id: 'auto_6',
    user_id: 'seller_6',
    title: 'Tesla Model 3 Long Range - Autopilot',
    description: 'Electric vehicle with full self-driving capability',
    price: 38500,
    negotiable: false,
    category_id: 'vehicles',
    images: [CAR_IMAGES[12]],
    location: 'Stuttgart, Germany',
    city: 'Stuttgart',
    distance: 25,
    status: 'active',
    featured: true,
    boosted: true,
    views: 456,
    favorites_count: 89,
    created_at: new Date(Date.now() - 18000000).toISOString(),
    updated_at: new Date(Date.now() - 18000000).toISOString(),
    make: 'Tesla',
    model: 'Model 3',
    year: 2023,
    mileage: 8000,
    fuelType: 'Electric',
    transmission: 'Automatic',
    bodyType: 'Sedan',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: true,
    exchangePossible: true,
    financingAvailable: true,
    seller: {
      user_id: 'seller_6',
      name: 'EV Motors Stuttgart',
      rating: 4.9,
      verified: true,
      sellerType: 'dealer',
      memberSince: '2020-06-15',
    },
  },
  {
    id: 'auto_7',
    user_id: 'seller_7',
    title: 'Ford Mustang GT 5.0 V8 - Muscle Car',
    description: 'American muscle with throaty V8 engine',
    price: 42000,
    negotiable: true,
    category_id: 'vehicles',
    images: [CAR_IMAGES[10]],
    location: 'Düsseldorf, Germany',
    city: 'Düsseldorf',
    distance: 18,
    status: 'active',
    featured: false,
    boosted: false,
    views: 234,
    favorites_count: 56,
    created_at: new Date(Date.now() - 21600000).toISOString(),
    updated_at: new Date(Date.now() - 21600000).toISOString(),
    make: 'Ford',
    model: 'Mustang GT',
    year: 2021,
    mileage: 15000,
    fuelType: 'Petrol',
    transmission: 'Manual',
    bodyType: 'Coupe',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: false,
    exchangePossible: true,
    financingAvailable: false,
    seller: {
      user_id: 'seller_7',
      name: 'Classic Cars NRW',
      rating: 4.6,
      verified: true,
      sellerType: 'dealer',
      memberSince: '2019-02-28',
    },
  },
  {
    id: 'auto_8',
    user_id: 'seller_8',
    title: 'Porsche 911 Carrera - Iconic Sports Car',
    description: 'The legendary 911 in pristine condition',
    price: 89900,
    negotiable: true,
    category_id: 'vehicles',
    images: [CAR_IMAGES[3], CAR_IMAGES[4], CAR_IMAGES[6]],
    location: 'Berlin, Germany',
    city: 'Berlin',
    distance: 3,
    status: 'active',
    featured: true,
    boosted: true,
    views: 678,
    favorites_count: 123,
    created_at: new Date(Date.now() - 25200000).toISOString(),
    updated_at: new Date(Date.now() - 25200000).toISOString(),
    make: 'Porsche',
    model: '911 Carrera',
    year: 2022,
    mileage: 5000,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    bodyType: 'Coupe',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: true,
    exchangePossible: false,
    financingAvailable: true,
    seller: {
      user_id: 'seller_8',
      name: 'Porsche Zentrum Berlin',
      rating: 5.0,
      verified: true,
      sellerType: 'certified',
      memberSince: '2017-04-10',
    },
  },
  {
    id: 'auto_9',
    user_id: 'seller_9',
    title: 'Hyundai Tucson N Line - Stylish SUV',
    description: 'Modern crossover with sport styling',
    price: 29500,
    negotiable: true,
    category_id: 'vehicles',
    images: [CAR_IMAGES[9]],
    location: 'Leipzig, Germany',
    city: 'Leipzig',
    distance: 30,
    status: 'active',
    featured: false,
    boosted: false,
    views: 87,
    favorites_count: 12,
    created_at: new Date(Date.now() - 28800000).toISOString(),
    updated_at: new Date(Date.now() - 28800000).toISOString(),
    make: 'Hyundai',
    model: 'Tucson',
    year: 2023,
    mileage: 15000,
    fuelType: 'Hybrid',
    transmission: 'Automatic',
    bodyType: 'SUV',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: false,
    exchangePossible: false,
    financingAvailable: true,
    seller: {
      user_id: 'seller_9',
      name: 'Thomas W.',
      rating: 4.3,
      verified: false,
      sellerType: 'individual',
      memberSince: '2023-01-20',
    },
  },
  {
    id: 'auto_10',
    user_id: 'seller_10',
    title: 'Honda Civic Type R - Track Ready',
    description: 'High-performance hot hatch',
    price: 38900,
    negotiable: false,
    category_id: 'vehicles',
    images: [],
    location: 'Nuremberg, Germany',
    city: 'Nuremberg',
    distance: 45,
    status: 'active',
    featured: false,
    boosted: true,
    views: 167,
    favorites_count: 34,
    created_at: new Date(Date.now() - 32400000).toISOString(),
    updated_at: new Date(Date.now() - 32400000).toISOString(),
    make: 'Honda',
    model: 'Civic Type R',
    year: 2023,
    mileage: 3000,
    fuelType: 'Petrol',
    transmission: 'Manual',
    bodyType: 'Hatchback',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: true,
    exchangePossible: true,
    financingAvailable: false,
    seller: {
      user_id: 'seller_10',
      name: 'Performance Cars Bayern',
      rating: 4.8,
      verified: true,
      sellerType: 'dealer',
      memberSince: '2020-08-15',
    },
  },
  {
    id: 'auto_11',
    user_id: 'seller_11',
    title: 'Kia EV6 GT-Line - Future Electric',
    description: 'Award-winning electric crossover',
    price: 47500,
    negotiable: true,
    category_id: 'vehicles',
    images: [],
    location: 'Dresden, Germany',
    city: 'Dresden',
    distance: 35,
    status: 'active',
    featured: false,
    boosted: false,
    views: 145,
    favorites_count: 29,
    created_at: new Date(Date.now() - 36000000).toISOString(),
    updated_at: new Date(Date.now() - 36000000).toISOString(),
    make: 'Kia',
    model: 'EV6',
    year: 2023,
    mileage: 10000,
    fuelType: 'Electric',
    transmission: 'Automatic',
    bodyType: 'SUV',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: true,
    exchangePossible: false,
    financingAvailable: true,
    seller: {
      user_id: 'seller_11',
      name: 'Kia Dresden',
      rating: 4.7,
      verified: true,
      sellerType: 'dealer',
      memberSince: '2021-03-01',
    },
  },
  {
    id: 'auto_12',
    user_id: 'seller_12',
    title: 'Nissan GT-R NISMO - Track Monster',
    description: 'Japanese supercar with racing DNA',
    price: 125000,
    negotiable: true,
    category_id: 'vehicles',
    images: [],
    location: 'Munich, Germany',
    city: 'Munich',
    distance: 10,
    status: 'active',
    featured: true,
    boosted: false,
    views: 534,
    favorites_count: 98,
    created_at: new Date(Date.now() - 39600000).toISOString(),
    updated_at: new Date(Date.now() - 39600000).toISOString(),
    make: 'Nissan',
    model: 'GT-R NISMO',
    year: 2021,
    mileage: 8500,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    bodyType: 'Coupe',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: true,
    exchangePossible: false,
    financingAvailable: true,
    seller: {
      user_id: 'seller_12',
      name: 'Supercar Gallery Munich',
      rating: 5.0,
      verified: true,
      sellerType: 'certified',
      memberSince: '2016-07-20',
    },
  },
  {
    id: 'auto_13',
    user_id: 'seller_13',
    title: 'VW ID.4 Pro - Family Electric',
    description: 'Spacious electric SUV for families',
    price: 35900,
    negotiable: true,
    category_id: 'vehicles',
    images: [],
    location: 'Hanover, Germany',
    city: 'Hanover',
    distance: 22,
    status: 'active',
    featured: false,
    boosted: false,
    views: 112,
    favorites_count: 19,
    created_at: new Date(Date.now() - 43200000).toISOString(),
    updated_at: new Date(Date.now() - 43200000).toISOString(),
    make: 'Volkswagen',
    model: 'ID.4',
    year: 2023,
    mileage: 18000,
    fuelType: 'Electric',
    transmission: 'Automatic',
    bodyType: 'SUV',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: false,
    exchangePossible: true,
    financingAvailable: true,
    seller: {
      user_id: 'seller_13',
      name: 'VW Zentrum Hanover',
      rating: 4.6,
      verified: true,
      sellerType: 'dealer',
      memberSince: '2019-11-15',
    },
  },
  {
    id: 'auto_14',
    user_id: 'seller_14',
    title: 'BMW M4 Competition - Ultimate Driving',
    description: 'High-performance coupe with track capability',
    price: 72500,
    negotiable: false,
    category_id: 'vehicles',
    images: [],
    location: 'Stuttgart, Germany',
    city: 'Stuttgart',
    distance: 28,
    status: 'active',
    featured: true,
    boosted: true,
    views: 389,
    favorites_count: 76,
    created_at: new Date(Date.now() - 46800000).toISOString(),
    updated_at: new Date(Date.now() - 46800000).toISOString(),
    make: 'BMW',
    model: 'M4',
    year: 2022,
    mileage: 12000,
    fuelType: 'Petrol',
    transmission: 'Automatic',
    bodyType: 'Coupe',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: true,
    exchangePossible: false,
    financingAvailable: true,
    seller: {
      user_id: 'seller_14',
      name: 'BMW Stuttgart Premium',
      rating: 4.9,
      verified: true,
      sellerType: 'certified',
      memberSince: '2018-02-10',
    },
  },
  {
    id: 'auto_15',
    user_id: 'seller_15',
    title: 'Audi e-tron GT - Electric Luxury',
    description: 'Premium electric gran turismo',
    price: 85000,
    negotiable: true,
    category_id: 'vehicles',
    images: [],
    location: 'Berlin, Germany',
    city: 'Berlin',
    distance: 7,
    status: 'active',
    featured: false,
    boosted: false,
    views: 267,
    favorites_count: 52,
    created_at: new Date(Date.now() - 50400000).toISOString(),
    updated_at: new Date(Date.now() - 50400000).toISOString(),
    make: 'Audi',
    model: 'e-tron GT',
    year: 2023,
    mileage: 6000,
    fuelType: 'Electric',
    transmission: 'Automatic',
    bodyType: 'Sedan',
    condition: 'used',
    accidentFree: true,
    inspectionAvailable: true,
    exchangePossible: true,
    financingAvailable: true,
    seller: {
      user_id: 'seller_15',
      name: 'Audi Berlin Electric',
      rating: 4.8,
      verified: true,
      sellerType: 'dealer',
      memberSince: '2020-09-01',
    },
  },
];

const CATEGORY_TABS = [
  { id: 'all', label: 'All' },
  { id: 'motors', label: 'Motors', icon: 'car' },
  { id: 'property', label: 'Property', icon: 'home' },
];

const FILTER_TABS = [
  { id: 'make', label: 'Make' },
  { id: 'model', label: 'Model' },
  { id: 'city', label: 'City' },
  { id: 'price', label: 'Price' },
];

// Analytics tracking helper
const trackEvent = (eventName: string, data?: any) => {
  console.log(`[Analytics] ${eventName}:`, data);
};

export default function AutoCategoryScreen() {
  const router = useRouter();
  
  // State
  const [activeTab, setActiveTab] = useState('motors');
  const [allListings] = useState<AutoListing[]>(MOCK_AUTO_LISTINGS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<AutoFilters>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  // Modal states
  const [showFiltersSheet, setShowFiltersSheet] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showPriceRange, setShowPriceRange] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);
  const [showMakeModelModal, setShowMakeModelModal] = useState(false);
  const [makeModelMode, setMakeModelMode] = useState<'make' | 'model'>('make');
  
  // Filter states
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [nearMeEnabled, setNearMeEnabled] = useState(false);
  const [radius, setRadius] = useState(50);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // Search history
  const [recentSearches, setRecentSearches] = useState(['BMW 3 Series', 'Mercedes C-Class', 'Audi A4']);
  const [popularSearches] = useState(['Tesla Model 3', 'VW Golf', 'BMW X5', 'Porsche 911']);

  // Filter and sort listings
  const filteredListings = useMemo(() => {
    let result = [...allListings];
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((listing) =>
        listing.title.toLowerCase().includes(query) ||
        listing.make.toLowerCase().includes(query) ||
        listing.model.toLowerCase().includes(query) ||
        listing.city.toLowerCase().includes(query)
      );
    }
    
    // Brand filter
    if (selectedBrand) {
      const brandName = CAR_BRANDS.find(b => b.id === selectedBrand)?.name || selectedBrand;
      result = result.filter((listing) =>
        listing.make.toLowerCase() === brandName.toLowerCase() ||
        listing.make.toLowerCase() === selectedBrand.toLowerCase()
      );
    }
    
    // Model filter
    if (selectedModel) {
      result = result.filter((listing) =>
        listing.model.toLowerCase().includes(selectedModel.toLowerCase())
      );
    }
    
    // City filter
    if (selectedCity) {
      result = result.filter((listing) => listing.city === selectedCity);
    }
    
    // Near me filter with radius
    if (nearMeEnabled) {
      result = result.filter((listing) => (listing.distance || 0) <= radius);
    }
    
    // Advanced filters
    if (filters.fuelType) {
      result = result.filter((listing) => listing.fuelType === filters.fuelType);
    }
    if (filters.transmission) {
      result = result.filter((listing) => listing.transmission === filters.transmission);
    }
    if (filters.bodyType) {
      result = result.filter((listing) => listing.bodyType === filters.bodyType);
    }
    if (filters.condition) {
      result = result.filter((listing) => listing.condition === filters.condition);
    }
    if (filters.priceMin !== undefined) {
      result = result.filter((listing) => listing.price >= (filters.priceMin || 0));
    }
    if (filters.priceMax !== undefined) {
      result = result.filter((listing) => listing.price <= (filters.priceMax || Infinity));
    }
    if (filters.verifiedSeller) {
      result = result.filter((listing) => listing.seller?.verified);
    }
    if (filters.accidentFree) {
      result = result.filter((listing) => listing.accidentFree);
    }
    if (filters.mileageMax !== undefined) {
      result = result.filter((listing) => listing.mileage <= (filters.mileageMax || Infinity));
    }
    
    // Sorting
    switch (sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'mileage_asc':
        result.sort((a, b) => a.mileage - b.mileage);
        break;
      case 'year_desc':
        result.sort((a, b) => b.year - a.year);
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'newest':
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
    }
    
    return result;
  }, [allListings, searchQuery, selectedBrand, selectedModel, selectedCity, nearMeEnabled, radius, filters, sortBy]);

  // Derived data
  const featuredListings = useMemo(() => 
    filteredListings.filter((l) => l.featured).slice(0, 6), 
    [filteredListings]
  );
  const verifiedListings = useMemo(() => 
    filteredListings.filter((l) => l.seller?.verified).slice(0, 6), 
    [filteredListings]
  );
  const lowMileageListings = useMemo(() => 
    [...filteredListings].sort((a, b) => a.mileage - b.mileage).slice(0, 6),
    [filteredListings]
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    trackEvent('pull_to_refresh');
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    trackEvent('search', { query });
    
    // Add to recent searches
    if (query && !recentSearches.includes(query)) {
      setRecentSearches((prev) => [query, ...prev.slice(0, 4)]);
    }
  };

  const handleBrandSelect = (brandId: string | null) => {
    setSelectedBrand(brandId);
    setSelectedModel(null);
    trackEvent('brand_select', { brandId });
  };

  const handleFilterTabPress = (tabId: string) => {
    trackEvent('filter_tab_press', { tabId });
    
    switch (tabId) {
      case 'make':
        setMakeModelMode('make');
        setShowMakeModelModal(true);
        break;
      case 'model':
        if (selectedBrand) {
          setMakeModelMode('model');
          setShowMakeModelModal(true);
        } else {
          Alert.alert('Select Make First', 'Please select a car make before choosing a model');
        }
        break;
      case 'city':
        setShowCityPicker(true);
        break;
      case 'price':
        setShowPriceRange(true);
        break;
    }
  };

  const handleApplyFilters = (newFilters: AutoFilters) => {
    setFilters(newFilters);
    trackEvent('filters_applied', newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSelectedBrand(null);
    setSelectedModel(null);
    setSelectedCity(null);
    setSearchQuery('');
    trackEvent('filters_cleared');
  };

  const toggleFavorite = (listingId: string) => {
    setFavorites((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(listingId)) {
        newSet.delete(listingId);
        trackEvent('favorite_removed', { listingId });
      } else {
        newSet.add(listingId);
        trackEvent('favorite_added', { listingId });
      }
      return newSet;
    });
  };

  const handleListingPress = (listing: AutoListing) => {
    trackEvent('listing_view', { listingId: listing.id, title: listing.title });
    router.push(`/listing/${listing.id}`);
  };

  const handleChat = (listing: AutoListing) => {
    trackEvent('chat_initiated', { listingId: listing.id });
    Alert.alert('Start Chat', `Chat with ${listing.seller?.name || 'Seller'} about "${listing.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Chat', onPress: () => router.push(`/chat/${listing.id}`) },
    ]);
  };

  const handleCall = (listing: AutoListing) => {
    trackEvent('call_initiated', { listingId: listing.id });
    Alert.alert('Call Seller', `Call ${listing.seller?.name || 'Seller'}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Linking.openURL('tel:+4912345678') },
    ]);
  };

  const handleWhatsApp = (listing: AutoListing) => {
    trackEvent('whatsapp_initiated', { listingId: listing.id });
    const message = encodeURIComponent(`Hi, I'm interested in your "${listing.title}" listed for €${listing.price.toLocaleString()}`);
    Linking.openURL(`https://wa.me/4912345678?text=${message}`);
  };

  const handleNearMeToggle = () => {
    if (!nearMeEnabled) {
      // Simulate GPS detection
      Alert.alert(
        'Enable Location',
        'Allow LocalMarket to access your location to find cars near you?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Allow',
            onPress: () => {
              setNearMeEnabled(true);
              trackEvent('near_me_enabled');
              Alert.alert('Location Detected', 'Showing cars within 50km of Berlin');
            },
          },
        ]
      );
    } else {
      setNearMeEnabled(false);
      trackEvent('near_me_disabled');
    }
  };

  const handleExploreCardPress = (card: typeof EXPLORE_CARDS[0]) => {
    trackEvent('explore_card_press', { cardId: card.id, title: card.title });
    Alert.alert(card.title, card.subtitle + '\n\nThis feature is coming soon!');
  };

  const handleBrandLongPress = (brandId: string) => {
    const brand = CAR_BRANDS.find((b) => b.id === brandId);
    Alert.alert(
      `Follow ${brand?.name}`,
      'Get notified about new listings from this brand?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Follow',
          onPress: () => {
            trackEvent('brand_followed', { brandId });
            Alert.alert('Following!', `You'll get notifications for new ${brand?.name} listings`);
          },
        },
      ]
    );
  };

  const renderListItem = ({ item, index }: { item: AutoListing; index: number }) => {
    const showAd = (index + 1) % 7 === 0;
    
    return (
      <View style={styles.listItemWrapper}>
        <HorizontalListingCard
          listing={item}
          onPress={() => handleListingPress(item)}
          onFavorite={() => toggleFavorite(item.id)}
          onChat={() => handleChat(item)}
          onCall={() => handleCall(item)}
          isFavorited={favorites.has(item.id)}
        />
        {showAd && (
          <NativeAdCard type="listing" />
        )}
      </View>
    );
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (selectedBrand) count++;
    if (selectedModel) count++;
    if (selectedCity) count++;
    if (filters.priceMin || filters.priceMax) count++;
    Object.keys(filters).forEach((key) => {
      if (!['priceMin', 'priceMax'].includes(key) && filters[key as keyof AutoFilters]) {
        count++;
      }
    });
    return count;
  };

  const renderHeader = () => (
    <View>
      {/* Segmented Tabs */}
      <View style={styles.tabsSection}>
        <SegmentedTabs
          tabs={CATEGORY_TABS}
          activeTab={activeTab}
          onTabPress={(tab) => {
            setActiveTab(tab);
            if (tab === 'all') router.push('/');
            if (tab === 'property') router.push('/');
          }}
        />
      </View>

      {/* Smart Search */}
      <View style={styles.searchSection}>
        <SmartSearchBar
          onSearch={handleSearch}
          onVoiceSearch={() => Alert.alert('Voice Search', 'Voice search coming soon!')}
          recentSearches={recentSearches}
          popularSearches={popularSearches}
        />
      </View>

      {/* Location Controls */}
      <LocationControls
        selectedCity={selectedCity}
        nearMeEnabled={nearMeEnabled}
        radius={radius}
        onSelectCity={() => setShowCityPicker(true)}
        onToggleNearMe={handleNearMeToggle}
        onChangeRadius={setRadius}
      />

      {/* Brand Grid */}
      <BrandGrid
        brands={CAR_BRANDS}
        selectedBrand={selectedBrand}
        onSelectBrand={handleBrandSelect}
        onLongPressBrand={handleBrandLongPress}
      />

      {/* Filter Tabs */}
      <FilterTabs
        tabs={FILTER_TABS.map((tab) => ({
          ...tab,
          value: tab.id === 'make' && selectedBrand 
            ? CAR_BRANDS.find(b => b.id === selectedBrand)?.name 
            : tab.id === 'model' && selectedModel 
            ? selectedModel 
            : tab.id === 'city' && selectedCity
            ? selectedCity
            : tab.id === 'price' && (filters.priceMin || filters.priceMax)
            ? `€${filters.priceMin || 0} - ${filters.priceMax ? '€' + filters.priceMax : 'Any'}`
            : undefined,
        }))}
        activeFilters={{ 
          make: selectedBrand, 
          model: selectedModel, 
          city: selectedCity,
          price: filters.priceMin || filters.priceMax ? true : undefined,
          ...filters 
        }}
        onTabPress={handleFilterTabPress}
        onMoreFilters={() => setShowFiltersSheet(true)}
      />

      {/* Explore Cards */}
      <ExploreCards
        cards={EXPLORE_CARDS}
        onPressCard={handleExploreCardPress}
      />

      {/* Promoted Dealers Ad */}
      <NativeAdCard type="sponsored" />

      {/* Recommendation Sections */}
      {featuredListings.length > 0 && (
        <RecommendationSection
          title="Featured Listings"
          icon="star"
          listings={featuredListings}
          onPressListing={handleListingPress}
          onFavorite={toggleFavorite}
          favorites={favorites}
          onPressSeeAll={() => {
            trackEvent('see_all_featured');
            setSortBy('newest');
          }}
        />
      )}

      {verifiedListings.length > 0 && (
        <RecommendationSection
          title="Verified & Inspected"
          icon="shield-checkmark"
          listings={verifiedListings}
          onPressListing={handleListingPress}
          onFavorite={toggleFavorite}
          favorites={favorites}
          onPressSeeAll={() => {
            trackEvent('see_all_verified');
            setFilters((prev) => ({ ...prev, verifiedSeller: true }));
          }}
        />
      )}

      {lowMileageListings.length > 0 && (
        <RecommendationSection
          title="Low Mileage Cars"
          icon="speedometer"
          listings={lowMileageListings}
          onPressListing={handleListingPress}
          onFavorite={toggleFavorite}
          favorites={favorites}
          onPressSeeAll={() => {
            trackEvent('see_all_low_mileage');
            setSortBy('mileage_asc');
          }}
        />
      )}

      {/* Banner Ad */}
      <NativeAdCard type="banner" />

      {/* Section Header with Sort */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          All Listings ({filteredListings.length})
        </Text>
        <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
          <Ionicons name="swap-vertical" size={16} color={theme.colors.primary} />
          <Text style={styles.sortText}>
            {sortBy === 'newest' ? 'Newest' : 
             sortBy === 'price_asc' ? 'Price ↑' : 
             sortBy === 'price_desc' ? 'Price ↓' : 
             sortBy === 'mileage_asc' ? 'Mileage ↑' :
             sortBy === 'year_desc' ? 'Year' : 'Sort'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Active Filters Badge */}
      {getActiveFilterCount() > 0 && (
        <View style={styles.activeFiltersRow}>
          <Text style={styles.activeFiltersText}>
            {getActiveFilterCount()} filter{getActiveFilterCount() > 1 ? 's' : ''} active
          </Text>
          <TouchableOpacity onPress={handleClearFilters}>
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Motors</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="notifications-outline" size={22} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => Alert.alert('Safety Tips', '• Always meet in public places\n• Verify seller identity\n• Inspect car before payment\n• Use secure payment methods\n• Get a professional inspection')}
          >
            <Ionicons name="shield-checkmark-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={filteredListings}
        renderItem={renderListItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={64} color={theme.colors.outline} />
            <Text style={styles.emptyTitle}>No listings found</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your filters</Text>
            <TouchableOpacity style={styles.clearButton} onPress={handleClearFilters}>
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          </View>
        }
        ListFooterComponent={
          loading ? (
            <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
          ) : (
            <View style={styles.footerPadding} />
          )
        }
        onEndReachedThreshold={0.5}
      />

      {/* Modals */}
      <AdvancedFiltersSheet
        visible={showFiltersSheet}
        onClose={() => setShowFiltersSheet(false)}
        filters={filters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />

      <CityPickerModal
        visible={showCityPicker}
        onClose={() => setShowCityPicker(false)}
        selectedCity={selectedCity}
        onSelectCity={(city) => {
          setSelectedCity(city);
          trackEvent('city_selected', { city });
        }}
      />

      <PriceRangeModal
        visible={showPriceRange}
        onClose={() => setShowPriceRange(false)}
        minPrice={filters.priceMin}
        maxPrice={filters.priceMax}
        onApply={(min, max) => {
          setFilters((prev) => ({ ...prev, priceMin: min, priceMax: max }));
          trackEvent('price_range_applied', { min, max });
        }}
      />

      <SortModal
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        selectedSort={sortBy}
        onSelectSort={(sort) => {
          setSortBy(sort);
          trackEvent('sort_changed', { sort });
        }}
      />

      <MakeModelModal
        visible={showMakeModelModal}
        onClose={() => setShowMakeModelModal(false)}
        mode={makeModelMode}
        selectedMake={selectedBrand}
        selectedModel={selectedModel}
        onSelectMake={(make) => {
          setSelectedBrand(make);
          trackEvent('make_selected', { make });
        }}
        onSelectModel={(model) => {
          setSelectedModel(model);
          trackEvent('model_selected', { model });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  backButton: {
    padding: 4,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  headerButton: {
    padding: 4,
  },
  tabsSection: {
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  searchSection: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: theme.borderRadius.full,
  },
  sortText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  activeFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primaryContainer,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  activeFiltersText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  clearFiltersText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  listItemWrapper: {
    marginBottom: theme.spacing.xs,
  },
  cardWrapper: {
    flex: 1,
  },
  cardLeft: {
    paddingRight: theme.spacing.xs,
  },
  cardRight: {
    paddingLeft: theme.spacing.xs,
  },
  adContainer: {
    marginTop: theme.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: theme.spacing.md,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginTop: theme.spacing.xs,
  },
  clearButton: {
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  },
  clearButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  loader: {
    paddingVertical: theme.spacing.lg,
  },
  footerPadding: {
    height: theme.spacing.xxl,
  },
});
