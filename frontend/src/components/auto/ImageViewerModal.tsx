import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Image,
  Animated,
  PanResponder,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../utils/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerModalProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  visible,
  images,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);
  
  // Zoom state for each image
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  
  const lastScale = useRef(1);
  const lastTranslateX = useRef(0);
  const lastTranslateY = useRef(0);

  const resetZoom = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
    lastScale.current = 1;
    lastTranslateX.current = 0;
    lastTranslateY.current = 0;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        translateX.setOffset(lastTranslateX.current);
        translateY.setOffset(lastTranslateY.current);
        translateX.setValue(0);
        translateY.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (lastScale.current > 1) {
          translateX.setValue(gestureState.dx);
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        translateX.flattenOffset();
        translateY.flattenOffset();
        lastTranslateX.current += gestureState.dx;
        lastTranslateY.current += gestureState.dy;
        
        // Double tap to zoom
        if (Math.abs(gestureState.dx) < 5 && Math.abs(gestureState.dy) < 5) {
          if (lastScale.current > 1) {
            resetZoom();
          } else {
            Animated.spring(scale, { toValue: 2, useNativeDriver: true }).start();
            lastScale.current = 2;
          }
        }
      },
    })
  ).current;

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (slideIndex !== currentIndex) {
      setCurrentIndex(slideIndex);
      resetZoom();
    }
  };

  const goToImage = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
    resetZoom();
  };

  const renderImage = ({ item, index }: { item: string; index: number }) => (
    <View style={styles.imageContainer}>
      <Animated.View
        style={[
          styles.imageWrapper,
          {
            transform: [
              { scale: index === currentIndex ? scale : 1 },
              { translateX: index === currentIndex ? translateX : 0 },
              { translateY: index === currentIndex ? translateY : 0 },
            ],
          },
        ]}
        {...(index === currentIndex ? panResponder.panHandlers : {})}
      >
        <Image
          source={{ uri: item }}
          style={styles.image}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.95)" barStyle="light-content" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.counter}>
            {currentIndex + 1} / {images.length}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Images */}
        <FlatList
          ref={flatListRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onMomentumScrollEnd={handleScroll}
          renderItem={renderImage}
          keyExtractor={(item, index) => `image-${index}`}
        />

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <View style={styles.thumbnailStrip}>
            <FlatList
              data={images}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailContent}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  onPress={() => goToImage(index)}
                  style={[
                    styles.thumbnail,
                    currentIndex === index && styles.thumbnailActive,
                  ]}
                >
                  <Image
                    source={{ uri: item }}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
              keyExtractor={(_, index) => `thumb-${index}`}
            />
          </View>
        )}

        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonLeft]}
                onPress={() => goToImage(currentIndex - 1)}
              >
                <Ionicons name="chevron-back" size={32} color="#fff" />
              </TouchableOpacity>
            )}
            {currentIndex < images.length - 1 && (
              <TouchableOpacity
                style={[styles.navButton, styles.navButtonRight]}
                onPress={() => goToImage(currentIndex + 1)}
              >
                <Ionicons name="chevron-forward" size={32} color="#fff" />
              </TouchableOpacity>
            )}
          </>
        )}

        {/* Zoom hint */}
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>Double-tap to zoom • Swipe to navigate</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  thumbnailStrip: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
  },
  thumbnailContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: theme.colors.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonLeft: {
    left: 16,
  },
  navButtonRight: {
    right: 16,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
});
