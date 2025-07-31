import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import type {
  Admin,
  Dealer,
  User,
  Document,
  PricingTable,
  AuthSession,
  CreateDealerForm,
  CreateUserForm,
  CreateAdminForm,
  CreateWorkerForm,
  CreateDealerAccountForm,
  UploadDocumentForm,
  UpdateDocumentStatusForm,
  DashboardStats,
  KPDealerInfo,
  ServicePlan,
  AdditionalService,
  DocumentServicePlan,
  ChatRoom,
  ChatMessage,
  ContactCode,
  CreateContactCodeForm,
  UpdateContactCodeForm
} from '../shared/schema';

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS dealers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    kp_number TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS kp_dealer_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kp_number TEXT UNIQUE NOT NULL,
    dealer_name TEXT NOT NULL,
    location TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('dealer_store', 'dealer_worker', 'admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers (id)
  );

  CREATE TABLE IF NOT EXISTS contact_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL,
    dealer_name TEXT NOT NULL,
    carrier TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    document_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    store_name TEXT,
    contact_code TEXT,
    carrier TEXT NOT NULL,
    previous_carrier TEXT,
    status TEXT NOT NULL CHECK (status IN ('접수', '보완필요', '완료')),
    activation_status TEXT NOT NULL DEFAULT '대기' CHECK (activation_status IN ('대기', '진행중', '업무요청중', '개통', '취소', '보완필요', '기타완료', '폐기')),
    file_path TEXT,
    file_name TEXT,
    file_size INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    activated_at DATETIME,
    activated_by INTEGER,
    notes TEXT,
    FOREIGN KEY (dealer_id) REFERENCES dealers (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (activated_by) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS document_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('가입서류', '변경서류')),
    uploaded_by INTEGER NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    FOREIGN KEY (uploaded_by) REFERENCES admins (id)
  );

  CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'user')),
    dealer_id INTEGER,
    expires_at DATETIME NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_documents_dealer_id ON documents(dealer_id);
  CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
  CREATE INDEX IF NOT EXISTS idx_documents_activation_status ON documents(activation_status);
  CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);
  

  CREATE INDEX IF NOT EXISTS idx_documents_activated_at ON documents(activated_at);
  CREATE INDEX IF NOT EXISTS idx_documents_customer_name ON documents(customer_name);
  CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);

  CREATE TABLE IF NOT EXISTS service_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_name TEXT NOT NULL,
    carrier TEXT NOT NULL,
    plan_type TEXT NOT NULL,
    data_allowance TEXT NOT NULL,
    monthly_fee INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS additional_services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service_name TEXT NOT NULL,
    service_type TEXT NOT NULL,
    monthly_fee INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS document_service_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    service_plan_id INTEGER NOT NULL,
    additional_service_ids TEXT,
    bundle_type TEXT,
    payment_type TEXT NOT NULL,
    registration_fee INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents (id),
    FOREIGN KEY (service_plan_id) REFERENCES service_plans (id)
  );

  CREATE INDEX IF NOT EXISTS idx_service_plans_carrier ON service_plans(carrier);
  CREATE INDEX IF NOT EXISTS idx_service_plans_plan_type ON service_plans(plan_type);
  CREATE INDEX IF NOT EXISTS idx_additional_services_service_type ON additional_services(service_type);
  CREATE INDEX IF NOT EXISTS idx_document_service_plans_document_id ON document_service_plans(document_id);
`);

// Create default admin if none exists
const adminExists = db.prepare('SELECT COUNT(*) as count FROM admin_users').get() as { count: number };
if (adminExists.count === 0) {
  const hashedPassword = bcrypt.hashSync('admin123!', 10);
  db.prepare('INSERT INTO admin_users (email, password, name) VALUES (?, ?, ?)').run(
    'admin@portal.com',
    hashedPassword,
    '시스템 관리자'
  );
}

// Create initial KP dealer info if none exists
const kpInfoExists = db.prepare('SELECT COUNT(*) as count FROM kp_dealer_info').get() as { count: number };
if (kpInfoExists.count === 0) {
  const kpData = [
    { kp_number: 'KP001', dealer_name: '서울중앙점', location: '서울특별시 중구', contact_email: 'seoul@mcc.com', contact_phone: '02-1234-5678' },
    { kp_number: 'KP002', dealer_name: '부산해운대점', location: '부산광역시 해운대구', contact_email: 'busan@mcc.com', contact_phone: '051-9876-5432' },
    { kp_number: 'KP003', dealer_name: '대구동성로점', location: '대구광역시 중구', contact_email: 'daegu@mcc.com', contact_phone: '053-5555-1234' },
    { kp_number: 'KP004', dealer_name: '인천송도점', location: '인천광역시 연수구', contact_email: 'incheon@mcc.com', contact_phone: '032-7777-8888' },
    { kp_number: 'KP005', dealer_name: '광주상무점', location: '광주광역시 서구', contact_email: 'gwangju@mcc.com', contact_phone: '062-3333-4444' },
  ];
  
  for (const kp of kpData) {
    db.prepare('INSERT INTO kp_dealer_info (kp_number, dealer_name, location, contact_email, contact_phone, is_active) VALUES (?, ?, ?, ?, ?, ?)').run(
      kp.kp_number,
      kp.dealer_name,
      kp.location,
      kp.contact_email,
      kp.contact_phone,
      1
    );
  }
}

// Create initial service plans if none exist
const servicePlansExists = db.prepare('SELECT COUNT(*) as count FROM service_plans').get() as { count: number };
if (servicePlansExists.count === 0) {
  const servicePlans = [
    // 선불 요금제
    { plan_name: '선)363/1M', carrier: '선불', plan_type: 'LTE', data_allowance: '1GB', monthly_fee: 36300 },
    { plan_name: '선)363/2M', carrier: '선불', plan_type: 'LTE', data_allowance: '2GB', monthly_fee: 36300 },
    { plan_name: '선)363/3M', carrier: '선불', plan_type: 'LTE', data_allowance: '3GB', monthly_fee: 36300 },
    { plan_name: '선)383/1M', carrier: '선불', plan_type: 'LTE', data_allowance: '1GB', monthly_fee: 38300 },
    { plan_name: '선)383/2M', carrier: '선불', plan_type: 'LTE', data_allowance: '2GB', monthly_fee: 38300 },
    { plan_name: '선)585/1M', carrier: '선불', plan_type: 'LTE', data_allowance: '1GB', monthly_fee: 58500 },
    { plan_name: '선)407/1M', carrier: '선불', plan_type: 'LTE', data_allowance: '1GB', monthly_fee: 40700 },
    
    // 중외할부통신 5G 요금제
    { plan_name: '중외)5G 웰컴 5', carrier: '중외할부통신', plan_type: '5G', data_allowance: '5GB', monthly_fee: 0 },
    { plan_name: '중외)5G 웰컴 3', carrier: '중외할부통신', plan_type: '5G', data_allowance: '3GB', monthly_fee: 0 },
    { plan_name: '중외)5G 웰컴 1', carrier: '중외할부통신', plan_type: '5G', data_allowance: '1GB', monthly_fee: 0 },
    
    // 미래엔 LTE 요금제
    { plan_name: '미)LTE 스페셜 플러스 N', carrier: '미래엔', plan_type: 'LTE', data_allowance: '무제한', monthly_fee: 0 },
    { plan_name: '미)LTE 스페셜 프로', carrier: '미래엔', plan_type: 'LTE', data_allowance: '무제한', monthly_fee: 0 },
    { plan_name: '미)LTE 스페셜', carrier: '미래엔', plan_type: 'LTE', data_allowance: '무제한', monthly_fee: 0 },
    { plan_name: '미)LTE (15GB+/100분)', carrier: '미래엔', plan_type: 'LTE', data_allowance: '15GB+', monthly_fee: 0 },
    { plan_name: '미)데이터플러스 (15GB+/100분)', carrier: '미래엔', plan_type: 'LTE', data_allowance: '15GB+', monthly_fee: 0 },
    { plan_name: '미)LTE (10GB+/통화기본)', carrier: '미래엔', plan_type: 'LTE', data_allowance: '10GB+', monthly_fee: 0 },
    { plan_name: '미)LTE (7GB+/통화기본)', carrier: '미래엔', plan_type: 'LTE', data_allowance: '7GB+', monthly_fee: 0 },
    { plan_name: '미)5G (31GB+/통화기본)', carrier: '미래엔', plan_type: '5G', data_allowance: '31GB+', monthly_fee: 0 },
    
    // 엠모바일 요금제
    { plan_name: '엠)M 알뜰 1.5GB 100분', carrier: '엠모바일', plan_type: 'LTE', data_allowance: '1.5GB', monthly_fee: 0 },
    { plan_name: '엠)M 알뜰 안심', carrier: '엠모바일', plan_type: 'LTE', data_allowance: '무제한', monthly_fee: 0 },
    { plan_name: '엠)통화 맘껏 4.5GB', carrier: '엠모바일', plan_type: 'LTE', data_allowance: '4.5GB', monthly_fee: 0 },
    { plan_name: '엠)M 스페셜 10GB 플러스', carrier: '엠모바일', plan_type: 'LTE', data_allowance: '10GB+', monthly_fee: 0 },
    { plan_name: '엠)5G M 알뜰 10GB', carrier: '엠모바일', plan_type: '5G', data_allowance: '10GB', monthly_fee: 0 },
    { plan_name: '엠)5G M 프리미엄 110GB', carrier: '엠모바일', plan_type: '5G', data_allowance: '110GB', monthly_fee: 0 },
    
    // KT 계열 요금제
    { plan_name: '카K)Z Mini + 밀리의 서재', carrier: 'KT', plan_type: 'LTE', data_allowance: '10GB', monthly_fee: 0 },
    { plan_name: '카K)핀다이렉트Z Max(100GB)', carrier: 'KT', plan_type: 'LTE', data_allowance: '100GB', monthly_fee: 0 },
    
    // 텔레콤 요금제
    { plan_name: '텔)LTE 알뜰 (100GB+/통화맘껏)', carrier: '텔레콤', plan_type: 'LTE', data_allowance: '100GB+', monthly_fee: 0 },
    { plan_name: '텔)LTE 알뜰 (11GB+/통화맘껏)', carrier: '텔레콤', plan_type: 'LTE', data_allowance: '11GB+', monthly_fee: 0 },
    { plan_name: '텔)CMLink (100GB+)', carrier: '텔레콤', plan_type: 'LTE', data_allowance: '100GB+', monthly_fee: 0 },
    
    // SK 계열 요금제
    { plan_name: '카S)핀다이렉트 Z (11GB+)', carrier: 'SK텔레콤', plan_type: 'LTE', data_allowance: '11GB+', monthly_fee: 0 },
    { plan_name: '카S)핀다이렉트Z Max(제휴)', carrier: 'SK텔레콤', plan_type: 'LTE', data_allowance: '무제한', monthly_fee: 0 },
    
    // 헬로모바일 요금제
    { plan_name: '헬)슬림 유심 1GB 100분', carrier: '헬로모바일', plan_type: 'LTE', data_allowance: '1GB', monthly_fee: 0 },
    { plan_name: '헬)DATA 걱정없는 유심 7GB', carrier: '헬로모바일', plan_type: 'LTE', data_allowance: '7GB', monthly_fee: 0 },
    { plan_name: '헬)데이터 더주는 유심 15GB', carrier: '헬로모바일', plan_type: 'LTE', data_allowance: '15GB', monthly_fee: 0 },
    
    // 주요 통신사 5G 요금제
    { plan_name: '중K)61K-5G 심플 70GB', carrier: 'KT', plan_type: '5G', data_allowance: '70GB', monthly_fee: 61000 },
    { plan_name: '중K)61K-5G 심플 50GB', carrier: 'KT', plan_type: '5G', data_allowance: '50GB', monthly_fee: 61000 },
    { plan_name: '중K)90K-넷플릭스 초이스 베이직', carrier: 'KT', plan_type: '5G', data_allowance: '무제한', monthly_fee: 90000 },
    { plan_name: '중K)100K-스페셜', carrier: 'KT', plan_type: '5G', data_allowance: '무제한', monthly_fee: 100000 },
    { plan_name: '중K)110K-넷플릭스 초이스 프리미엄', carrier: 'KT', plan_type: '5G', data_allowance: '무제한', monthly_fee: 110000 },
  ];
  
  for (const plan of servicePlans) {
    db.prepare('INSERT INTO service_plans (plan_name, carrier, plan_type, data_allowance, monthly_fee, is_active) VALUES (?, ?, ?, ?, ?, ?)').run(
      plan.plan_name,
      plan.carrier,
      plan.plan_type,
      plan.data_allowance,
      plan.monthly_fee,
      1
    );
  }
}

// Create initial additional services if none exist
const additionalServicesExists = db.prepare('SELECT COUNT(*) as count FROM additional_services').get() as { count: number };
if (additionalServicesExists.count === 0) {
  const additionalServices = [
    { service_name: '넷플릭스 스탠다드', service_type: '부가서비스', monthly_fee: 13500, description: '넷플릭스 스탠다드 이용권' },
    { service_name: '넷플릭스 프리미엄', service_type: '부가서비스', monthly_fee: 17000, description: '넷플릭스 프리미엄 이용권' },
    { service_name: '유튜브 프리미엄', service_type: '부가서비스', monthly_fee: 11900, description: '유튜브 프리미엄 이용권' },
    { service_name: '디즈니+', service_type: '부가서비스', monthly_fee: 9900, description: '디즈니+ 이용권' },
    { service_name: '웨이브', service_type: '부가서비스', monthly_fee: 10900, description: '웨이브 이용권' },
    { service_name: '시즌', service_type: '부가서비스', monthly_fee: 8900, description: '시즌 이용권' },
    { service_name: '인터넷 결합', service_type: '결합상품', monthly_fee: 0, description: '인터넷 결합 할인' },
    { service_name: 'IPTV 결합', service_type: '결합상품', monthly_fee: 0, description: 'IPTV 결합 할인' },
    { service_name: '인터넷+IPTV 결합', service_type: '결합상품', monthly_fee: 0, description: '인터넷+IPTV 결합 할인' },
    { service_name: '무선인터넷', service_type: '부가서비스', monthly_fee: 5500, description: '무선인터넷 서비스' },
    { service_name: '국제전화', service_type: '부가서비스', monthly_fee: 3300, description: '국제전화 서비스' },
    { service_name: '음성사서함', service_type: '부가서비스', monthly_fee: 2200, description: '음성사서함 서비스' },
  ];
  
  for (const service of additionalServices) {
    db.prepare('INSERT INTO additional_services (service_name, service_type, monthly_fee, description, is_active) VALUES (?, ?, ?, ?, ?)').run(
      service.service_name,
      service.service_type,
      service.monthly_fee,
      service.description,
      1
    );
  }
}

// 단가표 정책 테이블 생성
db.exec(`
  CREATE TABLE IF NOT EXISTS pricing_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    carrier TEXT NOT NULL,
    service_plan_name TEXT NOT NULL,
    commission_amount INTEGER NOT NULL DEFAULT 0,
    policy_type TEXT NOT NULL DEFAULT 'commission',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 기본 단가표 정책 샘플 데이터 추가
const pricingPoliciesExists = db.prepare('SELECT COUNT(*) as count FROM pricing_policies').get() as { count: number };
if (pricingPoliciesExists.count === 0) {
  const pricingPolicies = [
    { carrier: 'SK텔링크', service_plan_name: '5G플러스', commission_amount: 50000, policy_type: 'commission' },
    { carrier: 'SK텔링크', service_plan_name: '5G스탠다드', commission_amount: 40000, policy_type: 'commission' },
    { carrier: 'KT', service_plan_name: 'Y25플러스', commission_amount: 45000, policy_type: 'commission' },
    { carrier: 'KT', service_plan_name: 'Y25베이직', commission_amount: 35000, policy_type: 'commission' },
    { carrier: 'LG미디어로그', service_plan_name: 'U+5G베이직', commission_amount: 30000, policy_type: 'commission' },
    { carrier: 'LG미디어로그', service_plan_name: 'U+5G프리미엄', commission_amount: 55000, policy_type: 'commission' },
  ];
  
  for (const policy of pricingPolicies) {
    db.prepare('INSERT INTO pricing_policies (carrier, service_plan_name, commission_amount, policy_type, is_active) VALUES (?, ?, ?, ?, ?)').run(
      policy.carrier,
      policy.service_plan_name,
      policy.commission_amount,
      policy.policy_type,
      1
    );
  }
}

export interface IStorage {
  // Authentication
  authenticateAdmin(username: string, password: string): Promise<Admin | null>;
  authenticateUser(username: string, password: string): Promise<{ user: User; dealer: Dealer } | null>;
  createSession(userId: number, userType: 'admin' | 'user', dealerId?: number, userRole?: string): Promise<string>;
  getSession(sessionId: string): Promise<AuthSession | null>;
  deleteSession(sessionId: string): Promise<void>;
  
  // Account creation
  createAdmin(data: CreateAdminForm): Promise<Admin>;
  createWorker(data: CreateWorkerForm): Promise<User>;
  createDealerAccount(data: CreateDealerAccountForm): Promise<{ user: User; dealer: Dealer }>;
  
  // KP number management
  getKPInfo(kpNumber: string): Promise<KPDealerInfo | null>;
  createKPDealerInfo(data: Omit<KPDealerInfo, 'id' | 'createdAt'>): Promise<KPDealerInfo>;
  getAllKPDealerInfo(): Promise<KPDealerInfo[]>;
  
  // Service plans management
  createServicePlan(data: Omit<ServicePlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServicePlan>;
  getServicePlans(): Promise<ServicePlan[]>;
  getServicePlansByCarrier(carrier: string): Promise<ServicePlan[]>;
  updateServicePlan(id: number, data: Partial<Omit<ServicePlan, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ServicePlan>;
  deleteServicePlan(id: number): Promise<void>;
  
  // Additional services management
  createAdditionalService(data: Omit<AdditionalService, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdditionalService>;
  getAdditionalServices(): Promise<AdditionalService[]>;
  getAdditionalServicesByType(serviceType: string): Promise<AdditionalService[]>;
  updateAdditionalService(id: number, data: Partial<Omit<AdditionalService, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AdditionalService>;
  deleteAdditionalService(id: number): Promise<void>;
  
  // Document service plans management
  createDocumentServicePlan(data: Omit<DocumentServicePlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentServicePlan>;
  getDocumentServicePlan(documentId: number): Promise<DocumentServicePlan | null>;
  updateDocumentServicePlan(documentId: number, data: Partial<Omit<DocumentServicePlan, 'id' | 'createdAt' | 'updatedAt'>>): Promise<DocumentServicePlan>;
  deleteDocumentServicePlan(documentId: number): Promise<void>;
  
  // Admin operations
  getAdminById(id: number): Promise<Admin | null>;
  getUserById(id: number): Promise<(User & { dealerName: string }) | null>;
  createDealer(data: CreateDealerForm): Promise<Dealer>;
  createUser(data: CreateUserForm): Promise<User>;
  getDealers(): Promise<Dealer[]>;
  getUsers(dealerId?: number): Promise<Array<User & { dealerName: string }>>;
  getAllUsers(): Promise<Array<User & { dealerName: string; userType: string }>>;
  updateUser(id: number, data: { username?: string; password?: string; name?: string }): Promise<User>;
  
  // Contact codes management
  updateDealerContactCodes(dealerId: number, contactCodes: Array<{ carrierId: string; carrierName: string; contactCode: string }>): Promise<void>;
  getDealerContactCodes(dealerId: number): Promise<Array<{ carrierId: string; carrierName: string; contactCode: string }>>;
  
  // Document operations
  uploadDocument(data: UploadDocumentForm & { dealerId: number; userId: number; filePath: string; fileName: string; fileSize: number }): Promise<Document>;
  getDocument(id: number): Promise<Document | null>;
  getDocuments(dealerId?: number, filters?: { status?: string; activationStatus?: string; search?: string; startDate?: string; endDate?: string }): Promise<Array<Document & { dealerName: string; userName: string; activatedByName?: string }>>;
  updateDocumentStatus(id: number, data: UpdateDocumentStatusForm): Promise<Document>;
  updateDocumentActivationStatus(id: number, data: any): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
  checkDuplicateDocument(data: { customerName: string; customerPhone: string; storeName?: string; contactCode?: string }): Promise<Array<Document & { dealerName: string }>>;
  
  // Document templates
  uploadDocumentTemplate(data: { title: string; category: string; filePath: string; fileName: string; fileSize: number; uploadedBy: number }): Promise<any>;
  getDocumentTemplates(): Promise<any[]>;
  getDocumentTemplateById(id: number): Promise<any | null>;
  
  // Worker stats
  getWorkerStatsWithDealer(dealerId?: number): Promise<WorkerStats[]>;
  
  // Dashboard stats
  getDashboardStats(dealerId?: number): Promise<DashboardStats>;
  getCarrierStats(startDate?: string, endDate?: string): Promise<any[]>;
  getWorkerStats(startDate?: string, endDate?: string): Promise<any[]>;
  
  // Admin analytics
  getWorkerCarrierDetails(workerId: number): Promise<Array<{ carrier: string; count: number }>>;
  getCarrierDealerDetails(carrier: string): Promise<Array<{ dealerName: string; count: number }>>;
  
  // Chat rooms and messages
  createChatRoom(documentId: number, dealerId: number, workerId?: number): Promise<ChatRoom>;
  getChatRoom(documentId: number): Promise<ChatRoom | null>;
  getChatRoomById(roomId: number): Promise<ChatRoom | null>;
  updateChatRoom(roomId: number, data: Partial<ChatRoom>): Promise<ChatRoom>;
  createChatMessage(data: Omit<ChatMessage, 'id' | 'createdAt' | 'readAt'>): Promise<ChatMessage>;
  getChatMessages(roomId: number): Promise<ChatMessage[]>;
  markMessageAsRead(messageId: number): Promise<void>;
  
  // Carriers
  getCarriers(): Promise<any[]>;
  getCarrierById(id: number): Promise<any | null>;
  createCarrier(data: any): Promise<any>;
  updateCarrier(id: number, data: any): Promise<any>;
  
  // Pricing Policies
  getPricingPolicies(): Promise<PricingPolicy[]>;
  getPricingPolicyById(id: number): Promise<PricingPolicy | null>;
  createPricingPolicy(data: CreatePricingPolicyForm): Promise<PricingPolicy>;
  updatePricingPolicy(id: number, data: Partial<PricingPolicy>): Promise<PricingPolicy>;
  deletePricingPolicy(id: number): Promise<void>;
}

class SqliteStorage implements IStorage {
  async authenticateAdmin(username: string, password: string): Promise<Admin | null> {
    const admin = db.prepare('SELECT * FROM users WHERE username = ? AND user_type = ?').get(username, 'admin') as any;
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return null;
    }
    return {
      id: admin.id,
      username: admin.username,
      password: admin.password,
      name: admin.name,
      createdAt: new Date(admin.created_at)
    };
  }

  async authenticateUser(username: string, password: string): Promise<{ user: User; dealer?: Dealer } | null> {
    const result = db.prepare(`
      SELECT u.*, d.name as dealer_name, d.created_at as dealer_created_at
      FROM users u
      LEFT JOIN dealers d ON u.dealer_id = d.id
      WHERE u.username = ? AND u.user_type != ?
    `).get(username, 'admin') as any;
    
    if (!result || !bcrypt.compareSync(password, result.password)) {
      return null;
    }

    const user: User = {
      id: result.id,
      dealerId: result.dealer_id,
      username: result.username,
      password: result.password,
      name: result.name,
      role: result.user_type,
      createdAt: new Date(result.created_at)
    };

    let dealer: Dealer | undefined = undefined;
    if (result.dealer_id && result.dealer_name) {
      dealer = {
        id: result.dealer_id,
        name: result.dealer_name,
        location: '',
        contactEmail: '',
        contactPhone: '',
        createdAt: new Date(result.dealer_created_at)
      };
    }

    return { user, dealer };
  }

  async createSession(userId: number, userType: 'admin' | 'user', dealerId?: number, userRole?: string): Promise<string> {
    const sessionId = nanoid();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    // Add user_role column if it doesn't exist
    try {
      db.prepare('ALTER TABLE auth_sessions ADD COLUMN user_role TEXT').run();
    } catch (e) {
      // Column already exists
    }

    db.prepare('INSERT INTO auth_sessions (id, user_id, user_type, dealer_id, user_role, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(
      sessionId,
      userId,
      userType,
      dealerId || null,
      userRole || null,
      expiresAt.toISOString()
    );

    return sessionId;
  }

  async getSession(sessionId: string): Promise<AuthSession | null> {
    try {
      // Use a simpler datetime comparison
      const session = db.prepare('SELECT * FROM auth_sessions WHERE id = ? AND expires_at > ?').get(sessionId, new Date().toISOString()) as any;
      if (!session) return null;

      return {
        id: session.id,
        userId: session.user_id,
        userType: session.user_type,
        userRole: session.user_role,
        dealerId: session.dealer_id,
        expiresAt: new Date(session.expires_at)
      };
    } catch (error) {
      console.error('Error getting session:', error);
      return null; // Return null instead of throwing to prevent crashes
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    db.prepare('DELETE FROM auth_sessions WHERE id = ?').run(sessionId);
  }

  async getAdminById(id: number): Promise<Admin | null> {
    const admin = db.prepare('SELECT * FROM users WHERE id = ? AND user_type = ?').get(id, 'admin') as any;
    if (!admin) return null;
    
    return {
      id: admin.id,
      email: admin.email,
      password: admin.password,
      name: admin.name,
      createdAt: new Date(admin.created_at)
    };
  }

  async getUserById(id: number): Promise<(User & { dealerName: string }) | null> {
    const user = db.prepare(`
      SELECT u.*, d.name as dealer_name
      FROM users u
      JOIN dealers d ON u.dealer_id = d.id
      WHERE u.id = ?
    `).get(id) as any;
    
    if (!user) return null;
    
    return {
      id: user.id,
      dealerId: user.dealer_id,
      email: user.email,
      password: user.password,
      name: user.name,
      role: user.role,
      createdAt: new Date(user.created_at),
      dealerName: user.dealer_name
    };
  }

  async createDealer(data: CreateDealerForm): Promise<Dealer> {
    const insertResult = db.prepare('INSERT INTO dealers (name) VALUES (?)').run(data.name);
    const result = db.prepare('SELECT * FROM dealers WHERE id = ?').get(insertResult.lastInsertRowid) as any;

    return {
      id: result.id,
      name: result.name,
      location: '',
      contactEmail: '',
      contactPhone: '',
      createdAt: new Date(result.created_at)
    };
  }

  async createUser(data: CreateUserForm): Promise<User> {
    const hashedPassword = bcrypt.hashSync(data.password, 10);
    const insertResult = db.prepare('INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)').run(
      data.email,
      hashedPassword,
      data.name,
      data.role
    );

    const result = db.prepare('SELECT * FROM users WHERE id = ?').get(insertResult.lastInsertRowid) as any;

    return {
      id: result.id,
      dealerId: result.dealer_id,
      email: result.email,
      password: result.password,
      name: result.name,
      role: result.role,
      createdAt: new Date(result.created_at)
    };
  }

  async createAdmin(data: CreateAdminForm): Promise<Admin> {
    const hashedPassword = bcrypt.hashSync(data.password, 10);
    const insertResult = db.prepare('INSERT INTO admin_users (email, password, name) VALUES (?, ?, ?)').run(
      data.email,
      hashedPassword,
      data.name
    );

    const result = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(insertResult.lastInsertRowid) as any;

    return {
      id: result.id,
      email: result.email,
      password: result.password,
      name: result.name,
      createdAt: new Date(result.created_at)
    };
  }

  async createWorker(data: CreateWorkerForm): Promise<User> {
    const hashedPassword = bcrypt.hashSync(data.password, 10);
    const insertResult = db.prepare('INSERT INTO users (email, password, name, user_type) VALUES (?, ?, ?, ?)').run(
      data.email,
      hashedPassword,
      data.name,
      'dealer_worker'
    );

    const result = db.prepare('SELECT * FROM users WHERE id = ?').get(insertResult.lastInsertRowid) as any;

    return {
      id: result.id,
      dealerId: result.dealer_id,
      email: result.email,
      password: result.password,
      name: result.name,
      role: result.user_type,
      createdAt: new Date(result.created_at)
    };
  }

  async createDealerAccount(data: CreateDealerAccountForm, kpInfo: KPDealerInfo): Promise<{ user: User; dealer: Dealer }> {
    // 판매점 생성
    const dealerResult = db.prepare('INSERT INTO dealers (name, location, contact_email, contact_phone, kp_number) VALUES (?, ?, ?, ?, ?)').run(
      kpInfo.dealerName,
      kpInfo.location,
      kpInfo.contactEmail || '',
      kpInfo.contactPhone || '',
      data.kpNumber
    );
    
    const dealer = db.prepare('SELECT * FROM dealers WHERE id = ?').get(dealerResult.lastInsertRowid) as any;
    
    // 판매점 계정 생성
    const hashedPassword = bcrypt.hashSync(data.password, 10);
    const userResult = db.prepare('INSERT INTO users (dealer_id, email, password, name, role) VALUES (?, ?, ?, ?, ?)').run(
      dealer.id,
      data.email,
      hashedPassword,
      data.name,
      'dealer_store'
    );
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userResult.lastInsertRowid) as any;
    
    return {
      user: {
        id: user.id,
        dealerId: user.dealer_id,
        email: user.email,
        password: user.password,
        name: user.name,
        role: user.role,
        createdAt: new Date(user.created_at)
      },
      dealer: {
        id: dealer.id,
        name: dealer.name,
        location: dealer.location,
        contactEmail: dealer.contact_email,
        contactPhone: dealer.contact_phone,
        kpNumber: dealer.kp_number,
        createdAt: new Date(dealer.created_at)
      }
    };
  }

  async getKPInfo(kpNumber: string): Promise<KPDealerInfo | null> {
    const kpInfo = db.prepare('SELECT * FROM kp_dealer_info WHERE kp_number = ? AND is_active = 1').get(kpNumber) as any;
    if (!kpInfo) return null;
    
    return {
      id: kpInfo.id,
      kpNumber: kpInfo.kp_number,
      dealerName: kpInfo.dealer_name,
      location: kpInfo.location,
      contactEmail: kpInfo.contact_email,
      contactPhone: kpInfo.contact_phone,
      isActive: kpInfo.is_active,
      createdAt: new Date(kpInfo.created_at)
    };
  }

  async createKPDealerInfo(data: Omit<KPDealerInfo, 'id' | 'createdAt'>): Promise<KPDealerInfo> {
    const insertResult = db.prepare('INSERT INTO kp_dealer_info (kp_number, dealer_name, location, contact_email, contact_phone, is_active) VALUES (?, ?, ?, ?, ?, ?)').run(
      data.kpNumber,
      data.dealerName,
      data.location,
      data.contactEmail || null,
      data.contactPhone || null,
      data.isActive ? 1 : 0
    );
    
    const result = db.prepare('SELECT * FROM kp_dealer_info WHERE id = ?').get(insertResult.lastInsertRowid) as any;
    
    return {
      id: result.id,
      kpNumber: result.kp_number,
      dealerName: result.dealer_name,
      location: result.location,
      contactEmail: result.contact_email,
      contactPhone: result.contact_phone,
      isActive: result.is_active,
      createdAt: new Date(result.created_at)
    };
  }

  async getAllKPDealerInfo(): Promise<KPDealerInfo[]> {
    const results = db.prepare('SELECT * FROM kp_dealer_info WHERE is_active = 1 ORDER BY kp_number').all() as any[];
    
    return results.map(result => ({
      id: result.id,
      kpNumber: result.kp_number,
      dealerName: result.dealer_name,
      location: result.location,
      contactEmail: result.contact_email,
      contactPhone: result.contact_phone,
      isActive: result.is_active,
      createdAt: new Date(result.created_at)
    }));
  }

  // Service Plans Management
  async createServicePlan(data: Omit<ServicePlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServicePlan> {
    const result = db.prepare(`
      INSERT INTO service_plans (plan_name, carrier, plan_type, data_allowance, monthly_fee, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.planName, data.carrier, data.planType, data.dataAllowance, data.monthlyFee, data.isActive ? 1 : 0);

    const servicePlan = db.prepare('SELECT * FROM service_plans WHERE id = ?').get(result.lastInsertRowid) as any;
    
    return {
      id: servicePlan.id,
      planName: servicePlan.plan_name,
      carrier: servicePlan.carrier,
      planType: servicePlan.plan_type,
      dataAllowance: servicePlan.data_allowance,
      monthlyFee: servicePlan.monthly_fee,
      isActive: servicePlan.is_active,
      createdAt: new Date(servicePlan.created_at),
      updatedAt: new Date(servicePlan.updated_at)
    };
  }

  async getServicePlans(): Promise<ServicePlan[]> {
    const plans = db.prepare('SELECT * FROM service_plans WHERE is_active = 1 ORDER BY carrier, plan_name').all() as any[];
    return plans.map(plan => ({
      id: plan.id,
      planName: plan.plan_name,
      carrier: plan.carrier,
      planType: plan.plan_type,
      dataAllowance: plan.data_allowance,
      monthlyFee: plan.monthly_fee,
      isActive: plan.is_active,
      createdAt: new Date(plan.created_at),
      updatedAt: new Date(plan.updated_at)
    }));
  }

  async getServicePlansByCarrier(carrier: string): Promise<ServicePlan[]> {
    const plans = db.prepare('SELECT * FROM service_plans WHERE carrier = ? AND is_active = 1 ORDER BY plan_name').all(carrier) as any[];
    return plans.map(plan => ({
      id: plan.id,
      planName: plan.plan_name,
      carrier: plan.carrier,
      planType: plan.plan_type,
      dataAllowance: plan.data_allowance,
      monthlyFee: plan.monthly_fee,
      isActive: plan.is_active,
      createdAt: new Date(plan.created_at),
      updatedAt: new Date(plan.updated_at)
    }));
  }

  async updateServicePlan(id: number, data: Partial<Omit<ServicePlan, 'id' | 'createdAt' | 'updatedAt'>>): Promise<ServicePlan> {
    const setParts = [];
    const values = [];

    if (data.planName !== undefined) {
      setParts.push('plan_name = ?');
      values.push(data.planName);
    }
    if (data.carrier !== undefined) {
      setParts.push('carrier = ?');
      values.push(data.carrier);
    }
    if (data.planType !== undefined) {
      setParts.push('plan_type = ?');
      values.push(data.planType);
    }
    if (data.dataAllowance !== undefined) {
      setParts.push('data_allowance = ?');
      values.push(data.dataAllowance);
    }
    if (data.monthlyFee !== undefined) {
      setParts.push('monthly_fee = ?');
      values.push(data.monthlyFee);
    }
    if (data.isActive !== undefined) {
      setParts.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }

    setParts.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.prepare(`UPDATE service_plans SET ${setParts.join(', ')} WHERE id = ?`).run(...values);

    const plan = db.prepare('SELECT * FROM service_plans WHERE id = ?').get(id) as any;
    return {
      id: plan.id,
      planName: plan.plan_name,
      carrier: plan.carrier,
      planType: plan.plan_type,
      dataAllowance: plan.data_allowance,
      monthlyFee: plan.monthly_fee,
      isActive: plan.is_active,
      createdAt: new Date(plan.created_at),
      updatedAt: new Date(plan.updated_at)
    };
  }

  async deleteServicePlan(id: number): Promise<void> {
    db.prepare('UPDATE service_plans SET is_active = 0 WHERE id = ?').run(id);
  }

  // Additional Services Management
  async createAdditionalService(data: Omit<AdditionalService, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdditionalService> {
    const result = db.prepare(`
      INSERT INTO additional_services (service_name, service_type, monthly_fee, description, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.serviceName, data.serviceType, data.monthlyFee, data.description || null, data.isActive ? 1 : 0);

    const service = db.prepare('SELECT * FROM additional_services WHERE id = ?').get(result.lastInsertRowid) as any;
    
    return {
      id: service.id,
      serviceName: service.service_name,
      serviceType: service.service_type,
      monthlyFee: service.monthly_fee,
      description: service.description,
      isActive: service.is_active,
      createdAt: new Date(service.created_at),
      updatedAt: new Date(service.updated_at)
    };
  }

  async getAdditionalServices(): Promise<AdditionalService[]> {
    const services = db.prepare('SELECT * FROM additional_services WHERE is_active = 1 ORDER BY service_type, service_name').all() as any[];
    return services.map(service => ({
      id: service.id,
      serviceName: service.service_name,
      serviceType: service.service_type,
      monthlyFee: service.monthly_fee,
      description: service.description,
      isActive: service.is_active,
      createdAt: new Date(service.created_at),
      updatedAt: new Date(service.updated_at)
    }));
  }

  async getAdditionalServicesByType(serviceType: string): Promise<AdditionalService[]> {
    const services = db.prepare('SELECT * FROM additional_services WHERE service_type = ? AND is_active = 1 ORDER BY service_name').all(serviceType) as any[];
    return services.map(service => ({
      id: service.id,
      serviceName: service.service_name,
      serviceType: service.service_type,
      monthlyFee: service.monthly_fee,
      description: service.description,
      isActive: service.is_active,
      createdAt: new Date(service.created_at),
      updatedAt: new Date(service.updated_at)
    }));
  }

  async updateAdditionalService(id: number, data: Partial<Omit<AdditionalService, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AdditionalService> {
    const setParts = [];
    const values = [];

    if (data.serviceName !== undefined) {
      setParts.push('service_name = ?');
      values.push(data.serviceName);
    }
    if (data.serviceType !== undefined) {
      setParts.push('service_type = ?');
      values.push(data.serviceType);
    }
    if (data.monthlyFee !== undefined) {
      setParts.push('monthly_fee = ?');
      values.push(data.monthlyFee);
    }
    if (data.description !== undefined) {
      setParts.push('description = ?');
      values.push(data.description);
    }
    if (data.isActive !== undefined) {
      setParts.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }

    setParts.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.prepare(`UPDATE additional_services SET ${setParts.join(', ')} WHERE id = ?`).run(...values);

    const service = db.prepare('SELECT * FROM additional_services WHERE id = ?').get(id) as any;
    return {
      id: service.id,
      serviceName: service.service_name,
      serviceType: service.service_type,
      monthlyFee: service.monthly_fee,
      description: service.description,
      isActive: service.is_active,
      createdAt: new Date(service.created_at),
      updatedAt: new Date(service.updated_at)
    };
  }

  async deleteAdditionalService(id: number): Promise<void> {
    db.prepare('UPDATE additional_services SET is_active = 0 WHERE id = ?').run(id);
  }

  // Document Service Plans Management
  async createDocumentServicePlan(data: Omit<DocumentServicePlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentServicePlan> {
    const result = db.prepare(`
      INSERT INTO document_service_plans (document_id, service_plan_id, additional_service_ids, bundle_type, payment_type, registration_fee)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.documentId,
      data.servicePlanId,
      data.additionalServiceIds || null,
      data.bundleType || null,
      data.paymentType,
      data.registrationFee || null
    );

    const docServicePlan = db.prepare('SELECT * FROM document_service_plans WHERE id = ?').get(result.lastInsertRowid) as any;
    
    return {
      id: docServicePlan.id,
      documentId: docServicePlan.document_id,
      servicePlanId: docServicePlan.service_plan_id,
      additionalServiceIds: docServicePlan.additional_service_ids,
      bundleType: docServicePlan.bundle_type,
      paymentType: docServicePlan.payment_type,
      registrationFee: docServicePlan.registration_fee,
      createdAt: new Date(docServicePlan.created_at),
      updatedAt: new Date(docServicePlan.updated_at)
    };
  }

  async getDocumentServicePlan(documentId: number): Promise<DocumentServicePlan | null> {
    const docServicePlan = db.prepare('SELECT * FROM document_service_plans WHERE document_id = ?').get(documentId) as any;
    
    if (!docServicePlan) return null;

    return {
      id: docServicePlan.id,
      documentId: docServicePlan.document_id,
      servicePlanId: docServicePlan.service_plan_id,
      additionalServiceIds: docServicePlan.additional_service_ids,
      bundleType: docServicePlan.bundle_type,
      paymentType: docServicePlan.payment_type,
      registrationFee: docServicePlan.registration_fee,
      createdAt: new Date(docServicePlan.created_at),
      updatedAt: new Date(docServicePlan.updated_at)
    };
  }

  async updateDocumentServicePlan(documentId: number, data: Partial<Omit<DocumentServicePlan, 'id' | 'createdAt' | 'updatedAt'>>): Promise<DocumentServicePlan> {
    const setParts = [];
    const values = [];

    if (data.servicePlanId !== undefined) {
      setParts.push('service_plan_id = ?');
      values.push(data.servicePlanId);
    }
    if (data.additionalServiceIds !== undefined) {
      setParts.push('additional_service_ids = ?');
      values.push(data.additionalServiceIds);
    }
    if (data.bundleType !== undefined) {
      setParts.push('bundle_type = ?');
      values.push(data.bundleType);
    }
    if (data.paymentType !== undefined) {
      setParts.push('payment_type = ?');
      values.push(data.paymentType);
    }
    if (data.registrationFee !== undefined) {
      setParts.push('registration_fee = ?');
      values.push(data.registrationFee);
    }

    setParts.push('updated_at = CURRENT_TIMESTAMP');
    values.push(documentId);

    db.prepare(`UPDATE document_service_plans SET ${setParts.join(', ')} WHERE document_id = ?`).run(...values);

    const docServicePlan = db.prepare('SELECT * FROM document_service_plans WHERE document_id = ?').get(documentId) as any;
    return {
      id: docServicePlan.id,
      documentId: docServicePlan.document_id,
      servicePlanId: docServicePlan.service_plan_id,
      additionalServiceIds: docServicePlan.additional_service_ids,
      bundleType: docServicePlan.bundle_type,
      paymentType: docServicePlan.payment_type,
      registrationFee: docServicePlan.registration_fee,
      createdAt: new Date(docServicePlan.created_at),
      updatedAt: new Date(docServicePlan.updated_at)
    };
  }

  async deleteDocumentServicePlan(documentId: number): Promise<void> {
    db.prepare('DELETE FROM document_service_plans WHERE document_id = ?').run(documentId);
  }

  // Direct service plan update in documents table
  async updateDocumentServicePlanDirect(id: number, data: { servicePlanId?: number | null; additionalServiceIds?: string; registrationFeePrepaid?: boolean; registrationFeePostpaid?: boolean; registrationFeeInstallment?: boolean; simFeePrepaid?: boolean; simFeePostpaid?: boolean; bundleApplied?: boolean; bundleNotApplied?: boolean; deviceModel?: string | null; simNumber?: string | null; subscriptionNumber?: string | null; dealerNotes?: string | null }): Promise<Document> {
    const query = `
      UPDATE documents 
      SET service_plan_id = ?, 
          additional_service_ids = ?, 
          registration_fee_prepaid = ?, 
          registration_fee_postpaid = ?, 
          registration_fee_installment = ?,
          sim_fee_prepaid = ?,
          sim_fee_postpaid = ?,
          bundle_applied = ?,
          bundle_not_applied = ?,
          device_model = ?,
          sim_number = ?,
          subscription_number = ?,
          dealer_notes = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    db.prepare(query).run(
      data.servicePlanId || null, 
      data.additionalServiceIds || null, 
      data.registrationFeePrepaid ? 1 : 0, 
      data.registrationFeePostpaid ? 1 : 0, 
      data.registrationFeeInstallment ? 1 : 0,
      data.simFeePrepaid ? 1 : 0, 
      data.simFeePostpaid ? 1 : 0, 
      data.bundleApplied ? 1 : 0, 
      data.bundleNotApplied ? 1 : 0, 
      data.deviceModel || null,
      data.simNumber || null,
      data.subscriptionNumber || null,
      data.dealerNotes || null,
      id
    );
    
    // 업데이트된 문서 정보 반환
    const document = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;
    return {
      id: document.id,
      dealerId: document.dealer_id,
      userId: document.user_id,
      documentNumber: document.document_number,
      customerName: document.customer_name,
      customerPhone: document.customer_phone,
      storeName: document.store_name,
      carrier: document.carrier,
      status: document.status,
      activationStatus: document.activation_status,
      filePath: document.file_path,
      fileName: document.file_name,
      fileSize: document.file_size,
      uploadedAt: new Date(document.uploaded_at),
      updatedAt: new Date(document.updated_at),
      activatedAt: document.activated_at ? new Date(document.activated_at) : null,
      activatedBy: document.activated_by,
      notes: document.notes,
      servicePlanId: document.service_plan_id,
      additionalServiceIds: document.additional_service_ids,
      registrationFeePrepaid: Boolean(document.registration_fee_prepaid),
      registrationFeePostpaid: Boolean(document.registration_fee_postpaid),
      registrationFeeInstallment: Boolean(document.registration_fee_installment),
      simFeePrepaid: Boolean(document.sim_fee_prepaid),
      simFeePostpaid: Boolean(document.sim_fee_postpaid),
      bundleApplied: Boolean(document.bundle_applied),
      bundleNotApplied: Boolean(document.bundle_not_applied),
      deviceModel: document.device_model,
      simNumber: document.sim_number,
      subscriptionNumber: document.subscription_number,
      dealerNotes: document.dealer_notes
    };
  }

  async getDealers(): Promise<Dealer[]> {
    const dealers = db.prepare('SELECT * FROM dealers ORDER BY name').all() as any[];
    return dealers.map(d => ({
      id: d.id,
      name: d.name,
      location: d.location,
      contactEmail: d.contact_email,
      contactPhone: d.contact_phone,
      createdAt: new Date(d.created_at)
    }));
  }

  async getUsers(dealerId?: number): Promise<Array<User & { dealerName: string }>> {
    let query = `
      SELECT u.*, d.name as dealer_name
      FROM users u
      LEFT JOIN dealers d ON u.dealer_id = d.id
    `;
    let params: any[] = [];

    if (dealerId) {
      query += ' WHERE u.dealer_id = ?';
      params.push(dealerId);
    }

    query += ' ORDER BY u.name';

    const users = db.prepare(query).all(...params) as any[];
    return users.map(u => ({
      id: u.id,
      dealerId: u.dealer_id,
      email: u.email,
      password: u.password,
      name: u.name,
      role: u.user_type,
      createdAt: new Date(u.created_at),
      dealerName: u.dealer_name || '관리자'
    }));
  }

  async getAllUsers(): Promise<Array<User & { dealerName: string; userType: string }>> {
    const query = `
      SELECT u.*, d.name as dealer_name, 
        CASE 
          WHEN u.user_type = 'admin' THEN '관리자'
          WHEN u.user_type = 'dealer_worker' THEN '근무자'
          WHEN u.user_type = 'dealer_store' THEN '판매점'
          ELSE u.user_type
        END as user_type_name
      FROM users u
      LEFT JOIN dealers d ON u.dealer_id = d.id
      ORDER BY u.user_type, u.name
    `;

    const users = db.prepare(query).all() as any[];
    return users.map(u => ({
      id: u.id,
      dealerId: u.dealer_id,
      username: u.username,
      password: u.password,
      name: u.name,
      role: u.user_type,
      createdAt: new Date(u.created_at),
      dealerName: u.dealer_name || '관리자',
      userType: u.user_type_name
    }));
  }

  async updateUser(id: number, data: { username?: string; password?: string; name?: string }): Promise<User> {
    const updates: string[] = [];
    const params: any[] = [];

    if (data.username) {
      updates.push('username = ?');
      params.push(data.username);
    }
    if (data.password) {
      const hashedPassword = bcrypt.hashSync(data.password, 10);
      updates.push('password = ?');
      params.push(hashedPassword);
    }
    if (data.name) {
      updates.push('name = ?');
      params.push(data.name);
    }

    if (updates.length === 0) {
      throw new Error('업데이트할 필드가 없습니다.');
    }

    params.push(id);
    
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    db.prepare(query).run(...params);

    const result = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    return {
      id: result.id,
      dealerId: result.dealer_id,
      username: result.username,
      password: result.password,
      name: result.name,
      role: result.user_type,
      createdAt: new Date(result.created_at)
    };
  }

  async uploadDocument(data: UploadDocumentForm & { dealerId: number; userId: number; filePath?: string | null; fileName?: string | null; fileSize?: number | null }): Promise<Document> {
    // 고유한 한글 접수번호 생성
    let documentNumber: string;
    let attempts = 0;
    
    do {
      documentNumber = this.generateKoreanDocumentNumber();
      const existing = db.prepare('SELECT id FROM documents WHERE document_number = ?').get(documentNumber);
      if (!existing) break;
      
      // 중복인 경우 1밀리초 대기 후 재시도
      await new Promise(resolve => setTimeout(resolve, 1));
      attempts++;
    } while (attempts < 10); // 최대 10번 시도
    
    // 접점코드로 판매점명 자동 설정
    const storeName = data.contactCode ? await this.getStoreName(data.contactCode, data.carrier) : null;
    
    // 새로운 접점코드 자동 등록
    if (data.contactCode && storeName) {
      const existingCode = await this.findContactCodeByCode(data.contactCode);
      if (!existingCode) {
        await this.createContactCode({
          code: data.contactCode,
          dealerName: storeName,
          carrier: data.carrier,
          isActive: true
        });
      }
    }
    
    try {
      console.log('Attempting to insert document with dealerId:', data.dealerId);
      
      const insertResult = db.prepare(`
        INSERT INTO documents (
          dealer_id, user_id, document_number, customer_name, customer_phone, 
          store_name, carrier, previous_carrier, contact_code, status, activation_status, 
          file_path, file_name, file_size, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        data.dealerId || null,
        data.userId,
        documentNumber,
        data.customerName,
        data.customerPhone,
        storeName || null,
        data.carrier,
        (data as any).previousCarrier || null,
        data.contactCode || null,
        '접수',
        '대기',
        data.filePath || null,
        data.fileName || null,
        data.fileSize || null,
        data.notes || null
      );

      console.log('Insert result:', insertResult);

      if (!insertResult || !insertResult.lastInsertRowid) {
        throw new Error('문서 삽입에 실패했습니다.');
      }

      const result = db.prepare('SELECT * FROM documents WHERE id = ?').get(insertResult.lastInsertRowid) as any;
      
      console.log('Query result:', result);
      
      if (!result) {
        throw new Error('삽입된 문서를 찾을 수 없습니다.');
      }

      return {
        id: result.id,
        dealerId: result.dealer_id,
        userId: result.user_id,
        documentNumber: result.document_number,
        customerName: result.customer_name,
        customerPhone: result.customer_phone,
        storeName: result.store_name,
        carrier: result.carrier,
        previousCarrier: result.previous_carrier,
        contactCode: result.contact_code,
        status: result.status,
        activationStatus: result.activation_status,
        filePath: result.file_path,
        fileName: result.file_name,
        fileSize: result.file_size,
        uploadedAt: new Date(result.uploaded_at),
        updatedAt: new Date(result.updated_at || result.uploaded_at),
        activatedAt: result.activated_at ? new Date(result.activated_at) : undefined,
        notes: result.notes
      } as Document;
      
    } catch (error: any) {
      console.error('Document insert error:', error);
      throw new Error(`문서 업로드 중 오류 발생: ${error.message}`);
    }

  }

  // 접점 코드 관리 메서드들
  async updateDealerContactCodes(dealerId: number, contactCodes: Array<{ carrierId: string; carrierName: string; contactCode: string }>): Promise<void> {
    const contactCodesJson = JSON.stringify(contactCodes);
    db.prepare('UPDATE dealers SET contact_codes = ? WHERE id = ?').run(contactCodesJson, dealerId);
  }

  async getDealerContactCodes(dealerId: number): Promise<Array<{ carrierId: string; carrierName: string; contactCode: string }>> {
    const dealer = db.prepare('SELECT contact_codes FROM dealers WHERE id = ?').get(dealerId) as any;
    if (!dealer || !dealer.contact_codes) {
      return [];
    }
    try {
      return JSON.parse(dealer.contact_codes);
    } catch {
      return [];
    }
  }

  async getContactCodeForCarrier(dealerId: number, carrier: string): Promise<string | null> {
    const contactCodes = await this.getDealerContactCodes(dealerId);
    const matchingCode = contactCodes.find(code => 
      code.carrierName === carrier || code.carrierId === carrier
    );
    return matchingCode ? matchingCode.contactCode : null;
  }

  async getDocuments(dealerId?: number, filters?: { status?: string; activationStatus?: string; search?: string; startDate?: string; endDate?: string; workerFilter?: string }, userId?: number): Promise<Array<Document & { dealerName: string; userName: string; activatedByName?: string }>> {
    let query = `
      SELECT d.*, dealers.name as dealer_name, u.name as user_name,
             COALESCE(activated_user.name, activated_admin.name) as activated_by_name
      FROM documents d
      LEFT JOIN dealers ON d.dealer_id = dealers.id
      JOIN users u ON d.user_id = u.id
      LEFT JOIN users activated_user ON d.activated_by = activated_user.id
      LEFT JOIN admin_users activated_admin ON d.activated_by = activated_admin.id
      WHERE 1=1
    `;
    let params: any[] = [];

    if (dealerId) {
      query += ' AND d.dealer_id = ?';
      params.push(dealerId);
    }

    if (filters?.status) {
      query += ' AND d.status = ?';
      params.push(filters.status);
    }

    if (filters?.activationStatus) {
      console.log('Filtering by activation status:', filters.activationStatus);
      if (filters.activationStatus.includes(',')) {
        // 다중 상태 필터링 (예: "대기,진행중")
        const statuses = filters.activationStatus.split(',').map(s => s.trim());
        const placeholders = statuses.map(() => '?').join(',');
        query += ` AND d.activation_status IN (${placeholders})`;
        params.push(...statuses);
      } else {
        query += ' AND d.activation_status = ?';
        params.push(filters.activationStatus);
      }
    }

    if (filters?.search) {
      query += ' AND (d.customer_name LIKE ? OR d.document_number LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters?.startDate) {
      query += ' AND date(d.uploaded_at) >= ?';
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      query += ' AND date(d.uploaded_at) <= ?';
      params.push(filters.endDate);
    }

    // 근무자별 필터링 (자신이 개통한 건만 조회)
    if (filters?.workerFilter === 'my' && userId) {
      query += ' AND d.activated_by = ?';
      params.push(userId);
    }

    query += ' ORDER BY d.uploaded_at DESC';

    console.log('SQL Query:', query);
    console.log('SQL Params:', params);
    const documents = db.prepare(query).all(...params) as any[];
    console.log('Raw documents found:', documents.length);
    return documents.map(d => ({
      id: d.id,
      dealerId: d.dealer_id,
      userId: d.user_id,
      documentNumber: d.document_number,
      customerName: d.customer_name,
      customerPhone: d.customer_phone,
      storeName: d.store_name,
      carrier: d.carrier,
      previousCarrier: d.previous_carrier,
      contactCode: d.contact_code,
      status: d.status,
      activationStatus: d.activation_status || '대기',
      filePath: d.file_path,
      fileName: d.file_name,
      fileSize: d.file_size,
      uploadedAt: new Date(d.uploaded_at),
      updatedAt: new Date(d.updated_at),
      activatedAt: d.activated_at ? new Date(d.activated_at) : undefined,
      activatedBy: d.activated_by,
      notes: d.notes,
      supplementNotes: d.supplement_notes,
      deviceModel: d.device_model,
      simNumber: d.sim_number,
      subscriptionNumber: d.subscription_number,
      servicePlanId: d.service_plan_id,
      additionalServiceIds: d.additional_service_ids,
      registrationFeePrepaid: Boolean(d.registration_fee_prepaid),
      registrationFeePostpaid: Boolean(d.registration_fee_postpaid),
      registrationFeeInstallment: Boolean(d.registration_fee_installment),
      simFeePrepaid: Boolean(d.sim_fee_prepaid),
      simFeePostpaid: Boolean(d.sim_fee_postpaid),
      bundleApplied: Boolean(d.bundle_applied),
      bundleNotApplied: Boolean(d.bundle_not_applied),
      dealerNotes: d.dealer_notes,
      discardReason: d.discard_reason,
      dealerName: d.dealer_name,
      userName: d.user_name,
      activatedByName: d.activated_by_name
    } as Document & { dealerName: string; userName: string; activatedByName?: string }));
  }

  async checkDuplicateDocument(data: { customerName: string; customerPhone: string; storeName?: string; contactCode?: string }): Promise<Array<Document & { dealerName: string }>> {
    let query = `
      SELECT d.*, dealers.name as dealer_name
      FROM documents d
      LEFT JOIN dealers ON d.dealer_id = dealers.id
      WHERE d.customer_name = ? AND d.customer_phone = ?
    `;
    let params: any[] = [data.customerName, data.customerPhone];

    // 판매점명 또는 접점코드로 추가 조건 검색
    if (data.storeName) {
      query += ` AND d.store_name = ?`;
      params.push(data.storeName);
    } else if (data.contactCode) {
      query += ` AND d.contact_code = ?`;
      params.push(data.contactCode);
    }

    // 활성 상태인 문서만 조회 (취소되지 않은 문서)
    query += ` AND d.activation_status != ? ORDER BY d.uploaded_at DESC`;
    params.push('취소');

    const documents = db.prepare(query).all(...params) as any[];
    return documents.map(d => ({
      id: d.id,
      dealerId: d.dealer_id,
      userId: d.user_id,
      documentNumber: d.document_number,
      customerName: d.customer_name,
      customerPhone: d.customer_phone,
      storeName: d.store_name,
      carrier: d.carrier,
      previousCarrier: d.previous_carrier,
      contactCode: d.contact_code,
      status: d.status,
      activationStatus: d.activation_status || '대기',
      filePath: d.file_path,
      fileName: d.file_name,
      fileSize: d.file_size,
      uploadedAt: new Date(d.uploaded_at),
      updatedAt: new Date(d.updated_at),
      activatedAt: d.activated_at ? new Date(d.activated_at) : undefined,
      activatedBy: d.activated_by,
      notes: d.notes,
      supplementNotes: d.supplement_notes,
      deviceModel: d.device_model,
      simNumber: d.sim_number,
      subscriptionNumber: d.subscription_number,
      servicePlanId: d.service_plan_id,
      additionalServiceIds: d.additional_service_ids,
      registrationFeePrepaid: Boolean(d.registration_fee_prepaid),
      registrationFeePostpaid: Boolean(d.registration_fee_postpaid),
      registrationFeeInstallment: Boolean(d.registration_fee_installment),
      simFeePrepaid: Boolean(d.sim_fee_prepaid),
      simFeePostpaid: Boolean(d.sim_fee_postpaid),
      bundleApplied: Boolean(d.bundle_applied),
      bundleNotApplied: Boolean(d.bundle_not_applied),
      dealerNotes: d.dealer_notes,
      dealerName: d.dealer_name
    } as Document & { dealerName: string }));
  }

  // 부가서비스 이름 가져오기 헬퍼 함수
  private getAdditionalServiceNames(additionalServiceIds: string | null): string | null {
    if (!additionalServiceIds) return null;
    
    try {
      const serviceIds = JSON.parse(additionalServiceIds) as string[];
      if (!Array.isArray(serviceIds) || serviceIds.length === 0) return null;
      
      // 데이터베이스에서 실제 부가서비스 이름 조회
      const serviceNames = serviceIds.map(id => {
        const service = db.prepare('SELECT service_name FROM additional_services WHERE id = ?').get(id) as any;
        return service ? service.service_name : null;
      }).filter(Boolean);
      
      return serviceNames.length > 0 ? serviceNames.join(', ') : null;
    } catch (error) {
      console.error('Error parsing additional service IDs:', error);
      return null;
    }
  }

  async getExportDocuments(startDate: string, endDate: string): Promise<any[]> {
    const query = `
      SELECT 
        d.activated_at as activatedAt,
        d.store_name as storeName,
        d.customer_name as customerName,
        d.customer_phone as customerPhone,
        dealers.name as dealerName,
        d.carrier,
        sp.plan_name as servicePlanName,
        d.subscription_number as subscriptionNumber,
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

    return db.prepare(query).all(startDate, endDate) as any[];
  }

  async updateDocumentStatus(id: number, data: UpdateDocumentStatusForm): Promise<Document> {
    let updateQuery = `
      UPDATE documents 
      SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    `;
    let params: any[] = [data.status, data.notes || null];

    if (data.activationStatus) {
      updateQuery += `, activation_status = ?`;
      params.push(data.activationStatus);
      
      if (data.activationStatus === '개통' || data.activationStatus === '취소') {
        updateQuery += `, activated_at = CURRENT_TIMESTAMP`;
      }
    }

    updateQuery += ` WHERE id = ?`;
    params.push(id);

    db.prepare(updateQuery).run(...params);
    const result = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;

    return {
      id: result.id,
      dealerId: result.dealer_id,
      userId: result.user_id,
      documentNumber: result.document_number,
      customerName: result.customer_name,
      customerPhone: result.customer_phone,
      storeName: result.store_name,
      status: result.status,
      activationStatus: result.activation_status,
      filePath: result.file_path,
      fileName: result.file_name,
      fileSize: result.file_size,
      uploadedAt: new Date(result.uploaded_at),
      updatedAt: new Date(result.updated_at),
      activatedAt: result.activated_at ? new Date(result.activated_at) : undefined,
      notes: result.notes,
      assignedWorkerId: result.assigned_worker_id,
      assignedAt: result.assigned_at ? new Date(result.assigned_at) : undefined
    };
  }

  async updateDocumentActivationStatus(id: number, data: any, workerId?: number): Promise<Document> {
    let updateQuery = `
      UPDATE documents 
      SET activation_status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    `;
    let params: any[] = [data.activationStatus, data.notes || null];

    // 진행중 상태로 변경 시 작업자 할당
    if (data.activationStatus === '진행중' && workerId) {
      updateQuery += `, assigned_worker_id = ?, assigned_at = CURRENT_TIMESTAMP`;
      params.push(workerId);
    }

    // 보완필요 상태일 때 보완 관련 정보 추가
    if (data.activationStatus === '보완필요') {
      updateQuery += `, supplement_notes = ?, supplement_required_by = ?, supplement_required_at = CURRENT_TIMESTAMP`;
      params.push(data.supplementNotes || null, data.supplementRequiredBy || null);
    }

    // 폐기 상태일 때 폐기 사유 추가
    if (data.activationStatus === '폐기') {
      updateQuery += `, discard_reason = ?`;
      params.push(data.discardReason || null);
    }

    // 개통완료 또는 기타완료 시 작업자 ID와 시간 기록, 그리고 기기/유심/가입번호 정보
    if ((data.activationStatus === '개통' || data.activationStatus === '기타완료') && data.activatedBy) {
      updateQuery += `, activated_by = ?, activated_at = CURRENT_TIMESTAMP`;
      params.push(data.activatedBy);
    } else if (data.activationStatus === '개통' || data.activationStatus === '기타완료' || data.activationStatus === '취소' || data.activationStatus === '폐기') {
      updateQuery += `, activated_at = CURRENT_TIMESTAMP`;
    }
    
    // 개통완료 또는 기타완료 시 기기/유심/가입번호 정보 및 판매점 메모 업데이트
    if (data.activationStatus === '개통' || data.activationStatus === '기타완료') {
      const now = new Date();
      const activationNumber = `개통${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      
      updateQuery += `, device_model = ?, sim_number = ?, subscription_number = ?, dealer_notes = ?, service_plan_id = ?, additional_service_ids = ?, registration_fee_prepaid = ?, registration_fee_postpaid = ?, sim_fee_prepaid = ?, sim_fee_postpaid = ?, bundle_applied = ?, bundle_not_applied = ?`;
      params.push(
        data.deviceModel || null,
        data.simNumber || null,
        data.subscriptionNumber || null,
        data.dealerNotes || null,
        data.servicePlanId || null,
        data.additionalServiceIds ? JSON.stringify(data.additionalServiceIds) : null,
        data.registrationFeePrepaid ? 1 : 0,
        data.registrationFeePostpaid ? 1 : 0,
        data.simFeePrepaid ? 1 : 0,
        data.simFeePostpaid ? 1 : 0,
        data.bundleApplied ? 1 : 0,
        data.bundleNotApplied ? 1 : 0
      );
    }

    updateQuery += ` WHERE id = ?`;
    params.push(id);

    db.prepare(updateQuery).run(...params);
    const result = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;

    return {
      id: result.id,
      dealerId: result.dealer_id,
      userId: result.user_id,
      documentNumber: result.document_number,
      customerName: result.customer_name,
      customerPhone: result.customer_phone,
      storeName: result.store_name,
      carrier: result.carrier,
      status: result.status,
      activationStatus: result.activation_status,
      filePath: result.file_path,
      fileName: result.file_name,
      fileSize: result.file_size,
      uploadedAt: new Date(result.uploaded_at),
      updatedAt: new Date(result.updated_at),
      activatedAt: result.activated_at ? new Date(result.activated_at) : undefined,
      activatedBy: result.activated_by,
      notes: result.notes,
      supplementNotes: result.supplement_notes,
      supplementRequiredBy: result.supplement_required_by,
      supplementRequiredAt: result.supplement_required_at ? new Date(result.supplement_required_at) : undefined,
      deviceModel: result.device_model,
      simNumber: result.sim_number,
      subscriptionNumber: result.subscription_number,
      servicePlanId: result.service_plan_id,
      additionalServiceIds: result.additional_service_ids,
      registrationFeePrepaid: Boolean(result.registration_fee_prepaid),
      registrationFeePostpaid: Boolean(result.registration_fee_postpaid),
      registrationFeeInstallment: Boolean(result.registration_fee_installment),
      simFeePrepaid: Boolean(result.sim_fee_prepaid),
      simFeePostpaid: Boolean(result.sim_fee_postpaid),
      bundleApplied: Boolean(result.bundle_applied),
      bundleNotApplied: Boolean(result.bundle_not_applied),
      dealerNotes: result.dealer_notes,
      deviceModel: result.device_model,
      simNumber: result.sim_number,
      subscriptionNumber: result.subscription_number
    };
  }

  async deleteDocument(id: number): Promise<void> {
    const document = db.prepare('SELECT file_path FROM documents WHERE id = ?').get(id) as { file_path: string } | undefined;
    if (document) {
      try {
        fs.unlinkSync(document.file_path);
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  }

  async updateDocumentNotes(id: number, notes: string): Promise<void> {
    const result = db.prepare(`
      UPDATE documents 
      SET notes = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(notes, id);
    
    if (result.changes === 0) {
      throw new Error('문서를 찾을 수 없습니다.');
    }
  }

  async getDocument(id: number): Promise<(Document & { assignedWorkerId?: number; assignedAt?: Date }) | null> {
    const result = db.prepare(`
      SELECT d.*, dealers.name as dealer_name, u.name as user_name, sp.plan_name
      FROM documents d
      JOIN dealers ON d.dealer_id = dealers.id
      JOIN users u ON d.user_id = u.id
      LEFT JOIN service_plans sp ON d.service_plan_id = sp.id
      WHERE d.id = ?
    `).get(id) as any;

    if (!result) return null;

    return {
      id: result.id,
      dealerId: result.dealer_id,
      userId: result.user_id,
      documentNumber: result.document_number,
      customerName: result.customer_name,
      customerPhone: result.customer_phone,
      storeName: result.store_name,
      carrier: result.carrier,
      contactCode: result.contact_code,
      status: result.status,
      activationStatus: result.activation_status || '대기',
      filePath: result.file_path,
      fileName: result.file_name,
      fileSize: result.file_size,
      uploadedAt: new Date(result.uploaded_at),
      updatedAt: new Date(result.updated_at),
      activatedAt: result.activated_at ? new Date(result.activated_at) : undefined,
      activatedBy: result.activated_by,
      notes: result.notes,
      supplementNotes: result.supplement_notes,
      supplementRequiredBy: result.supplement_required_by,
      supplementRequiredAt: result.supplement_required_at ? new Date(result.supplement_required_at) : undefined,
      dealerName: result.dealer_name,
      userName: result.user_name,
      servicePlanId: result.service_plan_id,
      servicePlanName: result.plan_name,
      additionalServiceIds: result.additional_service_ids,
      totalMonthlyFee: result.total_monthly_fee,
      registrationFeePrepaid: Boolean(result.registration_fee_prepaid),
      registrationFeePostpaid: Boolean(result.registration_fee_postpaid),
      registrationFeeInstallment: Boolean(result.registration_fee_installment),
      simFeePrepaid: Boolean(result.sim_fee_prepaid),
      simFeePostpaid: Boolean(result.sim_fee_postpaid),
      bundleApplied: Boolean(result.bundle_applied),
      bundleNotApplied: Boolean(result.bundle_not_applied),
      deviceModel: result.device_model,
      simNumber: result.sim_number,
      subscriptionNumber: result.subscription_number,
      assignedWorkerId: result.assigned_worker_id,
      assignedAt: result.assigned_at ? new Date(result.assigned_at) : undefined
    };
  }

  async uploadPricingTable(data: { title: string; filePath: string; fileName: string; fileSize: number; uploadedBy: number }): Promise<PricingTable> {
    // Deactivate all previous pricing tables
    db.prepare('UPDATE pricing_tables SET is_active = false').run();

    const insertResult = db.prepare(`
      INSERT INTO pricing_tables (title, file_name, file_path, file_size, uploaded_by, is_active)
      VALUES (?, ?, ?, ?, ?, true)
    `).run(
      data.title,
      data.fileName,
      data.filePath,
      data.fileSize,
      data.uploadedBy
    );

    const result = db.prepare('SELECT * FROM pricing_tables WHERE id = ?').get(insertResult.lastInsertRowid) as any;

    return {
      id: result.id,
      title: result.title,
      fileName: result.file_name,
      filePath: result.file_path,
      fileSize: result.file_size,
      uploadedBy: result.uploaded_by,
      uploadedAt: new Date(result.uploaded_at),
      isActive: result.is_active
    };
  }

  async getPricingTables(): Promise<PricingTable[]> {
    const tables = db.prepare('SELECT * FROM pricing_tables ORDER BY uploaded_at DESC').all() as any[];
    return tables.map(t => ({
      id: t.id,
      title: t.title,
      fileName: t.file_name,
      filePath: t.file_path,
      fileSize: t.file_size,
      uploadedBy: t.uploaded_by,
      uploadedAt: new Date(t.uploaded_at),
      isActive: t.is_active
    }));
  }

  async getActivePricingTable(): Promise<PricingTable | null> {
    const table = db.prepare('SELECT * FROM pricing_tables WHERE is_active = true ORDER BY uploaded_at DESC LIMIT 1').get() as any;
    if (!table) return null;

    return {
      id: table.id,
      title: table.title,
      fileName: table.file_name,
      filePath: table.file_path,
      fileSize: table.file_size,
      uploadedBy: table.uploaded_by,
      uploadedAt: new Date(table.uploaded_at),
      isActive: table.is_active
    };
  }

  async getDashboardStats(dealerId?: number, userId?: number, userType?: string, startDate?: string, endDate?: string): Promise<DashboardStats & { carrierStats?: any[]; workerStats?: any[] }> {
    let whereClause = '';
    let params: any[] = [];
    
    // 사용자 유형별 필터링
    if (userType === 'dealer_store' && dealerId) {
      whereClause = ' WHERE dealer_id = ?';
      params = [dealerId];
    } else if (userType === 'dealer_worker' && userId) {
      whereClause = ' WHERE activated_by = ? OR user_id = ?';
      params = [userId, userId];
    }
    // admin은 모든 데이터 조회
    
    // 날짜 필터링을 업로드 날짜 기준으로 변경
    let uploadDateParams = [...params];
    let uploadWhereClause = whereClause;
    if (startDate) {
      uploadWhereClause += (uploadWhereClause ? ' AND' : ' WHERE') + ' date(uploaded_at) >= ?';
      uploadDateParams.push(startDate);
    }
    if (endDate) {
      uploadWhereClause += (uploadWhereClause ? ' AND' : ' WHERE') + ' date(uploaded_at) <= ?';
      uploadDateParams.push(endDate);
    }

    // 전체 통계는 업로드 날짜 기준
    const total = db.prepare(`SELECT COUNT(*) as count FROM documents${uploadWhereClause}`).get(...uploadDateParams) as { count: number };
    const pending = db.prepare(`SELECT COUNT(*) as count FROM documents${uploadWhereClause}${uploadWhereClause ? ' AND' : ' WHERE'} status = ?`).get(...uploadDateParams, '접수') as { count: number };
    const completed = db.prepare(`SELECT COUNT(*) as count FROM documents${uploadWhereClause}${uploadWhereClause ? ' AND' : ' WHERE'} status = ?`).get(...uploadDateParams, '완료') as { count: number };
    
    // 개통 관련 통계는 근무자의 경우 자신이 처리한 건만, 판매점/관리자는 모든 데이터
    let activationWhereClause = '';
    let activationParams: any[] = [];
    if (userType === 'dealer_store' && dealerId) {
      activationWhereClause = ' WHERE dealer_id = ?';
      activationParams = [dealerId];
    } else if (userType === 'dealer_worker' && userId) {
      // 근무자는 자신이 처리한 건만 표시 (activated_by 기준)
      activationWhereClause = ' WHERE activated_by = ?';
      activationParams = [userId];
    }
    
    const activated = db.prepare(`SELECT COUNT(*) as count FROM documents${activationWhereClause}${activationWhereClause ? ' AND' : ' WHERE'} activation_status = ?`).get(...activationParams, '개통') as { count: number };
    const otherCompleted = db.prepare(`SELECT COUNT(*) as count FROM documents${activationWhereClause}${activationWhereClause ? ' AND' : ' WHERE'} activation_status = ?`).get(...activationParams, '기타완료') as { count: number };
    const canceled = db.prepare(`SELECT COUNT(*) as count FROM documents${activationWhereClause}${activationWhereClause ? ' AND' : ' WHERE'} activation_status = ?`).get(...activationParams, '취소') as { count: number };
    const discarded = db.prepare(`SELECT COUNT(*) as count FROM documents${activationWhereClause}${activationWhereClause ? ' AND' : ' WHERE'} activation_status = ?`).get(...activationParams, '폐기') as { count: number };
    const pendingActivations = db.prepare(`SELECT COUNT(*) as count FROM documents${activationWhereClause}${activationWhereClause ? ' AND' : ' WHERE'} activation_status = ?`).get(...activationParams, '대기') as { count: number };
    const inProgress = db.prepare(`SELECT COUNT(*) as count FROM documents${activationWhereClause}${activationWhereClause ? ' AND' : ' WHERE'} activation_status = ?`).get(...activationParams, '진행중') as { count: number };

    const stats: DashboardStats & { carrierStats?: any[]; workerStats?: any[]; otherCompletedCount?: number; discardedCount?: number } = {
      totalDocuments: total.count,
      pendingDocuments: pending.count,
      completedDocuments: completed.count,
      thisWeekSubmissions: total.count,
      thisMonthSubmissions: total.count,
      activatedCount: activated.count,
      canceledCount: canceled.count,
      pendingActivations: pendingActivations.count,
      inProgressCount: inProgress.count,
      otherCompletedCount: otherCompleted.count,
      discardedCount: discarded.count
    };

    // 관리자에게만 통신사별/근무자별 통계 제공
    if (userType === 'admin') {
      // 날짜 필터가 있는 경우 통신사별/근무자별 통계에도 적용
      let carrierDateFilter = '';
      let workerDateFilter = '';
      let dateParams: any[] = [];
      
      if (startDate || endDate) {
        if (startDate) {
          carrierDateFilter += ' AND date(activated_at) >= ?';
          workerDateFilter += ' AND date(d.activated_at) >= ?';
          dateParams.push(startDate);
        }
        if (endDate) {
          carrierDateFilter += ' AND date(activated_at) <= ?';
          workerDateFilter += ' AND date(d.activated_at) <= ?';
          dateParams.push(endDate);
        }
      }
      
      // 통신사별 개통 수량 (개통만 - 기타완료 제외)
      const carrierQuery = `
        SELECT 
          carrier,
          COUNT(*) as count
        FROM documents 
        WHERE activation_status = '개통'${carrierDateFilter}
        GROUP BY carrier
        ORDER BY count DESC
      `;
      stats.carrierStats = db.prepare(carrierQuery).all(...dateParams) as any[];

      // 근무자별 개통 수량 (개통만 - 기타완료 제외)
      const workerQuery = `
        SELECT 
          u.id as workerId,
          u.name as workerName,
          COUNT(*) as count
        FROM documents d
        JOIN users u ON d.activated_by = u.id
        WHERE d.activation_status = '개통'${workerDateFilter}
        GROUP BY d.activated_by, u.id, u.name
        ORDER BY count DESC
      `;
      stats.workerStats = db.prepare(workerQuery).all(...dateParams) as any[];
    }
    
    return stats;
  }

  // Separate methods for carrier and worker stats
  async getCarrierStats(startDate?: string, endDate?: string): Promise<any[]> {
    let dateFilter = '';
    let dateParams: any[] = [];
    
    if (startDate || endDate) {
      if (startDate) {
        dateFilter += ' AND date(activated_at) >= ?';
        dateParams.push(startDate);
      }
      if (endDate) {
        dateFilter += ' AND date(activated_at) <= ?';
        dateParams.push(endDate);
      }
    }
    
    const carrierQuery = `
      SELECT 
        carrier,
        COUNT(*) as count
      FROM documents 
      WHERE activation_status = '개통'${dateFilter}
      GROUP BY carrier
      ORDER BY count DESC
    `;
    return db.prepare(carrierQuery).all(...dateParams) as any[];
  }

  async getWorkerStats(startDate?: string, endDate?: string): Promise<any[]> {
    let dateFilter = '';
    let dateParams: any[] = [];
    
    if (startDate || endDate) {
      if (startDate) {
        dateFilter += ' AND date(d.activated_at) >= ?';
        dateParams.push(startDate);
      }
      if (endDate) {
        dateFilter += ' AND date(d.activated_at) <= ?';
        dateParams.push(endDate);
      }
    }
    
    const workerQuery = `
      SELECT 
        u.id as workerId,
        u.name as workerName,
        COUNT(DISTINCT d.id) as count
      FROM documents d
      JOIN users u ON d.activated_by = u.id
      WHERE d.activation_status = '개통' AND d.activated_by IS NOT NULL${dateFilter}
      GROUP BY u.id, u.name
      ORDER BY count DESC
    `;
    return db.prepare(workerQuery).all(...dateParams) as any[];
  }

  async uploadDocumentTemplate(data: { title: string; category: string; filePath: string; fileName: string; fileSize: number; uploadedBy: number }): Promise<any> {
    const insertResult = db.prepare(`
      INSERT INTO document_templates (title, file_name, file_path, file_size, category, uploaded_by, is_active)
      VALUES (?, ?, ?, ?, ?, ?, true)
    `).run(
      data.title,
      data.fileName,
      data.filePath,
      data.fileSize,
      data.category,
      data.uploadedBy
    );

    const result = db.prepare('SELECT * FROM document_templates WHERE id = ?').get(insertResult.lastInsertRowid) as any;

    return {
      id: result.id,
      title: result.title,
      fileName: result.file_name,
      filePath: result.file_path,
      fileSize: result.file_size,
      category: result.category,
      uploadedBy: result.uploaded_by,
      uploadedAt: new Date(result.uploaded_at),
      isActive: result.is_active
    };
  }

  async getDocumentTemplates(): Promise<any[]> {
    const templates = db.prepare('SELECT * FROM document_templates WHERE is_active = true ORDER BY category, uploaded_at DESC').all() as any[];
    return templates.map(t => ({
      id: t.id,
      title: t.title,
      fileName: t.file_name,
      filePath: t.file_path,
      fileSize: t.file_size,
      category: t.category,
      uploadedBy: t.uploaded_by,
      uploadedAt: new Date(t.uploaded_at),
      isActive: t.is_active
    }));
  }

  async getDocumentTemplateById(id: number): Promise<any | null> {
    const template = db.prepare('SELECT * FROM document_templates WHERE id = ? AND is_active = true').get(id) as any;
    if (!template) return null;

    return {
      id: template.id,
      title: template.title,
      fileName: template.file_name,
      filePath: template.file_path,
      fileSize: template.file_size,
      category: template.category,
      uploadedBy: template.uploaded_by,
      uploadedAt: new Date(template.uploaded_at),
      isActive: template.is_active
    };
  }

  async getWorkerStatsWithDealer(dealerId?: number): Promise<WorkerStats[]> {
    let query = `
      SELECT 
        u.name as worker_name,
        u.id as worker_id,
        d.name as dealer_name,
        d.id as dealer_id,
        COUNT(DISTINCT docs.id) as total_activations,
        SUM(CASE WHEN date(docs.activated_at) >= date('now', 'start of month') THEN 1 ELSE 0 END) as monthly_activations
      FROM documents docs
      JOIN users u ON docs.activated_by = u.id
      JOIN dealers d ON docs.dealer_id = d.id
      WHERE docs.activation_status = '개통' AND docs.activated_by IS NOT NULL
    `;
    
    if (dealerId) {
      query += ' AND docs.dealer_id = ?';
    }
    
    query += ' GROUP BY u.id, u.name, d.id, d.name ORDER BY monthly_activations DESC';
    
    const results = db.prepare(query).all(dealerId ? [dealerId] : []) as any[];
    
    return results.map(r => ({
      workerName: r.worker_name,
      workerId: r.worker_id,
      totalActivations: r.total_activations,
      monthlyActivations: r.monthly_activations,
      dealerId: r.dealer_id,
      dealerName: r.dealer_name
    }));
  }

  async deleteUser(userId: number): Promise<void> {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    stmt.run(userId);
  }

  async findDealerByName(name: string): Promise<Dealer | null> {
    const stmt = db.prepare('SELECT * FROM dealers WHERE name = ?');
    const dealer = stmt.get(name) as any;
    
    if (!dealer) return null;
    
    return {
      id: dealer.id,
      name: dealer.name,
      location: dealer.location,
      contactEmail: dealer.contact_email,
      contactPhone: dealer.contact_phone,
      createdAt: new Date(dealer.created_at),
      updatedAt: new Date(dealer.updated_at)
    };
  }

  // 정산 관리 메서드들
  async createSettlement(data: any): Promise<any> {
    const stmt = db.prepare(`
      INSERT INTO settlements (
        document_id, dealer_id, customer_name, customer_phone,
        service_plan_id, service_plan_name, additional_services,
        bundle_type, bundle_details, policy_level, policy_details,
        settlement_amount, commission_rate, settlement_status, settlement_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.documentId,
      data.dealerId,
      data.customerName,
      data.customerPhone,
      data.servicePlanId || null,
      data.servicePlanName || null,
      JSON.stringify(data.additionalServices || []),
      data.bundleType || null,
      data.bundleDetails || null,
      data.policyLevel || 1,
      data.policyDetails || null,
      data.settlementAmount || null,
      data.commissionRate || null,
      data.settlementStatus || '대기',
      data.settlementDate ? Math.floor(data.settlementDate.getTime() / 1000) : null
    );

    return this.getSettlement(result.lastInsertRowid as number);
  }

  async getSettlement(id: number): Promise<any> {
    const stmt = db.prepare(`
      SELECT s.*, d.name as dealer_name, sp.plan_name
      FROM settlements s
      LEFT JOIN dealers d ON s.dealer_id = d.id
      LEFT JOIN service_plans sp ON s.service_plan_id = sp.id
      WHERE s.id = ?
    `);
    
    const settlement = stmt.get(id) as any;
    if (!settlement) return null;
    
    return {
      id: settlement.id,
      documentId: settlement.document_id,
      dealerId: settlement.dealer_id,
      dealerName: settlement.dealer_name,
      customerName: settlement.customer_name,
      customerPhone: settlement.customer_phone,
      servicePlanId: settlement.service_plan_id,
      servicePlanName: settlement.service_plan_name || settlement.plan_name,
      additionalServices: JSON.parse(settlement.additional_services || '[]'),
      bundleType: settlement.bundle_type,
      bundleDetails: settlement.bundle_details,
      policyLevel: settlement.policy_level,
      policyDetails: settlement.policy_details,
      settlementAmount: settlement.settlement_amount,
      commissionRate: settlement.commission_rate,
      settlementStatus: settlement.settlement_status,
      settlementDate: settlement.settlement_date ? new Date(settlement.settlement_date * 1000) : null,
      createdAt: new Date(settlement.created_at * 1000),
      updatedAt: new Date(settlement.updated_at * 1000)
    };
  }

  async getSettlements(dealerId?: number): Promise<any[]> {
    let query = `
      SELECT s.*, d.name as dealer_name, sp.plan_name
      FROM settlements s
      LEFT JOIN dealers d ON s.dealer_id = d.id
      LEFT JOIN service_plans sp ON s.service_plan_id = sp.id
    `;
    let params: any[] = [];
    
    if (dealerId) {
      query += ' WHERE s.dealer_id = ?';
      params.push(dealerId);
    }
    
    query += ' ORDER BY s.created_at DESC';
    
    const stmt = db.prepare(query);
    const settlements = stmt.all(...params) as any[];
    
    return settlements.map(s => ({
      id: s.id,
      documentId: s.document_id,
      dealerId: s.dealer_id,
      dealerName: s.dealer_name,
      customerName: s.customer_name,
      customerPhone: s.customer_phone,
      servicePlanId: s.service_plan_id,
      servicePlanName: s.service_plan_name || s.plan_name,
      additionalServices: JSON.parse(s.additional_services || '[]'),
      bundleType: s.bundle_type,
      bundleDetails: s.bundle_details,
      policyLevel: s.policy_level,
      policyDetails: s.policy_details,
      settlementAmount: s.settlement_amount,
      commissionRate: s.commission_rate,
      settlementStatus: s.settlement_status,
      settlementDate: s.settlement_date ? new Date(s.settlement_date * 1000) : null,
      createdAt: new Date(s.created_at * 1000),
      updatedAt: new Date(s.updated_at * 1000)
    }));
  }

  async updateSettlement(id: number, data: any): Promise<any> {
    const updateFields = [];
    const params = [];
    
    if (data.customerName !== undefined) {
      updateFields.push('customer_name = ?');
      params.push(data.customerName);
    }
    if (data.customerPhone !== undefined) {
      updateFields.push('customer_phone = ?');
      params.push(data.customerPhone);
    }
    if (data.servicePlanId !== undefined) {
      updateFields.push('service_plan_id = ?');
      params.push(data.servicePlanId);
    }
    if (data.servicePlanName !== undefined) {
      updateFields.push('service_plan_name = ?');
      params.push(data.servicePlanName);
    }
    if (data.additionalServices !== undefined) {
      updateFields.push('additional_services = ?');
      params.push(JSON.stringify(data.additionalServices));
    }
    if (data.bundleType !== undefined) {
      updateFields.push('bundle_type = ?');
      params.push(data.bundleType);
    }
    if (data.bundleDetails !== undefined) {
      updateFields.push('bundle_details = ?');
      params.push(data.bundleDetails);
    }
    if (data.policyLevel !== undefined) {
      updateFields.push('policy_level = ?');
      params.push(data.policyLevel);
    }
    if (data.policyDetails !== undefined) {
      updateFields.push('policy_details = ?');
      params.push(data.policyDetails);
    }
    if (data.settlementAmount !== undefined) {
      updateFields.push('settlement_amount = ?');
      params.push(data.settlementAmount);
    }
    if (data.commissionRate !== undefined) {
      updateFields.push('commission_rate = ?');
      params.push(data.commissionRate);
    }
    if (data.settlementStatus !== undefined) {
      updateFields.push('settlement_status = ?');
      params.push(data.settlementStatus);
    }
    if (data.settlementDate !== undefined) {
      updateFields.push('settlement_date = ?');
      params.push(data.settlementDate ? Math.floor(data.settlementDate.getTime() / 1000) : null);
    }
    
    updateFields.push('updated_at = ?');
    params.push(Math.floor(Date.now() / 1000));
    params.push(id);
    
    const stmt = db.prepare(`
      UPDATE settlements 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `);
    
    stmt.run(...params);
    return this.getSettlement(id);
  }

  async deleteSettlement(id: number): Promise<void> {
    const stmt = db.prepare('DELETE FROM settlements WHERE id = ?');
    stmt.run(id);
  }

  async getWorkerCarrierDetails(workerId: number): Promise<Array<{ carrier: string; count: number }>> {
    const query = `
      SELECT d.carrier, COUNT(*) as count
      FROM documents d
      WHERE d.activated_by = ? AND d.activation_status = '개통'
      GROUP BY d.carrier
      ORDER BY count DESC
    `;
    return db.prepare(query).all(workerId) as Array<{ carrier: string; count: number }>;
  }

  async getCarrierDealerDetails(carrier: string): Promise<Array<{ dealerName: string; count: number }>> {
    const query = `
      SELECT dealers.name as dealerName, COUNT(*) as count
      FROM documents d
      JOIN dealers ON d.dealer_id = dealers.id
      WHERE d.carrier = ? AND d.activation_status = '개통'
      GROUP BY dealers.name
      ORDER BY count DESC
    `;
    return db.prepare(query).all(carrier) as Array<{ dealerName: string; count: number }>;
  }

  // 채팅 관련 메서드들
  async createChatRoom(documentId: number, dealerId: number, workerId?: number): Promise<ChatRoom> {
    const stmt = db.prepare(`
      INSERT INTO chat_rooms (document_id, dealer_id, worker_id, status)
      VALUES (?, ?, ?, 'active')
    `);
    
    const result = stmt.run(documentId, dealerId, workerId || null);
    const roomId = result.lastInsertRowid as number;
    
    // 시스템 메시지 생성
    await this.createChatMessage({
      roomId,
      senderId: workerId || 0,
      senderType: 'worker',
      senderName: '시스템',
      message: '채팅방이 생성되었습니다. 문의사항이 있으시면 언제든 메시지를 남겨주세요.',
      messageType: 'system'
    });
    
    return this.getChatRoomById(roomId) as Promise<ChatRoom>;
  }

  async getChatRoom(documentId: number): Promise<ChatRoom | null> {
    const room = db.prepare(`
      SELECT * FROM chat_rooms 
      WHERE document_id = ? AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `).get(documentId) as any;
    
    if (!room) return null;
    
    return {
      id: room.id,
      documentId: room.document_id,
      dealerId: room.dealer_id,
      workerId: room.worker_id,
      status: room.status,
      createdAt: new Date(room.created_at),
      closedAt: room.closed_at ? new Date(room.closed_at) : undefined
    };
  }

  async getChatRoomById(roomId: number): Promise<ChatRoom | null> {
    const room = db.prepare('SELECT * FROM chat_rooms WHERE id = ?').get(roomId) as any;
    
    if (!room) return null;
    
    return {
      id: room.id,
      documentId: room.document_id,
      dealerId: room.dealer_id,
      workerId: room.worker_id,
      status: room.status,
      createdAt: new Date(room.created_at),
      closedAt: room.closed_at ? new Date(room.closed_at) : undefined
    };
  }

  async updateChatRoom(roomId: number, data: Partial<ChatRoom>): Promise<ChatRoom> {
    const updateFields: string[] = [];
    const params: any[] = [];
    
    if (data.workerId !== undefined) {
      updateFields.push('worker_id = ?');
      params.push(data.workerId);
    }
    
    if (data.status !== undefined) {
      updateFields.push('status = ?');
      params.push(data.status);
      
      if (data.status === 'closed') {
        updateFields.push('closed_at = ?');
        params.push(new Date().toISOString());
      }
    }
    
    if (updateFields.length > 0) {
      params.push(roomId);
      const stmt = db.prepare(`
        UPDATE chat_rooms 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `);
      stmt.run(...params);
    }
    
    return this.getChatRoomById(roomId) as Promise<ChatRoom>;
  }

  async createChatMessage(data: Omit<ChatMessage, 'id' | 'createdAt' | 'readAt'>): Promise<ChatMessage> {
    const stmt = db.prepare(`
      INSERT INTO chat_messages (room_id, sender_id, sender_type, sender_name, message, message_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      data.roomId,
      data.senderId,
      data.senderType,
      data.senderName,
      data.message,
      data.messageType
    );
    
    const messageId = result.lastInsertRowid as number;
    return this.getChatMessageById(messageId) as Promise<ChatMessage>;
  }

  async getChatMessages(roomId: number): Promise<ChatMessage[]> {
    const messages = db.prepare(`
      SELECT * FROM chat_messages 
      WHERE room_id = ? 
      ORDER BY created_at ASC
    `).all(roomId) as any[];
    
    return messages.map(msg => ({
      id: msg.id,
      roomId: msg.room_id,
      senderId: msg.sender_id,
      senderType: msg.sender_type,
      senderName: msg.sender_name,
      message: msg.message,
      messageType: msg.message_type,
      createdAt: new Date(msg.created_at),
      readAt: msg.read_at ? new Date(msg.read_at) : undefined
    }));
  }

  async getChatMessageById(messageId: number): Promise<ChatMessage | null> {
    const msg = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(messageId) as any;
    
    if (!msg) return null;
    
    return {
      id: msg.id,
      roomId: msg.room_id,
      senderId: msg.sender_id,
      senderType: msg.sender_type,
      senderName: msg.sender_name,
      message: msg.message,
      messageType: msg.message_type,
      createdAt: new Date(msg.created_at),
      readAt: msg.read_at ? new Date(msg.read_at) : undefined
    };
  }

  async markMessageAsRead(messageId: number): Promise<void> {
    const stmt = db.prepare('UPDATE chat_messages SET read_at = ? WHERE id = ?');
    stmt.run(new Date().toISOString(), messageId);
  }

  // 당일 통계 조회
  async getTodayStats(userId?: number, userType?: string): Promise<{ 
    todayReception: number; 
    todayActivation: number;
    todayOtherCompleted: number;
    carrierStats: Array<{ carrier: string; count: number }>;
  }> {
    const today = new Date().toISOString().split('T')[0];
    
    let whereClause = '';
    let params: any[] = [today];
    
    // 근무자의 경우 자신이 처리한 건만 조회
    if (userType === 'dealer_worker' && userId) {
      whereClause = ' AND activated_by = ?';
      params.push(userId);
    }
    
    // 당일 접수건 (업로드 날짜 기준) - 모든 사용자에게 동일하게 표시
    const todayReception = db.prepare(`
      SELECT COUNT(*) as count 
      FROM documents 
      WHERE date(uploaded_at) = ?
    `).get(today) as { count: number };
    
    // 당일 개통건 (개통 완료 날짜 기준) - 기타완료 제외
    const todayActivation = db.prepare(`
      SELECT COUNT(*) as count 
      FROM documents 
      WHERE date(activated_at) = ? AND activation_status = '개통'${whereClause}
    `).get(...params) as { count: number };
    
    // 당일 기타완료건 (기타완료 날짜 기준)
    const todayOtherCompleted = db.prepare(`
      SELECT COUNT(*) as count 
      FROM documents 
      WHERE date(activated_at) = ? AND activation_status = '기타완료'${whereClause}
    `).get(...params) as { count: number };
    
    // 당일 통신사별 개통 현황 - 기타완료 제외, 기타 통신사들도 제외
    const carrierStats = db.prepare(`
      SELECT carrier, COUNT(*) as count
      FROM documents 
      WHERE date(activated_at) = ? AND activation_status = '개통'
        AND carrier NOT LIKE '기타%'${whereClause}
      GROUP BY carrier
      ORDER BY count DESC
    `).all(...params) as Array<{ carrier: string; count: number }>;
    
    return {
      todayReception: todayReception.count,
      todayActivation: todayActivation.count,
      todayOtherCompleted: todayOtherCompleted.count,
      carrierStats: carrierStats
    };
  }

  // 접점코드 관리 기능
  async createContactCode(data: CreateContactCodeForm): Promise<ContactCode> {
    const stmt = db.prepare(`
      INSERT INTO contact_codes (code, dealer_name, carrier, is_active)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = stmt.run(data.code, data.dealerName, data.carrier, data.isActive ? 1 : 0);
    const contactCode = db.prepare('SELECT * FROM contact_codes WHERE id = ?').get(result.lastInsertRowid) as any;
    
    return {
      id: contactCode.id,
      code: contactCode.code,
      dealerName: contactCode.dealer_name,
      carrier: contactCode.carrier,
      isActive: Boolean(contactCode.is_active),
      createdAt: new Date(contactCode.created_at),
      updatedAt: new Date(contactCode.updated_at)
    };
  }

  async getContactCodes(): Promise<ContactCode[]> {
    const codes = db.prepare('SELECT * FROM contact_codes WHERE is_active = 1 ORDER BY code').all() as any[];
    return codes.map(code => ({
      id: code.id,
      code: code.code,
      dealerName: code.dealer_name,
      carrier: code.carrier,
      isActive: Boolean(code.is_active),
      createdAt: new Date(code.created_at),
      updatedAt: new Date(code.updated_at)
    }));
  }

  async getContactCodesByCarrier(carrier: string): Promise<ContactCode[]> {
    const codes = db.prepare('SELECT * FROM contact_codes WHERE carrier = ? AND is_active = 1 ORDER BY code').all(carrier) as any[];
    return codes.map(code => ({
      id: code.id,
      code: code.code,
      dealerName: code.dealer_name,
      carrier: code.carrier,
      isActive: Boolean(code.is_active),
      createdAt: new Date(code.created_at),
      updatedAt: new Date(code.updated_at)
    }));
  }

  async findContactCodeByCode(code: string): Promise<ContactCode | null> {
    const contactCode = db.prepare('SELECT * FROM contact_codes WHERE code = ? AND is_active = 1').get(code) as any;
    if (!contactCode) return null;
    
    return {
      id: contactCode.id,
      code: contactCode.code,
      dealerName: contactCode.dealer_name,
      carrier: contactCode.carrier,
      isActive: Boolean(contactCode.is_active),
      createdAt: new Date(contactCode.created_at),
      updatedAt: new Date(contactCode.updated_at)
    };
  }

  async updateContactCode(id: number, data: UpdateContactCodeForm): Promise<ContactCode> {
    const setParts = [];
    const values = [];

    if (data.code !== undefined) {
      setParts.push('code = ?');
      values.push(data.code);
    }
    if (data.dealerName !== undefined) {
      setParts.push('dealer_name = ?');
      values.push(data.dealerName);
    }
    if (data.carrier !== undefined) {
      setParts.push('carrier = ?');
      values.push(data.carrier);
    }
    if (data.isActive !== undefined) {
      setParts.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }
    
    setParts.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = db.prepare(`UPDATE contact_codes SET ${setParts.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    const contactCode = db.prepare('SELECT * FROM contact_codes WHERE id = ?').get(id) as any;
    
    return {
      id: contactCode.id,
      code: contactCode.code,
      dealerName: contactCode.dealer_name,
      carrier: contactCode.carrier,
      isActive: Boolean(contactCode.is_active),
      createdAt: new Date(contactCode.created_at),
      updatedAt: new Date(contactCode.updated_at)
    };
  }

  async deleteContactCode(id: number): Promise<void> {
    db.prepare('UPDATE contact_codes SET is_active = 0 WHERE id = ?').run(id);
  }

  // 한글 접수번호 생성 함수
  generateKoreanDocumentNumber(): string {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    const second = now.getSeconds().toString().padStart(2, '0');
    const millisecond = now.getMilliseconds().toString().padStart(3, '0');
    
    return `접수${month}월${day}일${hour}시${minute}분${second}초${millisecond}`;
  }

  // 개통방명 코드로 판매점명 자동 설정
  async getStoreName(contactCode: string, carrier: string): Promise<string | null> {
    const contact = db.prepare('SELECT dealer_name FROM contact_codes WHERE code = ? AND carrier = ? AND is_active = 1').get(contactCode, carrier) as any;
    return contact ? contact.dealer_name : null;
  }

  // ==================== 통신사 관리 ====================
  
  async getCarriers(): Promise<any[]> {
    const carriers = db.prepare('SELECT * FROM carriers ORDER BY display_order, name').all() as any[];
    return carriers.map(c => ({
      id: c.id,
      name: c.name,
      displayOrder: c.display_order || 0,
      isActive: Boolean(c.is_active),
      isWired: Boolean(c.is_wired),
      bundleNumber: c.bundle_number || '',
      bundleCarrier: c.bundle_carrier || '',
      documentRequired: Boolean(c.document_required),
      requireCustomerName: Boolean(c.require_customer_name),
      requireCustomerPhone: Boolean(c.require_customer_phone),
      requireContactCode: Boolean(c.require_contact_code),
      requireCustomerEmail: Boolean(c.require_email),
      requireCarrier: Boolean(c.require_carrier || true),
      requireBundleNumber: Boolean(c.require_bundle_number),
      requireBundleCarrier: Boolean(c.require_bundle_carrier),
      requirePreviousCarrier: Boolean(c.require_previous_carrier),
      requireDocumentUpload: Boolean(c.require_file_upload),
      createdAt: new Date(c.created_at)
    }));
  }

  async getCarrierById(id: number): Promise<any | null> {
    const carrier = db.prepare('SELECT * FROM carriers WHERE id = ?').get(id) as any;
    if (!carrier) return null;
    
    return {
      id: carrier.id,
      name: carrier.name,
      displayOrder: carrier.display_order || 0,
      isActive: Boolean(carrier.is_active),
      isWired: Boolean(carrier.is_wired),
      bundleNumber: carrier.bundle_number || '',
      bundleCarrier: carrier.bundle_carrier || '',
      documentRequired: Boolean(carrier.document_required),
      requireCustomerName: Boolean(carrier.require_customer_name),
      requireCustomerPhone: Boolean(carrier.require_customer_phone),
      requireContactCode: Boolean(carrier.require_contact_code),
      requireCustomerEmail: Boolean(carrier.require_email),
      requireCarrier: Boolean(carrier.require_carrier || true),
      requireBundleNumber: Boolean(carrier.require_bundle_number),
      requireBundleCarrier: Boolean(carrier.require_bundle_carrier),
      requirePreviousCarrier: Boolean(carrier.require_previous_carrier),
      requireDocumentUpload: Boolean(carrier.require_file_upload),
      createdAt: new Date(carrier.created_at)
    };
  }

  async createCarrier(data: any): Promise<any> {
    const stmt = db.prepare(`
      INSERT INTO carriers (
        name, require_customer_name, require_customer_phone, require_contact_code,
        require_email, require_bundle_number, require_bundle_carrier, require_previous_carrier,
        require_store_name, require_file_upload, is_wired, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    const result = stmt.run(
      data.name,
      data.requireCustomerName ? 1 : 0,
      data.requireCustomerPhone ? 1 : 0,
      data.requireContactCode ? 1 : 0,
      data.requireEmail ? 1 : 0,
      data.requireBundleNumber ? 1 : 0,
      data.requireBundleCarrier ? 1 : 0,
      data.requirePreviousCarrier ? 1 : 0,
      data.requireStoreName ? 1 : 0,
      data.requireFileUpload ? 1 : 0,
      data.isWired ? 1 : 0
    );
    
    return this.getCarrierById(result.lastInsertRowid as number);
  }

  async updateCarrier(id: number, data: any): Promise<any> {
    const updateFields = [];
    const params = [];
    
    if (data.requireCustomerName !== undefined) {
      updateFields.push('require_customer_name = ?');
      params.push(data.requireCustomerName ? 1 : 0);
    }
    if (data.requireCustomerPhone !== undefined) {
      updateFields.push('require_customer_phone = ?');
      params.push(data.requireCustomerPhone ? 1 : 0);
    }
    if (data.requireContactCode !== undefined) {
      updateFields.push('require_contact_code = ?');
      params.push(data.requireContactCode ? 1 : 0);
    }
    if (data.requireEmail !== undefined) {
      updateFields.push('require_email = ?');
      params.push(data.requireEmail ? 1 : 0);
    }
    if (data.requireBundleNumber !== undefined) {
      updateFields.push('require_bundle_number = ?');
      params.push(data.requireBundleNumber ? 1 : 0);
    }
    if (data.requireBundleCarrier !== undefined) {
      updateFields.push('require_bundle_carrier = ?');
      params.push(data.requireBundleCarrier ? 1 : 0);
    }
    if (data.requirePreviousCarrier !== undefined) {
      updateFields.push('require_previous_carrier = ?');
      params.push(data.requirePreviousCarrier ? 1 : 0);
    }
    if (data.requireStoreName !== undefined) {
      updateFields.push('require_store_name = ?');
      params.push(data.requireStoreName ? 1 : 0);
    }
    if (data.requireFileUpload !== undefined) {
      updateFields.push('require_file_upload = ?');
      params.push(data.requireFileUpload ? 1 : 0);
    }
    if (data.isWired !== undefined) {
      updateFields.push('is_wired = ?');
      params.push(data.isWired ? 1 : 0);
    }
    if (data.isActive !== undefined) {
      updateFields.push('is_active = ?');
      params.push(data.isActive ? 1 : 0);
    }
    if (data.name !== undefined) {
      updateFields.push('name = ?');
      params.push(data.name);
    }
    if (data.displayOrder !== undefined) {
      updateFields.push('display_order = ?');
      params.push(data.displayOrder);
    }
    if (data.bundleNumber !== undefined) {
      updateFields.push('bundle_number = ?');
      params.push(data.bundleNumber);
    }
    if (data.bundleCarrier !== undefined) {
      updateFields.push('bundle_carrier = ?');
      params.push(data.bundleCarrier);
    }
    if (data.documentRequired !== undefined) {
      updateFields.push('document_required = ?');
      params.push(data.documentRequired ? 1 : 0);
    }
    
    if (updateFields.length > 0) {
      params.push(id);
      const stmt = db.prepare(`
        UPDATE carriers 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `);
      stmt.run(...params);
    }
    
    return this.getCarrierById(id);
  }

  // Pricing Policies Management
  async createPricingPolicy(data: Omit<PricingPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<PricingPolicy> {
    const result = db.prepare(`
      INSERT INTO pricing_policies (carrier, service_plan_name, commission_amount, policy_type, is_active)
      VALUES (?, ?, ?, ?, ?)
    `).run(data.carrier, data.servicePlanName, data.commissionAmount, data.policyType, data.isActive ? 1 : 0);

    const policy = db.prepare('SELECT * FROM pricing_policies WHERE id = ?').get(result.lastInsertRowid) as any;
    
    return {
      id: policy.id,
      carrier: policy.carrier,
      servicePlanName: policy.service_plan_name,
      commissionAmount: policy.commission_amount,
      policyType: policy.policy_type,
      isActive: Boolean(policy.is_active),
      createdAt: new Date(policy.created_at),
      updatedAt: new Date(policy.updated_at)
    };
  }

  async getPricingPolicies(): Promise<PricingPolicy[]> {
    const policies = db.prepare('SELECT * FROM pricing_policies WHERE is_active = 1 ORDER BY carrier, service_plan_name').all() as any[];
    return policies.map(policy => ({
      id: policy.id,
      carrier: policy.carrier,
      servicePlanName: policy.service_plan_name,
      commissionAmount: policy.commission_amount,
      policyType: policy.policy_type,
      isActive: Boolean(policy.is_active),
      createdAt: new Date(policy.created_at),
      updatedAt: new Date(policy.updated_at)
    }));
  }

  async getPricingPolicy(id: number): Promise<PricingPolicy | null> {
    const policy = db.prepare('SELECT * FROM pricing_policies WHERE id = ?').get(id) as any;
    if (!policy) return null;

    return {
      id: policy.id,
      carrier: policy.carrier,
      servicePlanName: policy.service_plan_name,
      commissionAmount: policy.commission_amount,
      policyType: policy.policy_type,
      isActive: Boolean(policy.is_active),
      createdAt: new Date(policy.created_at),
      updatedAt: new Date(policy.updated_at)
    };
  }

  async updatePricingPolicy(id: number, data: Partial<Omit<PricingPolicy, 'id' | 'createdAt' | 'updatedAt'>>): Promise<PricingPolicy> {
    const setParts = [];
    const values = [];

    if (data.carrier !== undefined) {
      setParts.push('carrier = ?');
      values.push(data.carrier);
    }
    if (data.servicePlanName !== undefined) {
      setParts.push('service_plan_name = ?');
      values.push(data.servicePlanName);
    }
    if (data.commissionAmount !== undefined) {
      setParts.push('commission_amount = ?');
      values.push(data.commissionAmount);
    }
    if (data.policyType !== undefined) {
      setParts.push('policy_type = ?');
      values.push(data.policyType);
    }
    if (data.isActive !== undefined) {
      setParts.push('is_active = ?');
      values.push(data.isActive ? 1 : 0);
    }

    setParts.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    db.prepare(`UPDATE pricing_policies SET ${setParts.join(', ')} WHERE id = ?`).run(...values);

    const policy = db.prepare('SELECT * FROM pricing_policies WHERE id = ?').get(id) as any;
    return {
      id: policy.id,
      carrier: policy.carrier,
      servicePlanName: policy.service_plan_name,
      commissionAmount: policy.commission_amount,
      policyType: policy.policy_type,
      isActive: Boolean(policy.is_active),
      createdAt: new Date(policy.created_at),
      updatedAt: new Date(policy.updated_at)
    };
  }

  async deletePricingPolicy(id: number): Promise<void> {
    db.prepare('UPDATE pricing_policies SET is_active = 0 WHERE id = ?').run(id);
  }

  // 통신사와 요금제에 따른 자동 커미션 계산
  async calculateCommissionForDocument(carrier: string, servicePlanName: string): Promise<number> {
    const policy = db.prepare(`
      SELECT commission_amount 
      FROM pricing_policies 
      WHERE carrier = ? AND service_plan_name = ? AND is_active = 1
      LIMIT 1
    `).get(carrier, servicePlanName) as any;

    return policy ? policy.commission_amount : 0;
  }

  // 정산 데이터 자동 계산으로 업데이트
  async updateSettlementWithAutoCalculation(documentId: number): Promise<void> {
    const document = await this.getDocument(documentId);
    if (!document || !document.servicePlanId) return;

    const servicePlan = await this.getServicePlan(document.servicePlanId);
    if (!servicePlan) return;

    const commissionAmount = await this.calculateCommissionForDocument(document.carrier, servicePlan.planName);
    
    if (commissionAmount > 0) {
      // settlements 테이블이 있다면 업데이트, 없다면 해당 로직 생략
      try {
        db.prepare(`
          UPDATE settlements 
          SET settlement_amount = ?, auto_calculated = 1, settlement_status = '계산완료', updated_at = unixepoch()
          WHERE document_id = ?
        `).run(commissionAmount, documentId);
      } catch (error) {
        console.warn('Settlements table not found or update failed:', error);
      }
    }
  }
}

export const storage = new SqliteStorage();
