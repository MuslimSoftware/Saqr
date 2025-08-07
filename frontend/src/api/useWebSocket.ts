import { useState, useEffect, useRef, useCallback } from 'react';

export interface WebSocketOptions {
  onOpen?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
  onClose?: (event: CloseEvent) => void;
  reconnectLimit?: number;
  reconnectInterval?: number;
}

export interface WebSocketState {
  isConnected: boolean;
  lastMessage: MessageEvent | null;
  error: Event | null;
}

export const useWebSocket = (url: string | null, options: WebSocketOptions = {}) => {
  const { 
    onOpen, 
    onMessage, 
    onError, 
    onClose,
    reconnectLimit = 5,
    reconnectInterval = 3000 
  } = options;
  const ws = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnect = useRef(true);

  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    lastMessage: null,
    error: null,
  });

  const attemptReconnect = useCallback(() => {
    if (!shouldReconnect.current || !url || reconnectAttempts.current >= reconnectLimit) {
      console.log('[useWebSocket] Reconnection disabled or limit reached');
      return;
    }

    reconnectAttempts.current += 1;
    console.log(`[useWebSocket] Attempting reconnection ${reconnectAttempts.current}/${reconnectLimit} in ${reconnectInterval}ms...`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, reconnectInterval);
  }, [url, reconnectLimit, reconnectInterval]);

  const connect = useCallback(() => {
    if (!url) {
      console.log('[useWebSocket] connect() early return: no url');
      return;
    }
    if (ws.current && ws.current.readyState === WebSocket.CONNECTING) {
      console.log('[useWebSocket] connect() early return: already connecting');
      return;
    }
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      console.log('[useWebSocket] connect() early return: already connected');
      return;
    }

    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    ws.current = new WebSocket(url);
    setState(prev => ({ ...prev, isConnected: false, error: null }));

    ws.current.onopen = (event) => {
      console.log('[useWebSocket] Connection opened');
      reconnectAttempts.current = 0; // Reset on successful connection
      setState(prev => ({ ...prev, isConnected: true, error: null }));
      
      onOpen?.(event);
    };

    ws.current.onmessage = (event) => {
      setState(prev => ({ ...prev, lastMessage: event }));
      onMessage?.(event);
    };

    ws.current.onerror = (event) => {
      console.error('[useWebSocket] Error:', event);
      setState(prev => ({ ...prev, isConnected: false, error: event }));
      onError?.(event);
    };

    ws.current.onclose = (event) => {
      console.log('[useWebSocket] Connection closed, code:', event.code);
      setState(prev => ({ ...prev, isConnected: false, error: null }));
      ws.current = null;
      
      onClose?.(event);
      
      // Attempt reconnection if it wasn't a normal closure and reconnection is enabled
      if (shouldReconnect.current && event.code !== 1000 && event.code !== 1001) {
        attemptReconnect();
      }
    };

  }, [url, onOpen, onMessage, onError, onClose, attemptReconnect]);

  const disconnect = useCallback(() => {
    shouldReconnect.current = false; // Disable reconnection
    
    // Clear any pending reconnection
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (ws.current) {
      ws.current.onclose = null; // Prevent onClose handler during manual disconnect
      ws.current.onerror = null;
      ws.current.onmessage = null;
      ws.current.onopen = null;
      ws.current.close();
      ws.current = null;
      setState(prev => ({ 
          ...prev, 
          isConnected: false, 
          error: null,
          // lastMessage: null // debatable if we should clear last message on disconnect
      }));
    }
  }, []);

  useEffect(() => {
    shouldReconnect.current = true; // Enable reconnection for new URLs
    reconnectAttempts.current = 0; // Reset attempts for new connections
    
    if (url) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [url, connect, disconnect]);

  const sendMessage = useCallback((data: string | ArrayBuffer | Blob | ArrayBufferView): Promise<boolean> => {
    return new Promise((resolve) => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        // Send immediately if connected
        try {
          ws.current.send(data);
          resolve(true);
        } catch (error) {
          console.error('[useWebSocket] Error sending message:', error);
          resolve(false);
        }
      } else {
        // Try to connect first, then send message
        console.log('[useWebSocket] WebSocket not connected, attempting to connect...');
        
        if (!url) {
          console.log('[useWebSocket] No URL available for connection');
          resolve(false);
          return;
        }

        // Attempt to connect
        connect();

        // Wait for connection to establish (with timeout)
        const connectionTimeout = setTimeout(() => {
          console.log('[useWebSocket] Connection timeout, message failed');
          resolve(false);
        }, 5000); // 5 second timeout

        // Check connection status periodically
        const checkConnection = () => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            clearTimeout(connectionTimeout);
            try {
              ws.current.send(data);
              resolve(true);
            } catch (error) {
              console.error('[useWebSocket] Error sending message after reconnection:', error);
              resolve(false);
            }
          } else if (ws.current?.readyState === WebSocket.CONNECTING) {
            // Still connecting, check again in 100ms
            setTimeout(checkConnection, 100);
          } else {
            // Connection failed
            clearTimeout(connectionTimeout);
            console.log('[useWebSocket] Connection failed, message failed');
            resolve(false);
          }
        };

        // Start checking connection status
        setTimeout(checkConnection, 100);
      }
    });
  }, [url, connect]);

  return {
    isConnected: state.isConnected,
    lastMessage: state.lastMessage,
    error: state.error,
    sendMessage,
    connect,
    disconnect,
  };
}; 