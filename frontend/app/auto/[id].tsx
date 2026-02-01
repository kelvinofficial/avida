import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Linking,
  Alert,
  Share,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../src/utils/theme';
import { AutoListing } from '../../src/types/auto';

const { width } = Dimensions.get('window');

// Real car images from Unsplash
const CAR_IMAGES = [
  'https://images.unsplash.com/photo-1765171103306-44c89d9808a1?w=800&q=80',
  'https://images.unsplash.com/photo-1636378182990-3bc1fd5c8307?w=800&q=80',
  'https://images.unsplash.com/photo-1638731042137-4569fadabc3d?w=800&q=80',
  'https://images.unsplash.com/photo-1627855660287-98188dab870f?w=800&q=80',
  'https://images.unsplash.com/photo-1603395626261-8811305660e8?w=800&q=80',
  'https://images.unsplash.com/photo-1654425210135-78ab49d8507a?w=800&q=80',
  'https://images.unsplash.com/photo-1600872254796-9ee1791c2b87?w=800&q=80',
  'https://images.unsplash.com/photo-1636378182946-a5e6a2726503?w=800&q=80',
  'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80',
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80',
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80',
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80',
  'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80',
  'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?w=800&q=80',
  'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80',
];

// Mock auto listings data (same as in Auto page)
const MOCK_AUTO_LISTINGS: Record<string, AutoListing> = {
  'auto_1': {
    id: 'auto_1',
    user_id: 'seller_1',
    title: 'BMW 320i M Sport - Full Service History',
    description: 'Excellent condition BMW 3 Series with full service history. This stunning vehicle comes with the M Sport package, featuring aggressive styling, sport suspension, and premium interior upgrades. The car has been meticulously maintained with all services done at authorized BMW dealers. Features include LED headlights, navigation system, heated seats, parking sensors, and much more.',
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
  'auto_2': {
    id: 'auto_2',
    user_id: 'seller_2',
    title: 'Mercedes-Benz C200 AMG Line',
    description: 'Stunning C-Class with AMG styling package. This elegant sedan combines luxury with sportiness. Features include AMG body kit, 19-inch alloy wheels, panoramic sunroof, MBUX infotainment system, and premium leather interior. Low mileage and accident-free.',
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
  'auto_3': {
    id: 'auto_3',
    user_id: 'seller_3',
    title: 'Volkswagen Golf GTI - Low Mileage',
    description: 'Hot hatch legend! This Golf GTI delivers pure driving pleasure with its turbocharged engine and precise handling. Features include sport seats, digital cockpit, adaptive chassis control, and the iconic GTI styling.',
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
  'auto_4': {
    id: 'auto_4',
    user_id: 'seller_4',
    title: 'Audi Q5 S-Line Quattro - Full Options',
    description: 'Luxury SUV with all-wheel drive. This Q5 comes fully loaded with S-Line exterior, virtual cockpit, Bang & Olufsen sound system, Matrix LED headlights, and quattro all-wheel drive for confident driving in all conditions.',
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
  'auto_5': {
    id: 'auto_5',
    user_id: 'seller_5',
    title: 'Toyota Camry Hybrid - Eco Champion',
    description: 'Fuel-efficient hybrid sedan perfect for daily commuting. This Camry offers excellent fuel economy, a comfortable ride, and Toyota reliability. Features include adaptive cruise control, lane departure warning, and premium JBL audio system.',
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
  'auto_6': {
    id: 'auto_6',
    user_id: 'seller_6',
    title: 'Tesla Model 3 Long Range - Autopilot',
    description: 'Electric vehicle with full self-driving capability. This Model 3 offers impressive range, instant acceleration, and cutting-edge technology. Features include Autopilot, premium interior, 15-inch touchscreen, and over-the-air updates.',
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
  'auto_7': {
    id: 'auto_7',
    user_id: 'seller_7',
    title: 'Ford Mustang GT 5.0 V8 - Muscle Car',
    description: 'American muscle with throaty V8 engine. This Mustang GT delivers raw power and iconic styling. Features include 5.0L V8 engine, manual transmission, Brembo brakes, and active exhaust system.',
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
  'auto_8': {
    id: 'auto_8',
    user_id: 'seller_8',
    title: 'Porsche 911 Carrera - Iconic Sports Car',
    description: 'The legendary 911 in pristine condition. This Carrera combines timeless design with modern performance. Features include Sport Chrono package, PASM suspension, Porsche Communication Management, and premium leather interior.',
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
  'auto_9': {
    id: 'auto_9',
    user_id: 'seller_9',
    title: 'Hyundai Tucson N Line - Stylish SUV',
    description: 'Modern crossover with sport styling. The Tucson N Line offers a perfect blend of style, practicality, and efficiency. Features include hybrid powertrain, digital cluster, BOSE sound system, and smart safety features.',
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
  'auto_10': {
    id: 'auto_10',
    user_id: 'seller_10',
    title: 'Honda Civic Type R - Track Ready',
    description: 'High-performance hot hatch with racing DNA. The Civic Type R is engineered for the track but practical for daily use. Features include 2.0L VTEC Turbo, adaptive dampers, limited-slip differential, and aggressive aero kit.',
    price: 38900,
    negotiable: false,
    category_id: 'vehicles',
    images: [CAR_IMAGES[10]],
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
  'auto_11': {
    id: 'auto_11',
    user_id: 'seller_11',
    title: 'Kia EV6 GT-Line - Future Electric',
    description: 'Award-winning electric crossover with stunning design. The EV6 offers fast charging, impressive range, and a tech-packed interior. Features include vehicle-to-load capability, augmented reality HUD, and premium relaxation seats.',
    price: 47500,
    negotiable: true,
    category_id: 'vehicles',
    images: [CAR_IMAGES[12]],
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
  'auto_12': {
    id: 'auto_12',
    user_id: 'seller_12',
    title: 'Nissan GT-R NISMO - Track Monster',
    description: 'Japanese supercar with racing DNA. The GT-R NISMO is a hand-built masterpiece delivering supercar performance. Features include hand-assembled 3.8L twin-turbo V6, carbon fiber aero, and track-tuned suspension.',
    price: 125000,
    negotiable: true,
    category_id: 'vehicles',
    images: [CAR_IMAGES[11]],
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
  'auto_13': {
    id: 'auto_13',
    user_id: 'seller_13',
    title: 'VW ID.4 Pro - Family Electric',
    description: 'Spacious electric SUV for families. The ID.4 offers generous interior space, practical features, and zero emissions. Features include ID. Cockpit, wireless App-Connect, and IQ.DRIVE assist systems.',
    price: 35900,
    negotiable: true,
    category_id: 'vehicles',
    images: [CAR_IMAGES[14]],
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
  'auto_14': {
    id: 'auto_14',
    user_id: 'seller_14',
    title: 'BMW M4 Competition - Ultimate Driving',
    description: 'High-performance coupe with track capability. The M4 Competition delivers exhilarating performance with its twin-turbo inline-6. Features include M Carbon bucket seats, M Drive Professional, and adaptive M suspension.',
    price: 72500,
    negotiable: false,
    category_id: 'vehicles',
    images: [CAR_IMAGES[5], CAR_IMAGES[8]],
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
  'auto_15': {
    id: 'auto_15',
    user_id: 'seller_15',
    title: 'Audi e-tron GT - Electric Luxury',
    description: 'Premium electric gran turismo. The e-tron GT combines stunning design with electric performance. Features include quattro all-wheel drive, air suspension, Matrix LED headlights, and virtual cockpit plus.',
    price: 85000,
    negotiable: true,
    category_id: 'vehicles',
    images: [CAR_IMAGES[13]],
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
};

export default function AutoListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [isFavorited, setIsFavorited] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const listing = MOCK_AUTO_LISTINGS[id || ''];

  if (!listing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFoundContainer}>
          <Ionicons name="car-outline" size={64} color={theme.colors.outline} />
          <Text style={styles.notFoundText}>Listing not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatMileage = (mileage: number) => {
    return new Intl.NumberFormat('de-DE').format(mileage) + ' km';
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this ${listing.title} for ${formatPrice(listing.price)}!`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleCall = () => {
    Alert.alert('Call Seller', `Call ${listing.seller?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Call', onPress: () => Linking.openURL('tel:+4912345678') },
    ]);
  };

  const handleChat = () => {
    Alert.alert('Start Chat', `Chat with ${listing.seller?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Chat', onPress: () => router.push(`/chat/${listing.id}`) },
    ]);
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Hi, I'm interested in your "${listing.title}" listed for ${formatPrice(listing.price)}`
    );
    Linking.openURL(`https://wa.me/4912345678?text=${message}`);
  };

  const SpecItem = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <View style={styles.specItem}>
      <Ionicons name={icon as any} size={20} color={theme.colors.primary} />
      <View>
        <Text style={styles.specLabel}>{label}</Text>
        <Text style={styles.specValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
            <Ionicons name="share-outline" size={24} color={theme.colors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setIsFavorited(!isFavorited)}
            style={styles.headerButton}
          >
            <Ionicons
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorited ? theme.colors.error : theme.colors.onSurface}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageGallery}>
          <FlatList
            data={listing.images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setCurrentImageIndex(index);
            }}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.mainImage} resizeMode="cover" />
            )}
            keyExtractor={(item, index) => index.toString()}
          />
          {listing.images.length > 1 && (
            <View style={styles.imageIndicators}>
              {listing.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.imageIndicator,
                    currentImageIndex === index && styles.imageIndicatorActive,
                  ]}
                />
              ))}
            </View>
          )}
          {/* Badges */}
          <View style={styles.badgeContainer}>
            {listing.featured && (
              <View style={styles.featuredBadge}>
                <Ionicons name="star" size={14} color="#fff" />
                <Text style={styles.badgeText}>Featured</Text>
              </View>
            )}
            {listing.boosted && (
              <View style={styles.boostedBadge}>
                <Ionicons name="rocket" size={14} color="#fff" />
                <Text style={styles.badgeText}>Boosted</Text>
              </View>
            )}
          </View>
        </View>

        {/* Price & Title */}
        <View style={styles.mainInfo}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(listing.price)}</Text>
            {listing.negotiable && (
              <View style={styles.negotiableBadge}>
                <Text style={styles.negotiableText}>Negotiable</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{listing.title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.location}>
              {listing.city} • {listing.distance} km away
            </Text>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.statText}>{listing.views} views</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="heart-outline" size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.statText}>{listing.favorites_count} favorites</Text>
            </View>
          </View>
        </View>

        {/* Key Specs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Details</Text>
          <View style={styles.specsGrid}>
            <SpecItem icon="calendar-outline" label="Year" value={listing.year.toString()} />
            <SpecItem icon="speedometer-outline" label="Mileage" value={formatMileage(listing.mileage)} />
            <SpecItem icon="flash-outline" label="Fuel" value={listing.fuelType} />
            <SpecItem icon="cog-outline" label="Transmission" value={listing.transmission} />
            <SpecItem icon="car-outline" label="Body Type" value={listing.bodyType} />
            <SpecItem icon="checkmark-circle-outline" label="Condition" value={listing.condition === 'new' ? 'New' : 'Used'} />
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features & Trust</Text>
          <View style={styles.featuresGrid}>
            {listing.accidentFree && (
              <View style={styles.featureItem}>
                <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
                <Text style={styles.featureText}>Accident Free</Text>
              </View>
            )}
            {listing.inspectionAvailable && (
              <View style={styles.featureItem}>
                <Ionicons name="document-text" size={20} color={theme.colors.primary} />
                <Text style={styles.featureText}>Inspection Available</Text>
              </View>
            )}
            {listing.exchangePossible && (
              <View style={styles.featureItem}>
                <Ionicons name="repeat" size={20} color={theme.colors.primary} />
                <Text style={styles.featureText}>Exchange Possible</Text>
              </View>
            )}
            {listing.financingAvailable && (
              <View style={styles.featureItem}>
                <Ionicons name="card" size={20} color={theme.colors.primary} />
                <Text style={styles.featureText}>Financing Available</Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{listing.description}</Text>
        </View>

        {/* Seller Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seller</Text>
          <View style={styles.sellerCard}>
            <View style={styles.sellerAvatar}>
              <Ionicons name="person" size={24} color={theme.colors.primary} />
            </View>
            <View style={styles.sellerInfo}>
              <View style={styles.sellerNameRow}>
                <Text style={styles.sellerName}>{listing.seller?.name}</Text>
                {listing.seller?.verified && (
                  <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary} />
                )}
              </View>
              <View style={styles.sellerBadges}>
                {listing.seller?.sellerType === 'dealer' && (
                  <View style={styles.dealerBadge}>
                    <Text style={styles.dealerBadgeText}>Dealer</Text>
                  </View>
                )}
                {listing.seller?.sellerType === 'certified' && (
                  <View style={styles.certifiedBadge}>
                    <Ionicons name="ribbon" size={12} color="#fff" />
                    <Text style={styles.certifiedBadgeText}>Certified</Text>
                  </View>
                )}
              </View>
              <View style={styles.sellerRating}>
                <Ionicons name="star" size={14} color="#FFB800" />
                <Text style={styles.ratingText}>{listing.seller?.rating} rating</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomCTA}>
        <TouchableOpacity style={styles.callButton} onPress={handleCall}>
          <Ionicons name="call" size={20} color={theme.colors.primary} />
          <Text style={styles.callButtonText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
          <Ionicons name="chatbubble" size={20} color="#fff" />
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.whatsappButton} onPress={handleWhatsApp}>
          <Ionicons name="logo-whatsapp" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  headerButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  notFoundText: {
    fontSize: 18,
    color: theme.colors.onSurfaceVariant,
    marginTop: theme.spacing.md,
  },
  backButton: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.full,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageGallery: {
    position: 'relative',
    height: 280,
    backgroundColor: theme.colors.surfaceVariant,
  },
  mainImage: {
    width: width,
    height: 280,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: theme.spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  imageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  imageIndicatorActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  badgeContainer: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  boostedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  mainInfo: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.onSurface,
  },
  negotiableBadge: {
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  negotiableText: {
    color: theme.colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginTop: theme.spacing.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: theme.spacing.sm,
  },
  location: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    marginTop: theme.spacing.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  section: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: theme.spacing.md,
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  specItem: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  specLabel: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primaryContainer,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  featureText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    color: theme.colors.onSurface,
    lineHeight: 22,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  sellerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.onSurface,
  },
  sellerBadges: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  dealerBadge: {
    backgroundColor: theme.colors.secondaryContainer,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dealerBadgeText: {
    fontSize: 11,
    color: theme.colors.onSecondaryContainer,
    fontWeight: '600',
  },
  certifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.tertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  certifiedBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  sellerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 13,
    color: theme.colors.onSurfaceVariant,
  },
  bottomCTA: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: theme.spacing.md,
    paddingBottom: 34,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outlineVariant,
    gap: theme.spacing.sm,
  },
  callButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  chatButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  whatsappButton: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#25D366',
  },
});
