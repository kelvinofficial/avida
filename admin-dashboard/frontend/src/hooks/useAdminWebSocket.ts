'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface AdminEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface UseAdminWebSocketOptions {
  onEvent?: (event: AdminEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useAdminWebSocket(options: UseAdminWebSocketOptions = {}) {
  const { onEvent, onConnect, onDisconnect, onError } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<AdminEvent | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    // Get token from localStorage
    const token = localStorage.getItem('admin_token');
    if (!token) {
      console.log('No token available for WebSocket connection');
      return;
    }

    // Determine WebSocket URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
    const wsHost = apiUrl.replace(/^https?:\/\//, '').replace(/\/api\/admin$/, '');
    const wsUrl = `${wsProtocol}://${wsHost}/ws/admin/${token}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Admin WebSocket connected');
        setConnected(true);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as AdminEvent;
          setLastEvent(data);
          onEvent?.(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        console.log('Admin WebSocket disconnected');
        setConnected(false);
        onDisconnect?.();
        
        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('Admin WebSocket error:', error);
        onError?.(error);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
    }
  }, [onConnect, onDisconnect, onError, onEvent]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const sendMessage = useCallback((message: Record<string, unknown>) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  // Send ping to keep connection alive
  useEffect(() => {
    if (!connected) return;

    const pingInterval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [connected, sendMessage]);

  // Connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    connected,
    lastEvent,
    sendMessage,
    reconnect: connect,
    disconnect,
  };
}

// Event types for type safety
export const AdminEventTypes = {
  NEW_USER: 'new_user',
  NEW_LISTING: 'new_listing',
  NEW_REPORT: 'new_report',
  NEW_TICKET: 'new_ticket',
  LISTING_APPROVED: 'listing_approved',
  LISTING_REJECTED: 'listing_rejected',
  USER_BANNED: 'user_banned',
  NOTIFICATION_SENT: 'notification_sent',
} as const;

export type AdminEventType = typeof AdminEventTypes[keyof typeof AdminEventTypes];
