// Static data for Auto/Motors page
import { CarBrand, ExploreCard } from '../types/auto';

// Car brand logos (using placeholder icons for demo)
export const CAR_BRANDS: CarBrand[] = [
  { id: 'toyota', name: 'Toyota', logo: '🚗', listingsCount: 1245 },
  { id: 'bmw', name: 'BMW', logo: '🔵', listingsCount: 892 },
  { id: 'mercedes', name: 'Mercedes', logo: '⭐', listingsCount: 756 },
  { id: 'volkswagen', name: 'VW', logo: '🔷', listingsCount: 1102 },
  { id: 'audi', name: 'Audi', logo: '⚫', listingsCount: 634 },
  { id: 'ford', name: 'Ford', logo: '🔵', listingsCount: 521 },
  { id: 'honda', name: 'Honda', logo: '🔴', listingsCount: 445 },
  { id: 'hyundai', name: 'Hyundai', logo: '💠', listingsCount: 389 },
  { id: 'nissan', name: 'Nissan', logo: '🔘', listingsCount: 312 },
  { id: 'porsche', name: 'Porsche', logo: '🏎️', listingsCount: 156 },
  { id: 'tesla', name: 'Tesla', logo: '⚡', listingsCount: 234 },
  { id: 'kia', name: 'Kia', logo: '🔺', listingsCount: 287 },
];

// Model data per brand
export const CAR_MODELS: Record<string, string[]> = {
  toyota: ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Tacoma', 'Prius', 'Land Cruiser'],
  bmw: ['3 Series', '5 Series', 'X3', 'X5', 'M3', 'M5', '7 Series'],
  mercedes: ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE', 'A-Class', 'AMG GT'],
  volkswagen: ['Golf', 'Passat', 'Tiguan', 'Polo', 'Arteon', 'ID.4', 'Touareg'],
  audi: ['A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7', 'e-tron', 'RS6'],
  ford: ['Focus', 'Mustang', 'F-150', 'Explorer', 'Escape', 'Bronco'],
  honda: ['Civic', 'Accord', 'CR-V', 'HR-V', 'Pilot', 'Odyssey'],
  hyundai: ['Elantra', 'Sonata', 'Tucson', 'Santa Fe', 'Kona', 'Ioniq'],
  nissan: ['Altima', 'Sentra', 'Rogue', 'Pathfinder', 'Maxima', 'GT-R'],
  porsche: ['911', 'Cayenne', 'Macan', 'Panamera', 'Taycan', 'Boxster'],
  tesla: ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck'],
  kia: ['Sportage', 'Sorento', 'Forte', 'K5', 'Telluride', 'EV6'],
};

// Explore Motors cards
export const EXPLORE_CARDS: ExploreCard[] = [
  {
    id: 'new-cars',
    title: 'New Cars',
    subtitle: 'Brand new vehicles',
    icon: 'car-sport',
    color: '#3B82F6',
    route: '/auto/new',
  },
  {
    id: 'compare',
    title: 'Compare Cars',
    subtitle: 'Side by side comparison',
    icon: 'git-compare',
    color: '#8B5CF6',
    route: '/auto/compare',
  },
  {
    id: 'reviews',
    title: 'Reviews',
    subtitle: 'Expert & user reviews',
    icon: 'star',
    color: '#F59E0B',
    route: '/auto/reviews',
  },
  {
    id: 'inspection',
    title: 'Car Inspection',
    subtitle: 'Professional checks',
    icon: 'shield-checkmark',
    color: '#10B981',
    route: '/auto/inspection',
  },
  {
    id: 'auction',
    title: 'Auction Sheet',
    subtitle: 'Import verification',
    icon: 'document-text',
    color: '#EF4444',
    route: '/auto/auction',
  },
  {
    id: 'finance',
    title: 'Car Finance',
    subtitle: 'Easy loan options',
    icon: 'cash',
    color: '#06B6D4',
    route: '/auto/finance',
  },
];

// Filter options
export const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'LPG', 'CNG'];
export const TRANSMISSIONS = ['Automatic', 'Manual', 'CVT', 'Semi-Auto'];
export const BODY_TYPES = ['Sedan', 'SUV', 'Hatchback', 'Pickup', 'Coupe', 'Wagon', 'Van', 'Convertible'];
export const DRIVE_TYPES = ['FWD', 'RWD', 'AWD', '4WD'];
export const CONDITIONS = ['New', 'Used'];
export const SELLER_TYPES = [
  { id: 'individual', label: 'Individual' },
  { id: 'dealer', label: 'Dealer' },
  { id: 'certified', label: 'Certified Dealer' },
];

export const PRICE_RANGES = [
  { min: 0, max: 5000, label: 'Under €5,000' },
  { min: 5000, max: 10000, label: '€5,000 - €10,000' },
  { min: 10000, max: 20000, label: '€10,000 - €20,000' },
  { min: 20000, max: 30000, label: '€20,000 - €30,000' },
  { min: 30000, max: 50000, label: '€30,000 - €50,000' },
  { min: 50000, max: 100000, label: '€50,000 - €100,000' },
  { min: 100000, max: null, label: 'Over €100,000' },
];

export const YEAR_RANGE = {
  min: 1990,
  max: new Date().getFullYear() + 1,
};

export const MILEAGE_RANGES = [
  { max: 10000, label: 'Under 10,000 km' },
  { max: 30000, label: 'Under 30,000 km' },
  { max: 50000, label: 'Under 50,000 km' },
  { max: 100000, label: 'Under 100,000 km' },
  { max: 150000, label: 'Under 150,000 km' },
  { max: null, label: 'Any mileage' },
];

export const CITIES = [
  'Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt', 'Stuttgart',
  'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden',
  'Hanover', 'Nuremberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld',
];
