# Avida Performance Playbook

## Cache-First Architecture Implementation

### Overview
This document describes the cache-first architecture implemented across the Avida Marketplace application to eliminate all loading indicators (spinners, skeletons) and achieve instant page rendering.

---

## Architecture Principles

### 1. Cache-First Rendering
- **Goal**: Show content immediately on every page load
- **How**: Initialize React state with cached data from localStorage/AsyncStorage
- **Fallback**: Empty arrays `[]` for lists, show static empty states instead of spinners

### 2. Background Data Refresh
- **Goal**: Keep data fresh without blocking UI
- **How**: Fetch fresh data after initial render, update state silently
- **Error Handling**: Keep showing cached data on network errors

### 3. Optimistic UI Updates
- **Goal**: Instant feedback for user actions
- **How**: Update local state immediately, sync to server in background
- **Rollback**: Revert state on server error

---

## Implementation Details

### Public Frontend (`/app/frontend`)

#### Cache Manager (`/app/frontend/src/utils/cacheManager.ts`)
```typescript
// Synchronous cache read for instant render
getCachedSync<T>(key: string): T | null

// Async cache operations
getCached<T>(key: string): Promise<{ data: T; isStale: boolean } | null>
setCache<T>(key: string, data: T): Promise<void>
clearCache(key: string): Promise<void>
```

#### Cache Keys
```typescript
CACHE_KEYS = {
  HOME_LISTINGS: 'home_listings',
  HOME_CATEGORIES: 'home_categories',
  FEATURED_LISTINGS: 'featured_listings',
  FEATURED_SELLERS: 'featured_sellers',
  USER_FAVORITES: 'user_favorites',
  USER_PROFILE: 'user_profile',
  BUSINESS_PROFILES: 'business_profiles',
  LISTING_DETAIL: (id) => `listing_${id}`,
}
```

#### useCacheFirst Hook (`/app/frontend/src/hooks/useCacheFirst.ts`)
```typescript
const { data, isFetching, refresh, setData } = useCacheFirst({
  cacheKey: 'my_data',
  fetcher: () => api.getData(),
  fallbackData: [],
});
// data is NEVER null - always shows cached or fallback
// isFetching is for background indicator (optional)
```

---

### Admin Dashboard (`/app/admin-dashboard/frontend`)

#### useCacheFirst Hook (`/app/admin-dashboard/frontend/src/hooks/useCacheFirst.ts`)
Same pattern as public frontend, adapted for Next.js.

---

## Changes Made

### Removed Components
- **Skeleton components**: Still exist but no longer imported in `_layout.tsx`
- **Loading states**: `loading: true` → Always `false` from hooks

### Modified Files

#### `/app/frontend/app/_layout.tsx`
- Removed skeleton imports
- Removed font loading skeleton display
- Minimal mount check (shows plain background for < 1 frame)

#### `/app/frontend/src/hooks/useHomeData.ts`
- Initialize with cached data: `useState<Listing[]>(cachedListings)`
- `loading` always returns `false`
- `loadingFeatured` always returns `false`
- Data fetches in background after mount

#### `/app/frontend/app/sellers/index.tsx`
- Uses cache-first pattern
- Removed skeleton display

---

## Cache Configuration

| Setting | Value | Description |
|---------|-------|-------------|
| STALE_TIME | 5 minutes | After this, fetch fresh data in background |
| MAX_AGE | 24 hours | After this, cache is considered expired |
| CACHE_VERSION | 1 | Increment to invalidate all caches |

---

## Performance Targets

| Metric | Target | How to Achieve |
|--------|--------|----------------|
| LCP | < 2.5s | Cache-first rendering, image optimization |
| INP | < 200ms | No blocking loaders, optimistic updates |
| CLS | < 0.1 | Static layouts, reserved image space |
| TTI | < 3s | Minimal JS, code splitting |

---

## Future Optimizations

### Phase 2: SSR/SSG (Pending)
- Convert critical pages to Server-Side Rendering
- Use Static Site Generation for static content
- Implement Incremental Static Regeneration

### Phase 2: Image Optimization (Pending)
- WebP/AVIF format conversion
- Responsive images with srcset
- Preload hero images
- Lazy load below-fold images

### Phase 3: Service Worker (Pending)
- Offline support
- Background sync
- Push notifications

---

## Testing

### Manual Testing
1. Clear browser cache and localStorage
2. Load homepage - should render instantly with empty state
3. Wait for data to load (background)
4. Refresh page - should render instantly with cached data

### Performance Testing
```bash
# Lighthouse CLI
npx lighthouse https://instant-avida.preview.emergentagent.com --view

# Web Vitals
# Check browser DevTools → Performance
```

---

## Rollback Plan

If cache-first causes issues:
1. Restore skeleton imports in `_layout.tsx`
2. Revert `useHomeData.ts` to use loading states
3. The skeleton components are still in `/app/frontend/src/components/skeletons/`

---

## Contact

For questions about this implementation, refer to:
- `/app/memory/PRD.md` - Product requirements
- `/app/frontend/src/utils/cacheManager.ts` - Cache logic
- `/app/frontend/src/hooks/useCacheFirst.ts` - React hook
