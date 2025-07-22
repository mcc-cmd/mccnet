import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupVite, serveStatic, log } from "./vite";
import router from "./routes";
import { storage } from "./storage";

const app = express();
const server = createServer(app);

// WebSocket Server 설정
const wss = new WebSocketServer({ server, path: '/ws' });

// 클라이언트 연결 관리
interface ClientConnection {
  ws: WebSocket;
  userId: number;
  userType: 'dealer' | 'worker';
  roomIds: Set<number>;
}

const clients = new Map<number, ClientConnection>();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// WebSocket 연결 처리
wss.on('connection', (ws: WebSocket, req) => {
  console.log('WebSocket client connected');

  ws.on('message', async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'auth':
          // 클라이언트 인증
          const { userId, userType } = message;
          console.log(`WebSocket auth: User ${userId} (${userType})`);
          
          // 기존 연결이 있다면 제거
          if (clients.has(userId)) {
            const existingClient = clients.get(userId);
            if (existingClient && existingClient.ws !== ws) {
              console.log(`Replacing existing connection for user ${userId}`);
            }
          }
          
          clients.set(userId, {
            ws,
            userId,
            userType,
            roomIds: new Set()
          });
          console.log(`Client ${userId} authenticated. Total clients: ${clients.size}`);
          ws.send(JSON.stringify({ type: 'auth_success', userId }));
          break;

        case 'join_room':
          // 채팅방 참여
          const { roomId } = message;
          console.log(`Join room request for room ${roomId}`);
          
          // 현재 WebSocket에 해당하는 클라이언트 찾기
          let foundClient = null;
          for (const [userId, client] of clients.entries()) {
            if (client.ws === ws) {
              foundClient = client;
              client.roomIds.add(roomId);
              console.log(`Client ${userId} joined room ${roomId}, now in rooms:`, Array.from(client.roomIds));
              ws.send(JSON.stringify({ type: 'joined_room', roomId, userId }));
              break;
            }
          }
          
          if (!foundClient) {
            console.log('Client not found for join_room - WebSocket connection issue');
            // 응답은 보내되 경고 메시지 포함
            ws.send(JSON.stringify({ type: 'joined_room', roomId, error: 'not_authenticated' }));
          }
          break;

        case 'send_message':
          // 메시지 전송
          console.log('Processing chat message:', message);
          await handleChatMessage(message);
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    // 클라이언트 연결 제거
    for (const [userId, client] of clients.entries()) {
      if (client.ws === ws) {
        console.log(`WebSocket client ${userId} disconnected, was in rooms:`, Array.from(client.roomIds));
        clients.delete(userId);
        break;
      }
    }
    console.log(`WebSocket client disconnected. Total clients: ${clients.size}`);
  });
});

// 채팅 메시지 처리 함수
async function handleChatMessage(message: any) {
  try {
    console.log('Handling chat message:', message);
    const { roomId, senderId, senderType, senderName, text } = message;
    
    // 메시지를 데이터베이스에 저장
    console.log('Saving message to database...');
    const chatMessage = await storage.createChatMessage({
      roomId,
      senderId,
      senderType,
      senderName,
      message: text,
      messageType: 'text'
    });
    console.log('Message saved:', chatMessage);

    // 해당 채팅방의 모든 클라이언트에게 메시지 브로드캐스트
    const broadcastMessage = {
      type: 'new_message',
      roomId,
      message: chatMessage
    };

    console.log('Broadcasting to clients:', clients.size);
    console.log('Room participants check for room:', roomId);
    let broadcastCount = 0;
    
    // 해당 채팅방에 참여한 클라이언트에게만 메시지 전송
    for (const client of clients.values()) {
      console.log(`Checking client ${client.userId} - in rooms:`, Array.from(client.roomIds), `WebSocket state: ${client.ws.readyState}`);
      if (client.roomIds.has(roomId) && client.ws.readyState === WebSocket.OPEN) {
        console.log(`✓ Sending message to client ${client.userId} for room ${roomId}`);
        client.ws.send(JSON.stringify(broadcastMessage));
        broadcastCount++;
      } else if (client.ws.readyState === WebSocket.OPEN) {
        console.log(`✗ Client ${client.userId} not in room ${roomId}, skipping`);
      } else {
        console.log(`✗ Client ${client.userId} WebSocket not ready (state: ${client.ws.readyState})`);
      }
    }
    console.log('Message broadcasted to', broadcastCount, 'clients');
  } catch (error) {
    console.error('Chat message handling error:', error);
  }
}

// API routes
app.use(router);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || '서버 오류가 발생했습니다.' });
});

const PORT = Number(process.env.PORT) || 5000;

if (app.get("env") === "development") {
  setupVite(app, server);
} else {
  serveStatic(app);
}

server.listen(PORT, "0.0.0.0", () => {
  log(`Server running on port ${PORT}`);
});
