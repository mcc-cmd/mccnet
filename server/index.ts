import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { setupVite, serveStatic, log } from "./vite";
import router from "./routes";
import { storage } from "./storage";
import { ChatWebSocketServer } from "./websocket";

const app = express();
const server = createServer(app);

// WebSocket 채팅 서버 초기화
const chatWS = new ChatWebSocketServer(server);

// Body parser middleware - 파일 업로드 라우트 완전 제외
app.use('/api', (req, res, next) => {
  // 파일 업로드 라우트는 multer에서만 처리
  if (req.path === '/documents' && req.method === 'POST') {
    return next();
  }
  
  // 다른 API 라우트는 기본 body parser 사용
  express.json({ limit: '50mb' })(req, res, (err) => {
    if (err) return next();
    express.urlencoded({ extended: true, limit: '50mb' })(req, res, next);
  });
});

// 비-API 라우트용 body parser
app.use((req, res, next) => {
  if (!req.path.startsWith('/api/')) {
    express.json({ limit: '50mb' })(req, res, (err) => {
      if (err) return next();
      express.urlencoded({ extended: true, limit: '50mb' })(req, res, next);
    });
  } else {
    next();
  }
});

// WebSocket 채팅 서버는 이미 초기화됨

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
