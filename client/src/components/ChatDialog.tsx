import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, User } from 'lucide-react';
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
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const apiRequest = useApiRequest();
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 채팅방 데이터 조회 (폴링 방식)
  const { data: chatData, isLoading, error: chatError } = useQuery({
    queryKey: ['chat-room', documentId],
    queryFn: async () => {
      console.log('Fetching chat room for document:', documentId);
      try {
        setConnectionStatus('connecting');
        const result = await apiRequest(`/api/chat/room/${documentId}`, { method: 'GET' });
        console.log('Chat room fetch result:', result);
        setConnectionStatus('connected');
        return result;
      } catch (error) {
        console.log('Chat room fetch error:', error);
        setConnectionStatus('disconnected');
        return null;
      }
    },
    enabled: open,
    refetchInterval: 2000, // 2초마다 폴링
    refetchOnWindowFocus: false,
    retry: false
  });

  // 채팅방 생성/업데이트
  const createRoomMutation = useMutation({
    mutationFn: async (data: { documentId: number; dealerId: number; workerId?: number }) => {
      console.log('Creating chat room with data:', data);
      setConnectionStatus('connecting');
      const result = await apiRequest('/api/chat/room', { 
        method: 'POST', 
        body: JSON.stringify(data)
      });
      console.log('Chat room creation response:', result);
      setConnectionStatus('connected');
      return result;
    },
    onSuccess: (data) => {
      console.log('Chat room created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['chat-room', documentId] });
    },
    onError: (error) => {
      console.error('Chat room creation failed:', error);
      setConnectionStatus('disconnected');
    }
  });

  // 메시지 전송
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: { roomId: number; message: string }) => {
      console.log('Sending message:', messageData);
      const result = await apiRequest('/api/chat/message', {
        method: 'POST',
        body: JSON.stringify(messageData)
      });
      console.log('Message sent result:', result);
      return result;
    },
    onSuccess: () => {
      setMessage('');
      // 즉시 메시지 목록 갱신
      queryClient.invalidateQueries({ queryKey: ['chat-room', documentId] });
    },
    onError: (error) => {
      console.error('Message send failed:', error);
    }
  });

  const handleSendMessage = () => {
    if (!message.trim() || !chatData?.room) return;
    
    sendMessageMutation.mutate({
      roomId: chatData.room.id,
      message: message.trim()
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(date));
  };

  const canStartChat = user && (user.userType === 'admin' || user.role === 'dealer_worker' || chatData?.room);
  const messages = chatData?.messages || [];

  // 채팅방 자동 생성
  useEffect(() => {
    if (open && !chatData?.room && !isLoading && !createRoomMutation.isPending && user && chatData === null) {
      console.log('Auto-creating chat room for document:', documentId);
      const workerId = user.userType === 'admin' || user.role === 'dealer_worker' ? user.id : undefined;
      createRoomMutation.mutate({
        documentId,
        dealerId,
        workerId
      });
    }
  }, [open, chatData, isLoading, createRoomMutation.isPending, user]);

  // 메시지 스크롤
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

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
                 connectionStatus === 'connecting' ? '연결 중' : '연결 끊김'}
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
                      className={`max-w-[70%] rounded-lg px-3 py-2 ${
                        msg.senderId === user?.id
                          ? 'bg-teal-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {msg.senderId !== user?.id && (
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
                placeholder={chatData?.room ? "메시지를 입력하세요..." : "채팅방을 불러오는 중..."}
                className="flex-1"
                disabled={!chatData?.room || createRoomMutation.isPending || sendMessageMutation.isPending}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || !chatData?.room || createRoomMutation.isPending || sendMessageMutation.isPending}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
            
            {/* 디버그 정보 표시 */}
            <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded">
              Debug: 연결: {connectionStatus} | 
              채팅방: {chatData?.room ? `ID ${chatData.room.id}` : 'None'} | 
              생성중: {createRoomMutation.isPending ? 'Yes' : 'No'} |
              메시지: {messages.length}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}