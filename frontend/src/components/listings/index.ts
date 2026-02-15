// Re-export ListingCard from shared component for backwards compatibility
import { ListingCard } from '../shared/ListingCard';
import PropertyListingCard from './PropertyListingCard';
import AutoListingCard from './AutoListingCard';

export type { ListingCardProps, Listing } from '../shared/ListingCard';
export { ListingCard, PropertyListingCard, AutoListingCard };
