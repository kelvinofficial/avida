import { useState, useEffect, useCallback } from 'react';

interface SafetyTip {
  tip_text: string;
  is_default?: boolean;
}

interface SafetyTipsResponse {
  category_id: string;
  tips: SafetyTip[];
  is_default: boolean;
}

// Default fallback tips if API fails
const DEFAULT_TIPS = [
  { tip_text: 'Meet in a public place', is_default: true },
  { tip_text: "Don't send money before seeing the item", is_default: true },
  { tip_text: 'Check the item thoroughly before paying', is_default: true },
];

export function useSafetyTips(categoryId: string | undefined) {
  const [tips, setTips] = useState<SafetyTip[]>(DEFAULT_TIPS);
  const [loading, setLoading] = useState(false);

  const fetchTips = useCallback(async () => {
    if (!categoryId) {
      setTips(DEFAULT_TIPS);
      return;
    }

    try {
      setLoading(true);
      const API_BASE = process.env.EXPO_PUBLIC_API_URL || '';
      const response = await fetch(`${API_BASE}/api/safety-tips/public/${categoryId}`);
      
      if (response.ok) {
        const data: SafetyTipsResponse = await response.json();
        if (data.tips && data.tips.length > 0) {
          setTips(data.tips.slice(0, 5)); // Limit to 5 tips for display
        } else {
          setTips(DEFAULT_TIPS);
        }
      } else {
        setTips(DEFAULT_TIPS);
      }
    } catch (error) {
      console.error('Error fetching safety tips:', error);
      setTips(DEFAULT_TIPS);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchTips();
  }, [fetchTips]);

  return { tips, loading };
}
