import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { storage } from './storage';

interface WSConnection {
  ws: WebSocket;
  userId: number;
  userType: 'dealer' | 'worker' | 'admin';
  userName: string;
  documentId?: number;
}

class ChatWebSocketServer {
  private wss: WebSocketServer;
  private connections = new Map<WebSocket, WSConnection>();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws'
    });

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  private handleConnection(ws: WebSocket, request: any) {
    console.log('WebSocket connection established');

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleMessage(ws, message);
      } catch (error) {
        console.error('WebSocket message parse error:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      this.connections.delete(ws);
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private async handleMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case 'auth':
        await this.handleAuth(ws, message);
        break;
      case 'join_document':
        await this.handleJoinDocument(ws, message);
        break;
      case 'send_message':
        await this.handleSendMessage(ws, message);
        break;
      case 'get_messages':
        await this.handleGetMessages(ws, message);
        break;
      default:
        this.sendError(ws, 'Unknown message type');
    }
  }

  private async handleAuth(ws: WebSocket, message: any) {
    try {
      const { userId, userType, userName } = message;
      
      if (!userId || !userType || !userName) {
        this.sendError(ws, 'Missing authentication data');
        return;
      }

      this.connections.set(ws, {
        ws,
        userId,
        userType,
        userName,
      });

      this.send(ws, {
        type: 'auth_success',
        data: { authenticated: true }
      });

    } catch (error) {
      console.error('Auth error:', error);
      this.sendError(ws, 'Authentication failed');
    }
  }

  private async handleJoinDocument(ws: WebSocket, message: any) {
    try {
      const connection = this.connections.get(ws);
      if (!connection) {
        this.sendError(ws, 'Not authenticated');
        return;
      }

      const { documentId } = message;
      if (!documentId) {
        this.sendError(ws, 'Missing document ID');
        return;
      }

      // 문서 존재 확인
      const document = await storage.getDocument(documentId);
      if (!document) {
        this.sendError(ws, 'Document not found');
        return;
      }

      // 권한 확인 (판매점은 자신의 문서만, 관리자/직원은 모든 문서)
      if (connection.userType === 'dealer' && document.dealerId !== connection.userId) {
        this.sendError(ws, 'Access denied');
        return;
      }

      // 채팅방 생성 또는 가져오기
      let chatRoom = await storage.getChatRoomByDocumentId(documentId);
      if (!chatRoom) {
        chatRoom = await storage.createChatRoom({
          documentId,
          dealerId: document.dealerId || null,
          isActive: true,
        });
      }

      // 연결에 문서 ID 저장
      connection.documentId = documentId;

      this.send(ws, {
        type: 'document_joined',
        data: { 
          documentId, 
          chatRoomId: chatRoom.id,
          documentNumber: document.documentNumber,
          customerName: document.customerName 
        }
      });

    } catch (error) {
      console.error('Join document error:', error);
      this.sendError(ws, 'Failed to join document');
    }
  }

  private async handleSendMessage(ws: WebSocket, message: any) {
    try {
      const connection = this.connections.get(ws);
      if (!connection || !connection.documentId) {
        this.sendError(ws, 'Not authenticated or not joined to document');
        return;
      }

      const { message: text, messageType = 'text' } = message;
      if (!text || text.trim().length === 0) {
        this.sendError(ws, 'Message cannot be empty');
        return;
      }

      // 채팅방 가져오기
      const chatRoom = await storage.getChatRoomByDocumentId(connection.documentId);
      if (!chatRoom) {
        this.sendError(ws, 'Chat room not found');
        return;
      }

      // 메시지 저장
      const savedMessage = await storage.createChatMessage({
        chatRoomId: chatRoom.id,
        senderId: connection.userId,
        senderType: connection.userType,
        senderName: connection.userName,
        message: text.trim(),
        messageType,
        isRead: false,
      });

      // 같은 문서에 연결된 모든 클라이언트에게 메시지 브로드캐스트
      this.broadcastToDocument(connection.documentId, {
        type: 'new_message',
        data: {
          id: savedMessage.id,
          chatRoomId: savedMessage.chatRoomId,
          senderId: savedMessage.senderId,
          senderType: savedMessage.senderType,
          senderName: savedMessage.senderName,
          message: savedMessage.message,
          messageType: savedMessage.messageType,
          createdAt: savedMessage.createdAt,
        }
      });

    } catch (error) {
      console.error('Send message error:', error);
      this.sendError(ws, 'Failed to send message');
    }
  }

  private async handleGetMessages(ws: WebSocket, message: any) {
    try {
      const connection = this.connections.get(ws);
      if (!connection || !connection.documentId) {
        this.sendError(ws, 'Not authenticated or not joined to document');
        return;
      }

      const chatRoom = await storage.getChatRoomByDocumentId(connection.documentId);
      if (!chatRoom) {
        this.send(ws, {
          type: 'messages_history',
          data: { messages: [] }
        });
        return;
      }

      const messages = await storage.getChatMessages(chatRoom.id);

      this.send(ws, {
        type: 'messages_history',
        data: { messages }
      });

    } catch (error) {
      console.error('Get messages error:', error);
      this.sendError(ws, 'Failed to get messages');
    }
  }

  private broadcastToDocument(documentId: number, message: any) {
    for (const [ws, connection] of this.connections) {
      if (connection.documentId === documentId && ws.readyState === WebSocket.OPEN) {
        this.send(ws, message);
      }
    }
  }

  private send(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private sendError(ws: WebSocket, error: string) {
    this.send(ws, {
      type: 'error',
      data: { error }
    });
  }

  // 상태 변경 알림 (서버의 다른 부분에서 호출)
  public notifyStatusChange(documentId: number, status: string, updatedBy: string) {
    this.broadcastToDocument(documentId, {
      type: 'status_changed',
      data: {
        documentId,
        status,
        updatedBy,
        timestamp: new Date().toISOString()
      }
    });
  }
}

export { ChatWebSocketServer };