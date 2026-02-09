/**
 * Sandbox Mode Context
 * 
 * Provides sandbox mode state to the entire app, allowing admins to preview
 * the customer-facing app while clearly marking it as a test environment.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

interface SandboxSession {
  id: string;
  admin_id: string;
  role: 'buyer' | 'seller' | 'transport_partner' | 'admin';
  status: string;
  sandbox_user_id: string;
  started_at: string;
  simulated_time_offset_hours: number;
}

interface SandboxContextType {
  isSandboxMode: boolean;
  sandboxSession: SandboxSession | null;
  sandboxRole: string | null;
  sandboxUserId: string | null;
  timeOffset: number;
  isLoading: boolean;
  enterSandbox: (role: string) => Promise<boolean>;
  exitSandbox: () => Promise<void>;
  switchRole: (newRole: string) => Promise<boolean>;
  refreshSession: () => Promise<void>;
}

const SandboxContext = createContext<SandboxContextType | undefined>(undefined);

const SANDBOX_SESSION_KEY = 'sandbox_session';
const SANDBOX_ADMIN_ID_KEY = 'sandbox_admin_id';

export function SandboxProvider({ children }: { children: ReactNode }) {
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [sandboxSession, setSandboxSession] = useState<SandboxSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for active sandbox session on mount
  useEffect(() => {
    checkSandboxSession();
  }, []);

  const checkSandboxSession = async () => {
    try {
      // Get stored admin ID if any
      const storedAdminId = await AsyncStorage.getItem(SANDBOX_ADMIN_ID_KEY);
      
      if (storedAdminId) {
        // Check if there's an active session for this admin
        const response = await api.get(`/sandbox/session/active/${storedAdminId}`);
        
        if (response.data.active && response.data.session) {
          setSandboxSession(response.data.session);
          setIsSandboxMode(true);
        } else {
          // Clear stored data if no active session
          await AsyncStorage.removeItem(SANDBOX_SESSION_KEY);
          await AsyncStorage.removeItem(SANDBOX_ADMIN_ID_KEY);
          setSandboxSession(null);
          setIsSandboxMode(false);
        }
      }
    } catch (error) {
      console.log('Sandbox session check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const enterSandbox = useCallback(async (role: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // For now, use 'admin' as the default admin ID
      // In a real app, this would come from the authenticated admin user
      const adminId = 'admin';
      
      const response = await api.post('/sandbox/session/start', {
        admin_id: adminId,
        role: role
      });
      
      if (response.data.session) {
        await AsyncStorage.setItem(SANDBOX_ADMIN_ID_KEY, adminId);
        await AsyncStorage.setItem(SANDBOX_SESSION_KEY, JSON.stringify(response.data.session));
        setSandboxSession(response.data.session);
        setIsSandboxMode(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to enter sandbox:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const exitSandbox = useCallback(async () => {
    try {
      if (sandboxSession) {
        const storedAdminId = await AsyncStorage.getItem(SANDBOX_ADMIN_ID_KEY);
        await api.post(`/sandbox/session/${sandboxSession.id}/end`, {
          admin_id: storedAdminId || 'admin'
        });
      }
    } catch (error) {
      console.error('Failed to end sandbox session:', error);
    } finally {
      await AsyncStorage.removeItem(SANDBOX_SESSION_KEY);
      await AsyncStorage.removeItem(SANDBOX_ADMIN_ID_KEY);
      setSandboxSession(null);
      setIsSandboxMode(false);
    }
  }, [sandboxSession]);

  const switchRole = useCallback(async (newRole: string): Promise<boolean> => {
    try {
      if (!sandboxSession) return false;
      
      const storedAdminId = await AsyncStorage.getItem(SANDBOX_ADMIN_ID_KEY);
      
      const response = await api.post(`/sandbox/session/${sandboxSession.id}/switch-role`, {
        admin_id: storedAdminId || 'admin',
        new_role: newRole
      });
      
      if (response.data.success) {
        // Refresh session data
        await checkSandboxSession();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to switch role:', error);
      return false;
    }
  }, [sandboxSession]);

  const refreshSession = useCallback(async () => {
    await checkSandboxSession();
  }, []);

  const value: SandboxContextType = {
    isSandboxMode,
    sandboxSession,
    sandboxRole: sandboxSession?.role || null,
    sandboxUserId: sandboxSession?.sandbox_user_id || null,
    timeOffset: sandboxSession?.simulated_time_offset_hours || 0,
    isLoading,
    enterSandbox,
    exitSandbox,
    switchRole,
    refreshSession
  };

  return (
    <SandboxContext.Provider value={value}>
      {children}
    </SandboxContext.Provider>
  );
}

export function useSandbox() {
  const context = useContext(SandboxContext);
  if (context === undefined) {
    throw new Error('useSandbox must be used within a SandboxProvider');
  }
  return context;
}

export default SandboxContext;
