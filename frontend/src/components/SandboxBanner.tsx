/**
 * Sandbox Mode Banner Component
 * 
 * Displays a prominent banner when sandbox mode is active, showing:
 * - Clear "SANDBOX MODE" indicator
 * - Current role being tested
 * - Time offset if any
 * - Quick exit button
 * - Role switching dropdown
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSandbox } from '../utils/sandboxContext';

const ROLES = [
  { id: 'buyer', label: 'Buyer', icon: 'person-outline' },
  { id: 'seller', label: 'Seller', icon: 'storefront-outline' },
  { id: 'transport_partner', label: 'Transport', icon: 'car-outline' },
  { id: 'admin', label: 'Admin', icon: 'shield-outline' },
];

export default function SandboxBanner() {
  const { isSandboxMode, sandboxRole, timeOffset, exitSandbox, switchRole, isLoading } = useSandbox();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [switching, setSwitching] = useState(false);

  if (!isSandboxMode) return null;

  const currentRole = ROLES.find(r => r.id === sandboxRole) || ROLES[0];

  const handleSwitchRole = async (roleId: string) => {
    if (roleId === sandboxRole) {
      setShowRoleMenu(false);
      return;
    }
    
    setSwitching(true);
    try {
      await switchRole(roleId);
    } finally {
      setSwitching(false);
      setShowRoleMenu(false);
    }
  };

  const handleExit = async () => {
    await exitSandbox();
  };

  return (
    <>
      {/* Main Banner */}
      <View style={styles.banner}>
        {/* Left side - Sandbox indicator */}
        <View style={styles.leftSection}>
          <View style={styles.sandboxBadge}>
            <Ionicons name="flask" size={14} color="#FFF" />
            <Text style={styles.sandboxText}>SANDBOX</Text>
          </View>
          
          {/* Role selector */}
          <TouchableOpacity
            style={styles.roleSelector}
            onPress={() => setShowRoleMenu(true)}
            disabled={isLoading || switching}
          >
            <Ionicons name={currentRole.icon as any} size={14} color="#FFF" />
            <Text style={styles.roleText}>{currentRole.label}</Text>
            <Ionicons name="chevron-down" size={12} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Right side - Time offset and exit */}
        <View style={styles.rightSection}>
          {timeOffset > 0 && (
            <View style={styles.timeOffset}>
              <Ionicons name="time-outline" size={12} color="#FFF" />
              <Text style={styles.timeText}>+{timeOffset}h</Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.exitButton}
            onPress={handleExit}
            disabled={isLoading}
          >
            <Ionicons name="close-circle" size={16} color="#FFF" />
            <Text style={styles.exitText}>Exit</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Decorative border at bottom */}
      <View style={styles.stripedBorder}>
        {Array.from({ length: 20 }).map((_, i) => (
          <View key={i} style={[styles.stripe, { backgroundColor: i % 2 === 0 ? '#FF9800' : '#000' }]} />
        ))}
      </View>

      {/* Role Selection Modal */}
      <Modal
        visible={showRoleMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoleMenu(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowRoleMenu(false)}>
          <View style={styles.roleMenu}>
            <Text style={styles.menuTitle}>Switch Role</Text>
            <Text style={styles.menuSubtitle}>Preview app as different user types</Text>
            
            {ROLES.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.roleOption,
                  sandboxRole === role.id && styles.roleOptionActive
                ]}
                onPress={() => handleSwitchRole(role.id)}
                disabled={switching}
              >
                <View style={styles.roleOptionLeft}>
                  <Ionicons
                    name={role.icon as any}
                    size={20}
                    color={sandboxRole === role.id ? '#FF9800' : '#666'}
                  />
                  <Text style={[
                    styles.roleOptionText,
                    sandboxRole === role.id && styles.roleOptionTextActive
                  ]}>
                    {role.label}
                  </Text>
                </View>
                {sandboxRole === role.id && (
                  <Ionicons name="checkmark-circle" size={20} color="#FF9800" />
                )}
              </TouchableOpacity>
            ))}
            
            <View style={styles.menuFooter}>
              <Ionicons name="information-circle-outline" size={14} color="#666" />
              <Text style={styles.menuFooterText}>
                No real data will be affected
              </Text>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      web: {
        position: 'sticky' as any,
        top: 0,
        zIndex: 1000,
      },
    }),
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sandboxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  sandboxText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  roleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  roleText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeOffset: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 2,
  },
  timeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    gap: 4,
  },
  exitText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  stripedBorder: {
    height: 3,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  stripe: {
    flex: 1,
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleMenu: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    width: '85%',
    maxWidth: 320,
    ...Platform.select({
      web: {
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 20,
      },
    }),
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  roleOptionActive: {
    backgroundColor: '#FFF3E0',
  },
  roleOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleOptionText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  roleOptionTextActive: {
    color: '#FF9800',
    fontWeight: '600',
  },
  menuFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  menuFooterText: {
    fontSize: 12,
    color: '#666',
  },
});
