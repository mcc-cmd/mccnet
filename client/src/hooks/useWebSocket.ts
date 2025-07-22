import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/auth';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onMessage, reconnectAttempts = 5, reconnectInterval = 3000 } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const { user } = useAuth();

  const connect = () => {
    if (!user) return;
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      reconnectCount.current = 0;
      
      // 인증 메시지 전송
      const userType = user.userType === 'admin' ? 'worker' : 
                      user.userRole === 'dealer_worker' ? 'worker' : 'dealer';
      
      console.log('Sending auth message:', { userId: user.id, userType });
      ws.current?.send(JSON.stringify({
        type: 'auth',
        userId: user.id,
        userType
      }));
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Raw WebSocket message received:', message);
        setLastMessage(message);
        
        // 인증 성공 후 채팅방 참여 시도
        if (message.type === 'auth_success') {
          console.log('Authentication successful, ready to join rooms');
        }
        
        onMessage?.(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      
      // 자동 재연결
      if (reconnectCount.current < reconnectAttempts) {
        reconnectCount.current++;
        console.log(`Attempting to reconnect... (${reconnectCount.current}/${reconnectAttempts})`);
        setTimeout(connect, reconnectInterval);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  };

  const disconnect = () => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  };

  const sendMessage = (message: any) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (user) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect
  };
}