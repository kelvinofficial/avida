/**
 * Social Share Buttons Component
 * Provides share functionality for WhatsApp, Facebook, and Twitter
 * Pre-populates share content with listing info from SEO meta tags
 */

import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Share, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SocialShareButtonsProps {
  title: string;
  description: string;
  url: string;
  image?: string;
  price?: number;
  currency?: string;
  compact?: boolean;
  showLabel?: boolean;
  onShareComplete?: (platform: string) => void;
}

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://avida.com';

export const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({
  title,
  description,
  url,
  image,
  price,
  currency = '€',
  compact = false,
  showLabel = true,
  onShareComplete,
}) => {
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  
  // Format share text
  const shareText = price 
    ? `${title} - ${currency}${price.toLocaleString()}\n\n${description.slice(0, 100)}...`
    : `${title}\n\n${description.slice(0, 100)}...`;

  // Native share (for mobile)
  const handleNativeShare = async () => {
    try {
      const result = await Share.share({
        message: `${shareText}\n\n${fullUrl}`,
        title: title,
        url: fullUrl, // iOS only
      });
      
      if (result.action === Share.sharedAction) {
        onShareComplete?.('native');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  // WhatsApp share
  const handleWhatsAppShare = async () => {
    const whatsappText = encodeURIComponent(`${shareText}\n\n${fullUrl}`);
    const whatsappUrl = Platform.OS === 'web' 
      ? `https://web.whatsapp.com/send?text=${whatsappText}`
      : `whatsapp://send?text=${whatsappText}`;
    
    try {
      if (Platform.OS === 'web') {
        window.open(whatsappUrl, '_blank');
      } else {
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
        } else {
          // Fallback to web.whatsapp.com
          await Linking.openURL(`https://web.whatsapp.com/send?text=${whatsappText}`);
        }
      }
      onShareComplete?.('whatsapp');
    } catch (error) {
      console.error('Error sharing to WhatsApp:', error);
    }
  };

  // Facebook share
  const handleFacebookShare = async () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}&quote=${encodeURIComponent(shareText)}`;
    
    try {
      if (Platform.OS === 'web') {
        window.open(facebookUrl, '_blank', 'width=600,height=400');
      } else {
        await Linking.openURL(facebookUrl);
      }
      onShareComplete?.('facebook');
    } catch (error) {
      console.error('Error sharing to Facebook:', error);
    }
  };

  // Twitter/X share
  const handleTwitterShare = async () => {
    const twitterText = price 
      ? `${title} - ${currency}${price.toLocaleString()}`
      : title;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(fullUrl)}`;
    
    try {
      if (Platform.OS === 'web') {
        window.open(twitterUrl, '_blank', 'width=600,height=400');
      } else {
        await Linking.openURL(twitterUrl);
      }
      onShareComplete?.('twitter');
    } catch (error) {
      console.error('Error sharing to Twitter:', error);
    }
  };

  // Copy link
  const handleCopyLink = async () => {
    try {
      if (Platform.OS === 'web' && navigator.clipboard) {
        await navigator.clipboard.writeText(fullUrl);
        onShareComplete?.('copy');
      } else {
        // Use native share as fallback for mobile
        await Share.share({
          message: fullUrl,
          title: 'Copy Link',
        });
      }
    } catch (error) {
      console.error('Error copying link:', error);
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <TouchableOpacity 
          style={[styles.compactButton, styles.whatsappButton]} 
          onPress={handleWhatsAppShare}
          // @ts-ignore - for web compatibility
          {...(Platform.OS === 'web' ? { 'data-testid': 'share-whatsapp-btn' } : { testID: 'share-whatsapp-btn' })}
        >
          <Ionicons name="logo-whatsapp" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.compactButton, styles.facebookButton]} 
          onPress={handleFacebookShare}
          // @ts-ignore - for web compatibility
          {...(Platform.OS === 'web' ? { 'data-testid': 'share-facebook-btn' } : { testID: 'share-facebook-btn' })}
        >
          <Ionicons name="logo-facebook" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.compactButton, styles.twitterButton]} 
          onPress={handleTwitterShare}
          // @ts-ignore - for web compatibility
          {...(Platform.OS === 'web' ? { 'data-testid': 'share-twitter-btn' } : { testID: 'share-twitter-btn' })}
        >
          <Ionicons name="logo-twitter" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.compactButton, styles.copyButton]} 
          onPress={handleCopyLink}
          // @ts-ignore - for web compatibility
          {...(Platform.OS === 'web' ? { 'data-testid': 'share-copy-btn' } : { testID: 'share-copy-btn' })}
        >
          <Ionicons name="copy-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showLabel && <Text style={styles.label}>Share this listing</Text>}
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={[styles.shareButton, styles.whatsappButton]} 
          onPress={handleWhatsAppShare}
          // @ts-ignore - for web compatibility
          {...(Platform.OS === 'web' ? { 'data-testid': 'share-whatsapp-btn' } : { testID: 'share-whatsapp-btn' })}
        >
          <Ionicons name="logo-whatsapp" size={24} color="#fff" />
          <Text style={styles.buttonText}>WhatsApp</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.shareButton, styles.facebookButton]} 
          onPress={handleFacebookShare}
          // @ts-ignore - for web compatibility
          {...(Platform.OS === 'web' ? { 'data-testid': 'share-facebook-btn' } : { testID: 'share-facebook-btn' })}
        >
          <Ionicons name="logo-facebook" size={24} color="#fff" />
          <Text style={styles.buttonText}>Facebook</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.shareButton, styles.twitterButton]} 
          onPress={handleTwitterShare}
          // @ts-ignore - for web compatibility
          {...(Platform.OS === 'web' ? { 'data-testid': 'share-twitter-btn' } : { testID: 'share-twitter-btn' })}
        >
          <Ionicons name="logo-twitter" size={24} color="#fff" />
          <Text style={styles.buttonText}>Twitter</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.shareButton, styles.copyButton]} 
          onPress={handleCopyLink}
          // @ts-ignore - for web compatibility
          {...(Platform.OS === 'web' ? { 'data-testid': 'share-copy-btn' } : { testID: 'share-copy-btn' })}
        >
          <Ionicons name="copy-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>Copy Link</Text>
        </TouchableOpacity>
      </View>

      {/* Native share button for mobile */}
      {Platform.OS !== 'web' && (
        <TouchableOpacity 
          style={styles.nativeShareButton} 
          onPress={handleNativeShare}
          testID="share-native-btn"
        >
          <Ionicons name="share-outline" size={20} color="#2E7D32" />
          <Text style={styles.nativeShareText}>More sharing options</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  buttonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    minWidth: 100,
  },
  buttonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  whatsappButton: {
    backgroundColor: '#25D366',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  twitterButton: {
    backgroundColor: '#1DA1F2',
  },
  copyButton: {
    backgroundColor: '#6c757d',
  },
  nativeShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 8,
    gap: 8,
  },
  nativeShareText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '500',
  },
  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  compactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SocialShareButtons;
