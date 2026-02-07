import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const COLORS = {
  background: '#1A1A1A',
  surface: '#252525',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  border: '#374151',
};

const CATEGORIES = [
  { id: 'auto_vehicles', name: 'Auto & Vehicles', icon: 'car-outline' },
  { id: 'properties', name: 'Properties', icon: 'home-outline' },
  { id: 'electronics', name: 'Electronics', icon: 'laptop-outline' },
  { id: 'fashion_beauty', name: 'Fashion & Beauty', icon: 'shirt-outline' },
  { id: 'jobs_services', name: 'Jobs & Services', icon: 'briefcase-outline' },
];

const QUICK_LINKS = [
  { label: 'Post a Listing', route: '/post' },
  { label: 'My Listings', route: '/profile/my-listings' },
  { label: 'Saved Items', route: '/saved' },
  { label: 'Messages', route: '/chat' },
];

const SUPPORT_LINKS = [
  { label: 'Help Center', route: '#' },
  { label: 'Safety Tips', route: '#' },
  { label: 'Contact Us', route: '#' },
  { label: 'Report Issue', route: '#' },
];

const SOCIAL_LINKS = [
  { icon: 'logo-facebook', url: 'https://facebook.com', label: 'Facebook' },
  { icon: 'logo-twitter', url: 'https://twitter.com', label: 'Twitter' },
  { icon: 'logo-instagram', url: 'https://instagram.com', label: 'Instagram' },
  { icon: 'logo-linkedin', url: 'https://linkedin.com', label: 'LinkedIn' },
];

interface FooterProps {
  isTablet?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ isTablet = false }) => {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  const handleNavigation = (route: string) => {
    if (route.startsWith('http') || route === '#') {
      if (route !== '#') {
        Linking.openURL(route);
      }
    } else {
      router.push(route as any);
    }
  };

  const handleCategoryPress = (categoryId: string) => {
    router.push(`/category/${categoryId}` as any);
  };

  // For web, we need to use a style that breaks out of the parent container
  const fullWidthStyle = Platform.OS === 'web' ? {
    width: '100%',
  } : {};

  return (
    <View style={[styles.footer, fullWidthStyle]}>
      {/* Main Footer Content */}
      <View style={[styles.footerContent, isTablet && styles.footerContentTablet]}>
        {/* Brand Section */}
        <View style={[styles.footerSection, styles.brandSection]}>
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Ionicons name="storefront" size={24} color="#fff" />
            </View>
            <Text style={styles.logoText}>avida</Text>
          </View>
          <Text style={styles.brandDescription}>
            Your trusted marketplace for buying and selling. Find great deals on vehicles, properties, electronics, and more.
          </Text>
          {/* Social Links */}
          <View style={styles.socialLinks}>
            {SOCIAL_LINKS.map((social) => (
              <TouchableOpacity
                key={social.label}
                style={styles.socialButton}
                onPress={() => Linking.openURL(social.url)}
                accessibilityLabel={social.label}
              >
                <Ionicons name={social.icon as any} size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Categories Section */}
        <View style={styles.footerSection}>
          <Text style={styles.sectionTitle}>Categories</Text>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.linkItem}
              onPress={() => handleCategoryPress(category.id)}
            >
              <Ionicons name={category.icon as any} size={16} color={COLORS.textSecondary} style={styles.linkIcon} />
              <Text style={styles.linkText}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Links Section */}
        <View style={styles.footerSection}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          {QUICK_LINKS.map((link) => (
            <TouchableOpacity
              key={link.label}
              style={styles.linkItem}
              onPress={() => handleNavigation(link.route)}
            >
              <Text style={styles.linkText}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Support Section */}
        <View style={styles.footerSection}>
          <Text style={styles.sectionTitle}>Support</Text>
          {SUPPORT_LINKS.map((link) => (
            <TouchableOpacity
              key={link.label}
              style={styles.linkItem}
              onPress={() => handleNavigation(link.route)}
            >
              <Text style={styles.linkText}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Download App Section - Desktop Only */}
        {!isTablet && (
          <View style={[styles.footerSection, styles.downloadSection]}>
            <Text style={styles.sectionTitle}>Get the App</Text>
            <Text style={styles.downloadText}>
              Download our mobile app for the best experience. Buy and sell on the go!
            </Text>
            <View style={styles.appStoreButtons}>
              <TouchableOpacity 
                style={styles.appStoreBtn}
                onPress={() => Linking.openURL('https://apps.apple.com')}
              >
                <Ionicons name="logo-apple" size={20} color="#fff" />
                <View style={styles.appStoreBtnText}>
                  <Text style={styles.appStoreLabel}>Download on the</Text>
                  <Text style={styles.appStoreName}>App Store</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.appStoreBtn}
                onPress={() => Linking.openURL('https://play.google.com')}
              >
                <Ionicons name="logo-google-playstore" size={20} color="#fff" />
                <View style={styles.appStoreBtnText}>
                  <Text style={styles.appStoreLabel}>Get it on</Text>
                  <Text style={styles.appStoreName}>Google Play</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
      <View style={styles.footerBottom}>
        <View style={[styles.footerBottomContent, isTablet && styles.footerBottomContentTablet]}>
          <Text style={styles.copyright}>
            © {currentYear} Avida Marketplace. All rights reserved.
          </Text>
          <View style={styles.legalLinks}>
            <TouchableOpacity onPress={() => handleNavigation('#')}>
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.legalDivider}>•</Text>
            <TouchableOpacity onPress={() => handleNavigation('#')}>
              <Text style={styles.legalLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.legalDivider}>•</Text>
            <TouchableOpacity onPress={() => handleNavigation('#')}>
              <Text style={styles.legalLink}>Cookie Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    backgroundColor: COLORS.background,
    marginTop: 60,
    width: '100vw',
    marginLeft: 'calc(-50vw + 50%)',
  },
  footerContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: 1280,
    marginHorizontal: 'auto',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 32,
    gap: 40,
  },
  footerContentTablet: {
    gap: 24,
    paddingHorizontal: 20,
  },
  footerSection: {
    flex: 1,
    minWidth: 160,
    maxWidth: 240,
  },
  brandSection: {
    flex: 1.5,
    minWidth: 240,
    maxWidth: 320,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  brandDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
    marginBottom: 20,
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkIcon: {
    marginRight: 10,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  newsletterSection: {
    minWidth: 200,
    maxWidth: 280,
  },
  newsletterText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  subscribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  subscribeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  downloadSection: {
    minWidth: 200,
    maxWidth: 280,
  },
  downloadText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  appStoreButtons: {
    flexDirection: 'column',
    gap: 10,
  },
  appStoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 10,
  },
  appStoreBtnText: {
    flexDirection: 'column',
  },
  appStoreLabel: {
    fontSize: 10,
    color: '#ccc',
    lineHeight: 12,
  },
  appStoreName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 18,
  },
  footerBottom: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerBottomContent: {
    maxWidth: 1280,
    marginHorizontal: 'auto',
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 16,
  },
  footerBottomContentTablet: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  copyright: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legalLink: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  legalDivider: {
    fontSize: 13,
    color: COLORS.border,
  },
});

export default Footer;
