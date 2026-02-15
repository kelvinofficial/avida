/**
 * Home Page Components
 * Extracted from the main index.tsx to improve maintainability
 */

export { SearchSuggestions, AnimatedChip, useSearchSuggestions } from './SearchSuggestions';
export { CategoryIcon, COLORS_CATEGORY, CATEGORY_ITEM_WIDTH } from './CategoryIcon';
export type { CategoryIconProps } from './CategoryIcon';
// Re-export from shared component for backwards compatibility
export { ListingCard, CARD_WIDTH, CARD_IMAGE_HEIGHT, BORDER_RADIUS } from '../shared/ListingCard';
export type { Listing, ListingCardProps } from '../shared/ListingCard';
export { SkeletonCard } from './SkeletonCard';
export type { SkeletonCardProps } from './SkeletonCard';
export { FeaturedSellersSection } from './FeaturedSellersSection';
export type { FeaturedSeller, FeaturedListing } from './FeaturedSellersSection';
export { SubcategoryModal } from './SubcategoryModal';
export { MobileHeader } from './MobileHeader';
export { HomeDesktopHeader } from './HomeDesktopHeader';
export { ListingsGrid } from './ListingsGrid';
export { LocationModal } from './LocationModal';
export { 
  styles, 
  desktopStyles, 
  mobileStyles,
  HORIZONTAL_PADDING, 
  ROW_1_HEIGHT, 
  TOUCH_TARGET, 
  ICON_SIZE,
  MAX_CONTENT_WIDTH 
} from './homeStyles';
