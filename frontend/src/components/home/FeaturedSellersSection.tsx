import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Types for featured sellers and listings
export interface FeaturedSeller {
  id: string;
  business_name: string;
  identifier: string;
  logo_url: string | null;
  city: string | null;
  country: string | null;
  is_verified: boolean;
  is_premium: boolean;
  verification_tier: string;
  total_listings: number;
  total_views: number;
  primary_categories: string[];
  user?: {
    name: string;
    picture: string | null;
    rating?: number;
    total_ratings?: number;
  };
}

export interface FeaturedListing {
  id: string;
  title: string;
  price: number;
  currency: string;
  images: string[];
  location: any;
  created_at: string;
  views: number;
  featured: boolean;
  seller?: {
    business_name: string;
    is_verified: boolean;
    is_premium: boolean;
  };
}

interface FeaturedSellersSectionProps {
  featuredListings: FeaturedListing[];
  featuredSellers: FeaturedSeller[];
  loadingFeatured: boolean;
}

const HORIZONTAL_PADDING = 16;

export const FeaturedSellersSection: React.FC<FeaturedSellersSectionProps> = ({
  featuredListings,
  featuredSellers,
  loadingFeatured,
}) => {
  const router = useRouter();

  if (loadingFeatured) {
    return null; // Don't show loading state to avoid layout shift
  }
  
  // Show featured listings by verified sellers
  if (featuredListings.length > 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="shield-checkmark" size={20} color="#2E7D32" />
            <Text style={styles.title}>From Verified Sellers</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/business-directory')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {featuredListings.map((listing) => (
            <TouchableOpacity
              key={listing.id}
              style={styles.listingCard}
              onPress={() => router.push(`/listing/${listing.id}`)}
              data-testid={`featured-listing-${listing.id}`}
            >
              {/* Image */}
              <View style={styles.listingImageContainer}>
                <Image 
                  source={{ uri: listing.images?.[0] || 'https://via.placeholder.com/150' }} 
                  style={styles.listingImage} 
                />
                {/* Verified Badge */}
                <View style={styles.verifiedOverlay}>
                  <Ionicons name="shield-checkmark" size={12} color="#fff" />
                </View>
              </View>
              
              {/* Details */}
              <View style={styles.listingDetails}>
                <Text style={styles.listingPrice}>
                  {listing.currency || '$'}{listing.price?.toLocaleString()}
                </Text>
                <Text style={styles.listingTitle} numberOfLines={2}>
                  {listing.title}
                </Text>
                
                {/* Seller Info */}
                {listing.seller && (
                  <View style={styles.sellerInfo}>
                    <Ionicons name="storefront-outline" size={12} color="#6B7280" />
                    <Text style={styles.sellerName} numberOfLines={1}>
                      {listing.seller.business_name}
                    </Text>
                    {listing.seller.is_premium && (
                      <Ionicons name="diamond" size={10} color="#9C27B0" />
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }
  
  // Fallback to showing seller profiles if no featured listings
  if (featuredSellers.length === 0) {
    return null; // Don't show section if no verified sellers
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="shield-checkmark" size={20} color="#2E7D32" />
          <Text style={styles.title}>Verified Sellers</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/business-directory')}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {featuredSellers.map((seller) => (
          <TouchableOpacity
            key={seller.id}
            style={styles.sellerCard}
            onPress={() => router.push(`/business/${seller.identifier}`)}
            data-testid={`featured-seller-${seller.id}`}
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              {seller.logo_url ? (
                <Image source={{ uri: seller.logo_url }} style={styles.logo} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="storefront" size={24} color="#2E7D32" />
                </View>
              )}
              {/* Verification Badge */}
              <View style={[
                styles.badge,
                seller.is_premium ? styles.premiumBadge : styles.verifiedBadge
              ]}>
                <Ionicons 
                  name={seller.is_premium ? "diamond" : "checkmark-circle"} 
                  size={12} 
                  color="#fff" 
                />
              </View>
            </View>
            
            {/* Business Name */}
            <Text style={styles.businessName} numberOfLines={1}>
              {seller.business_name}
            </Text>
            
            {/* Location */}
            {seller.city && (
              <Text style={styles.location} numberOfLines={1}>
                {seller.city}
              </Text>
            )}
            
            {/* Stats */}
            <View style={styles.statsRow}>
              <Text style={styles.stat}>{seller.total_listings} items</Text>
            </View>
            
            {/* Tier Label */}
            <View style={[
              styles.tierLabel,
              seller.is_premium ? styles.premiumLabel : styles.verifiedLabel
            ]}>
              <Text style={[
                styles.tierText,
                seller.is_premium ? styles.premiumText : styles.verifiedText
              ]}>
                {seller.is_premium ? 'Premium' : 'Verified'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    gap: 12,
  },
  sellerCard: {
    width: 140,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
  },
  logoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  verifiedBadge: {
    backgroundColor: '#2E7D32',
  },
  premiumBadge: {
    backgroundColor: '#FFB300',
  },
  businessName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 2,
  },
  location: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stat: {
    fontSize: 11,
    color: '#888',
  },
  tierLabel: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedLabel: {
    backgroundColor: '#E8F5E9',
  },
  premiumLabel: {
    backgroundColor: '#FFF8E1',
  },
  tierText: {
    fontSize: 10,
    fontWeight: '600',
  },
  verifiedText: {
    color: '#2E7D32',
  },
  premiumText: {
    color: '#FF8F00',
  },
  
  // Listing Cards (for "From Verified Sellers" section)
  listingCard: {
    width: 180,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    overflow: 'hidden',
  },
  listingImageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
  },
  listingImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
  },
  verifiedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#2E7D32',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingDetails: {
    padding: 10,
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 4,
  },
  listingTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1A1A1A',
    lineHeight: 18,
    marginBottom: 6,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  sellerName: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
  },
});

export default FeaturedSellersSection;
