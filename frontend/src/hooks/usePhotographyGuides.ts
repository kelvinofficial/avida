/**
 * Hook to fetch photography guides from the admin-managed API
 * Falls back to static config if API fails
 */
import { useState, useEffect, useCallback } from 'react';
import { CATEGORY_LISTING_TIPS } from '../config/listingFormConfig';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export interface PhotographyGuide {
  id: string;
  title: string;
  description: string;
  icon: string;
  image_url?: string;
  order: number;
}

interface PhotographyGuidesResponse {
  guides: PhotographyGuide[];
  count: number;
}

// Cache for guides to avoid repeated API calls
const guidesCache: Record<string, { guides: PhotographyGuide[]; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function usePhotographyGuides(categoryId: string | undefined) {
  const [guides, setGuides] = useState<PhotographyGuide[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGuides = useCallback(async () => {
    if (!categoryId) {
      // Use default tips if no category selected
      const defaultTips = CATEGORY_LISTING_TIPS.default?.photoTips || [];
      setGuides(defaultTips.map((tip, index) => ({
        id: `default-${index}`,
        title: tip.title,
        description: tip.description,
        icon: tip.icon,
        order: index,
      })));
      return;
    }

    // Check cache first
    const cached = guidesCache[categoryId];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setGuides(cached.guides);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/photography-guides/public/${categoryId}`);
      
      if (response.ok) {
        const data: PhotographyGuidesResponse = await response.json();
        
        if (data.guides && data.guides.length > 0) {
          // Use API guides
          setGuides(data.guides);
          guidesCache[categoryId] = { guides: data.guides, timestamp: Date.now() };
        } else {
          // Fall back to static config
          fallbackToStaticTips(categoryId);
        }
      } else {
        // Fall back to static config
        fallbackToStaticTips(categoryId);
      }
    } catch (err) {
      console.error('Error fetching photography guides:', err);
      setError('Failed to fetch guides');
      // Fall back to static config
      fallbackToStaticTips(categoryId);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  const fallbackToStaticTips = (catId: string) => {
    const staticTips = CATEGORY_LISTING_TIPS[catId]?.photoTips || 
                       CATEGORY_LISTING_TIPS.default?.photoTips || [];
    
    const fallbackGuides = staticTips.map((tip, index) => ({
      id: `static-${index}`,
      title: tip.title,
      description: tip.description,
      icon: tip.icon,
      order: index,
    }));
    
    setGuides(fallbackGuides);
  };

  useEffect(() => {
    fetchGuides();
  }, [fetchGuides]);

  return { guides, loading, error, refetch: fetchGuides };
}

/**
 * Get photography guides for a category (can be called outside of hooks)
 * Returns a promise that resolves to guides array
 */
export async function getPhotographyGuides(categoryId: string): Promise<PhotographyGuide[]> {
  // Check cache first
  const cached = guidesCache[categoryId];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.guides;
  }

  try {
    const response = await fetch(`${API_URL}/api/photography-guides/public/${categoryId}`);
    
    if (response.ok) {
      const data: PhotographyGuidesResponse = await response.json();
      
      if (data.guides && data.guides.length > 0) {
        guidesCache[categoryId] = { guides: data.guides, timestamp: Date.now() };
        return data.guides;
      }
    }
  } catch (err) {
    console.error('Error fetching photography guides:', err);
  }

  // Fall back to static config
  const staticTips = CATEGORY_LISTING_TIPS[categoryId]?.photoTips || 
                     CATEGORY_LISTING_TIPS.default?.photoTips || [];
  
  return staticTips.map((tip, index) => ({
    id: `static-${index}`,
    title: tip.title,
    description: tip.description,
    icon: tip.icon,
    order: index,
  }));
}
