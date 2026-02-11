import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { BadgeCelebrationModal } from '../components/badges/BadgeCelebrationModal';

interface EarnedBadge {
  name: string;
  description: string;
  icon: string;
  color: string;
  points_earned?: number;
}

interface BadgeCelebrationContextType {
  showCelebration: (badge: EarnedBadge) => void;
  showMultipleCelebrations: (badges: EarnedBadge[]) => void;
}

const BadgeCelebrationContext = createContext<BadgeCelebrationContextType | null>(null);

export const useBadgeCelebration = () => {
  const context = useContext(BadgeCelebrationContext);
  if (!context) {
    throw new Error('useBadgeCelebration must be used within a BadgeCelebrationProvider');
  }
  return context;
};

interface BadgeCelebrationProviderProps {
  children: ReactNode;
}

export const BadgeCelebrationProvider: React.FC<BadgeCelebrationProviderProps> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [currentBadge, setCurrentBadge] = useState<EarnedBadge | null>(null);
  const [badgeQueue, setBadgeQueue] = useState<EarnedBadge[]>([]);

  const showCelebration = useCallback((badge: EarnedBadge) => {
    setCurrentBadge(badge);
    setVisible(true);
  }, []);

  const showMultipleCelebrations = useCallback((badges: EarnedBadge[]) => {
    if (badges.length === 0) return;
    
    // Show first badge immediately
    const [first, ...rest] = badges;
    setCurrentBadge(first);
    setBadgeQueue(rest);
    setVisible(true);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    
    // Show next badge in queue after a short delay
    if (badgeQueue.length > 0) {
      setTimeout(() => {
        const [next, ...rest] = badgeQueue;
        setCurrentBadge(next);
        setBadgeQueue(rest);
        setVisible(true);
      }, 300);
    } else {
      setCurrentBadge(null);
    }
  }, [badgeQueue]);

  return (
    <BadgeCelebrationContext.Provider value={{ showCelebration, showMultipleCelebrations }}>
      {children}
      <BadgeCelebrationModal
        visible={visible}
        onClose={handleClose}
        badge={currentBadge}
      />
    </BadgeCelebrationContext.Provider>
  );
};

export default BadgeCelebrationProvider;
