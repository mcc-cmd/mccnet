import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as XLSX from 'xlsx';
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
  updateDealerContactCodesSchema,
  createSettlementSchema,
  updateSettlementSchema,
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
  req.user = session; // Add user property for compatibility
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

// Public Service Plans API (before auth routes)
router.get('/api/service-plans', async (req: any, res) => {
  try {
    console.log('Service plans API called - public endpoint');
    const { carrier } = req.query;
    const servicePlans = carrier 
      ? await storage.getServicePlansByCarrier(carrier)
      : await storage.getServicePlans();
    console.log(`Found ${servicePlans.length} service plans`);
    res.json(servicePlans);
  } catch (error: any) {
    console.error('Service plans error:', error);
    res.status(500).json({ error: error.message });
  }
});

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
          dealerName: dealer?.name || null,
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

// Delete user
router.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    await storage.deleteUser(userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: error.message || 'Failed to delete user' });
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
    
    // 보완필요 상태일 때 요청한 근무자 ID 추가
    if (data.activationStatus === '보완필요' && req.session.userType === 'user') {
      data.supplementRequiredBy = req.session.userId;
    }
    
    const document = await storage.updateDocumentActivationStatus(id, data);
    res.json(document);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Service plan update endpoint
router.patch('/api/documents/:id/service-plan', requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { servicePlanId, additionalServiceIds, registrationFeePrepaid, registrationFeePostpaid, simFeePrepaid, simFeePostpaid, bundleApplied, bundleNotApplied, deviceModel, simNumber } = req.body;
    
    console.log('Service plan update request:', {
      id,
      servicePlanId,
      additionalServiceIds,
      registrationFeePrepaid,
      registrationFeePostpaid,
      simFeePrepaid,
      simFeePostpaid,
      bundleApplied,
      bundleNotApplied,
      deviceModel,
      simNumber
    });
    
    const document = await storage.updateDocumentServicePlanDirect(id, {
      servicePlanId: servicePlanId ? parseInt(servicePlanId) : null,
      additionalServiceIds,
      registrationFeePrepaid: registrationFeePrepaid || false,
      registrationFeePostpaid: registrationFeePostpaid || false,
      simFeePrepaid: simFeePrepaid || false,
      simFeePostpaid: simFeePostpaid || false,
      bundleApplied: bundleApplied || false,
      bundleNotApplied: bundleNotApplied || false,
      deviceModel: deviceModel || null,
      simNumber: simNumber || null,
      subscriptionNumber: req.body.subscriptionNumber || null
    });
    
    console.log('Service plan updated successfully:', document.id);
    res.json(document);
  } catch (error: any) {
    console.error('Service plan update error:', error);
    res.status(400).json({ error: error.message });
  }
});

// User routes
router.get('/api/dashboard/stats', requireAuth, async (req: any, res) => {
  try {
    const userType = req.session.userType === 'admin' ? 'admin' : 
                    req.session.userRole === 'dealer_worker' ? 'dealer_worker' : 'dealer_store';
    const dealerId = req.session.dealerId;
    const userId = req.session.userId;
    
    const stats = await storage.getDashboardStats(dealerId, userId, userType);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/documents', requireAuth, async (req: any, res) => {
  try {
    const { status, activationStatus, search, startDate, endDate } = req.query;
    console.log('Documents API request:', { status, activationStatus, search, startDate, endDate });
    console.log('Session data:', { 
      userId: req.session.userId, 
      dealerId: req.session.dealerId, 
      userType: req.session.userType,
      userRole: req.session.userRole 
    });
    
    // 관리자와 근무자는 모든 문서를, 판매점은 해당 대리점 문서만 조회
    const isWorker = req.session.userRole === 'dealer_worker';
    const isAdmin = req.session.userType === 'admin';
    
    // 관리자와 근무자는 모든 문서를 볼 수 있도록 dealerId를 undefined로 설정
    let dealerId = req.session.dealerId; // 기본값: 자신의 dealerId
    if (isAdmin || isWorker) {
      dealerId = undefined; // 모든 문서를 볼 수 있도록 설정
    }
    
    // 한국어 디코딩 처리
    let decodedActivationStatus = activationStatus as string;
    if (decodedActivationStatus) {
      try {
        decodedActivationStatus = decodeURIComponent(decodedActivationStatus);
      } catch (e) {
        console.log('Failed to decode activationStatus, using original:', decodedActivationStatus);
      }
    }
    
    const documents = await storage.getDocuments(dealerId, {
      status: status as string,
      activationStatus: decodedActivationStatus,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string
    });
    
    console.log('Documents found:', documents.length);
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

// 개통서류 엑셀 다운로드 API
router.get('/api/admin/export/activated-documents', requireAdmin, async (req: any, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: '시작일과 종료일이 필요합니다.' });
    }

    // 개통된 서류 조회
    const query = `
      SELECT 
        d.activated_at as activatedAt,
        d.store_name as storeName,
        d.customer_name as customerName,
        d.customer_phone as customerPhone,
        '',  -- 접점코드 (현재 데이터베이스에 없음)
        dealers.name as dealerName,
        d.carrier,
        sp.plan_name as servicePlanName,
        d.customer_phone as subscriptionNumber, -- 가입번호로 고객 전화번호 사용
        d.additional_service_ids,
        CASE 
          WHEN d.device_model IS NOT NULL AND d.sim_number IS NOT NULL 
          THEN d.device_model || '/' || d.sim_number
          WHEN d.device_model IS NOT NULL 
          THEN d.device_model
          WHEN d.sim_number IS NOT NULL 
          THEN d.sim_number
          ELSE ''
        END as deviceInfo
      FROM documents d
      JOIN dealers ON d.dealer_id = dealers.id
      LEFT JOIN service_plans sp ON d.service_plan_id = sp.id
      WHERE d.activation_status = '개통'
      AND DATE(d.activated_at) >= ?
      AND DATE(d.activated_at) <= ?
      ORDER BY d.activated_at DESC
    `;

    const documents = await storage.getExportDocuments(startDate as string, endDate as string);

    // 부가서비스 매핑
    const serviceMap: { [key: string]: string } = {
      '1': '필링',
      '2': '캐치콜',
      '3': '링투유',
      '4': '통화중대기',
      '5': '00700'
    };

    // 엑셀 데이터 준비
    const excelData = documents.map(doc => {
      let additionalServices = '';
      if (doc.additional_service_ids) {
        try {
          const serviceIds = JSON.parse(doc.additional_service_ids) as string[];
          additionalServices = serviceIds.map(id => serviceMap[id]).filter(Boolean).join(', ');
        } catch (e) {
          additionalServices = '';
        }
      }

      return {
        '개통일': doc.activatedAt ? new Date(doc.activatedAt).toLocaleDateString('ko-KR') : '',
        '요청점': doc.storeName || '',
        '고객명': doc.customerName || '',
        '개통번호': doc.customerPhone || '',
        '접점코드': '', // 현재 데이터베이스에 없음
        '판매점명': doc.dealerName || '',
        '유형': doc.carrier || '',
        '요금제': doc.servicePlanName || '',
        '가입번호': doc.subscriptionNumber || '',
        '부가': additionalServices,
        '유심모델/번호': doc.deviceInfo || ''
      };
    });

    // XLSX 라이브러리 사용하여 엑셀 파일 생성
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '개통서류');

    // 엑셀 파일을 버퍼로 생성
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // 파일명 설정
    const fileName = `개통서류_${startDate}_${endDate}.xlsx`;

    // 응답 헤더 설정
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', buffer.length);

    // 엑셀 파일 전송
    res.send(buffer);

  } catch (error: any) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: '엑셀 파일 생성에 실패했습니다.' });
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

// Contact codes management routes
router.get('/api/dealers/:id/contact-codes', requireAuth, async (req: any, res) => {
  try {
    const dealerId = parseInt(req.params.id);
    const contactCodes = await storage.getDealerContactCodes(dealerId);
    res.json(contactCodes);
  } catch (error: any) {
    console.error('Get dealer contact codes error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/dealers/:id/contact-codes', requireAdmin, async (req: any, res) => {
  try {
    const dealerId = parseInt(req.params.id);
    const { contactCodes } = updateDealerContactCodesSchema.parse({ dealerId, contactCodes: req.body.contactCodes });
    await storage.updateDealerContactCodes(dealerId, contactCodes);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Update dealer contact codes error:', error);
    res.status(400).json({ error: error.message });
  }
});

// 접점 코드 엑셀 업로드
router.post('/api/admin/contact-codes/upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일을 선택해주세요.' });
    }

    // XLSX 라이브러리를 사용하여 엑셀 파일 읽기
    const XLSX = await import('xlsx');
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    // 첫 번째 행은 헤더로 건너뛰기
    const rows = data.slice(1);
    
    // 처리된 대리점 수
    let processedCount = 0;

    for (const row of rows) {
      const [dealerName, ...carrierCodes] = row;
      
      if (!dealerName) continue;

      // 대리점 이름으로 찾기 (기존 대리점 또는 새로 생성할 대리점)
      let dealer = await storage.findDealerByName(dealerName.toString().trim());
      
      // 대리점이 없으면 새로 생성
      if (!dealer) {
        dealer = await storage.createDealer({
          name: dealerName.toString().trim(),
          location: '자동생성',
          contactEmail: `${dealerName.toString().trim().replace(/\s+/g, '')}@auto.com`,
          contactPhone: '000-0000-0000'
        });
      }

      // 통신사별 접점 코드 매핑
      const contactCodes = [
        { carrierId: 'sk-tellink', carrierName: 'SK텔링크', contactCode: carrierCodes[0] || '' },
        { carrierId: 'sk-pretty', carrierName: 'SK프리티', contactCode: carrierCodes[1] || '' },
        { carrierId: 'sk-stage5', carrierName: 'SK스테이지파이브', contactCode: carrierCodes[2] || '' },
        { carrierId: 'kt-telecom', carrierName: 'KT', contactCode: carrierCodes[3] || '' },
        { carrierId: 'kt-emobile', carrierName: 'KT엠모바일', contactCode: carrierCodes[4] || '' },
        { carrierId: 'kt-codemore', carrierName: 'KT코드모바일', contactCode: carrierCodes[5] || '' },
        { carrierId: 'lg-hellomobile', carrierName: 'LG헬로모바일', contactCode: carrierCodes[6] || '' },
        { carrierId: 'lg-uplus', carrierName: '미디어로그', contactCode: carrierCodes[7] || '' },
        { carrierId: 'mvno-emobile', carrierName: 'KT스테이지파이브', contactCode: carrierCodes[8] || '' },
        { carrierId: 'mvno-future', carrierName: 'LG밸류컴', contactCode: carrierCodes[9] || '' },
        { carrierId: 'mvno-china', carrierName: '중고KT', contactCode: carrierCodes[10] || '' },
        { carrierId: 'mvno-prepaid', carrierName: 'LG스마텔', contactCode: carrierCodes[11] || '' },
      ];

      // 접점 코드 업데이트
      await storage.updateDealerContactCodes(dealer.id, contactCodes);
      processedCount++;
    }

    // 임시 파일 삭제
    const fs = await import('fs');
    fs.unlinkSync(req.file.path);

    res.json({ 
      message: `${processedCount}개 대리점의 접점 코드가 성공적으로 업데이트되었습니다.`,
      processedCount 
    });

  } catch (error: any) {
    console.error('Contact codes excel upload error:', error);
    res.status(500).json({ error: '엑셀 파일 처리에 실패했습니다.' });
  }
});

// 정산 관리 라우트들

// 문서 기반 정산 등록을 위한 문서 데이터 조회
router.get('/api/documents/:id/settlement-data', requireAuth, async (req: any, res) => {
  try {
    const documentId = parseInt(req.params.id);
    const document = await storage.getDocument(documentId);
    
    if (!document) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    // 관련 서비스 플랜 정보 조회
    let servicePlan = null;
    if (document.servicePlanId) {
      servicePlan = await storage.getServicePlan(document.servicePlanId);
    }

    // 부가 서비스 정보 조회
    let additionalServices: string[] = [];
    if (document.additionalServiceIds) {
      try {
        const serviceIds = JSON.parse(document.additionalServiceIds);
        const services = await Promise.all(
          serviceIds.map((id: number) => storage.getAdditionalService(id))
        );
        additionalServices = services.filter(Boolean).map(s => s.serviceName);
      } catch (e) {
        console.warn('부가 서비스 파싱 실패:', e);
      }
    }

    // 대리점 정보 조회
    const dealer = await storage.getDealer(document.dealerId);

    res.json({
      documentId: document.id,
      dealerId: document.dealerId,
      dealerName: dealer?.name || '',
      customerName: document.customerName,
      customerPhone: document.customerPhone,
      carrier: document.carrier,
      servicePlanId: document.servicePlanId,
      servicePlanName: servicePlan?.planName || '',
      additionalServices,
      activatedAt: document.activatedAt,
      storeName: document.storeName,
    });
  } catch (error: any) {
    console.error('Get document settlement data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 정책차수 자동 계산을 위한 정책표 조회
router.get('/api/policy-level', requireAuth, async (req: any, res) => {
  try {
    const { date, carrier } = req.query;
    
    if (!date) {
      return res.status(400).json({ error: '날짜를 제공해주세요.' });
    }

    const targetDate = new Date(date);
    
    // 정책표(PricingTable) 조회 - 가장 최근 것부터
    const pricingTables = await storage.getPricingTables();
    
    // 날짜와 통신사에 맞는 정책표 찾기
    const applicablePolicy = pricingTables
      .filter(policy => {
        const policyDate = new Date(policy.createdAt);
        return policyDate <= targetDate && (carrier ? policy.title.includes(carrier) : true);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (!applicablePolicy) {
      return res.json({ policyLevel: 1, policyDetails: '기본 정책' });
    }

    // 정책차수 계산 로직 (예시: 정책표 생성 후 경과 일수에 따라)
    const daysSincePolicy = Math.floor((targetDate.getTime() - new Date(applicablePolicy.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    let policyLevel = 1;
    
    if (daysSincePolicy <= 30) {
      policyLevel = 1;
    } else if (daysSincePolicy <= 60) {
      policyLevel = 2;
    } else if (daysSincePolicy <= 90) {
      policyLevel = 3;
    } else {
      policyLevel = 4;
    }

    res.json({
      policyLevel,
      policyDetails: `${applicablePolicy.title} - ${policyLevel}차수`,
      policyTableId: applicablePolicy.id,
      policyTableTitle: applicablePolicy.title,
    });
  } catch (error: any) {
    console.error('Get policy level error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/settlements', requireAuth, async (req: any, res) => {
  try {
    const data = createSettlementSchema.parse(req.body);
    const settlement = await storage.createSettlement(data);
    res.json(settlement);
  } catch (error: any) {
    console.error('Create settlement error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.get('/api/settlements', requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    let dealerId = undefined;
    
    // 판매점 사용자는 자신의 대리점 데이터만 조회
    if (user.userType === 'dealer') {
      dealerId = user.dealerId;
    }
    
    const settlements = await storage.getSettlements(dealerId);
    res.json(settlements);
  } catch (error: any) {
    console.error('Get settlements error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/settlements/:id', requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const settlement = await storage.getSettlement(id);
    
    if (!settlement) {
      return res.status(404).json({ error: '정산 데이터를 찾을 수 없습니다.' });
    }
    
    res.json(settlement);
  } catch (error: any) {
    console.error('Get settlement error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/api/settlements/:id', requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateSettlementSchema.parse(req.body);
    const settlement = await storage.updateSettlement(id, data);
    res.json(settlement);
  } catch (error: any) {
    console.error('Update settlement error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.delete('/api/settlements/:id', requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteSettlement(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete settlement error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Service Plans management routes (admin only)

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

// 요금제 이미지 업로드 API
router.post('/api/service-plans/upload-image', requireAdmin, upload.single('image'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
    }

    const { carrier } = req.body;
    if (!carrier) {
      return res.status(400).json({ error: '통신사를 선택해주세요.' });
    }

    // 이미지에서 요금제 정보 추출 (현재는 예시 데이터로 구현)
    // 실제로는 OCR이나 이미지 분석 라이브러리를 사용할 수 있습니다
    const extractedPlans = [
      { planName: '선)363/1M', dataAllowance: '1M' },
      { planName: '선)363/2M', dataAllowance: '2M' },
      { planName: '선)363/3M', dataAllowance: '3M' },
      { planName: '선)383/1M', dataAllowance: '1M' },
      { planName: '선)383/2M', dataAllowance: '2M' }
    ];

    let addedPlans = 0;
    for (const plan of extractedPlans) {
      try {
        await storage.createServicePlan({
          planName: plan.planName,
          carrier: carrier,
          planType: '음성',
          dataAllowance: plan.dataAllowance,
          monthlyFee: 0,
          isActive: true
        });
        addedPlans++;
      } catch (error) {
        console.warn(`요금제 추가 실패: ${plan.planName}`, error);
      }
    }

    // 업로드된 이미지 파일 삭제 (필요에 따라)
    fs.unlinkSync(req.file.path);

    res.json({ 
      message: '요금제가 성공적으로 추가되었습니다.',
      addedPlans: addedPlans,
      carrier: carrier
    });
  } catch (error: any) {
    console.error('Error uploading service plan image:', error);
    res.status(500).json({ error: error.message || '이미지 업로드에 실패했습니다.' });
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

// 접수 문서를 정산으로 전환
router.post('/api/settlements/from-document/:documentId', requireAuth, async (req: any, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const document = await storage.getDocument(documentId);
    
    if (!document) {
      return res.status(404).json({ error: '접수 문서를 찾을 수 없습니다.' });
    }

    // 접수 문서 데이터를 정산 형태로 변환
    const settlementData = {
      documentId: document.id,
      dealerId: document.dealerId,
      customerName: document.customerName,
      customerPhone: document.phoneNumber,
      servicePlanId: document.servicePlanId,
      servicePlanName: document.servicePlan?.planName,
      additionalServices: document.additionalServices || [],
      bundleType: document.bundleApplied ? '결합' : '미결합',
      bundleDetails: document.bundleNotApplied ? '미결합 사유: ' + document.bundleNotApplied : undefined,
      policyLevel: 1,
      settlementStatus: '대기' as const,
      settlementAmount: 0,
      commissionRate: 0
    };

    const settlement = await storage.createSettlement(settlementData);
    res.json(settlement);
  } catch (error: any) {
    console.error('Create settlement from document error:', error);
    res.status(400).json({ error: error.message });
  }
});

// 개통 완료된 문서들을 일괄 정산 생성
router.post('/api/settlements/bulk-from-activated', requireAuth, async (req: any, res) => {
  try {
    const user = req.user;
    let dealerId = undefined;
    
    // 판매점 사용자는 자신의 대리점 데이터만 처리
    if (user.userType === 'dealer') {
      dealerId = user.dealerId;
    }

    const activatedDocuments = await storage.getDocuments({
      dealerId,
      activationStatus: '개통'
    });

    const settlements = [];
    for (const document of activatedDocuments) {
      // 이미 정산 데이터가 있는지 확인
      const existingSettlement = await storage.getSettlementByDocumentId(document.id);
      if (existingSettlement) continue;

      const settlementData = {
        documentId: document.id,
        dealerId: document.dealerId,
        customerName: document.customerName,
        customerPhone: document.phoneNumber,
        servicePlanId: document.servicePlanId,
        servicePlanName: document.servicePlan?.planName,
        additionalServices: document.additionalServices || [],
        bundleType: document.bundleApplied ? '결합' : '미결합',
        bundleDetails: document.bundleNotApplied ? '미결합 사유: ' + document.bundleNotApplied : undefined,
        policyLevel: 1,
        settlementStatus: '대기' as const,
        settlementAmount: 0,
        commissionRate: 0
      };

      const settlement = await storage.createSettlement(settlementData);
      settlements.push(settlement);
    }

    res.json({ 
      message: `${settlements.length}건의 정산 데이터가 생성되었습니다.`,
      settlements 
    });
  } catch (error: any) {
    console.error('Bulk create settlements error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 정산 데이터 엑셀 다운로드
router.get('/api/settlements/export', requireAuth, async (req: any, res) => {
  try {
    const { startDate, endDate } = req.query;
    const user = req.user;
    
    // 관리자와 근무자는 모든 문서를, 판매점은 해당 대리점 문서만 조회
    const isWorker = req.session.userRole === 'dealer_worker';
    const isAdmin = req.session.userType === 'admin';
    
    let dealerId = req.session.dealerId;
    if (isAdmin || isWorker) {
      dealerId = undefined; // 모든 문서를 볼 수 있도록 설정
    }
    
    // 개통 완료된 문서 조회
    const documents = await storage.getDocuments(dealerId, {
      activationStatus: '개통',
      startDate: startDate as string,
      endDate: endDate as string
    });
    
    // 엑셀 데이터 생성
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    
    const excelData = documents.map(doc => ({
      '개통날짜': doc.activatedAt ? format(new Date(doc.activatedAt), 'yyyy-MM-dd') : '',
      '문서번호': doc.documentNumber,
      '고객명': doc.customerName,
      '연락처': doc.customerPhone,
      '판매점명': doc.storeName || doc.dealerName,
      '통신사': doc.carrier,
      '접점코드': doc.contactCode || '',
      '요금제': doc.servicePlanName || '',
      '부가서비스': doc.additionalServices ? doc.additionalServices.join(', ') : '',
      '결합여부': doc.bundleApplied ? '결합' : (doc.bundleNotApplied ? '미결합' : '미지정'),
      '기기모델': doc.deviceModel || '',
      '유심번호': doc.simNumber || '',
      '비고': doc.notes || ''
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, '정산데이터');
    
    // 엑셀 파일 생성
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    const filename = `정산데이터_${startDate || '전체'}_${endDate || '현재'}.xlsx`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
    
  } catch (error: any) {
    console.error('Settlement export error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 수기 정산 등록 API
router.post('/api/settlements/manual', requireAuth, async (req: any, res) => {
  try {
    console.log('Manual settlement request:', req.body);
    console.log('Session data:', { 
      userId: req.session.userId, 
      dealerId: req.session.dealerId, 
      userType: req.session.userType 
    });
    
    const data = req.body;
    
    // 문서번호 생성 (MANUAL-YYYY-XXXXXX 형식)
    const now = new Date();
    const year = now.getFullYear();
    const randomNum = Math.floor(Math.random() * 900000) + 100000;
    const documentNumber = `MANUAL-${year}-${randomNum}`;
    
    // 수기 정산 데이터를 documents 테이블에 삽입
    const manualDocument = {
      dealerId: req.session.dealerId || 1, // 기본값 설정
      userId: req.session.userId,
      documentNumber,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      storeName: data.storeName,
      carrier: data.carrier,
      servicePlanId: data.servicePlanId,
      additionalServices: data.additionalServices || [],
      activationStatus: '개통',
      activatedAt: new Date(data.activatedAt),
      deviceModel: data.deviceModel,
      simNumber: data.simNumber,
      subscriptionNumber: data.subscriptionNumber,
      bundleApplied: data.bundleApplied,
      bundleNotApplied: data.bundleNotApplied,
      registrationFeePrepaid: data.registrationFeePrepaid,
      registrationFeePostpaid: data.registrationFeePostpaid,
      simFeePrepaid: data.simFeePrepaid,
      simFeePostpaid: data.simFeePostpaid,
      status: '접수',
      createdAt: now,
      updatedAt: now,
      notes: data.notes,
      isManualEntry: true // 수기 입력 구분을 위한 플래그
    };
    
    console.log('Creating manual document:', manualDocument);
    const createdDocument = await storage.uploadDocument(manualDocument);
    console.log('Manual document created successfully:', createdDocument.id);
    
    res.json({
      success: true,
      document: createdDocument,
      message: '수기 정산이 성공적으로 등록되었습니다.'
    });
    
  } catch (error: any) {
    console.error('Manual settlement creation error:', error);
    res.status(500).json({ error: error.message || '수기 정산 등록 중 오류가 발생했습니다.' });
  }
});

export default router;
