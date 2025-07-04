import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { setupVite, serveStatic, log } from "./vite";
import router from "./routes";

const app = express();
const server = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
