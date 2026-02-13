import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, ImageBackground } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Hoverable link component for web
const HoverableLink: React.FC<{
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
}> = ({ onPress, style, children }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const webProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};

  return (
    <TouchableOpacity
      style={[
        style,
        isHovered && Platform.OS === 'web' && {
          opacity: 1,
        }
      ]}
      onPress={onPress}
      {...webProps}
    >
      {typeof children === 'string' ? (
        <Text style={[
          hoverStyles.linkText,
          isHovered && Platform.OS === 'web' && hoverStyles.linkTextHover
        ]}>
          {children}
        </Text>
      ) : children}
    </TouchableOpacity>
  );
};

const hoverStyles = StyleSheet.create({
  linkText: {
    fontSize: 14,
    color: '#9CA3AF',
    ...(Platform.OS === 'web' ? { transition: 'color 0.2s ease, text-decoration 0.2s ease' } as any : {}),
  },
  linkTextHover: {
    color: '#FFFFFF',
    textDecorationLine: 'underline',
  },
});

const COLORS = {
  background: '#1A1A1A',
  surface: '#252525',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  border: '#374151',
  separator: '#4B5563',
};

// Background image for footer - marketplace community scene
const FOOTER_BG_IMAGE = 'https://static.prod-images.emergentagent.com/jobs/be688282-08e4-4748-a128-ae84926e0c3e/images/bd0e045b651acf1e415a8c91df5921ed939abff44601582f6b42e7f023aa74c7.png';

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
    width: '100vw',
    position: 'relative' as const,
    left: '50%',
    right: '50%',
    marginLeft: '-50vw',
    marginRight: '-50vw',
  } : {};

  // Add data attribute for CSS targeting on web
  const webProps = Platform.OS === 'web' ? { 'data-footer': 'true' } : {};

  // Render link with separator and hover effect
  const renderLinkWithSeparator = (link: { label: string; route: string }, index: number, array: any[]) => (
    <View key={link.label} style={styles.linkWithSeparator}>
      <HoverableLink
        style={styles.linkItem}
        onPress={() => handleNavigation(link.route)}
      >
        {link.label}
      </HoverableLink>
      {index < array.length - 1 && <View style={styles.verticalSeparator} />}
    </View>
  );

  // Render category link with separator and hover effect
  const renderCategoryWithSeparator = (category: typeof CATEGORIES[0], index: number, array: any[]) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const webHoverProps = Platform.OS === 'web' ? {
      onMouseEnter: () => setIsHovered(true),
      onMouseLeave: () => setIsHovered(false),
    } : {};
    
    return (
      <View key={category.id} style={styles.linkWithSeparator}>
        <TouchableOpacity
          style={styles.linkItem}
          onPress={() => handleCategoryPress(category.id)}
          {...webHoverProps}
        >
          <Ionicons 
            name={category.icon as any} 
            size={16} 
            color={isHovered ? '#FFFFFF' : COLORS.textSecondary} 
            style={styles.linkIcon} 
          />
          <Text style={[
            styles.linkText,
            isHovered && Platform.OS === 'web' && { color: '#FFFFFF', textDecorationLine: 'underline' }
          ]}>
            {category.name}
          </Text>
        </TouchableOpacity>
        {index < array.length - 1 && <View style={styles.verticalSeparator} />}
      </View>
    );
  };

  const footerContent = (
    <>
      {/* Dark overlay */}
      <View style={styles.overlay} />
      
      {/* Main Footer Content */}
      <View style={[
        styles.footerContent, 
        isTablet && styles.footerContentTablet
      ]}>
        {/* Brand Section */}
        <View style={[
          styles.footerSection, 
          styles.brandSection,
          isTablet && styles.brandSectionTablet
        ]}>
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
        <View style={[
          styles.footerSection,
          isTablet && styles.footerSectionTablet
        ]}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={isTablet ? styles.linksRowTablet : styles.linksColumn}>
            {isTablet ? (
              CATEGORIES.map((category, index, arr) => renderCategoryWithSeparator(category, index, arr))
            ) : (
              CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.linkItem}
                  onPress={() => handleCategoryPress(category.id)}
                >
                  <Ionicons name={category.icon as any} size={16} color={COLORS.textSecondary} style={styles.linkIcon} />
                  <Text style={styles.linkText}>{category.name}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Quick Links Section */}
        <View style={[
          styles.footerSection,
          isTablet && styles.footerSectionTablet
        ]}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          <View style={isTablet ? styles.linksRowTablet : styles.linksColumn}>
            {isTablet ? (
              QUICK_LINKS.map((link, index, arr) => renderLinkWithSeparator(link, index, arr))
            ) : (
              QUICK_LINKS.map((link) => (
                <TouchableOpacity
                  key={link.label}
                  style={styles.linkItem}
                  onPress={() => handleNavigation(link.route)}
                >
                  <Text style={styles.linkText}>{link.label}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Support Section */}
        <View style={[
          styles.footerSection,
          isTablet && styles.footerSectionTablet
        ]}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={isTablet ? styles.linksRowTablet : styles.linksColumn}>
            {isTablet ? (
              SUPPORT_LINKS.map((link, index, arr) => renderLinkWithSeparator(link, index, arr))
            ) : (
              SUPPORT_LINKS.map((link) => (
                <TouchableOpacity
                  key={link.label}
                  style={styles.linkItem}
                  onPress={() => handleNavigation(link.route)}
                >
                  <Text style={styles.linkText}>{link.label}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Download App Section */}
        <View style={[
          styles.footerSection, 
          styles.downloadSection,
          isTablet && styles.downloadSectionTablet
        ]}>
          <Text style={styles.sectionTitle}>Get the App</Text>
          <Text style={styles.downloadText}>
            Download our mobile app for the best experience. Buy and sell on the go!
          </Text>
          <View style={[styles.appStoreButtons, isTablet && styles.appStoreButtonsTablet]}>
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
      </View>

      {/* Footer Bottom */}
      <View style={styles.footerBottom}>
        <View style={[styles.footerBottomContent, isTablet && styles.footerBottomContentTablet]}>
          <Text style={styles.copyright}>
            © {currentYear} Avida Marketplace. All rights reserved.
          </Text>
          <View style={styles.legalLinks}>
            <HoverableLink onPress={() => handleNavigation('/privacy')}>
              Privacy Policy
            </HoverableLink>
            <View style={styles.legalSeparator} />
            <HoverableLink onPress={() => handleNavigation('/terms')}>
              Terms of Service
            </HoverableLink>
            <View style={styles.legalSeparator} />
            <HoverableLink onPress={() => handleNavigation('/cookies')}>
              Cookie Policy
            </HoverableLink>
          </View>
        </View>
      </View>
    </>
  );

  // Use ImageBackground for the main footer
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.footer, fullWidthStyle]} {...webProps}>
        <ImageBackground
          source={{ uri: FOOTER_BG_IMAGE }}
          style={styles.backgroundImage}
          imageStyle={styles.backgroundImageStyle}
          resizeMode="cover"
        >
          {footerContent}
        </ImageBackground>
      </View>
    );
  }

  return (
    <View style={[styles.footer, fullWidthStyle]} {...webProps}>
      <ImageBackground
        source={{ uri: FOOTER_BG_IMAGE }}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
        resizeMode="cover"
      >
        {footerContent}
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    backgroundColor: COLORS.background,
    marginTop: 0,
    overflow: 'hidden',
  },
  backgroundImage: {
    width: '100%',
  },
  backgroundImageStyle: {
    opacity: 0.15,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 26, 0.92)',
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
    position: 'relative',
    zIndex: 1,
  },
  footerContentTablet: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 32,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 24,
  },
  footerSection: {
    flex: 1,
    minWidth: 160,
    maxWidth: 240,
  },
  footerSectionTablet: {
    width: '100%',
    maxWidth: '100%',
    minWidth: '100%',
    alignItems: 'center',
  },
  brandSection: {
    flex: 1.5,
    minWidth: 240,
    maxWidth: 320,
  },
  brandSectionTablet: {
    alignItems: 'center',
    maxWidth: 400,
    textAlign: 'center',
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
    textAlign: 'left',
  },
  socialLinks: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  linksColumn: {
    flexDirection: 'column',
  },
  linksRowTablet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  linkWithSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verticalSeparator: {
    width: 1,
    height: 14,
    backgroundColor: COLORS.separator,
    marginHorizontal: 12,
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
  downloadSection: {
    minWidth: 200,
    maxWidth: 280,
  },
  downloadSectionTablet: {
    alignItems: 'center',
    maxWidth: 400,
  },
  downloadText: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    marginBottom: 16,
    textAlign: 'left',
  },
  appStoreButtons: {
    flexDirection: 'column',
    gap: 10,
  },
  appStoreButtonsTablet: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  appStoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    position: 'relative',
    zIndex: 1,
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
    gap: 12,
  },
  copyright: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  legalLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  legalLink: {
    fontSize: 13,
    color: COLORS.textSecondary,
    paddingHorizontal: 8,
  },
  legalSeparator: {
    width: 1,
    height: 12,
    backgroundColor: COLORS.separator,
  },
});

export default Footer;
