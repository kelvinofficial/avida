import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import MilestoneNotificationModal from '../components/badges/MilestoneNotificationModal';

interface Milestone {
  id: string;
  type: 'count' | 'special';
  name: string;
  message: string;
  icon: string;
  threshold?: number;
  badge_name?: string;
  achieved: boolean;
  acknowledged: boolean;
}

interface MilestoneContextType {
  newMilestones: Milestone[];
  achievedMilestones: Milestone[];
  pendingMilestones: Milestone[];
  totalBadges: number;
  checkForNewMilestones: () => Promise<void>;
  acknowledgeMilestone: (milestoneId: string) => Promise<void>;
  showNextMilestone: () => void;
}

const MilestoneContext = createContext<MilestoneContextType | null>(null);

export const useMilestones = () => {
  const context = useContext(MilestoneContext);
  if (!context) {
    throw new Error('useMilestones must be used within a MilestoneProvider');
  }
  return context;
};

interface MilestoneProviderProps {
  children: ReactNode;
}

export const MilestoneProvider: React.FC<MilestoneProviderProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const [newMilestones, setNewMilestones] = useState<Milestone[]>([]);
  const [achievedMilestones, setAchievedMilestones] = useState<Milestone[]>([]);
  const [pendingMilestones, setPendingMilestones] = useState<Milestone[]>([]);
  const [totalBadges, setTotalBadges] = useState(0);
  const [currentMilestone, setCurrentMilestone] = useState<Milestone | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [milestoneQueue, setMilestoneQueue] = useState<Milestone[]>([]);

  const checkForNewMilestones = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await api.get('/badges/milestones');
      const data = response.data;
      
      setTotalBadges(data.total_badges || 0);
      setAchievedMilestones(data.achieved_milestones || []);
      setPendingMilestones(data.pending_milestones || []);
      
      const newOnes = data.new_milestones || [];
      setNewMilestones(newOnes);
      
      // If there are new milestones, queue them for display
      if (newOnes.length > 0) {
        setMilestoneQueue(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(m => m.id));
          const uniqueNew = newOnes.filter((m: Milestone) => !existingIds.has(m.id));
          return [...prev, ...uniqueNew];
        });
      }
    } catch (error) {
      console.error('Failed to check milestones:', error);
    }
  }, [isAuthenticated]);

  const acknowledgeMilestone = useCallback(async (milestoneId: string) => {
    try {
      await api.post('/badges/milestones/acknowledge', { milestone_id: milestoneId });
      
      // Update local state
      setNewMilestones(prev => prev.filter(m => m.id !== milestoneId));
      setAchievedMilestones(prev => 
        prev.map(m => m.id === milestoneId ? { ...m, acknowledged: true } : m)
      );
    } catch (error) {
      console.error('Failed to acknowledge milestone:', error);
    }
  }, []);

  const showNextMilestone = useCallback(() => {
    if (milestoneQueue.length > 0) {
      const [next, ...rest] = milestoneQueue;
      setCurrentMilestone(next);
      setMilestoneQueue(rest);
      setShowModal(true);
    }
  }, [milestoneQueue]);

  const handleCloseModal = useCallback(async () => {
    if (currentMilestone) {
      await acknowledgeMilestone(currentMilestone.id);
    }
    setShowModal(false);
    setCurrentMilestone(null);
    
    // Show next milestone if any
    setTimeout(() => {
      if (milestoneQueue.length > 0) {
        showNextMilestone();
      }
    }, 500);
  }, [currentMilestone, acknowledgeMilestone, milestoneQueue, showNextMilestone]);

  const handleShare = useCallback(() => {
    // Share action already handled in modal
    console.log('Achievement shared');
  }, []);

  // Check for milestones on initial load and when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      checkForNewMilestones();
    }
  }, [isAuthenticated, checkForNewMilestones]);

  // Auto-show first milestone when queue is populated
  useEffect(() => {
    if (milestoneQueue.length > 0 && !showModal && !currentMilestone) {
      showNextMilestone();
    }
  }, [milestoneQueue, showModal, currentMilestone, showNextMilestone]);

  return (
    <MilestoneContext.Provider
      value={{
        newMilestones,
        achievedMilestones,
        pendingMilestones,
        totalBadges,
        checkForNewMilestones,
        acknowledgeMilestone,
        showNextMilestone,
      }}
    >
      {children}
      <MilestoneNotificationModal
        visible={showModal}
        milestone={currentMilestone}
        onClose={handleCloseModal}
        onShare={handleShare}
        userId={user?.user_id || ''}
      />
    </MilestoneContext.Provider>
  );
};

export default MilestoneContext;
