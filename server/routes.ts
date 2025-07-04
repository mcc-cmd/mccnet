import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import {
  loginSchema,
  createDealerSchema,
  createUserSchema,
  uploadDocumentSchema,
  updateDocumentStatusSchema,
  type AuthResponse
} from "../shared/schema";

const router = Router();

// Configure multer for file uploads
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dealerId = req.body.dealerId || (req as any).session?.dealerId;
    const uploadPath = path.join(process.cwd(), 'uploads', 'docs', String(dealerId));
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    cb(null, `${timestamp}-${basename}${ext}`);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('허용되지 않는 파일 형식입니다.'));
    }
  }
});

// Configure multer for pricing table uploads
const pricingUpload = multer({
  dest: path.join(process.cwd(), 'uploads', 'pricing'),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /xlsx|xls|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('허용되지 않는 파일 형식입니다. (xlsx, xls, pdf만 가능)'));
    }
  }
});

// Middleware to check authentication
const requireAuth = async (req: any, res: any, next: any) => {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');
  if (!sessionId) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  const session = await storage.getSession(sessionId);
  if (!session) {
    return res.status(401).json({ error: '유효하지 않은 세션입니다.' });
  }

  req.session = session;
  next();
};

// Middleware to check admin authentication
const requireAdmin = async (req: any, res: any, next: any) => {
  await requireAuth(req, res, () => {
    if (req.session?.userType !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    next();
  });
};

// Authentication routes
router.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    // Try admin login first
    const admin = await storage.authenticateAdmin(email, password);
    if (admin) {
      const sessionId = await storage.createSession(admin.id, 'admin');
      const response: AuthResponse = {
        success: true,
        user: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          userType: 'admin'
        },
        sessionId
      };
      return res.json(response);
    }

    // Try user login
    const userResult = await storage.authenticateUser(email, password);
    if (userResult) {
      const { user, dealer } = userResult;
      const sessionId = await storage.createSession(user.id, 'user', user.dealerId);
      const response: AuthResponse = {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          userType: 'user',
          dealerId: user.dealerId,
          dealerName: dealer.name
        },
        sessionId
      };
      return res.json(response);
    }

    res.status(401).json({ success: false, error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/api/auth/logout', requireAuth, async (req: any, res) => {
  try {
    await storage.deleteSession(req.session.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/auth/me', requireAuth, async (req: any, res) => {
  try {
    const session = req.session;
    if (session.userType === 'admin') {
      const admin = await storage.getAdminById(session.userId);
      if (admin) {
        res.json({
          success: true,
          user: {
            id: admin.id,
            name: admin.name,
            email: admin.email,
            userType: 'admin'
          }
        });
      } else {
        res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      }
    } else {
      const user = await storage.getUserById(session.userId);
      if (user) {
        res.json({
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            userType: 'user',
            dealerId: user.dealerId,
            dealerName: user.dealerName
          }
        });
      } else {
        res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      }
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin routes
router.post('/api/admin/dealers', requireAdmin, async (req, res) => {
  try {
    const data = createDealerSchema.parse(req.body);
    const dealer = await storage.createDealer(data);
    res.json(dealer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/api/admin/dealers', requireAdmin, async (req, res) => {
  try {
    const dealers = await storage.getDealers();
    res.json(dealers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const data = createUserSchema.parse(req.body);
    const user = await storage.createUser(data);
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await storage.getUsers();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/pricing-tables', requireAdmin, pricingUpload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일을 선택해주세요.' });
    }

    const { title } = req.body;
    const pricingTable = await storage.uploadPricingTable({
      title: title || req.file.originalname,
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedBy: req.session.userId
    });

    res.json(pricingTable);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/api/admin/documents', requireAdmin, async (req, res) => {
  try {
    const { status, search, startDate, endDate } = req.query;
    const documents = await storage.getDocuments(undefined, {
      status: status as string,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string
    });
    res.json(documents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/api/admin/documents/:id/status', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateDocumentStatusSchema.parse(req.body);
    const document = await storage.updateDocumentStatus(id, data);
    res.json(document);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// User routes
router.get('/api/dashboard/stats', requireAuth, async (req: any, res) => {
  try {
    const dealerId = req.session.userType === 'admin' ? undefined : req.session.dealerId;
    const stats = await storage.getDashboardStats(dealerId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/documents', requireAuth, async (req: any, res) => {
  try {
    const { status, search, startDate, endDate } = req.query;
    const dealerId = req.session.userType === 'admin' ? undefined : req.session.dealerId;
    
    const documents = await storage.getDocuments(dealerId, {
      status: status as string,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string
    });
    res.json(documents);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/documents', requireAuth, upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일을 선택해주세요.' });
    }

    if (req.session.userType !== 'user') {
      return res.status(403).json({ error: '사용자만 문서를 업로드할 수 있습니다.' });
    }

    const data = uploadDocumentSchema.parse(req.body);
    const document = await storage.uploadDocument({
      ...data,
      dealerId: req.session.dealerId,
      userId: req.session.userId,
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

    res.json(document);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/api/documents/:id', requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteDocument(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/pricing-tables', requireAuth, async (req, res) => {
  try {
    const tables = await storage.getPricingTables();
    res.json(tables);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/pricing-tables/active', requireAuth, async (req, res) => {
  try {
    const table = await storage.getActivePricingTable();
    res.json(table);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// File download routes
router.get('/api/files/documents/:id', requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const dealerId = req.session.userType === 'admin' ? undefined : req.session.dealerId;
    const documents = await storage.getDocuments(dealerId);
    const document = documents.find(d => d.id === id);
    
    if (!document) {
      return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    }

    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ error: '파일이 서버에 존재하지 않습니다.' });
    }

    res.download(document.filePath, document.fileName);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/files/pricing/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const tables = await storage.getPricingTables();
    const table = tables.find(t => t.id === id);
    
    if (!table) {
      return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    }

    if (!fs.existsSync(table.filePath)) {
      return res.status(404).json({ error: '파일이 서버에 존재하지 않습니다.' });
    }

    res.download(table.filePath, table.fileName);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
