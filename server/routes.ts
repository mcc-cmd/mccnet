import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import {
  loginSchema,
  createDealerSchema,
  createUserSchema,
  createAdminSchema,
  createWorkerSchema,
  createDealerAccountSchema,
  uploadDocumentSchema,
  updateDocumentStatusSchema,
  updateActivationStatusSchema,
  createServicePlanSchema,
  createAdditionalServiceSchema,
  createDocumentServicePlanSchema,
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
    const allowedTypes = /xlsx|xls|pdf|jpg|jpeg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|application\/pdf|image\/jpeg|image\/jpg/.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('허용되지 않는 파일 형식입니다. (xlsx, xls, pdf, jpg, jpeg만 가능)'));
    }
  }
});

// Configure multer for document template uploads
const templateUpload = multer({
  dest: path.join(process.cwd(), 'uploads', 'templates'),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|xlsx|xls|jpg|jpeg|png|gif|bmp|tiff|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|image\/jpeg|image\/jpg|image\/png|image\/gif|image\/bmp|image\/tiff|image\/webp/.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('허용되지 않는 파일 형식입니다. (pdf, doc, docx, xlsx, xls, jpg, jpeg, png, gif, bmp, tiff, webp 가능)'));
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

const requireWorker = async (req: any, res: any, next: any) => {
  await requireAuth(req, res, () => {
    if (req.session?.userType !== 'user') {
      return res.status(403).json({ error: '근무자 권한이 필요합니다.' });
    }
    next();
  });
};

const requireDealerOrWorker = async (req: any, res: any, next: any) => {
  await requireAuth(req, res, () => {
    if (req.session?.userType !== 'user') {
      return res.status(403).json({ error: '권한이 필요합니다.' });
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
      const sessionId = await storage.createSession(user.id, 'user', user.dealerId, user.role);
      const response: AuthResponse = {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          userType: 'user',
          dealerId: user.dealerId,
          dealerName: dealer.name,
          role: user.role
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

// Admin account creation endpoint
router.post('/api/admin/create-admin', requireAdmin, async (req, res) => {
  try {
    const data = createAdminSchema.parse(req.body);
    const admin = await storage.createAdmin(data);
    res.json(admin);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Worker account creation endpoint
router.post('/api/admin/create-worker', requireAdmin, async (req, res) => {
  try {
    const data = createWorkerSchema.parse(req.body);
    const worker = await storage.createWorker(data);
    res.json(worker);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// New account creation routes
router.post('/api/auth/register/dealer', async (req, res) => {
  try {
    const data = createDealerAccountSchema.parse(req.body);
    const result = await storage.createDealerAccount(data);
    res.json({ success: true, message: '판매점 계정이 성공적으로 생성되었습니다.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/api/admin/create-admin', requireAdmin, async (req, res) => {
  try {
    const data = createAdminSchema.parse(req.body);
    const admin = await storage.createAdmin(data);
    res.json({ success: true, message: '관리자 계정이 성공적으로 생성되었습니다.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/api/admin/create-worker', requireAdmin, async (req, res) => {
  try {
    const data = createWorkerSchema.parse(req.body);
    const worker = await storage.createWorker(data);
    res.json({ success: true, message: '근무자 계정이 성공적으로 생성되었습니다.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// KP number validation route
router.get('/api/kp-info/:kpNumber', async (req, res) => {
  try {
    const kpNumber = req.params.kpNumber;
    const kpInfo = await storage.getKPDealerInfo(kpNumber);
    if (kpInfo) {
      res.json(kpInfo);
    } else {
      res.status(404).json({ error: '유효하지 않은 KP번호입니다.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/admin/kp-info', requireAdmin, async (req, res) => {
  try {
    const kpInfos = await storage.getAllKPDealerInfo();
    res.json(kpInfos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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

// Worker statistics endpoint (admin only)
router.get('/api/worker-stats', requireAdmin, async (req: any, res) => {
  try {
    const stats = await storage.getWorkerStats();
    res.json(stats);
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

// Pricing table routes
router.get('/api/pricing-tables', requireAuth, async (req, res) => {
  try {
    const pricingTables = await storage.getPricingTables();
    res.json(pricingTables);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/pricing-tables/active', requireAuth, async (req, res) => {
  try {
    const activePricingTable = await storage.getActivePricingTable();
    res.json(activePricingTable);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Document upload route
router.post('/api/documents', requireAuth, upload.single('file'), async (req: any, res) => {
  try {
    if (req.session.userType !== 'user') {
      return res.status(403).json({ error: '사용자만 문서를 업로드할 수 있습니다.' });
    }

    const data = uploadDocumentSchema.parse(req.body);
    const document = await storage.uploadDocument({
      ...data,
      dealerId: req.session.dealerId,
      userId: req.session.userId,
      filePath: req.file?.path || null,
      fileName: req.file?.originalname || null,
      fileSize: req.file?.size || null
    });

    res.json(document);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Document template upload route
router.post('/api/admin/document-templates', requireAdmin, templateUpload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일을 선택해주세요.' });
    }

    const { title, category } = req.body;
    if (!category || !['가입서류', '변경서류'].includes(category)) {
      return res.status(400).json({ error: '올바른 카테고리를 선택해주세요.' });
    }

    const template = await storage.uploadDocumentTemplate({
      title: title || req.file.originalname,
      category,
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      uploadedBy: req.session.userId
    });

    res.json(template);
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



router.delete('/api/documents/:id', requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteDocument(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Activation status update endpoint
router.patch('/api/documents/:id/activation', requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateActivationStatusSchema.parse(req.body);
    
    // 개통완료 시 근무자 ID 추가 (관리자 제외)
    if (data.activationStatus === '개통' && req.session.userType === 'user') {
      data.activatedBy = req.session.userId;
    }
    
    const document = await storage.updateDocumentActivationStatus(id, data);
    res.json(document);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// User routes
router.get('/api/dashboard/stats', requireAuth, async (req: any, res) => {
  try {
    // 관리자와 근무자는 모든 데이터를 보고, 판매점은 자신의 대리점 데이터만 봄
    const isWorker = req.session.userRole === 'dealer_worker';
    const isAdmin = req.session.userType === 'admin';
    const dealerId = (isAdmin || isWorker) ? undefined : req.session.dealerId;
    
    const stats = await storage.getDashboardStats(dealerId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/documents', requireAuth, async (req: any, res) => {
  try {
    const { status, search, startDate, endDate } = req.query;
    // 관리자와 근무자는 모든 문서를, 판매점은 해당 대리점 문서만 조회
    const isWorker = req.session.userRole === 'dealer_worker';
    const isAdmin = req.session.userType === 'admin';
    
    // 관리자와 근무자는 모든 문서를 볼 수 있도록 dealerId를 undefined로 설정
    let dealerId = req.session.dealerId; // 기본값: 자신의 dealerId
    if (isAdmin || isWorker) {
      dealerId = undefined; // 모든 문서를 볼 수 있도록 설정
    }
    
    const documents = await storage.getDocuments(dealerId, {
      status: status as string,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string
    });
    
    res.json(documents);
  } catch (error: any) {
    console.error('Documents API error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/documents', requireDealerOrWorker, upload.single('file'), async (req: any, res) => {
  try {
    const data = uploadDocumentSchema.parse(req.body);
    const document = await storage.uploadDocument({
      ...data,
      dealerId: req.session.dealerId,
      userId: req.session.userId,
      filePath: req.file?.path || null,
      fileName: req.file?.originalname || null,
      fileSize: req.file?.size || null
    });

    res.json(document);
  } catch (error: any) {
    console.error('Document upload error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.delete('/api/documents/:id', requireAdmin, async (req: any, res) => {
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

// Document templates routes
router.get('/api/document-templates', requireAuth, async (req, res) => {
  try {
    const templates = await storage.getDocumentTemplates();
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/document-templates/:id/download', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const template = await storage.getDocumentTemplateById(id);
    
    if (!template) {
      return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    }

    if (!fs.existsSync(template.filePath)) {
      return res.status(404).json({ error: '파일이 존재하지 않습니다.' });
    }

    res.download(template.filePath, template.fileName);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Worker stats route
router.get('/api/worker-stats', requireAuth, async (req: any, res) => {
  try {
    const dealerId = req.session.userType === 'admin' ? undefined : req.session.dealerId;
    const stats = await storage.getWorkerStats(dealerId);
    res.json(stats);
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

// KP number lookup endpoint
router.get('/api/kp-info/:kpNumber', async (req, res) => {
  try {
    const kpNumber = req.params.kpNumber;
    const kpInfo = await storage.getKPInfo(kpNumber);
    if (kpInfo) {
      res.json(kpInfo);
    } else {
      res.status(404).json({ error: 'KP번호를 찾을 수 없습니다.' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Dealer account registration endpoint
router.post('/api/auth/register/dealer', async (req, res) => {
  try {
    const data = createDealerAccountSchema.parse(req.body);
    
    // Validate KP number
    const kpInfo = await storage.getKPInfo(data.kpNumber);
    if (!kpInfo) {
      return res.status(400).json({ error: '유효하지 않은 KP번호입니다.' });
    }
    
    // Create dealer account
    const dealer = await storage.createDealerAccount(data, kpInfo);
    res.json(dealer);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Service Plans API Routes
router.get('/api/service-plans', requireAuth, async (req: any, res) => {
  try {
    const { carrier } = req.query;
    const servicePlans = carrier 
      ? await storage.getServicePlansByCarrier(carrier)
      : await storage.getServicePlans();
    res.json(servicePlans);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/service-plans', requireAdmin, async (req: any, res) => {
  try {
    const data = createServicePlanSchema.parse(req.body);
    const servicePlan = await storage.createServicePlan(data);
    res.json(servicePlan);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/api/service-plans/:id', requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = createServicePlanSchema.partial().parse(req.body);
    const servicePlan = await storage.updateServicePlan(id, data);
    res.json(servicePlan);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/api/service-plans/:id', requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteServicePlan(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Additional Services API Routes
router.get('/api/additional-services', requireAuth, async (req: any, res) => {
  try {
    const { serviceType } = req.query;
    const additionalServices = serviceType 
      ? await storage.getAdditionalServicesByType(serviceType)
      : await storage.getAdditionalServices();
    res.json(additionalServices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/additional-services', requireAdmin, async (req: any, res) => {
  try {
    const data = createAdditionalServiceSchema.parse(req.body);
    const additionalService = await storage.createAdditionalService(data);
    res.json(additionalService);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/api/additional-services/:id', requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = createAdditionalServiceSchema.partial().parse(req.body);
    const additionalService = await storage.updateAdditionalService(id, data);
    res.json(additionalService);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/api/additional-services/:id', requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteAdditionalService(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Document Service Plans API Routes
router.get('/api/documents/:id/service-plan', requireAuth, async (req: any, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const documentServicePlan = await storage.getDocumentServicePlan(documentId);
    res.json(documentServicePlan);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/documents/:id/service-plan', requireAuth, async (req: any, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const data = createDocumentServicePlanSchema.parse({
      ...req.body,
      documentId
    });
    const documentServicePlan = await storage.createDocumentServicePlan(data);
    res.json(documentServicePlan);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/api/documents/:id/service-plan', requireAuth, async (req: any, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const data = createDocumentServicePlanSchema.partial().parse(req.body);
    const documentServicePlan = await storage.updateDocumentServicePlan(documentId, data);
    res.json(documentServicePlan);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/api/documents/:id/service-plan', requireAuth, async (req: any, res) => {
  try {
    const documentId = parseInt(req.params.id);
    await storage.deleteDocumentServicePlan(documentId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
