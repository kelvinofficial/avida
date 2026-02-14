/**
 * Common Components
 * 
 * Reusable UI components for mobile optimization:
 * - ImagePlaceholder: Polished placeholder for missing images
 * - OptimizedImage: Lazy-loading image with fallback
 * - TouchableScale: Enhanced touch feedback with haptics
 * - EnhancedRefreshControl: Pull-to-refresh with haptics
 * - OfflineBanner: Network status indicator
 * - FavoriteToast: Toast notification for favorites
 * - FavoriteNotificationProvider: WebSocket-based favorite notifications
 */

export { ImagePlaceholder } from './ImagePlaceholder';
export { OptimizedImage } from './OptimizedImage';
export { ImageWithSkeleton } from './ImageWithSkeleton';
export { TouchableScale } from './TouchableScale';
export { EnhancedRefreshControl } from './EnhancedRefreshControl';
export { OfflineBanner } from './OfflineBanner';
export { FavoriteToast } from './FavoriteToast';
export type { FavoriteToastProps } from './FavoriteToast';
export { FavoriteNotificationProvider, useFavoriteNotification } from './FavoriteNotificationProvider';
