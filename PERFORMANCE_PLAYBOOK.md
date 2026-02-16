# Performance Playbook - Zero Loader Architecture

## Overview
This document outlines the performance optimization strategy for the Avida Marketplace application. The goal is to eliminate 100% of loading indicators (skeletons, spinners, progress bars) and achieve instant rendering using a cache-first architecture.

## Core Principles

### 1. Cache-First Rendering
- **Show cached data immediately** on mount (no loading states)
- **Fetch fresh data in background** without blocking UI
- **Update UI silently** when fresh data arrives
- **Fallback to empty state** (not loading state) when no cache exists

### 2. No Loading Indicators
The following are **prohibited**:
- Skeleton/shimmer loaders
- ActivityIndicator / CircularProgress spinners
- Progress bars
- "Loading..." text

### 3. Empty States Over Loading States
When data is not available:
- Show empty state UI (e.g., "No items" message)
- Use placeholder icons for images
- Never show animated loaders

## Implementation Status

### Phase 1: Public Frontend ✅ COMPLETE
- Created unified cache utility (`/app/frontend/src/utils/cacheManager.ts`)
- Implemented cache-first hook pattern in `useHomeData.ts`
- Removed skeleton loaders from main pages:
  - `_layout.tsx` - Removed font loading skeletons
  - `index.tsx` - Home page with instant rendering
  - `sellers/index.tsx` - Sellers directory
  - `recently-viewed.tsx` - Recently viewed items
- Updated image components:
  - `OptimizedImage.tsx` - Static placeholder instead of shimmer
  - `ImageWithSkeleton.tsx` - Static placeholder instead of shimmer
  - `SkeletonCard.tsx` - Static placeholder (no animation)
  - `skeletons/index.tsx` - All skeletons converted to static placeholders

### Phase 2: Web Performance Optimization 🔄 IN PROGRESS
- **Image Optimization**: 
  - Lazy loading via native `loading="lazy"` attribute
  - Static placeholder fallback (no shimmer animation)
  - Priority loading for above-the-fold images
- **Service Worker**: (TODO)
- **Third-party Scripts**: (TODO)

### Phase 3: Admin Dashboard (UPCOMING)
- Cache hook exists at `/app/admin-dashboard/frontend/src/hooks/useCacheFirst.ts`
- Need to update pages using CircularProgress:
  - commission/page.tsx
  - seo-tools/page.tsx
  - polls-surveys/page.tsx
  - listings/page.tsx
  - content-calendar/page.tsx
  - photography-guides/page.tsx
  - aso-engine/page.tsx
  - qa-reliability/page.tsx

## Code Patterns

### Cache-First Hook Usage
```typescript
import { getCachedSync, setCacheSync, CACHE_KEYS } from '../utils/cacheManager';

function useData() {
  // 1. Initialize with cached data (synchronous)
  const cachedData = getCachedSync<DataType>(CACHE_KEYS.MY_DATA) ?? [];
  
  // 2. State initialized with cache (no loading state needed)
  const [data, setData] = useState<DataType[]>(cachedData);
  const [isFetchingInBackground, setIsFetchingInBackground] = useState(false);
  
  // 3. Fetch fresh data in background
  const fetchData = async () => {
    setIsFetchingInBackground(true);
    try {
      const freshData = await api.getData();
      setData(freshData);
      setCacheSync(CACHE_KEYS.MY_DATA, freshData);
    } catch (error) {
      // Keep showing cached data on error
      console.error(error);
    } finally {
      setIsFetchingInBackground(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  return { data, isFetchingInBackground };
}
```

### Static Image Placeholder
```typescript
// CORRECT: Static placeholder
const [isLoaded, setIsLoaded] = useState(false);

return (
  <View>
    {!isLoaded && <PlaceholderIcon />}
    <Image 
      source={{ uri }}
      onLoadEnd={() => setIsLoaded(true)}
      style={!isLoaded ? { opacity: 0 } : undefined}
    />
  </View>
);

// INCORRECT: Shimmer animation
{isLoading && <ShimmerAnimation />}  // ❌ NO!
```

### Empty State Pattern
```typescript
// CORRECT: Empty state
if (data.length === 0) {
  return <EmptyState message="No items found" />;
}

// INCORRECT: Loading state
if (loading) {  // ❌ NO!
  return <CircularProgress />;
}
```

## Cache Keys Reference

### Public Frontend (`/app/frontend/src/utils/cacheManager.ts`)
```typescript
export const CACHE_KEYS = {
  HOME_LISTINGS: 'home_listings',
  HOME_CATEGORIES: 'home_categories',
  FEATURED_LISTINGS: 'featured_listings',
  FEATURED_SELLERS: 'featured_sellers',
  USER_FAVORITES: 'user_favorites',
  USER_PROFILE: 'user_profile',
  SEARCH_SUGGESTIONS: 'search_suggestions',
  BUSINESS_PROFILES: 'business_profiles',
  LISTING_DETAIL: (id: string) => `listing_${id}`,
  CATEGORY_LISTINGS: (categoryId: string, page: number) => `category_${categoryId}_p${page}`,
  SELLER_PROFILE: (slug: string) => `seller_${slug}`,
};
```

### Admin Dashboard (`/app/admin-dashboard/frontend/src/hooks/useCacheFirst.ts`)
```typescript
export const ADMIN_CACHE_KEYS = {
  DASHBOARD_STATS: 'dashboard_stats',
  LISTINGS: 'listings',
  USERS: 'users',
  ANALYTICS: 'analytics',
  SEO_TOOLS: 'seo_tools',
  BANNERS: 'banners',
  VOUCHERS: 'vouchers',
  INTEGRATIONS: 'integrations',
};
```

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| LCP (Largest Contentful Paint) | < 2.5s | Pending |
| INP (Interaction to Next Paint) | < 200ms | Pending |
| CLS (Cumulative Layout Shift) | < 0.1 | Pending |
| Lighthouse Score | 90+ | Pending |

## Testing Checklist

- [x] Home page renders instantly without skeletons
- [x] Sellers page renders instantly without skeletons
- [x] Recently viewed page renders instantly without skeletons
- [x] Image components show static placeholder (no shimmer)
- [ ] Admin dashboard pages render with cached data
- [ ] Service worker caches API responses
- [ ] Lighthouse score >= 90

## Files Modified

### Phase 1 & 2 Changes
```
/app/frontend/src/
├── utils/
│   └── cacheManager.ts          ✅ Created (unified cache utility)
├── hooks/
│   └── useHomeData.ts           ✅ Modified (cache-first pattern)
├── components/
│   ├── common/
│   │   ├── OptimizedImage.tsx   ✅ Modified (static placeholder)
│   │   └── ImageWithSkeleton.tsx ✅ Modified (static placeholder)
│   ├── home/
│   │   └── SkeletonCard.tsx     ✅ Modified (static placeholder)
│   └── skeletons/
│       └── index.tsx            ✅ Modified (all static)
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx          ✅ Modified (removed font skeletons)
│   │   ├── index.tsx            ✅ Uses cache-first
│   │   └── recently-viewed.tsx  ✅ Modified (removed skeletons)
│   └── sellers/
│       └── index.tsx            ✅ Modified (removed skeletons)
```

## Changelog

### 2026-02-16 - Phase 2 Start
- Removed shimmer animations from image components
- Converted all skeleton components to static placeholders
- Updated SkeletonCard to be static (no animation)
- Updated ImageWithSkeleton to use static placeholder
- Updated OptimizedImage to use static placeholder

### 2026-02-16 - Phase 1 Complete
- Implemented cache-first architecture for public frontend
- Created unified cache manager
- Removed skeleton loaders from main pages
- Verified instant rendering via testing agent
