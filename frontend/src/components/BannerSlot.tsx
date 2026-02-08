import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Banner size configurations
const BANNER_SIZES: Record<string, { width: number; height: number }> = {
  '728x90': { width: 728, height: 90 },
  '300x250': { width: 300, height: 250 },
  '320x50': { width: 320, height: 50 },
  '320x100': { width: 320, height: 100 },
  '300x600': { width: 300, height: 600 },
  '970x250': { width: 970, height: 250 },
  '468x60': { width: 468, height: 60 },
  '336x280': { width: 336, height: 280 },
  'native': { width: SCREEN_WIDTH - 32, height: 100 },
};

// Placement to recommended size mapping
const PLACEMENT_SIZES: Record<string, string> = {
  'header_below': '728x90',
  'footer': '728x90',
  'feed_after_5': 'native',
  'feed_after_10': 'native',
  'feed_after_15': 'native',
  'feed_between_promoted': 'native',
  'feed_end': 'native',
  'detail_below_gallery': '300x250',
  'detail_below_info': '300x250',
  'detail_before_similar': '336x280',
  'detail_sticky_bottom': '320x50',
  'profile_page': '300x250',
  'publish_listing': '336x280',
  'search_results': '300x250',
  'notifications_page': '468x60',
};

interface Banner {
  id: string;
  name: string;
  placement: string;
  size: string;
  content: {
    type: 'image' | 'html' | 'script';
    image_url?: string;
    image_alt?: string;
    html_content?: string;
    script_content?: string;
    click_url?: string;
    click_tracking?: boolean;
  };
  is_sponsored: boolean;
  priority: number;
}

interface BannerSlotProps {
  placement: string;
  style?: any;
  onLoad?: () => void;
  onError?: () => void;
  category?: string;
  testId?: string;
}

// Detect device type
const getDeviceType = (): string => {
  if (Platform.OS !== 'web') {
    return SCREEN_WIDTH < 768 ? 'mobile' : 'tablet';
  }
  if (SCREEN_WIDTH < 768) return 'mobile';
  if (SCREEN_WIDTH < 1024) return 'tablet';
  return 'desktop';
};

// Main BannerSlot component
export const BannerSlot: React.FC<BannerSlotProps> = memo(({
  placement,
  style,
  onLoad,
  onError,
  category,
  testId,
}) => {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Fetch banner for this placement
  useEffect(() => {
    let mounted = true;
    
    const fetchBanner = async () => {
      try {
        const device = getDeviceType();
        const response = await api.get('/banners/display/' + placement, {
          params: { device, category }
        });
        
        if (mounted && response.data?.banner) {
          setBanner(response.data.banner);
          onLoad?.();
        } else {
          setError(true);
          onError?.();
        }
      } catch (err) {
        if (mounted) {
          setError(true);
          onError?.();
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchBanner();
    
    return () => {
      mounted = false;
    };
  }, [placement, category]);

  // Track click
  const handleClick = useCallback(async () => {
    if (!banner) return;
    
    // Track click
    try {
      await api.post(`/banners/track/click/${banner.id}`, null, {
        params: { device: getDeviceType() }
      });
    } catch (e) {
      // Silent fail for tracking
    }
    
    // Open URL
    if (banner.content.click_url) {
      Linking.openURL(banner.content.click_url);
    }
  }, [banner]);

  // Get banner dimensions
  const getBannerSize = () => {
    const sizeKey = banner?.size || PLACEMENT_SIZES[placement] || 'native';
    const size = BANNER_SIZES[sizeKey] || BANNER_SIZES['native'];
    
    // Scale to fit screen width
    if (size.width > SCREEN_WIDTH - 32) {
      const scale = (SCREEN_WIDTH - 32) / size.width;
      return {
        width: SCREEN_WIDTH - 32,
        height: Math.round(size.height * scale),
      };
    }
    
    return size;
  };

  // Don't render anything if loading failed or no banner
  if (error || (!loading && !banner)) {
    return null;
  }

  // Loading state
  if (loading) {
    const size = getBannerSize();
    return (
      <View 
        style={[styles.container, style, { height: size.height }]}
        data-testid={testId || `banner-slot-${placement}-loading`}
      >
        <ActivityIndicator size="small" color="#ccc" />
      </View>
    );
  }

  const size = getBannerSize();

  // Render based on content type
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={handleClick}
      activeOpacity={banner?.content.click_url ? 0.8 : 1}
      disabled={!banner?.content.click_url}
      data-testid={testId || `banner-slot-${placement}`}
    >
      {/* Sponsored label */}
      {banner?.is_sponsored && (
        <View style={styles.sponsoredBadge}>
          <Text style={styles.sponsoredText}>Sponsored</Text>
        </View>
      )}
      
      {/* Image banner */}
      {banner?.content.type === 'image' && banner.content.image_url && (
        <View style={[styles.imageContainer, { width: size.width, height: size.height }]}>
          {!imageLoaded && (
            <View style={styles.imagePlaceholder}>
              <ActivityIndicator size="small" color="#ccc" />
            </View>
          )}
          <Image
            source={{ uri: banner.content.image_url }}
            style={[styles.bannerImage, { width: size.width, height: size.height }]}
            resizeMode="contain"
            onLoad={() => setImageLoaded(true)}
            onError={() => setError(true)}
            accessibilityLabel={banner.content.image_alt || 'Advertisement'}
          />
        </View>
      )}
      
      {/* HTML banner - render as text for now (WebView would be needed for full HTML) */}
      {banner?.content.type === 'html' && (
        <View style={[styles.htmlContainer, { width: size.width, minHeight: size.height }]}>
          <Text style={styles.htmlText}>
            {banner.content.html_content?.replace(/<[^>]*>/g, '') || 'Advertisement'}
          </Text>
        </View>
      )}
      
      {/* Script banner placeholder */}
      {banner?.content.type === 'script' && (
        <View style={[styles.scriptContainer, { width: size.width, height: size.height }]}>
          <Ionicons name="megaphone-outline" size={24} color="#999" />
          <Text style={styles.scriptText}>Ad</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// Native feed banner - styled to match listing cards
export const FeedBanner: React.FC<Omit<BannerSlotProps, 'placement'> & { position: number }> = memo(({
  position,
  style,
  category,
  ...props
}) => {
  // Determine placement based on position
  let placement = 'feed_after_5';
  if (position >= 15) {
    placement = 'feed_after_15';
  } else if (position >= 10) {
    placement = 'feed_after_10';
  }

  const [banner, setBanner] = useState<Banner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const fetchBanner = async () => {
      try {
        const device = getDeviceType();
        const response = await api.get('/banners/display/' + placement, {
          params: { device, category }
        });
        
        if (mounted && response.data?.banner) {
          setBanner(response.data.banner);
        }
      } catch (err) {
        // Silent fail
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchBanner();
    
    return () => {
      mounted = false;
    };
  }, [placement, category]);

  const handleClick = useCallback(async () => {
    if (!banner) return;
    
    try {
      await api.post(`/banners/track/click/${banner.id}`, null, {
        params: { device: getDeviceType() }
      });
    } catch (e) {}
    
    if (banner.content.click_url) {
      Linking.openURL(banner.content.click_url);
    }
  }, [banner]);

  if (loading || !banner) {
    return null;
  }

  return (
    <TouchableOpacity
      style={[feedStyles.container, style]}
      onPress={handleClick}
      activeOpacity={0.9}
      data-testid={`feed-banner-${position}`}
    >
      {/* Native card style */}
      <View style={feedStyles.card}>
        {banner.is_sponsored && (
          <View style={feedStyles.sponsoredRow}>
            <Ionicons name="megaphone-outline" size={14} color="#888" />
            <Text style={feedStyles.sponsoredLabel}>Sponsored</Text>
          </View>
        )}
        
        {banner.content.type === 'image' && banner.content.image_url ? (
          <Image
            source={{ uri: banner.content.image_url }}
            style={feedStyles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={feedStyles.placeholder}>
            <Ionicons name="megaphone" size={32} color="#4CAF50" />
            <Text style={feedStyles.adTitle}>{banner.name}</Text>
          </View>
        )}
        
        {banner.content.click_url && (
          <View style={feedStyles.ctaRow}>
            <Text style={feedStyles.ctaText}>Learn More</Text>
            <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// Header banner component
export const HeaderBanner: React.FC<Omit<BannerSlotProps, 'placement'>> = memo((props) => {
  return (
    <BannerSlot
      placement="header_below"
      style={headerStyles.container}
      testId="header-banner"
      {...props}
    />
  );
});

// Sticky bottom banner for mobile
export const StickyBottomBanner: React.FC<Omit<BannerSlotProps, 'placement'>> = memo((props) => {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <View style={stickyStyles.container}>
      <BannerSlot
        placement="detail_sticky_bottom"
        testId="sticky-bottom-banner"
        {...props}
      />
      <TouchableOpacity
        style={stickyStyles.closeButton}
        onPress={() => setVisible(false)}
        data-testid="close-sticky-banner"
      >
        <Ionicons name="close" size={18} color="#666" />
      </TouchableOpacity>
    </View>
  );
});

// Helper function to inject banners into a listing array
export const injectBannersIntoFeed = (
  listings: any[],
  interval: number = 5,
  category?: string
): (any | { type: 'banner'; position: number })[] => {
  const result: any[] = [];
  
  listings.forEach((listing, index) => {
    result.push(listing);
    
    // Inject banner after every 'interval' items
    if ((index + 1) % interval === 0 && index < listings.length - 1) {
      result.push({
        type: 'banner',
        position: index + 1,
        category,
      });
    }
  });
  
  return result;
};

// Check if an item is a banner placeholder
export const isBannerItem = (item: any): boolean => {
  return item?.type === 'banner';
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  sponsoredBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 1,
  },
  sponsoredText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  imageContainer: {
    overflow: 'hidden',
    borderRadius: 8,
  },
  imagePlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  bannerImage: {
    borderRadius: 8,
  },
  htmlContainer: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  htmlText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  scriptContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  scriptText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});

const feedStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sponsoredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    gap: 4,
  },
  sponsoredLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  image: {
    width: '100%',
    height: 150,
  },
  placeholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
  },
  adTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 4,
  },
  ctaText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
});

const headerStyles = StyleSheet.create({
  container: {
    marginHorizontal: 0,
    marginVertical: 0,
    borderRadius: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});

const stickyStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
    position: 'absolute',
    right: 4,
    top: 4,
  },
});

export default BannerSlot;
