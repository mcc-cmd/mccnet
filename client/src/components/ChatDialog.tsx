import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, User } from 'lucide-react';
// WebSocket 제거 - 폴링 방식 사용
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
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
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
        const result = await apiRequest(`/api/chat/room/${documentId}`, { method: 'GET' });
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
      const result = await apiRequest('/api/chat/room', { 
        method: 'POST', 
        body: JSON.stringify(data)
      });
      console.log('Chat room creation response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Chat room created successfully:', data);
      if (data && data.room) {
        setChatRoom(data.room);
        setMessages(data.messages || []);
        queryClient.invalidateQueries({ queryKey: ['chat-room', documentId] });
      } else {
        console.error('Invalid chat room data:', data);
      }
    },
    onError: (error) => {
      console.error('Chat room creation failed:', error);
    }
  });

  // 폴링 기반 메시지 업데이트 (WebSocket 대신 사용)
  useEffect(() => {
    if (!open || !chatRoom) return;

    const pollInterval = setInterval(async () => {
      try {
        const result = await apiRequest(`/api/chat/room/${documentId}`, { method: 'GET' });
        if (result && result.messages) {
          setMessages(prev => {
            const newMessages = result.messages;
            // 새 메시지가 있는지 확인
            if (newMessages.length > prev.length) {
              setTimeout(scrollToBottom, 100);
            }
            return newMessages;
          });
          setConnectionStatus('connected');
        }
      } catch (error) {
        console.error('Failed to poll messages:', error);
        setConnectionStatus('disconnected');
      }
    }, 2000); // 2초마다 업데이트

    setConnectionStatus('connected');
    return () => clearInterval(pollInterval);
  }, [open, chatRoom, documentId]);

  // 메시지 전송 (API 기반)
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
                    user.userRole === 'dealer_worker' ? 'worker' : 'dealer';
    
    const messageData = {
      roomId: chatRoom.id,
      senderId: user.id,
      senderType: userType,
      senderName: user.name,
      message: message.trim(),
      messageType: 'text'
    };

    try {
      console.log('Sending message via API:', messageData);
      const result = await apiRequest('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify(messageData)
      });
      
      if (result) {
        console.log('Message sent successfully');
        setMessage('');
        
        // 즉시 메시지 목록 업데이트
        const updatedChat = await apiRequest(`/api/chat/room/${documentId}`, { method: 'GET' });
        if (updatedChat && updatedChat.messages) {
          setMessages(updatedChat.messages);
          setTimeout(scrollToBottom, 100);
        }
        setConnectionStatus('connected');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setConnectionStatus('disconnected');
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
    if (chatData && chatData.room) {
      console.log('Chat data received:', chatData);
      setChatRoom(chatData.room);
      setMessages(chatData.messages || []);
    }
  }, [chatData]);

  // 연결 상태 초기화
  useEffect(() => {
    if (open && chatRoom) {
      setConnectionStatus('connected');
    }
  }, [open, chatRoom]);

  // 별도 useEffect로 채팅방 생성 처리 - 단순화
  useEffect(() => {
    if (open && chatData && !chatData.room && user && !createRoomMutation.isPending) {
      console.log('Auto-creating chat room for document:', documentId);
      console.log('Current user:', user);
      const workerId = user.userType === 'admin' || user.userRole === 'dealer_worker' ? user.id : undefined;
      createRoomMutation.mutate({
        documentId,
        dealerId,
        workerId
      });
    }
  }, [open, chatData, user, createRoomMutation.isPending]);

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
    if (open && !chatRoom && !isLoading && !createRoomMutation.isPending && user && chatData === null) {
      console.log('Auto-creating chat room for document:', documentId);
      console.log('Current user:', user);
      console.log('Current sessionId:', useAuth.getState().sessionId);
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
            <div className="flex items-center gap-2 ml-auto">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 
                connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className={`text-xs px-2 py-1 rounded-full ${
                connectionStatus === 'connected' ? 'text-green-600 bg-green-100' : 
                connectionStatus === 'connecting' ? 'text-yellow-600 bg-yellow-100' : 'text-red-600 bg-red-100'
              }`}>
                {connectionStatus === 'connected' ? '연결됨' : 
                 connectionStatus === 'connecting' ? '연결 중' : '연결이 끊어졌습니다. 재연결을 시도하고 있습니다.'}
              </span>
            </div>
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
                disabled={!chatRoom || createRoomMutation.isPending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || !chatRoom || createRoomMutation.isPending}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            {/* 디버그 정보 표시 */}
            <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
              Debug: 연결: {connectionStatus} | 
              채팅방: {chatRoom ? `ID ${chatRoom.id}` : 'None'} | 
              생성중: {createRoomMutation.isPending ? 'Yes' : 'No'} |
              메시지: {messages.length}
            </div>
            
            {connectionStatus === 'disconnected' && (
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