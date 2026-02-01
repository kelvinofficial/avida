// Sample Property Data
import { Property, PropertyHighlight } from '../types/property';

// Real property images from Unsplash
export const PROPERTY_IMAGES = {
  house: [
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80',
  ],
  apartment: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80',
  ],
  office: [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=600&q=80',
  ],
  land: [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80',
    'https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=600&q=80',
  ],
};

export const GERMAN_CITIES = [
  'Berlin', 'Hamburg', 'Munich', 'Cologne', 'Frankfurt',
  'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dresden', 'Hanover'
];

export const BERLIN_AREAS = [
  'Mitte', 'Prenzlauer Berg', 'Kreuzberg', 'Charlottenburg',
  'Friedrichshain', 'Neukölln', 'Schöneberg', 'Wedding'
];

export const generateHighlights = (property: Partial<Property>): PropertyHighlight[] => {
  const highlights: PropertyHighlight[] = [];
  
  if (property.condition === 'new') {
    highlights.push({ id: 'new', icon: 'sparkles', label: 'Newly Built' });
  }
  if (property.condition === 'renovated') {
    highlights.push({ id: 'renovated', icon: 'hammer', label: 'Renovated' });
  }
  if (property.furnishing === 'furnished') {
    highlights.push({ id: 'furnished', icon: 'bed', label: 'Furnished' });
  }
  if (property.facilities?.gatedEstate) {
    highlights.push({ id: 'gated', icon: 'shield-checkmark', label: 'Gated Estate' });
  }
  if (property.facilities?.parking) {
    highlights.push({ id: 'parking', icon: 'car', label: 'Parking' });
  }
  if (property.facilities?.security) {
    highlights.push({ id: 'security', icon: 'lock-closed', label: '24hr Security' });
  }
  if (property.facilities?.swimmingPool) {
    highlights.push({ id: 'pool', icon: 'water', label: 'Swimming Pool' });
  }
  if (property.facilities?.gym) {
    highlights.push({ id: 'gym', icon: 'fitness', label: 'Gym Access' });
  }
  if (property.verification?.isVerified) {
    highlights.push({ id: 'verified', icon: 'checkmark-circle', label: 'Verified' });
  }
  
  return highlights.slice(0, 6);
};

// Mock property listings
export const MOCK_PROPERTIES: Property[] = [
  {
    id: 'prop_1',
    title: 'Modern 3BR Apartment in Mitte',
    description: 'Stunning modern apartment in the heart of Berlin. Features high ceilings, hardwood floors, and a private balcony with city views. Recently renovated with premium finishes.',
    purpose: 'rent',
    type: 'apartment',
    price: 2500,
    currency: 'EUR',
    priceNegotiable: true,
    pricePerMonth: true,
    location: {
      country: 'Germany',
      city: 'Berlin',
      area: 'Mitte',
      estate: 'Central Park Residences',
      address: 'Friedrichstraße',
    },
    bedrooms: 3,
    bathrooms: 2,
    toilets: 2,
    size: 120,
    sizeUnit: 'sqm',
    floorNumber: 5,
    totalFloors: 8,
    yearBuilt: 2022,
    furnishing: 'furnished',
    condition: 'new',
    facilities: {
      electricity24hr: true,
      waterSupply: true,
      airConditioning: true,
      wardrobe: true,
      kitchenCabinets: true,
      security: true,
      cctv: true,
      gatedEstate: true,
      parking: true,
      balcony: true,
      elevator: true,
      wifi: true,
    },
    highlights: [],
    images: PROPERTY_IMAGES.apartment,
    verification: {
      isVerified: true,
      docsChecked: true,
      addressConfirmed: true,
      ownerVerified: true,
    },
    seller: {
      id: 'agent_1',
      name: 'Berlin Premier Realty',
      type: 'agent',
      phone: '+49 30 12345678',
      whatsapp: '+49 151 12345678',
      isVerified: true,
      rating: 4.9,
      listingsCount: 45,
      memberSince: '2020-03-15',
      responseTime: 'within 1 hour',
    },
    featured: true,
    sponsored: true,
    boosted: false,
    views: 1250,
    favorites: 89,
    inquiries: 23,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'active',
  },
  {
    id: 'prop_2',
    title: 'Luxury Villa with Garden',
    description: 'Beautiful family villa with spacious garden, modern kitchen, and 4 bedrooms. Perfect for families looking for space and comfort.',
    purpose: 'buy',
    type: 'house',
    price: 850000,
    currency: 'EUR',
    priceNegotiable: true,
    location: {
      country: 'Germany',
      city: 'Berlin',
      area: 'Charlottenburg',
      estate: 'Westend Gardens',
    },
    bedrooms: 4,
    bathrooms: 3,
    toilets: 4,
    size: 280,
    sizeUnit: 'sqm',
    yearBuilt: 2019,
    furnishing: 'semi_furnished',
    condition: 'new',
    facilities: {
      electricity24hr: true,
      waterSupply: true,
      generator: true,
      airConditioning: true,
      security: true,
      gatedEstate: true,
      parking: true,
      swimmingPool: true,
      gym: false,
    },
    highlights: [],
    images: PROPERTY_IMAGES.house,
    verification: {
      isVerified: true,
      docsChecked: true,
      addressConfirmed: true,
    },
    seller: {
      id: 'owner_1',
      name: 'Hans Mueller',
      type: 'owner',
      phone: '+49 30 98765432',
      isVerified: true,
      memberSince: '2021-06-10',
    },
    featured: true,
    sponsored: false,
    boosted: true,
    views: 890,
    favorites: 67,
    inquiries: 15,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'active',
  },
  {
    id: 'prop_3',
    title: 'Cozy 2BR Apartment in Kreuzberg',
    description: 'Charming apartment in trendy Kreuzberg. Walking distance to cafes, restaurants, and public transport.',
    purpose: 'rent',
    type: 'apartment',
    price: 1400,
    currency: 'EUR',
    priceNegotiable: false,
    pricePerMonth: true,
    location: {
      country: 'Germany',
      city: 'Berlin',
      area: 'Kreuzberg',
    },
    bedrooms: 2,
    bathrooms: 1,
    size: 75,
    sizeUnit: 'sqm',
    floorNumber: 3,
    totalFloors: 5,
    yearBuilt: 2015,
    furnishing: 'unfurnished',
    condition: 'renovated',
    facilities: {
      electricity24hr: true,
      waterSupply: true,
      balcony: true,
      elevator: true,
    },
    highlights: [],
    images: [PROPERTY_IMAGES.apartment[1]],
    verification: {
      isVerified: false,
    },
    seller: {
      id: 'owner_2',
      name: 'Anna Schmidt',
      type: 'owner',
      phone: '+49 151 87654321',
      isVerified: false,
      memberSince: '2023-01-20',
    },
    featured: false,
    sponsored: false,
    boosted: false,
    views: 345,
    favorites: 28,
    inquiries: 8,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
    status: 'active',
  },
  {
    id: 'prop_4',
    title: 'Prime Office Space in Frankfurt',
    description: 'Modern office space in Frankfurt business district. Open floor plan with meeting rooms.',
    purpose: 'rent',
    type: 'office',
    price: 5500,
    currency: 'EUR',
    priceNegotiable: true,
    pricePerMonth: true,
    location: {
      country: 'Germany',
      city: 'Frankfurt',
      area: 'Bankenviertel',
    },
    size: 200,
    sizeUnit: 'sqm',
    floorNumber: 12,
    totalFloors: 25,
    yearBuilt: 2020,
    furnishing: 'unfurnished',
    condition: 'new',
    facilities: {
      electricity24hr: true,
      airConditioning: true,
      security: true,
      cctv: true,
      parking: true,
      elevator: true,
      wifi: true,
    },
    highlights: [],
    images: PROPERTY_IMAGES.office,
    verification: {
      isVerified: true,
      docsChecked: true,
    },
    seller: {
      id: 'agent_2',
      name: 'Commercial Realty GmbH',
      type: 'agent',
      phone: '+49 69 12345678',
      isVerified: true,
      rating: 4.7,
      listingsCount: 120,
    },
    featured: false,
    sponsored: true,
    boosted: false,
    views: 567,
    favorites: 34,
    inquiries: 12,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    updatedAt: new Date(Date.now() - 259200000).toISOString(),
    status: 'active',
  },
  {
    id: 'prop_5',
    title: 'Residential Plot in Munich Suburbs',
    description: 'Prime residential plot in quiet Munich suburb. Perfect for building your dream home.',
    purpose: 'buy',
    type: 'residential_plot',
    price: 320000,
    currency: 'EUR',
    priceNegotiable: true,
    location: {
      country: 'Germany',
      city: 'Munich',
      area: 'Grünwald',
    },
    size: 800,
    sizeUnit: 'sqm',
    furnishing: 'unfurnished',
    condition: 'new',
    facilities: {
      waterSupply: true,
      electricity24hr: true,
    },
    highlights: [],
    images: PROPERTY_IMAGES.land,
    verification: {
      isVerified: true,
      docsChecked: true,
      addressConfirmed: true,
    },
    seller: {
      id: 'agent_3',
      name: 'Bavaria Land & Property',
      type: 'agent',
      isVerified: true,
      rating: 4.8,
      listingsCount: 35,
    },
    featured: true,
    sponsored: false,
    boosted: false,
    views: 432,
    favorites: 56,
    inquiries: 9,
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    updatedAt: new Date(Date.now() - 345600000).toISOString(),
    status: 'active',
  },
];

// Generate highlights for mock data
MOCK_PROPERTIES.forEach(property => {
  property.highlights = generateHighlights(property);
});
