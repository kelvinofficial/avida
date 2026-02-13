import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ImagePlaceholderProps {
  size?: 'small' | 'medium' | 'large';
  type?: 'listing' | 'avatar' | 'general';
  style?: any;
  showText?: boolean;
}

/**
 * A polished placeholder component for when images are missing
 * Usage: <ImagePlaceholder size="medium" type="listing" />
 */
export const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({ 
  size = 'medium', 
  type = 'listing',
  style,
  showText = true,
}) => {
  const iconSize = size === 'small' ? 20 : size === 'large' ? 48 : 32;
  const wrapperSize = size === 'small' ? 36 : size === 'large' ? 72 : 52;
  
  const getIcon = () => {
    switch (type) {
      case 'avatar':
        return 'person-outline';
      case 'listing':
      default:
        return 'image-outline';
    }
  };
  
  const getText = () => {
    switch (type) {
      case 'avatar':
        return '';
      case 'listing':
      default:
        return 'No image';
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.iconWrapper, { width: wrapperSize, height: wrapperSize, borderRadius: wrapperSize / 2 }]}>
        <Ionicons name={getIcon()} size={iconSize} color="#90A4AE" />
      </View>
      {showText && type !== 'avatar' && (
        <Text style={styles.text}>{getText()}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#ECEFF1',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  iconWrapper: {
    backgroundColor: '#E0E4E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  text: {
    fontSize: 11,
    color: '#90A4AE',
    fontWeight: '500',
  },
});

export default ImagePlaceholder;
