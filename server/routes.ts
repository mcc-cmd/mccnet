import { Router } from "express";
import multer from "multer";
import formidable from "formidable";
import path from "path";
import fs from "fs";
import bcrypt from "bcrypt";
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { storage } from "./storage";
import { ChatWebSocketServer } from './websocket';
import { 
  createSalesTeamSchema,
  createSalesManagerSchema,
  assignSalesManagerToTeamSchema,
  createContactCodeMappingSchema,
  updateSalesTeamSchema, 
  updateSalesManagerSchema,
  updateContactCodeMappingSchema,
  salesManagerLoginSchema
} from "@shared/schema";
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
  createCarrierSchema,
  updateCarrierSchema,
  createSettlementUnitPriceSchema,
  updateSettlementUnitPriceSchema,
  createAdditionalServiceDeductionSchema,
  updateAdditionalServiceDeductionSchema,
  dealerRegistrationSchema,
  dealerLoginSchema,
  sendChatMessageSchema,
  type AuthResponse
} from "../shared/schema";
import {
  createCarrierServicePolicySchema,
  updateCarrierServicePolicySchema,
  createSettlementServicePolicyLogSchema
} from "../shared/schema-sqlite";

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
    fieldSize: 2 * 1024 * 1024, // 2MB for field values 
    fields: 30, // 필드 수 증가
    files: 1, // max number of files
    parts: 100, // 파트 수 증가
    headerPairs: 2000 // 헤더 쌍 수 증가
  },
  fileFilter: (req, file, cb) => {
    try {
      console.log('File filter - originalname:', file.originalname);
      console.log('File filter - mimetype:', file.mimetype);
      
      const allowedExts = /\.(jpeg|jpg|png|pdf|doc|docx)$/i;
      const allowedMimes = /^(image\/(jpeg|jpg|png)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document))$/i;
      
      const extValid = allowedExts.test(file.originalname);
      const mimeValid = allowedMimes.test(file.mimetype);

      console.log('File validation - ext:', extValid, 'mime:', mimeValid);

      if (extValid && mimeValid) {
        return cb(null, true);
      } else {
        console.log('File rejected - invalid type');
        cb(new Error('허용되지 않는 파일 형식입니다. (JPG, PNG, PDF, DOC, DOCX만 가능)'));
      }
    } catch (error) {
      console.error('File filter error:', error);
      cb(new Error('파일 검증 중 오류가 발생했습니다.'));
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
    const allowedTypes = /xlsx|xls|csv|pdf|jpg|jpeg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    // 스프레드시트 파일들의 MIME 타입 체크를 더 유연하게
    const isSpreadsheet = /\.(xlsx|xls|csv)$/i.test(file.originalname);
    const mimetype = /application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|text\/csv|application\/csv|application\/pdf|image\/jpeg|image\/jpg/.test(file.mimetype) || isSpreadsheet;

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('허용되지 않는 파일 형식입니다. (xlsx, xls, csv, pdf, jpg, jpeg만 가능)'));
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

// Configure multer for contact code uploads (CSV and Excel)
const contactCodeUpload = multer({
  dest: path.join(process.cwd(), 'uploads', 'contact-codes'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /xlsx|xls|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /application\/vnd\.ms-excel|application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet|text\/csv|application\/csv/.test(file.mimetype);

    if (extname || mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('허용되지 않는 파일 형식입니다. (xlsx, xls, csv만 가능)'));
    }
  }
});

// Middleware to check authentication
const requireAuth = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  console.log('Auth check - Header:', authHeader);
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Auth failed - No valid header');
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }
  
  const sessionId = authHeader.replace('Bearer ', '');
  console.log('Auth check - SessionId:', sessionId);

  const session = await storage.getSession(sessionId);
  console.log('Auth check - Session found:', session ? 'yes' : 'no');
  
  if (!session) {
    console.log('Auth failed - Invalid session');
    return res.status(401).json({ error: '유효하지 않은 세션입니다.' });
  }

  req.session = session;
  req.user = session; // Add user property for compatibility
  console.log('Auth success - User:', session.userId);
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
    
    // carrier 파라미터 검증 및 정리
    const cleanCarrier = carrier ? String(carrier).trim() : null;
    
    const servicePlans = cleanCarrier 
      ? await storage.getServicePlansByCarrier(cleanCarrier)
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
    console.log('Login attempt - body:', req.body);
    const { username, password } = loginSchema.parse(req.body);
    console.log('Login attempt - parsed:', { username, password: password ? '***' : 'empty' });
    
    // Try admin login first
    console.log('Authenticating admin:', username);
    const admin = await storage.authenticateAdmin(username, password);
    console.log('Admin found:', admin ? 'yes' : 'no');
    console.log('Admin auth result:', admin ? 'success' : 'failed');
    
    if (admin) {
      const sessionId = await storage.createSession(admin.id, 'admin');
      console.log('Session created:', sessionId);
      
      const response: AuthResponse = {
        success: true,
        user: {
          id: admin.id,
          name: admin.name,
          username: admin.username,
          userType: 'admin'
        },
        sessionId
      };
      return res.json(response);
    }

    // Try user login (includes workers, sales managers, and other users)
    console.log('Authenticating user:', username);
    const userResult = await storage.authenticateUser(username, password);
    console.log('User found:', userResult ? 'yes' : 'no');
    console.log('User auth result:', userResult ? 'success' : 'failed');
    
    if (userResult) {
      const sessionId = await storage.createSession(
        userResult.id, 
        userResult.userType || 'user',
        userResult.userType === 'sales_manager' ? userResult.id : undefined, // sales_manager인 경우 managerId 설정
        userResult.teamId, // teamId 추가
        userResult.userRole
      );
      console.log('User session created:', sessionId, 'Type:', userResult.userType, 'Role:', userResult.userRole, 'ManagerId:', userResult.userType === 'sales_manager' ? userResult.id : undefined, 'TeamId:', userResult.teamId);
      
      const response: AuthResponse = {
        success: true,
        user: {
          id: userResult.id,
          name: userResult.name || username, // fallback to username if name not available
          username: username,
          userType: userResult.userType || 'user'
        },
        sessionId
      };
      return res.json(response);
    }

    res.status(401).json({ success: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// 현재 사용자 정보 조회 API
router.get('/api/auth/me', requireAuth, async (req: any, res) => {
  try {
    console.log('Auth me request - session:', req.session);
    
    const userId = req.session.userId;
    const userType = req.session.userType;
    console.log('Auth me - userId:', userId, 'userType:', userType);
    
    if (userType === 'admin') {
      const admin = await storage.getAdminById(userId);
      if (admin) {
        const response: AuthResponse = {
          success: true,
          user: {
            id: admin.id,
            name: admin.name,
            username: admin.username,
            userType: 'admin'
          }
        };
        return res.json(response);
      }
    } else if (userType === 'sales_manager') {
      const manager = await storage.getSalesManagerById(userId);
      if (manager) {
        const response: AuthResponse = {
          success: true,
          user: {
            id: manager.id,
            name: manager.managerName,
            userType: 'sales_manager'
          }
        };
        return res.json(response);
      }
    } else {
      const user = await storage.getUserById(userId);
      if (user) {
        const response: AuthResponse = {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
            userType: user.userType || 'user'
          }
        };
        return res.json(response);
      }
    }
    
    res.status(401).json({ success: false, error: '사용자를 찾을 수 없습니다.' });
  } catch (error: any) {
    console.error('Auth me error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 영업과장 로그인 API 
router.post('/api/auth/manager-login', async (req, res) => {
  try {
    console.log('Manager login attempt - body:', req.body);
    const { username, password } = loginSchema.parse(req.body);
    console.log('Manager login attempt - parsed:', { username, password: password ? '***' : 'empty' });
    
    // Try sales manager login
    const manager = await storage.authenticateSalesManager(username, password);
    console.log('Manager auth result:', manager ? 'success' : 'failed');
    
    if (manager) {
      const sessionId = await storage.createSession(manager.id, 'sales_manager', manager.id, manager.teamId);
      console.log('Manager session created:', sessionId);
      
      const response: AuthResponse = {
        success: true,
        user: {
          id: manager.id,
          name: manager.managerName,
          userType: 'sales_manager'
        },
        sessionId
      };
      
      res.json(response);
    } else {
      res.status(401).json({ 
        success: false, 
        error: '아이디 또는 비밀번호가 올바르지 않습니다.' 
      });
    }
  } catch (error: any) {
    console.error('Manager login error:', error);
    res.status(500).json({ 
      success: false, 
      error: '로그인 처리 중 오류가 발생했습니다.' 
    });
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
            username: admin.username,
            userType: 'admin'
          }
        });
      } else {
        res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
      }
    } else if (session.userType === 'sales_manager') {
      const manager = await storage.getSalesManagerById(session.userId);
      if (manager) {
        res.json({
          success: true,
          user: {
            id: manager.id,
            name: manager.managerName,
            username: manager.username,
            userType: 'sales_manager',
            teamId: manager.teamId,
            managerCode: manager.managerCode,
            position: manager.position
          }
        });
      } else {
        res.status(404).json({ error: '영업과장을 찾을 수 없습니다.' });
      }
    } else {
      const user = await storage.getUserById(session.userId);
      if (user) {
        res.json({
          success: true,
          user: {
            id: user.id,
            name: user.name,
            username: user.username,
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


// 영업과장 계정 생성 (관리자 패널용)
router.post('/api/admin/create-sales-manager', requireAdmin, async (req, res) => {
  try {
    const { username, password, name, team } = req.body;
    
    if (!username || !password || !name || !team) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    // 사용자명 중복 체크
    const existingUser = await storage.getSalesManagerByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: `로그인 ID '${username}'는 이미 사용 중입니다.` });
    }

    // 팀 이름 정규화 (공백 제거)
    const normalizedTeamName = team.replace(/\s+/g, '');
    
    // 팀이 존재하는지 확인
    let salesTeam = await storage.getSalesTeamByName(normalizedTeamName);
    if (!salesTeam) {
      return res.status(400).json({ error: `영업팀 '${team}'을 찾을 수 없습니다.` });
    }

    // 고유한 영업과장 코드 생성 - 타임스탬프와 랜덤 요소 포함
    const timestamp = Date.now().toString();
    const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
    let managerCode = `${salesTeam.teamCode}_${username.toUpperCase()}_${timestamp.slice(-6)}_${randomSuffix}`;

    // 만약 이것도 중복이면 더 긴 랜덤 문자열 사용
    let attempts = 0;
    while (attempts < 5) {
      const existingManager = await storage.getSalesManagerByCode(managerCode);
      if (!existingManager) break;
      
      const longRandom = Math.random().toString(36).substring(2, 10).toUpperCase();
      managerCode = `${salesTeam.teamCode}_${username.toUpperCase()}_${longRandom}`;
      attempts++;
    }

    // 영업과장 생성
    const manager = await storage.createSalesManager({
      name,
      username,
      password,
      team
    });

    res.json(manager);
  } catch (error: any) {
    console.error('Sales manager creation error:', error);
    res.status(400).json({ error: `영업과장 생성에 실패했습니다: ${error.message}` });
  }
});

// 영업과장 목록 조회 (관리자 패널용)
router.get('/api/admin/sales-managers', requireAuth, async (req, res) => {
  try {
    const managers = await storage.getSalesManagers();
    // 팀 정보를 포함한 영업과장 목록 반환
    const managersWithTeams = await Promise.all(
      managers.map(async (manager) => {
        const team = await storage.getSalesTeamById(manager.teamId);
        return {
          ...manager,
          teamName: team?.teamName || '미지정'
        };
      })
    );
    res.json(managersWithTeams);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/admin/sales-teams', requireAuth, async (req, res) => {
  try {
    const teams = await storage.getSalesTeams();
    res.json(teams);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 비밀번호 변경 API (관리자 패널용)
router.post('/api/admin/change-password', requireAdmin, async (req: any, res) => {
  try {
    const { userId, accountType, newPassword } = req.body;
    console.log('Password change request:', { userId, accountType, newPassword: '***' });
    
    // userId가 없으면 세션에서 가져오기 (자신의 비밀번호 변경인 경우)
    const targetUserId = userId || req.session.userId;
    const targetAccountType = accountType || 'admin';
    
    if (!targetUserId || !targetAccountType || !newPassword) {
      console.log('Missing required fields:', { userId: !!targetUserId, accountType: !!targetAccountType, newPassword: !!newPassword });
      return res.status(400).json({ error: '필수 정보가 누락되었습니다.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '비밀번호는 최소 6자리 이상이어야 합니다.' });
    }

    // 시스템 관리자 권한 확인 - admin 계정만 허용
    const currentUser = await storage.getAdminById(req.session.userId);
    console.log('Current user check:', { currentUserId: req.session.userId, username: currentUser?.username });
    
    if (!currentUser || currentUser.username !== 'admin') {
      return res.status(403).json({ error: '비밀번호 변경은 시스템 관리자(admin)만 가능합니다.' });
    }

    console.log('Processing password change for:', { userId: targetUserId, accountType: targetAccountType });

    if (targetAccountType === 'admin') {
      await storage.updateAdminPassword(targetUserId, newPassword);
    } else if (targetAccountType === 'sales_manager') {
      await storage.updateSalesManagerPassword(targetUserId, newPassword);
    } else if (targetAccountType === 'worker') {
      await storage.updateUserPassword(targetUserId, newPassword);
    } else {
      console.log('Unsupported account type:', targetAccountType);
      return res.status(400).json({ error: '지원되지 않는 계정 유형입니다.' });
    }

    console.log('Password change successful for user:', targetUserId);
    res.json({ success: true, message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error: any) {
    console.error('Password change error:', error);
    res.status(400).json({ error: error.message });
  }
});

// 영업과장 삭제 API (시스템 관리자 전용)
router.delete('/api/admin/sales-managers/:id', requireAdmin, async (req, res) => {
  try {
    const managerId = parseInt(req.params.id);
    
    if (!managerId) {
      return res.status(400).json({ error: '유효하지 않은 영업과장 ID입니다.' });
    }

    await storage.deleteSalesManager(managerId);
    res.json({ success: true, message: '영업과장 계정이 성공적으로 삭제되었습니다.' });
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

// Worker details API
router.get('/api/admin/worker-details/:workerId', requireAdmin, async (req, res) => {
  try {
    const workerId = parseInt(req.params.workerId);
    const details = await storage.getWorkerCarrierDetails(workerId);
    res.json(details);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Carrier details API
router.get('/api/admin/carrier-details/:carrier', requireAdmin, async (req, res) => {
  try {
    const carrier = req.params.carrier;
    const details = await storage.getCarrierDealerDetails(carrier);
    res.json(details);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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

router.post('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { username, password, name, userType } = req.body;
    
    if (!username || !password || !name || !userType) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }
    
    const user = await storage.createUser({ username, password, name, userType });
    res.json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { username, password, name, role, userType, team } = req.body;
    
    console.log('Updating user:', id, 'with data:', { username, password: password ? '***' : undefined, name, role, userType, team });
    
    const updateData: any = {};
    if (username) updateData.username = username;
    if (password && password.trim() !== '') updateData.password = password;
    if (name) updateData.name = name;
    if (role) updateData.role = role;
    if (userType) updateData.userType = userType;
    if (team !== undefined) updateData.team = team; // team이 null일 수도 있으므로 !== undefined 체크
    
    const user = await storage.updateUser(id, updateData);
    res.json({ success: true, message: '사용자 정보가 성공적으로 업데이트되었습니다.' });
  } catch (error: any) {
    console.error('User update error:', error);
    res.status(400).json({ error: error.message });
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

router.post('/api/admin/change-user-role', requireAdmin, async (req, res) => {
  try {
    const { userId, accountType } = req.body;
    
    if (!userId || !accountType) {
      return res.status(400).json({ error: '사용자 ID와 계정 유형이 필요합니다.' });
    }

    if (!['admin', 'sales_manager', 'worker'].includes(accountType)) {
      return res.status(400).json({ error: '유효하지 않은 계정 유형입니다.' });
    }

    await storage.changeUserRole(userId, accountType);
    res.json({ success: true, message: '사용자 권한이 성공적으로 변경되었습니다.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
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
    // 임시로 빈 배열 반환 (pricing tables 기능이 현재 사용되지 않음)
    res.json([]);
  } catch (error: any) {
    console.error('Get pricing tables error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/pricing-tables/active', requireAuth, async (req, res) => {
  try {
    // 임시로 빈 배열 반환 (pricing tables 기능이 현재 사용되지 않음)
    res.json([]);
  } catch (error: any) {
    console.error('Get active pricing tables error:', error);
    res.status(500).json({ error: error.message });
  }
});



// Document upload route
// Multer error handling middleware
const handleUploadError = (error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    console.error('Multer error:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '파일 크기가 너무 큽니다. 10MB 이하의 파일을 업로드해주세요.' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: '예상치 못한 파일 필드입니다.' });
    }
    if (error.code === 'LIMIT_FIELD_COUNT') {
      return res.status(400).json({ error: '필드 수가 제한을 초과했습니다.' });
    }
    if (error.code === 'LIMIT_PART_COUNT') {
      return res.status(400).json({ error: '파트 수가 제한을 초과했습니다.' });
    }
    return res.status(400).json({ error: `파일 업로드 오류: ${error.message}` });
  }
  
  if (error.message && error.message.includes('Malformed part header')) {
    console.error('Malformed part header error:', error);
    return res.status(400).json({ error: '파일 업로드 형식에 문제가 있습니다. 페이지를 새로고침한 후 다시 시도해주세요.' });
  }
  
  console.error('Upload middleware error:', error);
  return res.status(400).json({ error: error.message || '파일 업로드 중 오류가 발생했습니다.' });
};

// Formidable을 사용한 대체 파일 업로드 처리
router.post('/api/documents', requireAuth, async (req: any, res: any) => {
  try {
    console.log('Document upload request received with formidable');
    
    const form = formidable({
      uploadDir: path.join(process.cwd(), 'uploads', 'temp'),
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFields: 30,
      maxFieldsSize: 2 * 1024 * 1024, // 2MB
      multiples: false,
      filename: (name, ext, part) => {
        const timestamp = Date.now();
        return `${timestamp}-${part.originalFilename}`;
      }
    });

    // 임시 업로드 디렉터리 생성
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const [fields, files] = await form.parse(req);
    
    console.log('Formidable parsing successful');
    console.log('Fields:', Object.keys(fields));
    console.log('Files:', Object.keys(files));

    // 필드 데이터 추출 (배열에서 첫 번째 값 가져오기)
    const formData: any = {};
    for (const [key, value] of Object.entries(fields)) {
      formData[key] = Array.isArray(value) ? value[0] : value;
    }

    // 파일 처리
    const uploadedFile = files.file?.[0];
    let finalFilePath = null;
    let originalFileName = null;
    let fileSize = null;

    if (uploadedFile) {
      console.log('Processing uploaded file:', uploadedFile.originalFilename);
      
      // 파일 타입 검증
      const allowedExts = /\.(jpeg|jpg|png|pdf|doc|docx)$/i;
      const allowedMimes = /^(image\/(jpeg|jpg|png)|application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document))$/i;
      
      const extValid = allowedExts.test(uploadedFile.originalFilename || '');
      const mimeValid = allowedMimes.test(uploadedFile.mimetype || '');

      if (!extValid || !mimeValid) {
        // 임시 파일 삭제
        if (fs.existsSync(uploadedFile.filepath)) {
          fs.unlinkSync(uploadedFile.filepath);
        }
        return res.status(400).json({ error: '허용되지 않는 파일 형식입니다. (JPG, PNG, PDF, DOC, DOCX만 가능)' });
      }

      // dealerId 결정
      let dealerId = null;
      if (req.session.userType === 'user' && req.session.dealerId) {
        dealerId = req.session.dealerId;
      }

      // 최종 저장 디렉터리
      const finalDir = path.join(process.cwd(), 'uploads', 'docs', String(dealerId || 'admin'));
      if (!fs.existsSync(finalDir)) {
        fs.mkdirSync(finalDir, { recursive: true });
      }

      // 파일 이동
      const timestamp = Date.now();
      const ext = path.extname(uploadedFile.originalFilename || '');
      const basename = path.basename(uploadedFile.originalFilename || '', ext);
      const newFileName = `${timestamp}-${basename}${ext}`;
      finalFilePath = path.join(finalDir, newFileName);
      
      fs.renameSync(uploadedFile.filepath, finalFilePath);
      originalFileName = uploadedFile.originalFilename;
      fileSize = uploadedFile.size;
      
      console.log('File moved to:', finalFilePath);
    }

    // 스키마 검증
    const data = uploadDocumentSchema.parse(formData);
    
    // 통신사별 필수 필드 검증
    if (data.carrier) {
      const carrierInfo = await storage.getCarrierById(parseInt(data.carrier));
      if (carrierInfo) {
        if (carrierInfo.requireCustomerPhone && (!data.customerPhone || data.customerPhone.trim() === '')) {
          return res.status(400).json({ error: '연락처를 입력하세요' });
        }
        if (carrierInfo.requireCustomerEmail && (!data.customerEmail || data.customerEmail.trim() === '')) {
          return res.status(400).json({ error: '이메일을 입력하세요' });
        }
      }
    }
    
    // dealerId 설정
    let dealerId = null;
    if (req.session.userType === 'user' && req.session.dealerId) {
      dealerId = req.session.dealerId;
    }
    
    const document = await storage.uploadDocument({
      ...data,
      dealerId: dealerId,
      userId: req.session.userId,
      filePath: finalFilePath,
      fileName: originalFileName,
      fileSize: fileSize
    });

    console.log('Document uploaded successfully:', document.id);
    res.json(document);

  } catch (error: any) {
    console.error('Document upload error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: '입력 데이터 형식이 올바르지 않습니다.' });
    }
    res.status(500).json({ error: error.message || '문서 처리 중 오류가 발생했습니다.' });
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
    const { status, search, startDate, endDate, activationStatus } = req.query;
    const documents = await storage.getDocuments({
      status: status as string,
      search: search as string,
      startDate: startDate as string,
      endDate: endDate as string,
      activationStatus: activationStatus as string
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

// Activation status update endpoint (PUT)
router.put('/api/documents/:id/activation-status', requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateActivationStatusSchema.parse(req.body);
    const isWorker = req.session.userRole === 'dealer_worker';
    const isAdmin = req.session.userType === 'admin';
    
    // 관리자가 아닌 근무자만 작업 잠금 제한 적용
    if (!isAdmin) {
      // 진행중 상태로 변경 시 작업자 할당 확인
      if (data.activationStatus === '진행중' && isWorker) {
        // 이미 다른 근무자가 진행중인지 확인
        const document = await storage.getDocument(id);
        if (document?.assignedWorkerId && document.assignedWorkerId !== req.session.userId) {
          return res.status(400).json({ 
            error: '이미 다른 근무자가 처리 중인 서류입니다.' 
          });
        }
      }
      
      // 진행중 상태 서류의 처리 권한 확인
      if (['개통', '취소', '보완필요'].includes(data.activationStatus) && isWorker) {
        const document = await storage.getDocument(id);
        if (document?.assignedWorkerId && document.assignedWorkerId !== req.session.userId) {
          return res.status(400).json({ 
            error: '다른 근무자가 처리 중인 서류는 수정할 수 없습니다.' 
          });
        }
      }
    }
    
    // For cancellation, use session user ID regardless of whether they're admin or worker
    const workerId = (data.activationStatus === '취소' || isWorker) ? req.session.userId : undefined;
    
    // 개통완료 시 처리자명 설정
    if (data.activationStatus === '개통') {
      // 세션에서 사용자 정보 가져오기
      const user = await storage.getUserById(req.session.userId);
      if (user) {
        data.activatedByName = user.name;
        data.activatedBy = user.id;
      } else {
        data.activatedByName = req.session.name || req.session.displayName || 'Unknown';
        data.activatedBy = req.session.userId;
      }
    }
    
    const updatedDocument = await storage.updateDocumentActivationStatus(id, data, workerId);
    res.json(updatedDocument);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Activation status update endpoint (PATCH)
router.patch('/api/documents/:id/activation', requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateActivationStatusSchema.parse(req.body);
    const isWorker = req.session.userRole === 'dealer_worker';
    const isAdmin = req.session.userType === 'admin';
    
    // 관리자가 아닌 근무자만 작업 잠금 제한 적용
    if (!isAdmin) {
      // 진행중 상태로 변경 시 작업자 할당 확인
      if (data.activationStatus === '진행중' && isWorker) {
        // 이미 다른 근무자가 진행중인지 확인
        const document = await storage.getDocument(id);
        if (document?.assignedWorkerId && document.assignedWorkerId !== req.session.userId) {
          return res.status(400).json({ 
            error: '이미 다른 근무자가 처리 중인 서류입니다.' 
          });
        }
      }
      
      // 진행중 상태 서류의 처리 권한 확인
      if (['개통', '취소', '보완필요'].includes(data.activationStatus) && isWorker) {
        const document = await storage.getDocument(id);
        if (document?.assignedWorkerId && document.assignedWorkerId !== req.session.userId) {
          return res.status(400).json({ 
            error: '다른 근무자가 처리 중인 서류는 수정할 수 없습니다.' 
          });
        }
      }
    }
    
    // 개통완료 시 처리자 ID와 이름 추가 (관리자 포함)
    if (data.activationStatus === '개통') {
      // 세션에서 사용자 정보 가져오기
      const user = await storage.getUserById(req.session.userId);
      if (user) {
        data.activatedBy = user.id;
        data.activatedByName = user.name;
      } else {
        data.activatedBy = req.session.userId;
        data.activatedByName = req.session.name || req.session.displayName || 'Unknown';
      }
    }
    
    // 기타완료 시 근무자 ID 추가 (관리자 제외)
    if (data.activationStatus === '기타완료' && req.session.userType === 'user') {
      data.activatedBy = req.session.userId;
    }
    
    // 보완필요 상태일 때 요청한 근무자 ID 추가
    if (data.activationStatus === '보완필요' && req.session.userType === 'user') {
      data.supplementRequiredBy = req.session.userId;
    }
    
    // 폐기 상태일 때 처리한 근무자 ID 추가 (관리자 포함)
    if (data.activationStatus === '폐기') {
      data.activatedBy = req.session.userId;
    }
    
    // 기타완료 상태일 때도 처리한 근무자 ID 추가 (관리자 포함)  
    if (data.activationStatus === '기타완료') {
      data.activatedBy = req.session.userId;
    }
    
    // For cancellation, use session user ID regardless of whether they're admin or worker
    const workerId = (data.activationStatus === '취소' || isWorker) ? req.session.userId : undefined;
    
    // 개통완료 시 요금제 정보도 함께 저장
    if (data.activationStatus === '개통') {
      console.log('Processing activation completion with data:', data);
      
      // 먼저 개통 상태 업데이트
      const updatedDocument = await storage.updateDocumentActivationStatus(id, data, workerId);
      
      // 서비스 플랜 데이터가 있는지 확인
      const hasServicePlanData = data.servicePlanId || 
        data.additionalServiceIds?.length > 0 || 
        data.registrationFeePrepaid || data.registrationFeePostpaid ||
        data.simFeePrepaid || data.simFeePostpaid ||
        data.bundleApplied || data.bundleNotApplied ||
        data.deviceModel || data.simNumber || data.subscriptionNumber;
        
      console.log('Has service plan data:', hasServicePlanData);
      console.log('Service plan data details:', {
        servicePlanId: data.servicePlanId,
        additionalServiceIds: data.additionalServiceIds,
        deviceModel: data.deviceModel,
        simNumber: data.simNumber,
        subscriptionNumber: data.subscriptionNumber
      });
      
      // 요금제 정보가 있으면 함께 저장 (조건을 더 관대하게 변경)
      if (hasServicePlanData) {
        console.log('Updating service plan data for document:', id);
        
        await storage.updateDocumentServicePlanDirect(id, {
          servicePlanId: data.servicePlanId ? parseInt(data.servicePlanId) : null,
          additionalServiceIds: JSON.stringify(data.additionalServiceIds || []),
          registrationFeePrepaid: data.registrationFeePrepaid || false,
          registrationFeePostpaid: data.registrationFeePostpaid || false,
          simFeePrepaid: data.simFeePrepaid || false,
          simFeePostpaid: data.simFeePostpaid || false,
          bundleApplied: data.bundleApplied || false,
          bundleNotApplied: data.bundleNotApplied || false,
          deviceModel: data.deviceModel || null,
          simNumber: data.simNumber || null,
          subscriptionNumber: data.subscriptionNumber || null,
          dealerNotes: data.dealerNotes || null
        });
      } else {
        console.log('No service plan data found, skipping service plan update');
      }
      
      res.json(updatedDocument);
    } else {
      const updatedDocument = await storage.updateDocumentActivationStatus(id, data, workerId);
      res.json(updatedDocument);
    }
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Service plan update endpoint
router.patch('/api/documents/:id/service-plan', requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { servicePlanId, additionalServiceIds, registrationFeePrepaid, registrationFeePostpaid, registrationFeeInstallment, simFeePrepaid, simFeePostpaid, bundleApplied, bundleNotApplied, deviceModel, simNumber } = req.body;
    
    console.log('Service plan update request:', {
      id,
      servicePlanId,
      additionalServiceIds,
      registrationFeePrepaid,
      registrationFeePostpaid,
      registrationFeeInstallment,
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
      registrationFeeInstallment: registrationFeeInstallment || false,
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
                    req.session.userType === 'sales_manager' ? 'sales_manager' :
                    req.session.userRole === 'dealer_worker' ? 'dealer_worker' : 'dealer_store';
    const dealerId = req.session.dealerId;
    const userId = req.session.userId;
    const salesManagerId = req.session.userType === 'sales_manager' ? req.session.userId : null;
    const { startDate, endDate } = req.query;
    
    const stats = await storage.getDashboardStats(dealerId, userId, userType, startDate, endDate, salesManagerId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Separate endpoints for carrier and worker stats
router.get('/api/dashboard/carrier-stats', requireAuth, async (req: any, res) => {
  try {
    if (req.session.userType !== 'admin' && req.session.userType !== 'sales_manager') {
      return res.status(403).json({ error: '관리자 또는 영업과장 권한이 필요합니다.' });
    }
    
    const { startDate, endDate } = req.query;
    const salesManagerId = req.session.userType === 'sales_manager' ? req.session.managerId || req.session.userId : null;
    console.log('Carrier stats request - userType:', req.session.userType, 'userId:', req.session.userId, 'managerId:', req.session.managerId, 'salesManagerId:', salesManagerId);
    const stats = await storage.getCarrierStats(startDate, endDate, salesManagerId);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/dashboard/worker-stats', requireAuth, async (req: any, res) => {
  try {
    if (req.session.userType !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    
    const { startDate, endDate } = req.query;
    const stats = await storage.getWorkerStats(startDate, endDate);
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 당일 통계 API
router.get('/api/dashboard/today-stats', requireAuth, async (req: any, res) => {
  try {
    console.log('=== TODAY STATS API CALLED ===');
    console.log('Session data:', req.session);
    console.log('Headers:', req.headers);
    
    // 근무자(user)인 경우 해당 근무자의 ID를 전달, 관리자는 전체 데이터 조회, 영업과장은 자신 소속팀 데이터만
    const workerId = req.session.userType === 'user' ? req.session.userId : undefined;
    const salesManagerId = req.session.userType === 'sales_manager' ? req.session.managerId || req.session.userId : undefined;
    console.log('Today stats request - userType:', req.session.userType, 'userId:', req.session.userId, 'managerId:', req.session.managerId, 'workerId:', workerId, 'salesManagerId:', salesManagerId);
    
    const stats = await storage.getTodayStats(workerId, salesManagerId);
    console.log('Today stats result:', stats);

    // 당일 통신사별 데이터도 함께 조회
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
    const carrierStats = await storage.getCarrierStats(today, today, salesManagerId);
    console.log('Today carrier stats:', carrierStats);
    
    // API 응답 형식을 프론트엔드 기대값에 맞춤
    const response = {
      todayReception: stats.todaySubmissions,
      todayActivation: stats.todayCompletions,
      todayOtherCompleted: stats.todayOtherCompleted || 0,
      carrierStats: carrierStats.map(carrier => ({
        carrier: carrier.carrier,
        new: carrier.newCustomer,
        portIn: carrier.portIn,
        total: carrier.total
      }))
    };
    
    console.log('Today stats response:', response);
    res.json(response);
  } catch (error: any) {
    console.error('Today stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 당월 개통현황 API
router.get('/api/dashboard/monthly-activation-stats', requireAuth, async (req: any, res) => {
  try {
    // 근무자(user)인 경우 해당 근무자의 ID를 전달, 관리자는 전체 데이터 조회, 영업과장은 자신 소속팀 데이터만
    const workerId = req.session.userType === 'user' ? req.session.userId : undefined;
    const salesManagerId = req.session.userType === 'sales_manager' ? req.session.userId : undefined;
    console.log('Monthly activation stats request - userType:', req.session.userType, 'userId:', req.session.userId, 'workerId:', workerId, 'salesManagerId:', salesManagerId);
    const stats = await storage.getMonthlyActivationStats(workerId, salesManagerId);
    
    res.json(stats);
  } catch (error: any) {
    console.error('Monthly activation stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 당월 상태별 통계 API (근무자별 필터링)
router.get('/api/dashboard/monthly-status-stats', requireAuth, async (req: any, res) => {
  try {
    // 근무자(user)인 경우 해당 근무자의 ID를 전달, 관리자는 전체 데이터 조회, 영업과장은 자신 소속팀 데이터만
    const workerId = req.session.userType === 'user' ? req.session.userId : undefined;
    const salesManagerId = req.session.userType === 'sales_manager' ? req.session.userId : undefined;
    console.log('Monthly status stats request - userType:', req.session.userType, 'userId:', req.session.userId, 'workerId:', workerId, 'salesManagerId:', salesManagerId);
    const stats = await storage.getMonthlyStatusStats(workerId, salesManagerId);
    
    res.json(stats);
  } catch (error: any) {
    console.error('Monthly status stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/documents', requireAuth, async (req: any, res) => {
  try {
    const { status, activationStatus, search, contactCode, startDate, endDate, carrier, allWorkers, includeActivatedBy } = req.query;
    console.log('Documents API request:', { status, activationStatus, search, contactCode, startDate, endDate, carrier, allWorkers, includeActivatedBy });
    console.log('Session data:', { 
      userId: req.session.userId, 
      dealerId: req.session.dealerId, 
      userType: req.session.userType,
      userRole: req.session.userRole 
    });
    
    // 관리자는 모든 문서를, 근무자는 자신이 처리한 문서만, 판매점은 해당 대리점 문서만 조회
    const isWorker = req.session.userRole === 'dealer_worker';
    const isAdmin = req.session.userType === 'admin';
    
    // 한국어 디코딩 처리 먼저 수행
    let decodedActivationStatus = activationStatus as string;
    if (decodedActivationStatus) {
      try {
        decodedActivationStatus = decodeURIComponent(decodedActivationStatus);
      } catch (e) {
        console.log('Failed to decode activationStatus, using original:', decodedActivationStatus);
      }
    }
    
    let dealerId = req.session.dealerId; // 기본값: 자신의 dealerId
    let workerId = undefined;
    
    if (isAdmin) {
      dealerId = undefined; // 관리자는 모든 문서를 볼 수 있음
    } else if (isWorker) {
      // allWorkers=true인 경우 (접수 관리에서 호출) 또는 개통완료 조회 시 모든 서류를 볼 수 있도록 함
      if (allWorkers === 'true' || decodedActivationStatus === '개통') {
        dealerId = undefined; // 모든 서류 조회 가능
        workerId = undefined; // 개통완료는 모든 사용자가 볼 수 있음
      } else {
        dealerId = undefined; // 근무자도 모든 문서를 볼 수 있지만
        // 당월 개통현황에서는 자신이 처리한 문서만 표시하기 위해 workerId 설정
        if (decodedActivationStatus && decodedActivationStatus.includes('개통') && decodedActivationStatus !== '개통') {
          workerId = req.session.userId;
        }
      }
    }
    
    console.log('Final dealerId for query:', dealerId, 'isAdmin:', isAdmin, 'isWorker:', isWorker, 'allWorkers:', allWorkers);
    
    const documents = await storage.getDocuments(dealerId, {
      status: status as string,
      activationStatus: decodedActivationStatus,
      search: search as string,
      contactCode: contactCode as string,
      startDate: startDate as string,
      endDate: endDate as string,
      carrier: carrier as string,
      workerId: workerId,
      excludeDeleted: true
    });
    
    // 정산 관련 요청인 경우 정산금액 계산 추가
    let processedDocuments = documents;
    let settlementPrices: any[] = [];
    let deductionPolicies: any[] = [];
    let calculateSettlementAmount: any = null;
    
    if (decodedActivationStatus === '개통') {
      try {
        // 정산단가 정보 조회
        settlementPrices = await storage.getActiveSettlementUnitPrices();
        
        // 부가서비스 차감 정책 조회
        deductionPolicies = await storage.getAdditionalServiceDeductions();
        
        // 정산금액 계산 함수
        calculateSettlementAmount = (doc: any) => {
          if (!doc.servicePlanId) return 0;
          
          console.log(`Document ${doc.id} settlement calculation:`, {
            servicePlanId: doc.servicePlanId,
            activatedAt: doc.activatedAt,
            settlementAmount: doc.settlementAmount,
            customerType: doc.customerType,
            previousCarrier: doc.previousCarrier
          });
          
          // 0. 문서에 저장된 정산금액이 있으면 우선 사용
          if (doc.settlementAmount !== undefined && doc.settlementAmount !== null && doc.settlementAmount > 0) {
            console.log(`Document ${doc.id}: Using stored amount ${doc.settlementAmount}`);
            return doc.settlementAmount;
          }
          
          // 1. 저장된 단가가 없는 경우 개통일시 기준으로 정산단가 찾기
          if (!doc.activatedAt) return 0;
          
          const activatedDate = new Date(doc.activatedAt);
          console.log(`Document ${doc.id}: Looking for prices for servicePlanId ${doc.servicePlanId}, activated at ${activatedDate.toISOString()}`);
          
          // 먼저 서비스 플랜 ID가 일치하는 활성화된 정산단가를 찾기
          const matchingPrices = settlementPrices.filter(p => {
            const servicePlanIdMatch = p.servicePlanId == doc.servicePlanId || 
                                       p.servicePlanId == parseFloat(doc.servicePlanId);
            return servicePlanIdMatch && p.isActive;
          });
          
          let priceInfo = null;
          
          if (matchingPrices.length > 0) {
            // 활성화된 정산단가가 있으면 가장 최근 것 사용
            priceInfo = matchingPrices.sort((a, b) => 
              new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
            )[0];
            console.log(`Document ${doc.id}: Using active price ${priceInfo.id} for servicePlan ${priceInfo.servicePlanId}`);
          } else {
            // 활성화된 정산단가가 없으면 기존 로직 사용 (개통일 기준 매칭)
            const applicablePrices = settlementPrices.filter(p => {
              const servicePlanIdMatch = p.servicePlanId == doc.servicePlanId || 
                                         p.servicePlanId == parseFloat(doc.servicePlanId);
              const effectiveFromDate = new Date(p.effectiveFrom);
              const effectiveUntilDate = p.effectiveUntil ? new Date(p.effectiveUntil) : null;
              
              const isApplicable = servicePlanIdMatch && 
                                  effectiveFromDate <= activatedDate &&
                                  (!effectiveUntilDate || effectiveUntilDate > activatedDate);
              
              console.log(`Document ${doc.id}: Checking price ${p.id} - servicePlan: ${p.servicePlanId}, effectiveFrom: ${effectiveFromDate.toISOString()}, applicable: ${isApplicable}`);
              
              return isApplicable;
            });
            
            priceInfo = applicablePrices.sort((a, b) => 
              new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
            )[0];
          }
          
          if (!priceInfo) {
            console.log(`Document ${doc.id}: No applicable price found`);
            return 0;
          }
          
          let baseAmount = 0;
          if (doc.previousCarrier && doc.previousCarrier !== doc.carrier) {
            baseAmount = priceInfo.portInPrice || 0;
          } else {
            baseAmount = priceInfo.newCustomerPrice || 0;
          }
          
          console.log(`Document ${doc.id}: Using price - base amount: ${baseAmount}`);
          return baseAmount;
        };
        
        // 각 문서에 정산금액 추가
        // 정산금액 계산은 나중에 개별적으로 처리
        processedDocuments = documents;
      } catch (error) {
        console.error('Settlement calculation error:', error);
        // 에러 발생 시 원본 documents 반환
        processedDocuments = documents;
      }
    }
    
    // 판매점명 정보 추가 (contactCode를 통해)
    const documentsWithStoreNames = await Promise.all(processedDocuments.map(async (doc: any) => {
      let storeName = doc.storeName;
      
      // storeName이 없고 contactCode가 있으면 contactCode를 통해 판매점명 조회
      if (!storeName && doc.contactCode) {
        try {
          const contactCodeInfo = await storage.getContactCodeByCode(doc.contactCode);
          if (contactCodeInfo) {
            storeName = contactCodeInfo.dealerName;
          }
        } catch (e) {
          console.warn('Contact code lookup failed:', e);
        }
      }
      
      let activatedByName = null;
      console.log('Document:', doc.id, 'activatedBy:', doc.activatedBy, 'includeActivatedBy:', includeActivatedBy);
      
      // 데이터베이스에 저장된 activatedByName을 우선적으로 사용
      if (doc.activatedByName) {
        activatedByName = doc.activatedByName;
        console.log('Using stored activatedByName:', activatedByName);
      } else if (includeActivatedBy === 'true' && doc.activatedBy) {
        // 저장된 이름이 없는 경우에만 사용자 조회
        try {
          console.log('Looking up user for activatedBy:', doc.activatedBy);
          const user = await storage.getUserById(doc.activatedBy);
          console.log('User lookup result:', user);
          if (user) {
            activatedByName = user.name || user.username;
            console.log('Setting activatedByName to:', activatedByName);
          }
        } catch (e) {
          console.error('User lookup failed for activatedBy:', doc.activatedBy, e);
        }
      }
      
      // 정산금액 계산 (수동 설정값이 있으면 우선 사용)
      let calculatedSettlementAmount = 0;
      if (decodedActivationStatus === '개통') {
        if (doc.settlementAmount && parseFloat(doc.settlementAmount) > 0) {
          // 수동으로 설정된 정산금액이 있으면 그대로 사용
          calculatedSettlementAmount = parseFloat(doc.settlementAmount);
        } else if (calculateSettlementAmount) {
          // 수동 설정값이 없으면 자동 계산
          calculatedSettlementAmount = calculateSettlementAmount(doc);
        }
      }

      const result = {
        ...doc,
        storeName: storeName || doc.contactCode || '-',
        calculatedSettlementAmount,
        realSalesPOS: doc.realSalesPOS || null,  // realSalesPOS 필드 명시적으로 포함
        policyDetails: doc.policy_details  // policy_details를 policyDetails로 매핑
      };
      
      if (activatedByName) {
        result.activatedByName = activatedByName;
        console.log('Added activatedByName to document:', doc.id, 'name:', activatedByName);
      }
      
      return result;
    }));
    
    console.log('Documents found:', documentsWithStoreNames.length);
    res.json(documentsWithStoreNames);
  } catch (error: any) {
    console.error('Documents API error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 개통완료 목록 엑셀 다운로드
router.get('/api/documents/export/excel', requireAuth, async (req: any, res) => {
  try {
    const { activationStatus, search, startDate, endDate, carrier } = req.query;
    
    // 관리자와 근무자는 모든 문서를, 판매점은 해당 대리점 문서만 조회
    const isWorker = req.session.userRole === 'dealer_worker';
    const isAdmin = req.session.userType === 'admin';
    
    let dealerId = req.session.dealerId;
    if (isAdmin || isWorker) {
      dealerId = undefined;
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
    
    const documents = await storage.getDocuments({
      activationStatus: decodedActivationStatus,
      search: search as string,
      startDate: startDate as string,
      carrier: carrier as string,
      endDate: endDate as string,
      dealerId: dealerId
    });
    
    // 엑셀 데이터 준비
    const XLSX = await import('xlsx');
    const excelData = documents.map(doc => ({
      '개통완료일시': doc.activatedAt ? format(new Date(doc.activatedAt), 'yyyy-MM-dd HH:mm:ss') : '',
      '고객명': doc.customerName || '',
      '연락처': doc.customerPhone || '',
      '판매점': (doc as any).storeName || (doc as any).dealerName || '',
      '개통처리자': (doc as any).activatedByName || '관리자',
      '가입번호': (doc as any).subscriptionNumber || '',
      '통신사': doc.carrier || '',
      '요금제': (doc as any).servicePlanName || '',
      '부가서비스': (doc as any).additionalServices || '',
      '가입비': ((doc as any).registrationFeePrepaid ? '선납 ' : '') + ((doc as any).registrationFeePostpaid ? '후납' : ''),
      '유심비': ((doc as any).simFeePrepaid ? '선납 ' : '') + ((doc as any).simFeePostpaid ? '후납' : ''),
      '결합': ((doc as any).bundleApplied ? '적용' : '') + ((doc as any).bundleNotApplied ? '미적용' : ''),
      '판매점메모': (doc as any).dealerNotes || '',
      '상태': doc.activationStatus || ''
    }));
    
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // 컬럼 너비 설정
    const columnWidths = [
      { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 },
      { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 20 }, { wch: 10 },
      { wch: 10 }, { wch: 10 }, { wch: 30 }, { wch: 10 }
    ];
    worksheet['!cols'] = columnWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, '개통완료목록');
    
    // 파일명 생성
    const fileName = `개통완료목록_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;
    
    // 엑셀 파일을 버퍼로 변환
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // 응답 헤더 설정
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    
    // 파일 전송
    res.end(buffer, 'binary');
    
  } catch (error: any) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Failed to export to Excel' });
  }
});

// 중복 접수 체크 API
router.post('/api/documents/check-duplicate', requireAuth, async (req: any, res) => {
  try {
    const { customerName, customerPhone, carrier, storeName, contactCode } = req.body;
    
    console.log('Checking duplicate for:', { customerName, customerPhone, carrier, storeName, contactCode });
    
    // 필수 정보 확인
    if (!customerName || !customerPhone || !carrier) {
      console.log('Missing required fields, returning empty duplicates');
      return res.json({ duplicates: [], hasInternal: false });
    }
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    
    console.log('Date range:', { monthStart, monthEnd });
    
    const duplicates = await storage.findDuplicateDocuments({
      customerName,
      customerPhone, 
      carrier,
      storeName: storeName || contactCode, // storeName이 없으면 contactCode 사용
      contactCode,
      monthStart: monthStart.toISOString(),
      monthEnd: monthEnd.toISOString()
    });
    
    console.log('Found duplicates:', duplicates.length);
    
    res.json({ 
      duplicates,
      hasInternal: duplicates.length > 0
    });
  } catch (error: any) {
    console.error('Check duplicate error:', error);
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

// Document notes update endpoint (for admin only)
router.patch('/api/documents/:id', requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { notes } = req.body;
    
    await storage.updateDocumentNotes(id, notes);
    res.json({ success: true, message: '작업내용이 수정되었습니다.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 정산 금액 수정 API
router.patch('/api/documents/:id/settlement-amount', requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { settlementAmount } = req.body;
    
    console.log('Updating settlement amount for document:', id, 'amount:', settlementAmount);
    
    if (typeof settlementAmount !== 'number' || settlementAmount < 0) {
      return res.status(400).json({ error: '유효하지 않은 정산 금액입니다.' });
    }
    
    await storage.updateDocumentSettlementAmount(id, settlementAmount);
    res.json({ success: true, message: '정산 금액이 수정되었습니다.' });
  } catch (error: any) {
    console.error('Settlement amount update error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/api/documents/:id', requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const session = req.session as AuthSession;
    
    // Check if user is admin or worker
    if (!session.userType || !['admin', 'user'].includes(session.userType)) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    await storage.deleteDocument(id);
    res.json({ success: true, message: '문서가 삭제되었습니다.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk delete documents (admin and worker only)
router.delete('/api/documents', requireAuth, async (req: any, res) => {
  try {
    const { documentIds } = req.body;
    const session = req.session as AuthSession;
    
    // Check if user is admin or worker
    if (!session.userType || !['admin', 'user'].includes(session.userType)) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({ error: '삭제할 문서 ID가 필요합니다.' });
    }

    const result = await storage.bulkDeleteDocuments(documentIds);
    
    res.json({ 
      success: true, 
      message: `${result}개의 문서가 삭제되었습니다.`,
      deletedCount: result
    });
  } catch (error: any) {
    console.error('Error bulk deleting documents:', error);
    res.status(500).json({ error: '문서 삭제 중 오류가 발생했습니다.' });
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
    const today = format(new Date(), 'yyyy-MM-dd');
    const fileName = `개통서류_${startDate || today}_${endDate || today}.xlsx`;

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
    const documents = await storage.getDocuments({ dealerId: dealerId });
    const document = documents.find(d => d.id === id);
    
    if (!document) {
      return res.status(404).json({ error: '파일을 찾을 수 없습니다.' });
    }

    if (!document.filePath) {
      return res.status(404).json({ error: '파일 경로가 없습니다.' });
    }

    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ error: '파일이 서버에 존재하지 않습니다.' });
    }

    res.download(document.filePath, document.fileName || `document_${id}`);
  } catch (error: any) {
    console.error('File download error:', error);
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

    if (!table.filePath) {
      return res.status(404).json({ error: '파일 경로가 없습니다.' });
    }

    if (!fs.existsSync(table.filePath)) {
      return res.status(404).json({ error: '파일이 서버에 존재하지 않습니다.' });
    }

    res.download(table.filePath, table.fileName || `pricing_${id}`);
  } catch (error: any) {
    console.error('Pricing file download error:', error);
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

// 정산 데이터 엑셀 다운로드 (반드시 :id 라우트보다 먼저 정의)
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
    
    // 개통 완료된 문서 조회 (삭제되지 않은 문서만)
    const documents = await storage.getDocuments(dealerId, {
      activationStatus: '개통',
      startDate: startDate as string,
      endDate: endDate as string,
      excludeDeleted: true  // 삭제된 문서 제외
    });
    
    // 정산단가 정보 조회
    const settlementPrices = await storage.getActiveSettlementUnitPrices();
    
    // 부가서비스 차감 정책 조회
    const deductionPolicies = await storage.getAdditionalServiceDeductions();
    
    // 정산금액 계산 함수
    const calculateSettlementAmount = (doc: any) => {
      if (!doc.servicePlanId) return 0;
      
      console.log(`Document ${doc.id} settlement calculation:`, {
        servicePlanId: doc.servicePlanId,
        activatedAt: doc.activatedAt,
        settlementAmount: doc.settlementAmount,
        customerType: doc.customerType,
        previousCarrier: doc.previousCarrier
      });
      
      // 0. 문서에 저장된 정산금액이 있으면 우선 사용 (가장 높은 우선순위)
      if (doc.settlementAmount !== undefined && doc.settlementAmount !== null && doc.settlementAmount > 0) {
        console.log(`Document ${doc.id}: Using stored amount ${doc.settlementAmount}`);
        return doc.settlementAmount;
      }
      
      // 1. 우선적으로 저장된 정산단가 사용 (개통 완료 시점에 저장된 단가)
      if (doc.settlementNewCustomerPrice !== undefined && doc.settlementPortInPrice !== undefined) {
        let baseAmount = 0;
        if (doc.previousCarrier && doc.previousCarrier !== doc.carrier) {
          baseAmount = doc.settlementPortInPrice || 0;
        } else {
          baseAmount = doc.settlementNewCustomerPrice || 0;
        }
        
        // 부가서비스 차감 적용
        let totalDeduction = 0;
        if (doc.additionalServiceIds && doc.additionalServiceIds !== '[]') {
          try {
            const additionalServiceIds = JSON.parse(doc.additionalServiceIds || '[]');
            if (Array.isArray(additionalServiceIds) && additionalServiceIds.length > 0) {
              additionalServiceIds.forEach(serviceId => {
                const deduction = deductionPolicies.find(d => 
                  d.additionalServiceId === parseInt(serviceId) && d.isActive
                );
                if (deduction) {
                  totalDeduction += deduction.deductionAmount;
                }
              });
            }
          } catch (error) {
            console.warn('Error parsing additional service IDs for document:', doc.id, error);
          }
        }
        
        return Math.max(0, baseAmount - totalDeduction);
      }
      
      // 2. 저장된 단가가 없는 경우 기존 로직 사용 (이전 버전 호환성)
      if (!doc.activatedAt) return 0;
      
      // 개통일시 기준으로 해당 시점에 유효한 정산단가 찾기
      const activatedDate = new Date(doc.activatedAt);
      console.log(`Document ${doc.id}: Looking for prices for servicePlanId ${doc.servicePlanId}, activated at ${activatedDate.toISOString()}`);
      
      const applicablePrices = settlementPrices.filter(p => {
        const servicePlanIdMatch = p.servicePlanId == doc.servicePlanId || 
                                   p.servicePlanId == parseFloat(doc.servicePlanId);
        const effectiveFromDate = new Date(p.effectiveFrom);
        const effectiveUntilDate = p.effectiveUntil ? new Date(p.effectiveUntil) : null;
        
        const isApplicable = servicePlanIdMatch && 
                            effectiveFromDate <= activatedDate &&
                            (!effectiveUntilDate || effectiveUntilDate > activatedDate);
        
        console.log(`Document ${doc.id}: Checking price ${p.id} - servicePlan: ${p.servicePlanId}, effectiveFrom: ${effectiveFromDate.toISOString()}, applicable: ${isApplicable}`);
        
        return isApplicable;
      });
      
      // 가장 최근 유효한 단가 선택 (effective_from 기준 내림차순)
      const priceInfo = applicablePrices.sort((a, b) => 
        new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
      )[0];
      
      if (!priceInfo) {
        // Fallback: 개통일 이전에 설정된 가장 최근 단가 사용
        const fallbackPrice = settlementPrices
          .filter(p => {
            const servicePlanIdMatch = p.servicePlanId == doc.servicePlanId || 
                                       p.servicePlanId == parseFloat(doc.servicePlanId);
            return servicePlanIdMatch && new Date(p.effectiveFrom) <= activatedDate;
          })
          .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())[0];
        
        if (!fallbackPrice) return 0;
        
        let baseAmount = 0;
        if (doc.previousCarrier && doc.previousCarrier !== doc.carrier) {
          baseAmount = fallbackPrice.portInPrice || 0;
        } else {
          baseAmount = fallbackPrice.newCustomerPrice || 0;
        }
        
        // 부가서비스 차감 적용
        let totalDeduction = 0;
        if (doc.additionalServiceIds && doc.additionalServiceIds !== '[]') {
          try {
            const additionalServiceIds = JSON.parse(doc.additionalServiceIds || '[]');
            if (Array.isArray(additionalServiceIds) && additionalServiceIds.length > 0) {
              additionalServiceIds.forEach(serviceId => {
                const deduction = deductionPolicies.find(d => 
                  d.additionalServiceId === parseInt(serviceId) && d.isActive
                );
                if (deduction) {
                  totalDeduction += deduction.deductionAmount;
                }
              });
            }
          } catch (error) {
            console.warn('Error parsing additional service IDs for document:', doc.id, error);
          }
        }
        
        return Math.max(0, baseAmount - totalDeduction);
      }
      
      // 번호이동 여부 확인 (이전 통신사가 있고 현재 통신사와 다른 경우)
      const isPortIn = doc.previousCarrier && doc.previousCarrier !== doc.carrier;
      
      // 기본 정산금액 계산
      let baseAmount = isPortIn ? (priceInfo.portInPrice || 0) : (priceInfo.newCustomerPrice || 0);
      
      // 부가서비스 차감 적용 - 부가서비스가 실제로 있을 때만 차감
      let totalDeduction = 0;
      if (doc.additionalServiceIds && doc.additionalServiceIds !== '[]') {
        try {
          const additionalServiceIds = JSON.parse(doc.additionalServiceIds || '[]');
          if (Array.isArray(additionalServiceIds) && additionalServiceIds.length > 0) {
            additionalServiceIds.forEach(serviceId => {
              const deduction = deductionPolicies.find(d => 
                d.additionalServiceId === parseInt(serviceId) && d.isActive
              );
              if (deduction) {
                totalDeduction += deduction.deductionAmount;
              }
            });
          }
        } catch (error) {
          console.warn('Error parsing additional service IDs for document:', doc.id, error);
        }
      }
      
      return Math.max(0, baseAmount - totalDeduction); // 음수가 되지 않도록 보장
    };
    
    // 엑셀 데이터 생성
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    
    const excelData = documents.map(doc => {
      // 날짜 안전 처리
      let activatedDate = '';
      try {
        if (doc.activatedAt) {
          const date = new Date(doc.activatedAt);
          if (!isNaN(date.getTime())) {
            activatedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD 형식
          }
        }
      } catch (error) {
        console.warn('Date parsing error for document:', doc.id, error);
      }

      // 부가서비스 안전 처리
      let additionalServicesText = '';
      try {
        if (doc.additionalServices) {
          if (Array.isArray(doc.additionalServices)) {
            additionalServicesText = doc.additionalServices.join(', ');
          } else if (typeof doc.additionalServices === 'string') {
            additionalServicesText = doc.additionalServices;
          }
        }
      } catch (error) {
        console.warn('Additional services parsing error for document:', doc.id, error);
      }

      // 번호이동 여부 확인
      const isPortIn = doc.previousCarrier && doc.previousCarrier !== doc.carrier;
      const customerType = isPortIn ? '번호이동' : '신규';
      
      // 해당 고객 유형에 따른 정산단가 조회
      const settlementAmount = calculateSettlementAmount(doc);
      let applicablePrice = '';
      
      if (doc.servicePlanId) {
        const priceInfo = settlementPrices.find(p => p.servicePlanId === doc.servicePlanId);
        if (priceInfo) {
          const price = isPortIn ? priceInfo.portInPrice : priceInfo.newCustomerPrice;
          applicablePrice = price ? price.toLocaleString() + '원' : '';
        }
      }

      return {
        '개통날짜': activatedDate,
        '문서번호': doc.documentNumber || '',
        '고객명': doc.customerName || '',
        '연락처': doc.customerPhone || '',
        '판매점명': doc.storeName || doc.dealerName || '',
        '통신사': doc.carrier || '',
        '이전통신사': doc.previousCarrier || '',
        '고객유형': customerType,
        '접점코드': doc.contactCode || '',
        '요금제': doc.servicePlanName || '',
        '부가서비스': additionalServicesText,
        '단가': applicablePrice,
        '결합여부': doc.bundleApplied ? '결합' : (doc.bundleNotApplied ? '미결합' : '미지정'),
        '기기모델': doc.deviceModel || '',
        '유심번호': doc.simNumber || '',
        '가입번호': doc.subscriptionNumber || '',
        '정산금액': settlementAmount.toLocaleString() + '원',
        '비고': doc.notes || ''
      };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, '정산데이터');
    
    // 엑셀 파일 생성
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    const filename = `정산데이터_${startDate || '전체'}_${endDate || '현재'}.xlsx`;
    
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Length', buffer.length.toString());
    res.end(buffer, 'binary');
    
  } catch (error: any) {
    console.error('Settlement export error:', error);
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

// Sales statistics API for sales managers
router.get('/api/sales-stats', requireAuth, async (req: any, res) => {
  try {
    const currentUser = req.user;
    console.log('Sales stats API called by user:', currentUser?.id, currentUser?.userType);
    
    // 전체 문서 중 개통완료 상태인 것들을 가져옴
    const documents = await storage.getDocumentsByStatus('개통완료');
    console.log('Found activated documents:', documents.length);
    
    // 접점코드 목록을 가져옴
    const contactCodes = await storage.getContactCodes();
    console.log('Found contact codes:', contactCodes.length);
    
    // 영업과장 목록을 가져옴
    const salesManagers = await storage.getSalesManagers();
    console.log('Found sales managers:', salesManagers.length);
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    // 이번 달 문서들 필터링
    const monthlyDocuments = documents.filter(doc => {
      if (!doc.activatedAt) return false;
      const docDate = new Date(doc.activatedAt);
      return docDate.getMonth() === currentMonth && docDate.getFullYear() === currentYear;
    });
    
    // 팀별 통계
    const teamStats = [];
    const teams = ['DX 1팀', 'DX 2팀'];
    
    for (const team of teams) {
      const teamManagers = salesManagers.filter(sm => sm.team === team);
      const teamContactCodes = contactCodes.filter(cc => 
        teamManagers.some(tm => tm.id === cc.salesManagerId)
      );
      
      const teamDocuments = documents.filter(doc =>
        teamContactCodes.some(cc => cc.code === doc.contactCode)
      );
      
      const teamMonthlyDocuments = monthlyDocuments.filter(doc =>
        teamContactCodes.some(cc => cc.code === doc.contactCode)
      );
      
      teamStats.push({
        team,
        totalActivations: teamDocuments.length,
        monthlyActivations: teamMonthlyDocuments.length,
        salesManagers: teamManagers.map(sm => sm.name)
      });
    }
    
    // 영업과장별 통계
    const salesManagerStats = [];
    
    for (const manager of salesManagers) {
      const managerContactCodes = contactCodes.filter(cc => cc.salesManagerId === manager.id);
      const managerDocuments = documents.filter(doc =>
        managerContactCodes.some(cc => cc.code === doc.contactCode)
      );
      
      const managerMonthlyDocuments = monthlyDocuments.filter(doc =>
        managerContactCodes.some(cc => cc.code === doc.contactCode)
      );
      
      // 판매점별 통계
      const dealerStats = [];
      for (const contactCode of managerContactCodes) {
        const dealerDocuments = documents.filter(doc => doc.contactCode === contactCode.code);
        const dealerMonthlyDocuments = monthlyDocuments.filter(doc => doc.contactCode === contactCode.code);
        
        if (dealerDocuments.length > 0 || dealerMonthlyDocuments.length > 0) {
          dealerStats.push({
            dealerName: contactCode.dealerName,
            contactCode: contactCode.code,
            activations: dealerDocuments.length,
            monthlyActivations: dealerMonthlyDocuments.length,
            carrier: contactCode.carrier
          });
        }
      }
      
      salesManagerStats.push({
        id: manager.id,
        name: manager.name,
        team: manager.team,
        totalActivations: managerDocuments.length,
        monthlyActivations: managerMonthlyDocuments.length,
        dealers: dealerStats
      });
    }
    
    // 판매점별 통계 (전체)
    const dealerStats = [];
    for (const contactCode of contactCodes) {
      const dealerDocuments = documents.filter(doc => doc.contactCode === contactCode.code);
      const dealerMonthlyDocuments = monthlyDocuments.filter(doc => doc.contactCode === contactCode.code);
      
      if (dealerDocuments.length > 0 || dealerMonthlyDocuments.length > 0) {
        dealerStats.push({
          dealerName: contactCode.dealerName,
          contactCode: contactCode.code,
          activations: dealerDocuments.length,
          monthlyActivations: dealerMonthlyDocuments.length,
          carrier: contactCode.carrier
        });
      }
    }
    
    const stats = {
      totalActivations: documents.length,
      monthlyActivations: monthlyDocuments.length,
      teamStats,
      salesManagerStats,
      dealerStats
    };
    
    console.log('Sending sales stats:', JSON.stringify(stats, null, 2));
    res.json(stats);
    
  } catch (error: any) {
    console.error('Sales stats API error:', error);
    res.status(500).json({ 
      error: '실적 데이터를 불러오는 중 오류가 발생했습니다.',
      details: error.message 
    });
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

// Service Plan Excel Upload
router.post('/api/service-plans/upload-excel', requireAdmin, pricingUpload.single('file'), async (req: any, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Excel 파일이 필요합니다.' });
    }

    let data: any[] = [];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (fileExtension === '.csv') {
      // Handle CSV files - remove BOM if present
      let csvContent = fs.readFileSync(file.path, 'utf8');
      if (csvContent.charCodeAt(0) === 0xFEFF) {
        csvContent = csvContent.slice(1);
      }
      const workbook = XLSX.read(csvContent, { type: 'string' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      // Handle Excel files - read as buffer first
      const buffer = fs.readFileSync(file.path);
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    }

    let addedPlans = 0;
    let updatedPlans = 0;
    let duplicatesSkipped = 0;
    const duplicates: string[] = [];

    for (const row of data) {
      try {
        const rowData = row as any;
        
        // Skip empty rows
        if (!rowData || Object.keys(rowData).length === 0) {
          continue;
        }
        // Map Excel columns to service plan fields with trimming
        const planName = String(rowData['요금제명'] || rowData['planName'] || '').trim();
        const carrier = String(rowData['통신사'] || rowData['carrier'] || '').trim();
        
        // 월요금 처리 - 콤마와 공백 제거 후 숫자 변환
        const monthlyFeeRaw = String(rowData['월요금(원)'] || rowData['월요금'] || rowData['monthlyFee'] || '0');
        const monthlyFee = parseInt(monthlyFeeRaw.replace(/[^0-9]/g, '')) || 0;
        
        // 결합 가능 여부 처리
        const combinationEligibleRaw = rowData['결합가능'] || rowData['combinationEligible'] || false;
        const combinationEligible = combinationEligibleRaw === true || 
                                    combinationEligibleRaw === 'TRUE' || 
                                    combinationEligibleRaw === 'true' || 
                                    combinationEligibleRaw === '1' || 
                                    combinationEligibleRaw === 1;

        const planData: any = {
          planName: planName,
          carrier: carrier,
          planType: String(rowData['요금제유형'] || rowData['planType'] || rowData['유형'] || 'LTE').trim(),
          dataAllowance: String(rowData['데이터제공량'] || rowData['dataAllowance'] || rowData['데이터'] || '').trim(),
          monthlyFee: monthlyFee,
          combinationEligible: combinationEligible,
          isActive: rowData['활성여부'] !== false && rowData['isActive'] !== false
        };

        // Validate required fields (after trimming)
        if (!planData.planName || !planData.carrier) {
          console.warn('Skipping invalid row (missing planName or carrier):', {
            planName: planData.planName,
            carrier: planData.carrier,
            originalRow: rowData
          });
          continue;
        }

        // 중복 확인 - 요금제명과 통신사가 동일한 경우
        const existingPlan = await storage.findServicePlanByNameAndCarrier(planData.planName, planData.carrier);
        if (existingPlan) {
          // 기존 요금제가 있으면 결합 가능 여부만 업데이트
          console.log(`Updating existing service plan: ${planData.carrier} - ${planData.planName}, combinationEligible: ${combinationEligible}`);
          await storage.updateServicePlan(existingPlan.id, {
            ...planData,
            combinationEligible: combinationEligible
          });
          const duplicateKey = `${planData.carrier} - ${planData.planName} (업데이트됨)`;
          duplicates.push(duplicateKey);
          updatedPlans++;
          continue;
        }

        // Create service plan
        await storage.createServicePlan(planData);
        addedPlans++;
      } catch (error) {
        console.error('Error creating service plan from row:', rowData, error);
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(file.path);

    // 결과 메시지 생성
    let message = '';
    if (addedPlans > 0 && updatedPlans > 0) {
      message = `${addedPlans}개의 요금제가 추가되고, ${updatedPlans}개의 요금제가 업데이트되었습니다.`;
    } else if (addedPlans > 0) {
      message = `${addedPlans}개의 요금제가 추가되었습니다.`;
    } else if (updatedPlans > 0) {
      message = `${updatedPlans}개의 요금제가 업데이트되었습니다.`;
    } else {
      message = '처리된 요금제가 없습니다.';
    }
    
    if (duplicatesSkipped > 0) {
      message += ` (${duplicatesSkipped}개 처리)`;
    }

    res.json({ 
      success: true, 
      addedPlans,
      updatedPlans,
      duplicatesSkipped,
      duplicates: duplicates.slice(0, 10), // 최대 10개까지만 표시
      message
    });
  } catch (error) {
    console.error('Service plan Excel upload error:', error);
    res.status(500).json({ error: 'Excel 파일 처리 중 오류가 발생했습니다.' });
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

// Settlement Unit Pricing API Routes
router.get('/api/settlement-unit-prices', requireAdmin, async (req: any, res) => {
  try {
    const prices = await storage.getActiveSettlementUnitPrices();
    res.json(prices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/settlement-unit-prices/all', requireAdmin, async (req: any, res) => {
  try {
    const prices = await storage.getSettlementUnitPrices();
    res.json(prices);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/settlement-unit-prices', requireAdmin, async (req: any, res) => {
  try {
    console.log('Settlement unit price creation request body:', req.body);
    const data = createSettlementUnitPriceSchema.parse(req.body);
    console.log('Parsed data:', data);
    console.log('Session userId:', req.session.userId);
    
    const price = await storage.createSettlementUnitPrice({
      ...data,
      createdBy: req.session.userId
    });
    res.json(price);
  } catch (error: any) {
    console.error('Settlement unit price creation error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.put('/api/settlement-unit-prices/:servicePlanId', requireAdmin, async (req: any, res) => {
  try {
    const servicePlanId = parseInt(req.params.servicePlanId);
    const data = updateSettlementUnitPriceSchema.parse(req.body);
    const price = await storage.updateSettlementUnitPrice(servicePlanId, {
      ...data,
      updatedBy: req.session.userId
    });
    res.json(price);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/api/settlement-unit-prices/:servicePlanId', requireAdmin, async (req: any, res) => {
  try {
    const servicePlanId = parseInt(req.params.servicePlanId);
    await storage.deleteSettlementUnitPrice(servicePlanId);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

//===============================================
// 통신사별 부가서비스 정책 관리 API
//===============================================

// 통신사별 부가서비스 정책 목록 조회
router.get('/api/carrier-service-policies', requireAuth, async (req: any, res) => {
  try {
    const { carrier } = req.query;
    const policies = await storage.getCarrierServicePolicies(carrier);
    res.json(policies);
  } catch (error: any) {
    console.error('Get carrier service policies error:', error);
    res.status(500).json({ error: error.message || '부가서비스 정책 조회 중 오류가 발생했습니다.' });
  }
});

// 통신사별 부가서비스 정책 생성
router.post('/api/carrier-service-policies', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const data = createCarrierServicePolicySchema.parse(req.body);
    const policy = await storage.createCarrierServicePolicy({
      ...data,
      createdBy: req.user.id
    });
    res.json(policy);
  } catch (error: any) {
    console.error('Create carrier service policy error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: '입력 데이터 형식이 올바르지 않습니다.' });
    }
    res.status(500).json({ error: error.message || '부가서비스 정책 생성 중 오류가 발생했습니다.' });
  }
});

// 통신사별 부가서비스 정책 수정
router.put('/api/carrier-service-policies/:id', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const policyId = parseInt(req.params.id);
    const data = updateCarrierServicePolicySchema.parse(req.body);
    const policy = await storage.updateCarrierServicePolicy(policyId, data);
    
    if (!policy) {
      return res.status(404).json({ error: '부가서비스 정책을 찾을 수 없습니다.' });
    }
    
    res.json(policy);
  } catch (error: any) {
    console.error('Update carrier service policy error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: '입력 데이터 형식이 올바르지 않습니다.' });
    }
    res.status(500).json({ error: error.message || '부가서비스 정책 수정 중 오류가 발생했습니다.' });
  }
});

// 통신사별 부가서비스 정책 삭제
router.delete('/api/carrier-service-policies/:id', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const policyId = parseInt(req.params.id);
    const success = await storage.deleteCarrierServicePolicy(policyId);
    
    if (!success) {
      return res.status(404).json({ error: '부가서비스 정책을 찾을 수 없습니다.' });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete carrier service policy error:', error);
    res.status(500).json({ error: error.message || '부가서비스 정책 삭제 중 오류가 발생했습니다.' });
  }
});

// 정산에 부가서비스 정책 적용
router.post('/api/settlements/:documentId/apply-policy', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const { policyId, reason } = req.body;
    
    const logEntry = await storage.applyServicePolicyToSettlement({
      documentId,
      policyId: parseInt(policyId),
      reason,
      appliedBy: req.session.userId
    });
    
    res.json(logEntry);
  } catch (error: any) {
    console.error('Apply service policy error:', error);
    res.status(500).json({ error: error.message || '부가서비스 정책 적용 중 오류가 발생했습니다.' });
  }
});

// 정산 부가서비스 정책 적용 내역 조회
router.get('/api/settlements/:documentId/policy-logs', requireAuth, async (req: any, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const logs = await storage.getSettlementPolicyLogs(documentId);
    res.json(logs);
  } catch (error: any) {
    console.error('Get settlement policy logs error:', error);
    res.status(500).json({ error: error.message || '정산 정책 적용 내역 조회 중 오류가 발생했습니다.' });
  }
});

router.get('/api/settlement-unit-prices/service-plan/:servicePlanId', requireAdmin, async (req: any, res) => {
  try {
    const servicePlanId = parseInt(req.params.servicePlanId);
    const price = await storage.getSettlementUnitPriceByServicePlan(servicePlanId);
    res.json(price);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Additional Services API Routes
router.get('/api/additional-services', requireAuth, async (req: any, res) => {
  try {
    const { serviceType, carrier } = req.query;
    let additionalServices;
    
    if (carrier) {
      additionalServices = await storage.getAdditionalServicesByCarrier(carrier);
    } else if (serviceType) {
      additionalServices = await storage.getAdditionalServicesByType(serviceType);
    } else {
      additionalServices = await storage.getAdditionalServices();
    }
    
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

// 문서의 정산 정책 세부 정보 조회
router.get('/api/documents/:id/settlement-policy-details', requireAuth, async (req: any, res) => {
  try {
    const documentId = parseInt(req.params.id);
    
    // 문서 정보 조회
    const document = await storage.getDocumentById(documentId);
    if (!document) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    // 적용된 부가서비스 조회
    let appliedServices = [];
    if (document.additionalServiceIds) {
      try {
        const serviceIds = JSON.parse(document.additionalServiceIds);
        const allServices = await storage.getAdditionalServices();
        appliedServices = allServices.filter(service => serviceIds.includes(service.id));
      } catch (e) {
        console.warn('Error parsing additional service IDs:', e);
      }
    }

    // 정산 정책 세부 정보 구성
    const policyDetails = {
      documentId: documentId,
      appliedServices: appliedServices.map(service => ({
        id: service.id,
        name: service.serviceName,
        carrier: service.carrier,
        type: service.serviceType,
        monthlyFee: service.monthlyFee || 0
      })),
      bundleStatus: {
        applied: document.bundleApplied,
        notApplied: document.bundleNotApplied
      },
      fees: {
        registrationFeePrepaid: document.registrationFeePrepaid,
        registrationFeePostpaid: document.registrationFeePostpaid,
        simFeePrepaid: document.simFeePrepaid,
        simFeePostpaid: document.simFeePostpaid
      }
    };

    res.json(policyDetails);
  } catch (error: any) {
    console.error('Settlement policy details API error:', error);
    res.status(500).json({ error: error.message });
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
      dealerId: dealerId,
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

// 채팅 관련 API 엔드포인트
router.get('/api/chat/room/:documentId', requireAuth, async (req: any, res) => {
  try {
    console.log('Getting chat room for document:', req.params.documentId);
    console.log('Session data:', { 
      userId: req.session.userId, 
      userType: req.session.userType 
    });
    
    const documentId = parseInt(req.params.documentId);
    const chatRoom = await storage.getChatRoom(documentId);
    
    if (!chatRoom) {
      console.log('No chat room found for document:', documentId);
      return res.json({ room: null, messages: [] });
    }
    
    const messages = await storage.getChatMessages(chatRoom.id);
    console.log('Chat room found with', messages.length, 'messages');
    res.json({ room: chatRoom, messages });
  } catch (error: any) {
    console.error('Get chat room error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/chat/room', requireAuth, async (req: any, res) => {
  try {
    console.log('Creating chat room with body:', req.body);
    console.log('Session data:', { 
      userId: req.session.userId, 
      userType: req.session.userType 
    });
    
    const { documentId, dealerId, workerId } = req.body;
    
    // 기존 채팅방이 있는지 확인
    let chatRoom = await storage.getChatRoom(documentId);
    
    if (!chatRoom) {
      console.log('Creating new chat room for document:', documentId);
      // 새 채팅방 생성
      chatRoom = await storage.createChatRoom(documentId, dealerId, workerId);
      console.log('Chat room created:', chatRoom);
    } else if (workerId && !chatRoom.workerId) {
      console.log('Updating existing chat room with worker:', workerId);
      // 기존 채팅방에 근무자 할당
      chatRoom = await storage.updateChatRoom(chatRoom.id, { workerId });
      console.log('Chat room updated:', chatRoom);
    }
    
    const messages = await storage.getChatMessages(chatRoom.id);
    console.log('Returning chat room with', messages.length, 'messages');
    res.json({ room: chatRoom, messages });
  } catch (error: any) {
    console.error('Create chat room error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/chat/messages/:roomId', requireAuth, async (req: any, res) => {
  try {
    const roomId = parseInt(req.params.roomId);
    const messages = await storage.getChatMessages(roomId);
    res.json(messages);
  } catch (error: any) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 채팅 API 라우트들
router.post('/api/chat/room', requireAuth, async (req: any, res) => {
  try {
    const { documentId, dealerId, workerId } = req.body;
    
    // 기존 채팅방 확인
    const existingRoom = await storage.getChatRoom(documentId);
    if (existingRoom) {
      const messages = await storage.getChatMessages(existingRoom.id);
      return res.json({ room: existingRoom, messages });
    }
    
    // 새 채팅방 생성
    const room = await storage.createChatRoom(documentId, dealerId, workerId);
    const messages = await storage.getChatMessages(room.id);
    
    res.json({ room, messages });
  } catch (error: any) {
    console.error('Chat room creation error:', error);
    res.status(500).json({ error: '채팅방 생성에 실패했습니다.' });
  }
});

router.get('/api/chat/room/:documentId', requireAuth, async (req: any, res) => {
  try {
    const documentId = parseInt(req.params.documentId);
    const room = await storage.getChatRoom(documentId);
    
    if (!room) {
      return res.status(404).json({ error: '채팅방을 찾을 수 없습니다.' });
    }
    
    const messages = await storage.getChatMessages(room.id);
    res.json({ room, messages });
  } catch (error: any) {
    console.error('Get chat room error:', error);
    res.status(500).json({ error: '채팅방 조회에 실패했습니다.' });
  }
});

router.post('/api/chat/message', requireAuth, async (req: any, res) => {
  try {
    const { roomId, message } = req.body;
    const { userId, userType, userRole } = req.session;
    
    const senderType = userType === 'admin' || userRole === 'dealer_worker' ? 'worker' : 'dealer';
    // 사용자 이름 가져오기
    let senderName = '사용자';
    try {
      const user = await storage.getUserById(userId);
      senderName = user?.name || '사용자';
    } catch (error) {
      console.log('Failed to get user name, using default');
    }
    
    const chatMessage = await storage.createChatMessage({
      roomId,
      senderId: userId,
      senderType,
      senderName,
      message,
      messageType: 'text'
    });
    
    res.json(chatMessage);
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: '메시지 전송에 실패했습니다.' });
  }
});

// 관리자 패널에서 생성된 영업과장 계정 목록 조회 (팀에 배정되지 않은 계정들)
router.get('/api/admin/unassigned-sales-managers', requireAuth, async (req: any, res) => {
  try {
    const unassignedManagers = await storage.getUnassignedSalesManagerAccounts();
    res.json(unassignedManagers);
  } catch (error: any) {
    console.error('Get unassigned sales managers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 영업과장을 팀에 배정하는 API
router.post('/api/admin/assign-sales-manager', requireAuth, async (req: any, res) => {
  try {
    const data = assignSalesManagerToTeamSchema.parse(req.body);
    const result = await storage.assignSalesManagerToTeam(data);
    res.json(result);
  } catch (error: any) {
    console.error('Assign sales manager error:', error);
    res.status(400).json({ error: error.message });
  }
});

// 대시보드 API 라우트들
router.get('/api/dashboard/stats', requireAuth, async (req: any, res) => {
  try {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 중복 라우트 제거됨 - 위에 정의된 라우트 사용

router.get('/api/dashboard/worker-stats', requireAuth, async (req: any, res) => {
  try {
    const workerStats = await storage.getWorkerStats();
    res.json(workerStats);
  } catch (error: any) {
    console.error('Worker stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/dashboard/carrier-stats', requireAuth, async (req: any, res) => {
  try {
    const carrierStats = await storage.getCarrierStats();
    res.json(carrierStats);
  } catch (error: any) {
    console.error('Carrier stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/pricing-tables/active', requireAuth, async (req: any, res) => {
  try {
    const pricingTables = await storage.getActivePricingTables();
    res.json(pricingTables);
  } catch (error: any) {
    console.error('Pricing tables error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 접점코드 관리 API
router.get('/api/contact-codes', requireAuth, async (req: any, res) => {
  try {
    const contactCodes = await storage.getContactCodes();
    res.json(contactCodes);
  } catch (error: any) {
    console.error('Get contact codes error:', error);
    res.status(500).json({ error: '접점코드 조회에 실패했습니다.' });
  }
});

// 부가서비스 정책을 기존 정산 데이터에 적용
router.post('/api/settlements/recalculate', requireAuth, async (req: any, res) => {
  try {
    const { userId, userType } = req.session;
    
    if (userType !== 'admin') {
      return res.status(403).json({ error: '관리자만 접근 가능합니다.' });
    }

    // 모든 개통 완료 문서의 정산금액을 부가서비스 정책을 적용하여 재계산
    const result = await storage.recalculateAllSettlementsWithPolicies();
    res.json({ 
      message: '정산 금액이 부가서비스 정책을 반영하여 재계산되었습니다.',
      updatedDocuments: result 
    });
  } catch (error: any) {
    console.error('Recalculate settlements error:', error);
    res.status(500).json({ error: '정산 재계산에 실패했습니다.' });
  }
});

router.get('/api/contact-codes/carrier/:carrier', requireAuth, async (req: any, res) => {
  try {
    const { carrier } = req.params;
    const contactCodes = await storage.getContactCodesByCarrier(carrier);
    res.json(contactCodes);
  } catch (error: any) {
    console.error('Get contact codes by carrier error:', error);
    res.status(500).json({ error: '접점코드 조회에 실패했습니다.' });
  }
});

router.get('/api/contact-codes/search/:code', requireAuth, async (req: any, res) => {
  try {
    const { code } = req.params;
    const contactCode = await storage.findContactCodeByCode(code);
    if (contactCode) {
      res.json(contactCode);
    } else {
      res.status(404).json({ error: '접점코드를 찾을 수 없습니다.' });
    }
  } catch (error: any) {
    console.error('Find contact code error:', error);
    res.status(500).json({ error: '접점코드 검색에 실패했습니다.' });
  }
});

// 판매점 생성 API
router.post('/api/dealers', requireAuth, async (req: any, res) => {
  try {
    const { userId, userType } = req.session;
    
    if (userType !== 'admin') {
      return res.status(403).json({ error: '관리자만 접근 가능합니다.' });
    }

    const { name, username, password, contactEmail, contactPhone, location } = req.body;
    
    if (!name || !username || !password || !contactEmail || !contactPhone || !location) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    // 사용자명 중복 검사
    const existingDealer = await storage.getDealerByUsername(username);
    if (existingDealer) {
      return res.status(400).json({ error: '이미 존재하는 아이디입니다.' });
    }

    const dealer = await storage.createDealer({
      name,
      username,
      password,
      contactEmail,
      contactPhone,
      location,
    });

    res.json(dealer);
  } catch (error: any) {
    console.error('Create dealer error:', error);
    res.status(500).json({ error: '판매점 생성에 실패했습니다.' });
  }
});

// 접점코드 다중 검색 API (부분 일치)
router.get('/api/contact-codes/search', requireAuth, async (req: any, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 1) {
      return res.json([]);
    }
    
    const results = await storage.searchContactCodes(q as string);
    res.json(results);
  } catch (error: any) {
    console.error('Search contact codes error:', error);
    res.status(500).json({ error: '접점코드 검색에 실패했습니다.' });
  }
});

router.post('/api/contact-codes', requireAuth, async (req: any, res) => {
  try {
    const { code, dealerName, realSalesPOS, carrier, isActive, salesManagerId, salesManagerName } = req.body;
    const contactCode = await storage.createContactCode({
      code,
      dealerName,
      realSalesPOS: realSalesPOS || null,
      carrier,
      isActive: isActive !== undefined ? isActive : true,
      salesManagerId: salesManagerId || null,
      salesManagerName: salesManagerName || null
    });
    res.json(contactCode);
  } catch (error: any) {
    console.error('Create contact code error:', error);
    res.status(500).json({ error: '접점코드 생성에 실패했습니다.' });
  }
});

router.put('/api/contact-codes/:id', requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { code, dealerName, realSalesPOS, carrier, isActive } = req.body;
    const contactCode = await storage.updateContactCode(id, {
      code,
      dealerName,
      realSalesPOS: realSalesPOS || null,
      carrier,
      isActive
    });
    res.json(contactCode);
  } catch (error: any) {
    console.error('Update contact code error:', error);
    res.status(500).json({ error: '접점코드 수정에 실패했습니다.' });
  }
});

router.delete('/api/contact-codes/:id', requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteContactCode(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete contact code error:', error);
    res.status(500).json({ error: '접점코드 삭제에 실패했습니다.' });
  }
});

// 접점코드 엑셀 업로드 API
router.post('/api/contact-codes/upload-excel', contactCodeUpload.single('file'), requireAuth, async (req: any, res) => {
  let filePath: string | null = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일을 업로드해주세요.' });
    }

    const forceUpdate = req.body.forceUpdate === 'true';
    console.log('💪 Force update mode:', forceUpdate);
    console.log('📋 Request body forceUpdate value:', req.body.forceUpdate);

    filePath = req.file.path;
    console.log('Processing file:', filePath);

    // 파일 존재 여부 확인
    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: '업로드된 파일을 찾을 수 없습니다.' });
    }

    const XLSX = await import('xlsx');
    const workbook = XLSX.default ? XLSX.default.readFile(filePath) : XLSX.readFile(filePath);
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ error: '엑셀 파일에 시트를 찾을 수 없습니다.' });
    }
    
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    if (!worksheet) {
      return res.status(400).json({ error: '엑셀 파일에 데이터를 찾을 수 없습니다.' });
    }

    // CSV 파일의 경우 첫 번째 행이 "Column1,Column2,Column3"일 수 있으므로 raw 데이터로 처리
    const rawData = XLSX.default ? XLSX.default.utils.sheet_to_json(worksheet, { header: 1 }) : XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (!rawData || rawData.length < 2) {
      return res.status(400).json({ error: '엑셀 파일에 데이터가 없습니다.' });
    }

    let addedCodes = 0;
    let duplicatesSkipped = 0;
    const errors: string[] = [];

    // 헤더 행 찾기 (접점코드, 판매점명, 통신사, 담당영업과장이 포함된 행)
    let headerIndex = -1;
    for (let i = 0; i < Math.min(5, rawData.length); i++) {
      const row = rawData[i] as any[];
      if (row && row.length >= 3) {
        const hasContactCode = row.some(cell => cell && String(cell).includes('접점코드'));
        const hasDealerName = row.some(cell => cell && String(cell).includes('판매점명'));
        const hasCarrier = row.some(cell => cell && String(cell).includes('통신사'));
        
        if (hasContactCode && hasDealerName && hasCarrier) {
          headerIndex = i;
          break;
        }
      }
    }

    if (headerIndex === -1) {
      return res.status(400).json({ error: '접점코드, 판매점명, 통신사 헤더를 찾을 수 없습니다.' });
    }

    const headers = rawData[headerIndex] as any[];
    const dataRows = rawData.slice(headerIndex + 1);

    // 컬럼 인덱스 찾기
    let codeIndex = -1, dealerNameIndex = -1, realSalesPOSIndex = -1, carrierIndex = -1, salesManagerIndex = -1;
    
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i]).trim();
      if (header.includes('접점코드') || header.toLowerCase().includes('code')) {
        codeIndex = i;
      } else if (header.includes('판매점명') || header.toLowerCase().includes('dealer')) {
        dealerNameIndex = i;
      } else if (header.includes('실판매POS') || header.includes('실판매pos') || header.toLowerCase().includes('realsalespos')) {
        realSalesPOSIndex = i;
      } else if (header.includes('통신사') || header.toLowerCase().includes('carrier')) {
        carrierIndex = i;
      } else if (header.includes('담당영업과장') || header.includes('영업과장') || header.toLowerCase().includes('manager')) {
        salesManagerIndex = i;
      }
    }

    if (codeIndex === -1 || dealerNameIndex === -1 || carrierIndex === -1) {
      return res.status(400).json({ error: '필수 컬럼을 찾을 수 없습니다. (접점코드, 판매점명, 통신사)' });
    }

    console.log(`Processing ${dataRows.length} rows`);
    
    // 각 행에 대해 접점코드 생성
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as any[];
      
      try {
        const code = row[codeIndex];
        const dealerName = row[dealerNameIndex];
        const realSalesPOS = realSalesPOSIndex >= 0 ? row[realSalesPOSIndex] : null;
        const carrier = row[carrierIndex];
        const salesManagerName = salesManagerIndex >= 0 ? row[salesManagerIndex] : null;
        
        console.log(`Row ${i + 2}: code=${code}, dealer=${dealerName}, realSalesPOS=${realSalesPOS}, carrier=${carrier}, salesManager=${salesManagerName}`);
        
        if (!code || !dealerName || !carrier) {
          const errorMsg = `${i + 2}행: 필수 정보가 누락되었습니다 (접점코드: ${code || 'X'}, 판매점명: ${dealerName || 'X'}, 통신사: ${carrier || 'X'})`;
          console.log(errorMsg);
          errors.push(errorMsg);
          continue;
        }

        // 영업과장 정보 매핑 (선택사항)
        let salesManagerId = null;
        if (salesManagerName && String(salesManagerName).trim()) {
          const managerName = String(salesManagerName).trim();
          const salesManager = await storage.getSalesManagerByName(managerName);
          if (salesManager) {
            salesManagerId = salesManager.id;
            console.log(`Found sales manager: ${managerName} (ID: ${salesManagerId})`);
          } else {
            // 영업과장을 찾을 수 없어도 접점코드는 등록 진행 (warning으로 변경)
            console.log(`Warning: ${i + 2}행 - 영업과장 '${managerName}'을 찾을 수 없습니다. 접점코드는 등록됩니다.`);
          }
        }

        // 기존 접점코드 확인
        const existingCode = await storage.findContactCodeByCode(String(code).trim());
        if (existingCode) {
          // 데이터가 변경된 경우에만 업데이트
          const newCarrier = String(carrier).trim();
          const newDealerName = String(dealerName).trim();
          const newRealSalesPOS = realSalesPOS ? String(realSalesPOS).trim() : null;
          
          const hasChanges = forceUpdate || (
            existingCode.carrier !== newCarrier ||
            existingCode.dealerName !== newDealerName ||
            existingCode.realSalesPOS !== newRealSalesPOS ||
            existingCode.salesManagerId !== salesManagerId
          );
          
          if (hasChanges) {
            console.log(`🔄 ${forceUpdate ? 'FORCE UPDATE' : 'UPDATE'}: ${code}`);
            console.log(`  📊 Changes - carrier: ${existingCode.carrier} → ${newCarrier}`);
            console.log(`  🏪 Changes - dealer: ${existingCode.dealerName} → ${newDealerName}`);
            console.log(`  📱 Changes - realSalesPOS: ${existingCode.realSalesPOS} → ${newRealSalesPOS}`);
            console.log(`  👤 Changes - salesManagerId: ${existingCode.salesManagerId} → ${salesManagerId}`);
            
            await storage.updateContactCode(existingCode.id, {
              carrier: newCarrier,
              dealerName: newDealerName,
              realSalesPOS: newRealSalesPOS,
              salesManagerId: salesManagerId,
              salesManagerName: salesManagerName ? String(salesManagerName).trim() : null,
              isActive: true // 중요: 업데이트 시에도 활성 상태 유지
            });
            addedCodes++;
            console.log(`✅ Successfully updated contact code: ${code}`);
          } else {
            duplicatesSkipped++;
            console.log(`⏭️  Skipping contact code: ${code} (no changes detected)`);
            if (!forceUpdate) {
              console.log(`💡 Tip: Enable force update to update all codes regardless of changes`);
            }
          }
          continue;
        }

        // 새 접점코드 생성
        const newContactCode = {
          code: String(code).trim(),
          dealerName: String(dealerName).trim(),
          realSalesPOS: realSalesPOS ? String(realSalesPOS).trim() : null,
          carrier: String(carrier).trim(),
          isActive: true,
          salesManagerId: salesManagerId,
          salesManagerName: salesManagerName ? String(salesManagerName).trim() : null
        };
        
        console.log(`Creating contact code:`, newContactCode);
        await storage.createContactCode(newContactCode);
        
        addedCodes++;
        console.log(`Successfully added contact code: ${code}`);
      } catch (error: any) {
        const errorMsg = `${i + 2}행: ${error.message}`;
        console.error(errorMsg, error);
        errors.push(errorMsg);
      }
    }

    // 임시 파일 삭제
    try {
      if (filePath) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Failed to delete temp file:', error);
    }

    console.log(`Upload completed: addedCodes=${addedCodes}, errors=${errors.length}`);

    if (addedCodes === 0 && errors.length > 0) {
      return res.status(400).json({ 
        error: '접점코드를 추가하지 못했습니다.',
        details: errors.slice(0, 10), // 최대 10개 오류 표시
        totalErrors: errors.length
      });
    }

    res.json({
      processed: addedCodes,
      duplicatesSkipped,
      errors: errors.length > 0 ? errors.slice(0, 10) : [],
      totalErrors: errors.length,
      message: `${addedCodes}개의 접점코드가 성공적으로 추가되었습니다.${errors.length > 0 ? ` (${errors.length}개 오류)` : ''}${duplicatesSkipped > 0 ? ` (${duplicatesSkipped}개 중복건 제외)` : ''}`
    });

  } catch (error: any) {
    console.error('Contact code excel upload error:', error);
    console.error('Error details:', error.stack);
    
    // 임시 파일 삭제
    if (filePath) {
      try {
        fs.unlinkSync(filePath);
      } catch (deleteError) {
        console.error('Failed to delete temp file:', deleteError);
      }
    }
    
    res.status(500).json({ 
      error: '파일 처리 중 오류가 발생했습니다.',
      details: error.message 
    });
  }
});

// ==================== 통신사 관리 API ====================

// 모든 통신사 조회 (공개 API)
router.get('/api/carriers', async (req: any, res) => {
  try {
    const carriers = await storage.getCarriers();
    // 활성화된 통신사만 반환
    const activeCarriers = carriers.filter(carrier => carrier.isActive);
    res.json(activeCarriers);
  } catch (error: any) {
    console.error('Get carriers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 등록된 문서의 통신사 목록 조회
router.get('/api/carriers/from-documents', async (req: any, res) => {
  try {
    const carriers = await storage.getCarriersFromDocuments();
    res.json(carriers);
  } catch (error: any) {
    console.error('Get carriers from documents error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 통신사 생성 (관리자 전용)
router.post('/api/carriers', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const data = createCarrierSchema.parse(req.body);
    const carrier = await storage.createCarrier(data);
    res.json(carrier);
  } catch (error: any) {
    console.error('Create carrier error:', error);
    res.status(400).json({ error: error.message });
  }
});

// 통신사 수정 (관리자 전용)
router.put('/api/carriers/:id', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateCarrierSchema.parse(req.body);
    const carrier = await storage.updateCarrier(id, data);
    res.json(carrier);
  } catch (error: any) {
    console.error('Update carrier error:', error);
    res.status(400).json({ error: error.message });
  }
});

// 통신사 삭제 (관리자 전용)
router.delete('/api/carriers/:id', requireAuth, requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteCarrier(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete carrier error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 통신사 엑셀 양식 다운로드
router.get('/api/carriers/excel-template', requireAuth, requireAdmin, (req: any, res) => {
  try {
    // 엑셀 양식 데이터 구조
    const templateData = [
      {
        '통신사명': 'KT',
        '표시순서': 1,
        '활성화': true,
        '유선통신사여부': false,
        '결합번호': '',
        '결합통신사': '',
        '서류필수': false,
        '고객명필수': true,
        '고객전화번호필수': true,
        '고객이메일필수': false,
        '접점코드필수': true,
        '통신사필수': true,
        '이전통신사필수': false,
        '서류업로드필수': false,
        '결합번호필수': false,
        '결합통신사필수': false
      },
      {
        '통신사명': 'SK',
        '표시순서': 2,
        '활성화': true,
        '유선통신사여부': false,
        '결합번호': '',
        '결합통신사': '',
        '서류필수': false,
        '고객명필수': true,
        '고객전화번호필수': true,
        '고객이메일필수': false,
        '접점코드필수': true,
        '통신사필수': true,
        '이전통신사필수': false,
        '서류업로드필수': false,
        '결합번호필수': false,
        '결합통신사필수': false
      }
    ];

    // 워크시트 생성
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '통신사 양식');

    // 응답 헤더 설정
    const filename = `통신사_업로드_양식_${format(new Date(), 'yyyyMMdd', { locale: ko })}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);

    // 엑셀 파일 생성 및 전송
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.send(buffer);
  } catch (error: any) {
    console.error('Excel template download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 통신사 엑셀 업로드
router.post('/api/carriers/upload-excel', requireAuth, requireAdmin, contactCodeUpload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 선택되지 않았습니다.' });
    }

    console.log('Reading Excel file:', req.file.path);

    // 엑셀 파일 읽기
    let workbook;
    try {
      // XLSX 모듈이 제대로 로드되었는지 확인
      if (typeof XLSX.readFile !== 'function') {
        console.error('XLSX.readFile is not available, trying to read file with buffer');
        const fileBuffer = fs.readFileSync(req.file.path);
        workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      } else {
        workbook = XLSX.readFile(req.file.path);
      }
    } catch (readError) {
      console.error('Error reading Excel file:', readError);
      return res.status(400).json({ error: '엑셀 파일을 읽는데 실패했습니다. 파일이 손상되었거나 잘못된 형식일 수 있습니다.' });
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ error: '엑셀 파일에 워크시트가 없습니다.' });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    if (!worksheet) {
      return res.status(400).json({ error: '워크시트를 읽을 수 없습니다.' });
    }

    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log('Excel data parsed:', data.length, 'rows');

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      try {
        const carrierData = {
          name: row['통신사명'] || row['name'],
          displayOrder: parseInt(row['표시순서'] || row['displayOrder']) || 0,
          isActive: row['활성화'] === true || row['활성화'] === 'true' || row['isActive'] === true,
          isWired: row['유선통신사여부'] === true || row['유선통신사여부'] === 'true' || row['isWired'] === true,
          bundleNumber: row['결합번호'] || row['bundleNumber'] || '',
          bundleCarrier: row['결합통신사'] || row['bundleCarrier'] || '',
          documentRequired: row['서류필수'] === true || row['서류필수'] === 'true' || row['documentRequired'] === true,
          requireCustomerName: row['고객명필수'] !== false && row['고객명필수'] !== 'false' && row['requireCustomerName'] !== false,
          requireCustomerPhone: row['고객전화번호필수'] !== false && row['고객전화번호필수'] !== 'false' && row['requireCustomerPhone'] !== false,
          requireCustomerEmail: row['고객이메일필수'] === true || row['고객이메일필수'] === 'true' || row['requireCustomerEmail'] === true,
          requireContactCode: row['접점코드필수'] !== false && row['접점코드필수'] !== 'false' && row['requireContactCode'] !== false,
          requireCarrier: row['통신사필수'] !== false && row['통신사필수'] !== 'false' && row['requireCarrier'] !== false,
          requirePreviousCarrier: row['이전통신사필수'] === true || row['이전통신사필수'] === 'true' || row['requirePreviousCarrier'] === true,
          requireDocumentUpload: row['서류업로드필수'] === true || row['서류업로드필수'] === 'true' || row['requireDocumentUpload'] === true,
          requireBundleNumber: row['결합번호필수'] === true || row['결합번호필수'] === 'true' || row['requireBundleNumber'] === true,
          requireBundleCarrier: row['결합통신사필수'] === true || row['결합통신사필수'] === 'true' || row['requireBundleCarrier'] === true,
        };

        if (!carrierData.name) {
          errors.push(`${i + 2}행: 통신사명이 비어있습니다.`);
          errorCount++;
          continue;
        }

        await storage.createCarrier(carrierData);
        successCount++;
      } catch (error: any) {
        console.error(`Row ${i + 2} error:`, error);
        errors.push(`${i + 2}행: ${error.message}`);
        errorCount++;
      }
    }

    // 업로드된 파일 삭제
    fs.unlinkSync(req.file.path);

    const message = `총 ${data.length}건 중 ${successCount}건 성공, ${errorCount}건 실패`;
    res.json({
      success: true,
      message,
      successCount,
      errorCount,
      errors: errors.slice(0, 10) // 최대 10개 오류만 반환
    });
  } catch (error: any) {
    console.error('Carriers excel upload error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Pricing Policies API
router.get('/api/pricing-policies', requireAdmin, async (req, res) => {
  try {
    const policies = await storage.getPricingPolicies();
    res.json(policies);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/pricing-policies', requireAdmin, async (req: any, res) => {
  try {
    const data = req.body;
    const policy = await storage.createPricingPolicy(data);
    res.json(policy);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/api/pricing-policies/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const policy = await storage.getPricingPolicy(id);
    
    if (!policy) {
      return res.status(404).json({ error: '단가표 정책을 찾을 수 없습니다.' });
    }
    
    res.json(policy);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/api/pricing-policies/:id', requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const policy = await storage.updatePricingPolicy(id, data);
    res.json(policy);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/api/pricing-policies/:id', requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deletePricingPolicy(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 자동 커미션 계산 API
router.post('/api/pricing-policies/calculate-commission', requireAuth, async (req: any, res) => {
  try {
    const { carrier, servicePlanName } = req.body;
    const commissionAmount = await storage.calculateCommissionForDocument(carrier, servicePlanName);
    res.json({ commissionAmount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 정산단가 엑셀 업로드 API
router.post('/api/admin/settlement-pricing/excel-upload', contactCodeUpload.single('file'), requireAuth, async (req: any, res) => {
  let filePath: string | null = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일을 업로드해주세요.' });
    }

    filePath = req.file.path;
    console.log('Processing settlement pricing file:', filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ error: '업로드된 파일을 찾을 수 없습니다.' });
    }

    const XLSX = await import('xlsx');
    const workbook = XLSX.default ? XLSX.default.readFile(filePath) : XLSX.readFile(filePath);
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res.status(400).json({ error: '엑셀 파일에 시트를 찾을 수 없습니다.' });
    }
    
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    if (!worksheet) {
      return res.status(400).json({ error: '엑셀 파일에 데이터를 찾을 수 없습니다.' });
    }

    const rawData = XLSX.default ? XLSX.default.utils.sheet_to_json(worksheet, { header: 1 }) : XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (!rawData || rawData.length < 2) {
      return res.status(400).json({ error: '엑셀 파일에 데이터가 없습니다.' });
    }

    let processedCount = 0;
    let duplicatesSkipped = 0;
    const errors: string[] = [];

    // 헤더 행 찾기 (통신사, 요금제명, 정산단가가 포함된 행)
    let headerIndex = -1;
    for (let i = 0; i < Math.min(5, rawData.length); i++) {
      const row = rawData[i] as any[];
      if (row && row.length >= 3) {
        const hasCarrier = row.some(cell => cell && String(cell).includes('통신사'));
        const hasPlanName = row.some(cell => cell && String(cell).includes('요금제'));
        const hasUnitPrice = row.some(cell => cell && (String(cell).includes('정산단가') || String(cell).includes('단가')));
        
        if (hasCarrier && hasPlanName && hasUnitPrice) {
          headerIndex = i;
          break;
        }
      }
    }

    if (headerIndex === -1) {
      return res.status(400).json({ error: '통신사, 요금제명, 정산단가 헤더를 찾을 수 없습니다.' });
    }

    const headers = rawData[headerIndex] as any[];
    const dataRows = rawData.slice(headerIndex + 1);

    // 컬럼 인덱스 찾기
    let carrierIndex = -1, planNameIndex = -1, unitPriceIndex = -1;
    
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i]).trim();
      if (header.includes('통신사')) {
        carrierIndex = i;
      } else if (header.includes('요금제')) {
        planNameIndex = i;
      } else if (header.includes('정산단가') || header.includes('단가')) {
        unitPriceIndex = i;
      }
    }

    if (carrierIndex === -1 || planNameIndex === -1 || unitPriceIndex === -1) {
      return res.status(400).json({ error: '필수 컬럼을 찾을 수 없습니다. (통신사, 요금제명, 정산단가)' });
    }

    console.log(`Processing ${dataRows.length} settlement pricing rows`);
    
    // 각 행에 대해 정산단가 처리
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i] as any[];
      
      try {
        const carrier = row[carrierIndex];
        const planName = row[planNameIndex];
        const unitPrice = row[unitPriceIndex];
        
        console.log(`Row ${i + 2}: carrier=${carrier}, planName=${planName}, unitPrice=${unitPrice}`);
        
        if (!carrier || !planName || !unitPrice) {
          const errorMsg = `${i + 2}행: 필수 정보가 누락되었습니다 (통신사: ${carrier || 'X'}, 요금제명: ${planName || 'X'}, 정산단가: ${unitPrice || 'X'})`;
          console.log(errorMsg);
          errors.push(errorMsg);
          continue;
        }

        // 숫자 변환
        const parsedUnitPrice = parseFloat(String(unitPrice).replace(/[,\s]/g, ''));
        if (isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
          const errorMsg = `${i + 2}행: 정산단가가 올바르지 않습니다 (${unitPrice})`;
          console.log(errorMsg);
          errors.push(errorMsg);
          continue;
        }

        // 해당 통신사와 요금제명으로 서비스 플랜 찾기
        const servicePlans = await storage.getServicePlans();
        const matchingPlan = servicePlans.find(plan => 
          plan.carrier.trim() === String(carrier).trim() && 
          plan.planName.trim() === String(planName).trim()
        );

        if (!matchingPlan) {
          const errorMsg = `${i + 2}행: 해당 통신사(${carrier})와 요금제명(${planName})에 맞는 서비스 플랜을 찾을 수 없습니다`;
          console.log(errorMsg);
          errors.push(errorMsg);
          continue;
        }

        // 정산단가 생성 또는 업데이트
        const existingPrice = await storage.getSettlementUnitPriceByServicePlan(matchingPlan.id);
        
        if (existingPrice) {
          // 기존 단가와 같은 값이면 중복으로 처리
          if (existingPrice.unitPrice === parsedUnitPrice) {
            duplicatesSkipped++;
            console.log(`Skipping duplicate settlement price: ${carrier} - ${planName} (${parsedUnitPrice})`);
            continue;
          }
          // 기존 단가 업데이트
          await storage.updateSettlementUnitPrice(matchingPlan.id, {
            unitPrice: parsedUnitPrice,
          }, req.user.id);
        } else {
          // 새 단가 생성
          await storage.createSettlementUnitPrice({
            servicePlanId: matchingPlan.id,
            unitPrice: parsedUnitPrice,
          }, req.user.id);
        }
        
        processedCount++;
        console.log(`Successfully processed row ${i + 2}: ${carrier} - ${planName} - ${parsedUnitPrice}`);
        
      } catch (rowError: any) {
        const errorMsg = `${i + 2}행 처리 중 오류: ${rowError.message}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // 파일 삭제
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    console.log(`Settlement pricing upload completed. Processed: ${processedCount}, Errors: ${errors.length}`);

    res.json({
      success: true,
      processed: processedCount,
      duplicatesSkipped,
      errors: errors.length > 0 ? errors.slice(0, 10) : [], // 최대 10개 오류만 표시
      message: `${processedCount}개 정산단가가 처리되었습니다.${errors.length > 0 ? ` (${errors.length}개 오류 발생)` : ''}${duplicatesSkipped > 0 ? ` (${duplicatesSkipped}개 중복건 제외)` : ''}`
    });

  } catch (error: any) {
    console.error('Settlement pricing excel upload error:', error);
    
    // 파일 삭제
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (deleteError) {
        console.error('Failed to delete file:', deleteError);
      }
    }
    
    res.status(500).json({ 
      error: '정산단가 업로드 중 오류가 발생했습니다: ' + error.message 
    });
  }
});

// Additional service deduction routes
router.get('/api/additional-service-deductions', requireAuth, async (req, res) => {
  try {
    const deductions = await storage.getAdditionalServiceDeductions();
    res.json(deductions);
  } catch (error) {
    console.error('Error fetching additional service deductions:', error);
    res.status(500).json({ error: 'Failed to fetch additional service deductions' });
  }
});

router.post('/api/additional-service-deductions', requireAuth, async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId || session.userType !== 'admin') {
      return res.status(403).json({ error: '관리자만 차감 정책을 추가할 수 있습니다.' });
    }

    const validation = createAdditionalServiceDeductionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const deduction = await storage.createAdditionalServiceDeduction({
      ...validation.data,
      createdBy: session.userId
    });
    res.json(deduction);
  } catch (error: any) {
    console.error('Error creating additional service deduction:', error);
    res.status(500).json({ error: error.message || 'Failed to create additional service deduction' });
  }
});

router.put('/api/additional-service-deductions/:id', requireAuth, async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId || session.userType !== 'admin') {
      return res.status(403).json({ error: '관리자만 차감 정책을 수정할 수 있습니다.' });
    }

    const additionalServiceId = parseInt(req.params.id);
    const validation = updateAdditionalServiceDeductionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.errors[0].message });
    }

    const deduction = await storage.updateAdditionalServiceDeduction(additionalServiceId, {
      ...validation.data,
      updatedBy: session.userId
    });
    res.json(deduction);
  } catch (error: any) {
    console.error('Error updating additional service deduction:', error);
    res.status(500).json({ error: error.message || 'Failed to update additional service deduction' });
  }
});

router.delete('/api/additional-service-deductions/:id', requireAuth, async (req, res) => {
  try {
    const session = req.session as any;
    if (!session?.userId || session.userType !== 'admin') {
      return res.status(403).json({ error: '관리자만 차감 정책을 삭제할 수 있습니다.' });
    }

    const additionalServiceId = parseInt(req.params.id);
    await storage.deleteAdditionalServiceDeduction(additionalServiceId);
    res.json({ message: 'Additional service deduction deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting additional service deduction:', error);
    res.status(500).json({ error: error.message || 'Failed to delete additional service deduction' });
  }
});

//===============================================
// 영업팀 및 영업과장 관리 API
//===============================================

// 영업과장 로그인 API (기존 로그인과 분리)
router.post('/api/auth/sales-manager-login', async (req, res) => {
  try {
    const { username, password } = salesManagerLoginSchema.parse(req.body);
    
    const manager = await storage.getSalesManagerByUsername(username);
    if (!manager) {
      return res.status(401).json({ 
        success: false, 
        error: '아이디 또는 비밀번호가 올바르지 않습니다.' 
      });
    }
    
    const isValidPassword = await bcrypt.compare(password, manager.password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        success: false, 
        error: '아이디 또는 비밀번호가 올바르지 않습니다.' 
      });
    }
    
    const sessionId = await storage.createSession(
      manager.id, 
      'sales_manager', 
      manager.id, 
      manager.teamId
    );
    
    const response: AuthResponse = {
      success: true,
      user: {
        id: manager.id,
        name: manager.managerName,
        username: manager.username,
        userType: 'sales_manager',
      },
      sessionId
    };
    
    res.json(response);
  } catch (error: any) {
    console.error('Sales manager login error:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message || '로그인 중 오류가 발생했습니다.' 
    });
  }
});

// 영업팀 관리 API
router.post('/api/admin/sales-teams', requireAdmin, async (req: any, res) => {
  try {
    const data = createSalesTeamSchema.parse(req.body);
    const team = await storage.createSalesTeam(data);
    res.json(team);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/api/admin/sales-teams', requireAdmin, async (req: any, res) => {
  try {
    const teams = await storage.getSalesTeams();
    res.json(teams);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/admin/sales-teams/:id', requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const team = await storage.getSalesTeamById(id);
    
    if (!team) {
      return res.status(404).json({ error: '영업팀을 찾을 수 없습니다.' });
    }
    
    res.json(team);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/api/admin/sales-teams/:id', requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateSalesTeamSchema.parse(req.body);
    const team = await storage.updateSalesTeam(id, data);
    res.json(team);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/api/admin/sales-teams/:id', requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteSalesTeam(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 영업과장 관리 API
// 중복 라우트 제거됨 - 위쪽의 기존 라우트 사용

router.get('/api/admin/sales-managers/:id', requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const manager = await storage.getSalesManagerById(id);
    
    if (!manager) {
      return res.status(404).json({ error: '영업과장을 찾을 수 없습니다.' });
    }
    
    res.json(manager);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/api/admin/sales-managers/:id', requireAdmin, async (req: any, res) => {
  try {
    console.log('Sales manager update request - params:', req.params);
    console.log('Sales manager update request - body:', req.body);
    
    const id = parseInt(req.params.id);
    const data = updateSalesManagerSchema.parse(req.body);
    
    console.log('Parsed update data:', data);
    
    const manager = await storage.updateSalesManager(id, data);
    
    console.log('Update successful, returning:', manager);
    res.json(manager);
  } catch (error: any) {
    console.error('Sales manager update error:', error);
    res.status(400).json({ error: error.message });
  }
});

router.delete('/api/admin/sales-managers/:id', requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteSalesManager(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 접점 코드 매핑 관리 API
router.post('/api/admin/contact-code-mappings', requireAdmin, async (req: any, res) => {
  try {
    const data = createContactCodeMappingSchema.parse(req.body);
    const mapping = await storage.createContactCodeMapping(data);
    res.json(mapping);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/api/admin/contact-code-mappings', requireAdmin, async (req: any, res) => {
  try {
    const { managerId, contactCode } = req.query;
    
    let mappings;
    if (managerId) {
      mappings = await storage.getContactCodeMappingsByManagerId(parseInt(managerId as string));
    } else if (contactCode) {
      mappings = await storage.getContactCodeMappingsByContactCode(contactCode as string);
    } else {
      mappings = await storage.getContactCodeMappings();
    }
    
    res.json(mappings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/api/admin/contact-code-mappings/:id', requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateContactCodeMappingSchema.parse(req.body);
    const mapping = await storage.updateContactCodeMapping(id, data);
    res.json(mapping);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/api/admin/contact-code-mappings/:id', requireAdmin, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await storage.deleteContactCodeMapping(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 영업과장용 실적 조회 API (접점 코드 기반 필터링)
router.get('/api/sales-manager/performance', requireAuth, async (req: any, res) => {
  try {
    // 영업과장 권한 체크
    if (req.session.userType !== 'sales_manager') {
      return res.status(403).json({ error: '영업과장 권한이 필요합니다.' });
    }
    
    const managerId = req.session.managerId;
    
    // 해당 영업과장의 접점 코드 목록 가져오기
    const contactMappings = await storage.getContactCodeMappingsByManagerId(managerId);
    const contactCodes = contactMappings.map(mapping => mapping.contactCode);
    
    if (contactCodes.length === 0) {
      return res.json({
        totalDocuments: 0,
        activatedCount: 0,
        canceledCount: 0,
        pendingCount: 0,
        contactCodes: []
      });
    }
    
    // 접점 코드 기반으로 실적 데이터 조회 (실제 구현은 기존 문서 시스템과 연동 필요)
    const performanceData = {
      totalDocuments: 0, // contactCodes 기반 문서 수
      activatedCount: 0,
      canceledCount: 0, 
      pendingCount: 0,
      contactCodes: contactCodes,
      teamId: req.session.teamId,
      managerId: managerId
    };
    
    res.json(performanceData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 모든 사용자 조회 API (권한 관리용)
router.get('/api/admin/all-users', requireAuth, async (req, res) => {
  try {
    const allUsers = await storage.getAllUsersForPermissions();
    res.json(allUsers);
  } catch (error: any) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 사용자 권한 관리 API
router.get('/api/admin/user-permissions/:userId/:userType', requireAuth, async (req, res) => {
  try {
    const { userId, userType } = req.params;
    const permissions = await storage.getUserPermissions(Number(userId), userType);
    res.json(permissions);
  } catch (error: any) {
    console.error('Get user permissions error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/admin/user-permissions', requireAuth, async (req, res) => {
  try {
    const { userId, userType, permissions } = req.body;
    await storage.updateUserPermissions(Number(userId), userType, permissions);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Update user permissions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// 판매점 등록 관련 API
// =====================================

// 판매점 등록 신청
router.post('/api/dealer-registration', async (req, res) => {
  try {
    const validatedData = dealerRegistrationSchema.parse(req.body);
    const registration = await storage.createDealerRegistration(validatedData);
    
    res.status(201).json({
      success: true,
      message: '판매점 등록 신청이 완료되었습니다. 승인 후 이용 가능합니다.',
      registrationId: registration.id
    });
  } catch (error: any) {
    console.error('Dealer registration error:', error);
    res.status(400).json({ 
      success: false, 
      error: error.message || '등록 신청 중 오류가 발생했습니다.' 
    });
  }
});

// 판매점 로그인
router.post('/api/dealer-login', async (req, res) => {
  try {
    const { username, password } = dealerLoginSchema.parse(req.body);
    const dealer = await storage.authenticateDealer(username, password);
    
    if (!dealer) {
      return res.status(401).json({ 
        success: false, 
        error: '아이디 또는 비밀번호가 올바르지 않거나 승인되지 않은 계정입니다.' 
      });
    }

    // 세션 설정
    req.session.userId = dealer.id;
    req.session.userType = 'dealer';
    req.session.username = dealer.username;
    req.session.name = dealer.representativeName;

    res.json({
      success: true,
      user: {
        id: dealer.id,
        name: dealer.representativeName,
        username: dealer.username,
        userType: 'dealer',
        businessName: dealer.businessName
      }
    });
  } catch (error: any) {
    console.error('Dealer login error:', error);
    res.status(500).json({ 
      success: false, 
      error: '로그인 중 오류가 발생했습니다.' 
    });
  }
});

// 관리자: 판매점 등록 신청 목록 조회
router.get('/api/admin/dealer-registrations', requireAuth, async (req, res) => {
  try {
    const registrations = await storage.getDealerRegistrations();
    res.json(registrations);
  } catch (error: any) {
    console.error('Get dealer registrations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 관리자: 판매점 등록 승인/거부
router.put('/api/admin/dealer-registrations/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    
    if (!['승인', '거부'].includes(status)) {
      return res.status(400).json({ error: '올바르지 않은 상태입니다.' });
    }

    await storage.updateDealerRegistrationStatus(
      Number(id), 
      status, 
      req.session.userId!, 
      rejectionReason
    );

    res.json({ 
      success: true, 
      message: status === '승인' ? '판매점이 승인되었습니다.' : '판매점 신청이 거부되었습니다.' 
    });
  } catch (error: any) {
    console.error('Update dealer registration status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// 채팅 관련 API
// =====================================

// 문서별 채팅방 정보 조회
router.get('/api/chat/room/:documentId', requireAuth, async (req, res) => {
  try {
    const { documentId } = req.params;
    
    // 문서 존재 확인 및 권한 체크
    const document = await storage.getDocument(Number(documentId));
    if (!document) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }

    // 판매점은 자신의 문서만, 관리자/직원은 모든 문서 접근 가능
    if (req.session.userType === 'dealer' && document.dealerId !== req.session.userId) {
      return res.status(403).json({ error: '접근 권한이 없습니다.' });
    }

    const chatRoom = await storage.getChatRoomByDocumentId(Number(documentId));
    
    res.json({
      chatRoom,
      document: {
        id: document.id,
        documentNumber: document.documentNumber,
        customerName: document.customerName,
        status: document.activationStatus
      }
    });
  } catch (error: any) {
    console.error('Get chat room error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 채팅 메시지 조회
router.get('/api/chat/messages/:chatRoomId', requireAuth, async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const messages = await storage.getChatMessages(Number(chatRoomId));
    res.json(messages);
  } catch (error: any) {
    console.error('Get chat messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
