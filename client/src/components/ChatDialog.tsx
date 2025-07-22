import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, User } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth, useApiRequest } from '@/lib/auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ChatRoom, ChatMessage } from '@shared/schema';

interface ChatDialogProps {
  documentId: number;
  dealerId: number;
  trigger?: React.ReactNode;
}

export function ChatDialog({ documentId, dealerId, trigger }: ChatDialogProps) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 채팅방 데이터 조회
  const { data: chatData, isLoading, error: chatError } = useQuery({
    queryKey: ['chat-room', documentId],
    queryFn: async () => {
      console.log('Fetching chat room for document:', documentId);
      try {
        const response = await apiRequest(`/api/chat/room/${documentId}`, { method: 'GET' });
        if (!response.ok) {
          console.log('Chat room not found, status:', response.status);
          return null;
        }
        const result = await response.json();
        console.log('Chat room fetch result:', result);
        return result;
      } catch (error) {
        console.log('Chat room fetch error:', error);
        return null;
      }
    },
    enabled: open,
    refetchOnWindowFocus: false,
    retry: false
  });

  // 채팅방 생성/업데이트
  const createRoomMutation = useMutation({
    mutationFn: async (data: { documentId: number; dealerId: number; workerId?: number }) => {
      console.log('Creating chat room with data:', data);
      const response = await apiRequest('/api/chat/room', { 
        method: 'POST', 
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      console.log('Chat room creation response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Chat room created successfully:', data);
      setChatRoom(data.room);
      setMessages(data.messages || []);
      queryClient.invalidateQueries({ queryKey: ['chat-room', documentId] });
    },
    onError: (error) => {
      console.error('Chat room creation failed:', error);
    }
  });

  // WebSocket 메시지 핸들링
  const { isConnected, sendMessage: sendWebSocketMessage } = useWebSocket({
    onMessage: (wsMessage) => {
      console.log('WebSocket message received:', wsMessage);
      if (wsMessage.type === 'new_message' && wsMessage.roomId === chatRoom?.id) {
        setMessages(prev => [...prev, wsMessage.message]);
        scrollToBottom();
      } else if (wsMessage.type === 'joined_room' && wsMessage.roomId === chatRoom?.id) {
        // 채팅방 참여 확인
        console.log('Joined chat room:', wsMessage.roomId);
      }
    }
  });

  // 메시지 전송
  const handleSendMessage = async () => {
    if (!message.trim() || !chatRoom || !user) {
      console.log('Message send blocked:', { 
        hasMessage: !!message.trim(), 
        hasChatRoom: !!chatRoom, 
        hasUser: !!user 
      });
      return;
    }

    const userType = user.userType === 'admin' ? 'worker' : 
                    user.role === 'dealer_worker' ? 'worker' : 'dealer';
    
    const messageData = {
      type: 'send_message',
      roomId: chatRoom.id,
      senderId: user.id,
      senderType: userType,
      senderName: user.name,
      text: message.trim()
    };

    console.log('Sending message:', messageData);
    console.log('WebSocket connected:', isConnected);
    
    const sent = sendWebSocketMessage(messageData);
    
    if (sent) {
      console.log('Message sent successfully');
      setMessage('');
    } else {
      console.error('Failed to send message - WebSocket not connected');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 채팅방 데이터 업데이트
  useEffect(() => {
    if (chatData) {
      console.log('Chat data received:', chatData);
      setChatRoom(chatData.room);
      setMessages(chatData.messages || []);
      
      // WebSocket 채팅방 참여
      if (chatData.room && isConnected) {
        console.log('Joining WebSocket room:', chatData.room.id);
        const joinResult = sendWebSocketMessage({
          type: 'join_room',
          roomId: chatData.room.id
        });
        console.log('Join room message sent:', joinResult);
      }
    }
  }, [chatData, isConnected]);

  // 메시지 변경 시 스크롤
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 채팅방이 없을 때 생성
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    
    if (newOpen && !chatRoom && !isLoading && !createRoomMutation.isPending) {
      console.log('Creating chat room for document:', documentId, 'dealer:', dealerId, 'user:', user);
      // 근무자인 경우 채팅방 생성/참여
      if (user && (user.userType === 'admin' || user.role === 'dealer_worker')) {
        createRoomMutation.mutate({
          documentId,
          dealerId,
          workerId: user.id
        });
      } else if (user) {
        // 판매점인 경우도 채팅방 생성
        createRoomMutation.mutate({
          documentId,
          dealerId
        });
      }
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(date));
  };

  const canStartChat = user && (user.userType === 'admin' || user.role === 'dealer_worker' || chatRoom);

  // 채팅방 생성 시도
  useEffect(() => {
    if (open && !chatRoom && !isLoading && !createRoomMutation.isPending && user && !chatData) {
      console.log('Auto-creating chat room for document:', documentId);
      const workerId = user.userType === 'admin' || user.role === 'dealer_worker' ? user.id : undefined;
      createRoomMutation.mutate({
        documentId,
        dealerId,
        workerId
      });
    }
  }, [open, chatRoom, isLoading, createRoomMutation.isPending, user, chatData]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="outline" 
            size="sm"
            disabled={!canStartChat}
            className="flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            채팅
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            실시간 채팅
            {isConnected && (
              <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                연결됨
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        {!canStartChat ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>채팅 기능은 근무자가 접수를 진행중 상태로 변경한 후에 이용할 수 있습니다.</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">채팅방을 불러오는 중...</p>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.senderId === user?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        msg.messageType === 'system'
                          ? 'bg-gray-100 text-gray-600 text-center text-sm mx-auto'
                          : msg.senderId === user?.id
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {msg.messageType !== 'system' && msg.senderId !== user?.id && (
                        <div className="flex items-center gap-1 mb-1">
                          <User className="w-3 h-3" />
                          <span className="text-xs font-medium">{msg.senderName}</span>
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      <div className="text-xs opacity-70 mt-1">
                        {formatTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            <div className="flex items-center gap-2 pt-4 border-t">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={chatRoom ? "메시지를 입력하세요..." : "채팅방을 불러오는 중..."}
                className="flex-1"
                disabled={!isConnected || !chatRoom || createRoomMutation.isPending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || !isConnected || !chatRoom || createRoomMutation.isPending}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            {/* 디버그 정보 표시 */}
            <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
              Debug: Connected: {isConnected ? 'Yes' : 'No'} | 
              ChatRoom: {chatRoom ? `ID ${chatRoom.id}` : 'None'} | 
              Creating: {createRoomMutation.isPending ? 'Yes' : 'No'} |
              Messages: {messages.length}
            </div>
            
            {!isConnected && (
              <div className="text-xs text-red-500 text-center pt-2">
                연결이 끊어졌습니다. 재연결을 시도하고 있습니다...
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}