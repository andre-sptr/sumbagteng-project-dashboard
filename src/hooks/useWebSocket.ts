'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export type WebSocketPayload = Record<string, unknown>;
export type WebSocketCallback<T = WebSocketPayload> = (data: T) => void;

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET !== 'true') {
      return;
    }

    // Port 3001 as defined in WebSocketServer.init
    const socketInstance = io('http://localhost:3001', {
      autoConnect: true,
      reconnection: true,
    });

    socketInstance.on('connect', () => {
      console.log('[WebSocket] Connected to server');
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('[WebSocket] Disconnected from server');
      setIsConnected(false);
    });

    socketRef.current = socketInstance;

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, []);

  const subscribe = useCallback(<T = WebSocketPayload>(event: string, callback: WebSocketCallback<T>) => {
    const socket = socketRef.current;
    if (socket) {
      socket.on(event, callback as WebSocketCallback);
    }
  }, []);

  const unsubscribe = useCallback(<T = WebSocketPayload>(event: string, callback?: WebSocketCallback<T>) => {
    const socket = socketRef.current;
    if (socket) {
      socket.off(event, callback as WebSocketCallback | undefined);
    }
  }, []);

  const emit = useCallback((event: string, data: WebSocketPayload) => {
    const socket = socketRef.current;
    if (socket) {
      socket.emit(event, data);
    }
  }, []);

  return { isConnected, subscribe, unsubscribe, emit };
}
