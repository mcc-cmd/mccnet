import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  boolean,
  text,
  decimal,
  serial,
  primaryKey,
} from "drizzle-orm/pg-core";

//===============================================
// PostgreSQL 데이터베이스 테이블 정의
//===============================================

// 세션 저장소 테이블 (필수)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// 영업팀 테이블 (신규 추가)
export const salesTeams = pgTable("sales_teams", {
  id: serial("id").primaryKey(),
  teamName: varchar("team_name", { length: 100 }).notNull(), // 영업팀명
  teamCode: varchar("team_code", { length: 20 }).unique().notNull(), // 영업팀 코드
  description: text("description"), // 팀 설명
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 영업과장 테이블 (신규 추가)
export const salesManagers = pgTable("sales_managers", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => salesTeams.id).notNull(),
  managerName: varchar("manager_name", { length: 100 }).notNull(), // 과장명
  managerCode: varchar("manager_code", { length: 20 }).unique().notNull(), // 과장 코드
  username: varchar("username", { length: 50 }).unique().notNull(), // 로그인 ID
  password: varchar("password", { length: 255 }).notNull(), // 해시된 비밀번호
  position: varchar("position", { length: 20 }).notNull().default('대리'), // 직급
  contactPhone: varchar("contact_phone", { length: 20 }),
  email: varchar("email", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 접점 코드 테이블 (신규 추가)
export const contactCodes = pgTable("contact_codes", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  dealerName: varchar("dealer_name", { length: 255 }).notNull(),
  carrier: varchar("carrier", { length: 100 }).notNull(),
  salesManagerId: integer("sales_manager_id").references(() => salesManagers.id),
  salesManagerName: varchar("sales_manager_name", { length: 100 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 접점 코드와 영업과장 매핑 테이블 (신규 추가)
export const contactCodeMappings = pgTable("contact_code_mappings", {
  id: serial("id").primaryKey(),
  managerId: integer("manager_id").references(() => salesManagers.id).notNull(),
  carrier: varchar("carrier", { length: 50 }).notNull(), // 통신사
  contactCode: varchar("contact_code", { length: 50 }).notNull(), // 접점 코드
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 관리자 테이블
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 통신사 테이블
export const carriers = pgTable("carriers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // 통신사명
  displayOrder: integer("display_order").default(0), // 표시 순서
  isActive: boolean("is_active").default(true), // 활성화 상태
  isWired: boolean("is_wired").default(false), // 유선 통신사 여부
  bundleNumber: varchar("bundle_number", { length: 100 }), // 결합 번호
  bundleCarrier: varchar("bundle_carrier", { length: 100 }), // 결합 통신사
  documentRequired: boolean("document_required").default(false), // 서류 필수 여부
  requireCustomerName: boolean("require_customer_name").default(true), // 고객명 필수
  requireCustomerPhone: boolean("require_customer_phone").default(true), // 고객 전화번호 필수
  requireCustomerEmail: boolean("require_customer_email").default(false), // 고객 이메일 필수
  requireContactCode: boolean("require_contact_code").default(true), // 접점코드 필수
  requireCarrier: boolean("require_carrier").default(true), // 통신사 필수
  requirePreviousCarrier: boolean("require_previous_carrier").default(false), // 이전통신사 필수
  requireDocumentUpload: boolean("require_document_upload").default(false), // 서류 업로드 필수
  requireBundleNumber: boolean("require_bundle_number").default(false), // 결합 번호 필수
  requireBundleCarrier: boolean("require_bundle_carrier").default(false), // 결합 통신사 필수
  allowNewCustomer: boolean("allow_new_customer").default(true), // 신규 고객 허용
  allowPortIn: boolean("allow_port_in").default(true), // 번호이동 허용
  requireDesiredNumber: boolean("require_desired_number").default(false), // 희망번호 필수 (신규시)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 서비스 플랜 테이블
export const servicePlans = pgTable("service_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(), // 요금제명
  carrier: varchar("carrier", { length: 100 }).notNull(), // 통신사
  planType: varchar("plan_type", { length: 50 }).notNull(), // 요금제 유형 (LTE, 5G 등)
  dataAllowance: varchar("data_allowance", { length: 100 }), // 데이터 제공량
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 }).notNull(), // 월 요금
  combinationEligible: boolean("combination_eligible").default(false), // 결합 가능 여부
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 부가서비스 테이블
export const additionalServices = pgTable("additional_services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(), // 부가서비스명
  carrier: varchar("carrier", { length: 100 }).notNull(), // 통신사
  monthlyFee: decimal("monthly_fee", { precision: 10, scale: 2 }).notNull(), // 월 요금
  description: text("description"), // 설명
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 정산단가 테이블
export const settlementUnitPrices = pgTable("settlement_unit_prices", {
  id: serial("id").primaryKey(),
  servicePlanId: integer("service_plan_id").references(() => servicePlans.id).notNull(),
  newCustomerPrice: decimal("new_customer_price", { precision: 10, scale: 2 }).notNull(), // 신규 정산단가
  portInPrice: decimal("port_in_price", { precision: 10, scale: 2 }).notNull(), // 번호이동 정산단가
  isActive: boolean("is_active").default(true),
  effectiveFrom: timestamp("effective_from").defaultNow(), // 적용 시작일
  effectiveUntil: timestamp("effective_until"), // 적용 종료일 (null이면 현재 적용 중)
  memo: text("memo"), // 메모 (몇차 단가인지 등)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: integer("created_by").notNull(), // 등록한 관리자 ID
});

// 문서 접수 테이블
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  dealerId: integer("dealer_id"), // nullable - admin이 직접 등록할 수도 있음
  userId: integer("user_id").notNull(), // 등록한 사용자 ID
  documentNumber: varchar("document_number", { length: 50 }).notNull().unique(),
  customerName: varchar("customer_name", { length: 100 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }).notNull(),
  storeName: varchar("store_name", { length: 255 }),
  contactCode: varchar("contact_code", { length: 50 }),
  carrier: varchar("carrier", { length: 100 }).notNull(),
  previousCarrier: varchar("previous_carrier", { length: 100 }),
  customerType: varchar("customer_type", { length: 20 }).default('new'), // 'new' or 'port-in'
  desiredNumber: varchar("desired_number", { length: 20 }),
  status: varchar("status", { length: 20 }).notNull().default('접수'),
  activationStatus: varchar("activation_status", { length: 20 }).notNull().default('대기'),
  filePath: varchar("file_path", { length: 500 }),
  fileName: varchar("file_name", { length: 255 }),
  fileSize: integer("file_size"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  activatedAt: timestamp("activated_at"),
  activatedBy: integer("activated_by"),
  cancelledBy: integer("cancelled_by"),
  notes: text("notes"),
  // 작업 잠금 시스템
  assignedWorkerId: integer("assigned_worker_id"),
  assignedAt: timestamp("assigned_at"),
  // 보완 관련 필드
  supplementRequired: text("supplement_required"),
  supplementNotes: text("supplement_notes"),
  supplementRequiredBy: integer("supplement_required_by"),
  supplementRequiredAt: timestamp("supplement_required_at"),
  // 개통 완료 후 플랜 정보
  servicePlanId: integer("service_plan_id").references(() => servicePlans.id),
  servicePlanName: varchar("service_plan_name", { length: 200 }),
  additionalServiceIds: text("additional_service_ids"), // JSON 배열
  registrationFee: decimal("registration_fee", { precision: 10, scale: 2 }),
  registrationFeePrepaid: boolean("registration_fee_prepaid").default(false),
  registrationFeePostpaid: boolean("registration_fee_postpaid").default(false),
  registrationFeeInstallment: boolean("registration_fee_installment").default(false),
  simFeePrepaid: boolean("sim_fee_prepaid").default(false),
  simFeePostpaid: boolean("sim_fee_postpaid").default(false),
  bundleApplied: boolean("bundle_applied").default(false),
  bundleNotApplied: boolean("bundle_not_applied").default(false),
  bundleDiscount: decimal("bundle_discount", { precision: 10, scale: 2 }),
  totalMonthlyFee: decimal("total_monthly_fee", { precision: 10, scale: 2 }),
  // 단말기 정보
  deviceModel: varchar("device_model", { length: 100 }),
  simNumber: varchar("sim_number", { length: 50 }),
  subscriptionNumber: varchar("subscription_number", { length: 50 }),
  dealerNotes: text("dealer_notes"),
  discardReason: text("discard_reason"),
  // 정산단가 저장 (개통 완료 시점의 단가)
  settlementNewCustomerPrice: decimal("settlement_new_customer_price", { precision: 10, scale: 2 }),
  settlementPortInPrice: decimal("settlement_port_in_price", { precision: 10, scale: 2 }),
  settlementCalculatedAt: timestamp("settlement_calculated_at"),
  // 수정된 정산 금액 (관리자가 직접 수정한 경우)
  settlementAmount: decimal("settlement_amount", { precision: 10, scale: 2 }),
});

// 판매점 자체 가입 테이블
export const dealerRegistrations = pgTable("dealer_registrations", {
  id: serial("id").primaryKey(),
  businessName: varchar("business_name", { length: 255 }).notNull(), // 사업체명
  representativeName: varchar("representative_name", { length: 100 }).notNull(), // 대표자명
  businessNumber: varchar("business_number", { length: 20 }).unique().notNull(), // 사업자번호
  contactPhone: varchar("contact_phone", { length: 20 }).notNull(),
  contactEmail: varchar("contact_email", { length: 100 }).unique().notNull(),
  address: text("address").notNull(), // 사업장 주소
  bankAccount: varchar("bank_account", { length: 100 }), // 정산 계좌
  bankName: varchar("bank_name", { length: 50 }), // 은행명
  accountHolder: varchar("account_holder", { length: 100 }), // 예금주
  // 로그인 정보
  username: varchar("username", { length: 50 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  // 승인 상태
  status: varchar("status", { length: 20 }).notNull().default('대기'), // '대기', '승인', '거부'
  approvedBy: integer("approved_by").references(() => admins.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 채팅방 테이블
export const chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  dealerId: integer("dealer_id"), // 판매점 ID (documents에서 가져올 수도 있지만 직접 저장)
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 채팅 메시지 테이블
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  chatRoomId: integer("chat_room_id").references(() => chatRooms.id).notNull(),
  senderId: integer("sender_id").notNull(), // 발송자 ID (dealer_registration 또는 user/admin)
  senderType: varchar("sender_type", { length: 20 }).notNull(), // 'dealer', 'worker', 'admin'
  senderName: varchar("sender_name", { length: 100 }).notNull(), // 발송자 이름
  message: text("message").notNull(),
  messageType: varchar("message_type", { length: 20 }).default('text'), // 'text', 'image', 'file'
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});



// Database schema types
export interface Admin {
  id: number;
  username: string;
  password: string;
  name: string;
  createdAt: Date;
}

// 통신사 타입
export interface Carrier {
  id: number;
  name: string;
  displayOrder: number;
  isActive: boolean;
  isWired: boolean;
  bundleNumber?: string;
  bundleCarrier?: string;
  documentRequired: boolean;
  requireCustomerName: boolean;
  requireCustomerPhone: boolean;
  requireCustomerEmail: boolean;
  requireContactCode: boolean;
  requireCarrier: boolean;
  requirePreviousCarrier: boolean;
  requireDocumentUpload: boolean;
  requireBundleNumber: boolean;
  requireBundleCarrier: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 서비스 플랜 타입
export interface ServicePlan {
  id: number;
  planName: string; // name을 planName으로 변경
  carrier: string;
  planType: string;
  dataAllowance?: string;
  monthlyFee: number;
  combinationEligible: boolean; // 결합 가능 여부
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 부가서비스 타입
export interface AdditionalService {
  id: number;
  name: string;
  carrier: string;
  monthlyFee: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 영업팀 타입
export interface SalesTeam {
  id: number;
  teamName: string;
  teamCode: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 영업과장 타입
export interface SalesManager {
  id: number;
  teamId: number;
  managerName: string;
  managerCode: string;
  username: string;
  password: string;
  position: '팀장' | '과장' | '대리'; // 직급 필드 추가
  contactPhone?: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 접점 코드 타입
export interface ContactCode {
  id: number;
  code: string;
  dealerName: string;
  carrier: string;
  salesManagerId?: number;
  salesManagerName?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 접점 코드 매핑 타입
export interface ContactCodeMapping {
  id: number;
  managerId: number;
  carrier: string;
  contactCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Dealer {
  id: number;
  name: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  kpNumber?: string; // KP번호 추가
  contactCodes?: string; // 통신사별 접점 코드 (JSON 형태로 저장)
  createdAt: Date;
}

export interface KPDealerInfo {
  id: number;
  kpNumber: string;
  dealerName: string;
  location: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface User {
  id: number;
  dealerId?: number; // nullable로 변경
  username: string; // email을 username으로 변경
  password: string;
  name: string;
  role: 'dealer_store' | 'dealer_worker'; // 판매점/근무자 구분
  createdAt: Date;
}

export interface Document {
  id: number;
  dealerId: number;
  userId: number;
  documentNumber: string;
  customerName: string;
  customerPhone: string;
  storeName?: string; // 판매점 이름 (자동 설정)
  contactCode?: string; // 개통방명 코드 입력
  carrier: string; // 통신사
  previousCarrier?: string; // 이전통신사
  status: '접수' | '보완필요' | '완료';
  activationStatus: '대기' | '진행중' | '업무요청중' | '보완필요' | '개통' | '취소' | '기타완료' | '폐기';
  filePath?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  uploadedAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
  activatedBy?: number; // 개통완료 처리한 근무자 ID
  cancelledBy?: number; // 개통취소 처리한 근무자 ID
  notes?: string;
  // 작업 잠금 시스템
  assignedWorkerId?: number; // 진행중 상태로 변경한 근무자 ID
  assignedAt?: Date; // 진행중으로 변경된 시간
  // 보완 관련 필드
  supplementRequired?: string; // 보완 필요 사유
  supplementNotes?: string; // 보완 상세 내용 (근무자가 작성)
  supplementRequiredBy?: number; // 보완 요청한 근무자 ID
  supplementRequiredAt?: Date; // 보완 요청 일시
  // 개통 완료 후 플랜 정보
  servicePlanId?: number;
  servicePlanName?: string; // 요금제명 (조인으로 가져온 값)
  additionalServiceIds?: string; // JSON 배열 형태로 저장
  registrationFee?: number;
  registrationFeePrepaid?: boolean; // 가입비 선납
  registrationFeePostpaid?: boolean; // 가입비 후납
  registrationFeeInstallment?: boolean; // 가입비 분납
  simFeePrepaid?: boolean; // 유심비 선납
  simFeePostpaid?: boolean; // 유심비 후납
  bundleApplied?: boolean; // 결합 적용
  bundleNotApplied?: boolean; // 결합 미적용
  bundleDiscount?: number;
  totalMonthlyFee?: number;
  // 단말기 정보
  deviceModel?: string; // 단말기 기종
  simNumber?: string; // 유심번호
  subscriptionNumber?: string; // 가입번호/계약번호
  dealerNotes?: string; // 판매점 전달 메모
  discardReason?: string; // 폐기 사유
  // 정산단가 저장 (개통 완료 시점의 단가)
  settlementNewCustomerPrice?: number; // 신규고객 정산단가
  settlementPortInPrice?: number; // 번호이동 정산단가
  settlementCalculatedAt?: Date; // 정산단가 계산 일시
}

export interface ChatRoom {
  id: number;
  documentId: number;
  dealerId: number;
  workerId?: number;
  status: 'active' | 'closed';
  createdAt: Date;
  closedAt?: Date;
}

export interface ChatMessage {
  id: number;
  roomId: number;
  senderId: number;
  senderType: 'dealer' | 'worker';
  senderName: string;
  message: string;
  messageType: 'text' | 'system';
  readAt?: Date;
  createdAt: Date;
}

// 판매점 등록 타입
export interface DealerRegistration {
  id: number;
  businessName: string;
  representativeName: string;
  businessNumber: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  bankAccount?: string;
  bankName?: string;
  accountHolder?: string;
  username: string;
  password: string;
  status: '대기' | '승인' | '거부';
  approvedBy?: number;
  approvedAt?: Date;
  rejectionReason?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentTemplate {
  id: number;
  title: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  category: '가입서류' | '변경서류';
  uploadedBy: number; // admin id
  uploadedAt: Date;
  isActive: boolean;
}

export interface WorkerStats {
  workerName: string;
  workerId: number;
  totalActivations: number;
  monthlyActivations: number;
  dealerId: number;
  dealerName: string;
}

export interface AuthSession {
  id: string;
  userId: number;
  userType: 'admin' | 'user' | 'sales_manager'; // 영업과장 추가
  userRole?: string;
  dealerId?: number;
  managerId?: number; // 영업과장 ID 추가
  teamId?: number; // 영업팀 ID 추가
  expiresAt: Date;
}

// Zod schemas for validation
export const loginSchema = z.object({
  username: z.string().min(3, "아이디는 최소 3자 이상이어야 합니다"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
});

export const createDealerSchema = z.object({
  name: z.string().min(1, "대리점명을 입력하세요"),
  location: z.string().min(1, "위치를 입력하세요"),
  contactEmail: z.string().email("올바른 이메일을 입력하세요"),
  contactPhone: z.string().min(1, "연락처를 입력하세요"),
  kpNumber: z.string().optional(),
  contactCodes: z.string().optional(), // 통신사별 접점 코드 (JSON)
});

// 접점 코드 관리용 스키마
export const contactCodeSchema = z.object({
  carrierId: z.string().min(1, "통신사를 선택하세요"),
  carrierName: z.string().min(1, "통신사명을 입력하세요"),
  contactCode: z.string().min(1, "접점 코드를 입력하세요"),
});

export const updateDealerContactCodesSchema = z.object({
  dealerId: z.number().min(1, "대리점을 선택하세요"),
  contactCodes: z.array(z.object({
    carrierId: z.string(),
    carrierName: z.string(),
    contactCode: z.string()
  })),
});

export const createAdminSchema = z.object({
  username: z.string().min(3, "아이디는 최소 3자 이상이어야 합니다"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  name: z.string().min(1, "이름을 입력하세요"),
});

export const createWorkerSchema = z.object({
  username: z.string().min(3, "아이디는 최소 3자 이상이어야 합니다"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  name: z.string().min(1, "이름을 입력하세요"),
});

export type CreateWorkerForm = z.infer<typeof createWorkerSchema>;

export type CreateWorkerForm = z.infer<typeof createWorkerSchema>;

export const createDealerAccountSchema = z.object({
  kpNumber: z.string().min(1, "KP번호를 입력하세요"),
  username: z.string().min(3, "아이디는 최소 3자 이상이어야 합니다"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  name: z.string().min(1, "이름을 입력하세요"),
});

export const createUserSchema = z.object({
  username: z.string().min(3, "아이디는 최소 3자 이상이어야 합니다"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  name: z.string().min(1, "이름을 입력하세요"),
  role: z.enum(['dealer_store', 'dealer_worker']),
});

export type CreateUserForm = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  username: z.string().min(3, "아이디는 최소 3자 이상이어야 합니다"),
  password: z.string().optional(),
  name: z.string().min(1, "이름을 입력하세요"),
  role: z.enum(['admin', 'sales_manager', 'worker']),
});

export type EditUserForm = z.infer<typeof editUserSchema>;

export const uploadDocumentSchema = z.object({
  customerName: z.string().min(1, "고객명을 입력하세요"),
  customerPhone: z.string().optional(), // 통신사별로 필수 여부가 달라질 수 있음
  customerEmail: z.string().optional(),
  contactCode: z.string().min(1, "개통방명 코드를 입력하세요"),
  storeName: z.string().optional(),
  carrier: z.string().min(1, "통신사를 선택하세요"),
  previousCarrier: z.string().optional(),
  customerType: z.enum(['new', 'port-in']).optional().default('new'),
  desiredNumber: z.string().optional(),
  bundleNumber: z.string().optional(),
  bundleCarrier: z.string().optional(),
  subscriptionNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const updateDocumentStatusSchema = z.object({
  status: z.enum(['접수', '보완필요', '완료']),
  activationStatus: z.enum(['대기', '진행중', '업무요청중', '개통', '취소', '폐기']).optional(),
  notes: z.string().optional(),
});

export const updateActivationStatusSchema = z.object({
  activationStatus: z.enum(['대기', '진행중', '업무요청중', '개통', '취소', '보완필요', '기타완료', '폐기']),
  notes: z.string().optional(),
  supplementNotes: z.string().optional(), // 보완 상세 내용
  activatedBy: z.number().optional(), // 개통완료 처리한 근무자 ID
  supplementRequiredBy: z.number().optional(), // 보완 요청한 근무자 ID
  deviceModel: z.string().optional(), // 기기모델
  simNumber: z.string().optional(), // 유심번호
  subscriptionNumber: z.string().optional(), // 가입번호/계약번호
  
  // 서비스 플랜 관련 필드들
  servicePlanId: z.union([z.string(), z.number()]).optional(),
  additionalServiceIds: z.array(z.union([z.string(), z.number()])).optional(),
  registrationFeePrepaid: z.boolean().optional(),
  registrationFeePostpaid: z.boolean().optional(),
  registrationFeeInstallment: z.boolean().optional(),
  simFeePrepaid: z.boolean().optional(),
  simFeePostpaid: z.boolean().optional(),
  bundleApplied: z.boolean().optional(),
  bundleNotApplied: z.boolean().optional(),
  
  // 판매점 전달 메모
  dealerNotes: z.string().optional(),
  // 폐기 사유
  discardReason: z.string().optional(),
});

// Type exports
export type LoginForm = z.infer<typeof loginSchema>;
export type CreateDealerForm = z.infer<typeof createDealerSchema>;
export type CreateUserForm = z.infer<typeof createUserSchema>;
export type CreateAdminForm = z.infer<typeof createAdminSchema>;
export type CreateWorkerForm = z.infer<typeof createWorkerSchema>;
export type CreateDealerAccountForm = z.infer<typeof createDealerAccountSchema>;
export type UploadDocumentForm = z.infer<typeof uploadDocumentSchema>;
export type UpdateDocumentStatusForm = z.infer<typeof updateDocumentStatusSchema>;
export type UpdateActivationStatusForm = z.infer<typeof updateActivationStatusSchema>;

// API response types
export interface AuthResponse {
  success: boolean;
  user?: {
    id: number;
    name: string;
    username: string;
    userType: 'admin' | 'user';
    dealerId?: number;
    dealerName?: string;
    role?: string;
  };
  sessionId?: string;
  error?: string;
}

export interface DashboardStats {
  totalDocuments: number;
  pendingDocuments: number;
  completedDocuments: number;
  thisWeekSubmissions: number;
  thisMonthSubmissions: number;
  activatedCount: number;
  canceledCount: number;
  pendingActivations: number;
  inProgressCount: number;
  otherCompletedCount?: number;
  discardedCount?: number;
}

// Service Plans types and schemas
export interface ServicePlan {
  id: number;
  planName: string;
  carrier: string;
  planType: string; // 5G, LTE, etc.
  dataAllowance: string;
  monthlyFee: number;
  combinationEligible: boolean; // 결합 가능 여부
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Cost information fields
  registrationFeePrepaid?: number;
  registrationFeePostpaid?: number;
  simFeePrepaid?: number;
  simFeePostpaid?: number;
  bundleApplied?: number;
  bundleNotApplied?: number;
}

export interface AdditionalService {
  id: number;
  serviceName: string;
  serviceType: string; // 부가서비스, 결합상품, etc.
  monthlyFee: number;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingPolicy {
  id: number;
  carrier: string;
  servicePlanName: string;
  commissionAmount: number; // 커미션 금액 (원)
  policyType: string; // 'commission', 'bonus', etc.
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentServicePlan {
  id: number;
  documentId: number;
  servicePlanId: number;
  additionalServiceIds?: string; // JSON array of service IDs
  bundleType?: string; // 결합상품 유형
  paymentType: string; // 선납, 후납
  registrationFee?: number; // 가입비
  createdAt: Date;
  updatedAt: Date;
}

export const createServicePlanSchema = z.object({
  planName: z.string().min(1, "요금제명을 입력해주세요"),
  carrier: z.string().min(1, "통신사를 선택해주세요"),
  planType: z.string().min(1, "요금제 유형을 선택해주세요"),
  dataAllowance: z.string().min(1, "데이터 허용량을 입력해주세요"),
  monthlyFee: z.number().min(0, "월 요금을 입력해주세요"),
  combinationEligible: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const createAdditionalServiceSchema = z.object({
  serviceName: z.string().min(1, "서비스명을 입력해주세요"),
  carrier: z.string().min(1, "통신사를 선택해주세요"),
  serviceType: z.string().min(1, "서비스 유형을 선택해주세요"),
  monthlyFee: z.number().min(0, "월 요금을 입력해주세요"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const createDocumentServicePlanSchema = z.object({
  documentId: z.number(),
  servicePlanId: z.number(),
  additionalServiceIds: z.string().optional(),
  bundleType: z.string().optional(),
  paymentType: z.string().min(1, "결제 유형을 선택해주세요"),
  registrationFee: z.number().optional(),
});

export type CreateServicePlanForm = z.infer<typeof createServicePlanSchema>;
export type CreateAdditionalServiceForm = z.infer<typeof createAdditionalServiceSchema>;
export type CreateDocumentServicePlanForm = z.infer<typeof createDocumentServicePlanSchema>;



// 정산 카테고리 인터페이스
// 정산단가 인터페이스 (새로운 기능)
export interface SettlementUnitPrice {
  id: number;
  servicePlanId: number;
  servicePlanName: string;
  carrier: string;
  newCustomerPrice: number; // 신규 정산단가 (원)
  portInPrice: number; // 번호이동 정산단가 (원)
  isActive: boolean;
  effectiveFrom: Date; // 적용 시작일
  effectiveUntil?: Date; // 적용 종료일 (null이면 현재 적용 중)
  memo?: string; // 메모 (몇차 단가인지 등)
  createdAt: Date;
  updatedAt: Date;
  createdBy: number; // 등록한 관리자 ID
}

// 부가서비스 차감 정책 인터페이스
export interface AdditionalServiceDeduction {
  id: number;
  additionalServiceId: number;
  additionalServiceName: string;
  deductionAmount: number; // 차감 금액 (원)
  isActive: boolean;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number;
}

export interface Settlement {
  id: number;
  documentId: number;
  dealerId: number;
  dealerName?: string;
  
  // 고객 정보
  customerName: string;
  customerPhone: string;
  
  // 요금제 정보
  servicePlanId?: number;
  servicePlanName?: string;
  
  // 부가 서비스 정보
  additionalServices: string[];
  
  // 결합 내역
  bundleType?: '결합' | '미결합' | '단독';
  bundleDetails?: string;
  
  // 정책차수
  policyLevel: number;
  policyDetails?: string;
  
  // 정산 정보
  settlementAmount?: number; // 정산 금액 (원 단위)
  commissionRate?: number; // 수수료율 (%)
  settlementStatus: '대기' | '계산완료' | '지급완료' | '보류';
  autoCalculated?: boolean; // 자동 계산 여부
  appliedUnitPrice?: number; // 적용된 정산 단가 (기존 정산은 기존 단가 유지)
  
  // 정산 일자
  settlementDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 정산 스키마
export const createSettlementSchema = z.object({
  documentId: z.number(),
  dealerId: z.number(),
  customerName: z.string().min(1, "고객명을 입력해주세요"),
  customerPhone: z.string().min(1, "고객 연락처를 입력해주세요"),
  servicePlanId: z.number().optional(),
  servicePlanName: z.string().optional(),
  additionalServices: z.array(z.string()).default([]),
  bundleType: z.enum(['결합', '미결합', '단독']).optional(),
  bundleDetails: z.string().optional(),
  policyLevel: z.number().min(1).default(1),
  policyDetails: z.string().optional(),
  settlementAmount: z.number().optional(),
  commissionRate: z.number().optional(),
  settlementStatus: z.enum(['대기', '계산완료', '지급완료', '보류']).default('대기'),
  settlementDate: z.union([z.string(), z.date()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ).optional(),
});

export const updateSettlementSchema = createSettlementSchema.partial();

// 정산단가 스키마
export const createSettlementUnitPriceSchema = z.object({
  servicePlanId: z.number().min(1, "요금제를 선택해주세요"),
  newCustomerPrice: z.number().min(0, "신규 정산단가를 입력해주세요"),
  portInPrice: z.number().min(0, "번호이동 정산단가를 입력해주세요"),
  effectiveFrom: z.union([z.string(), z.date()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ).optional(), // 기본값은 현재 날짜
  memo: z.string().optional(), // 메모 필드 추가
});

export const updateSettlementUnitPriceSchema = z.object({
  newCustomerPrice: z.number().min(0, "신규 정산단가를 입력해주세요"),
  portInPrice: z.number().min(0, "번호이동 정산단가를 입력해주세요"),
  effectiveFrom: z.union([z.string(), z.date()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ).optional(),
  memo: z.string().optional(), // 메모 필드 추가
});

// 부가서비스 차감 정책 스키마
export const createAdditionalServiceDeductionSchema = z.object({
  additionalServiceId: z.number().min(1, "부가서비스를 선택해주세요"),
  deductionAmount: z.number().min(0, "차감 금액을 입력해주세요"),
  effectiveFrom: z.union([z.string(), z.date()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ).optional(),
});

export const updateAdditionalServiceDeductionSchema = z.object({
  deductionAmount: z.number().min(0, "차감 금액을 입력해주세요"),
  effectiveFrom: z.union([z.string(), z.date()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ).optional(),
});

export type CreateSettlementForm = z.infer<typeof createSettlementSchema>;
export type UpdateSettlementForm = z.infer<typeof updateSettlementSchema>;
export type CreateSettlementUnitPriceForm = z.infer<typeof createSettlementUnitPriceSchema>;
export type UpdateSettlementUnitPriceForm = z.infer<typeof updateSettlementUnitPriceSchema>;
export type CreateAdditionalServiceDeductionForm = z.infer<typeof createAdditionalServiceDeductionSchema>;
export type UpdateAdditionalServiceDeductionForm = z.infer<typeof updateAdditionalServiceDeductionSchema>;

// Chat schemas
export const createChatMessageSchema = z.object({
  roomId: z.number(),
  message: z.string().min(1, "메시지를 입력하세요").max(1000, "메시지는 1000자 이내로 입력하세요"),
  messageType: z.enum(['text', 'system']).default('text'),
});

export type CreateChatMessageForm = z.infer<typeof createChatMessageSchema>;

// 판매점 등록 스키마
export const dealerRegistrationSchema = createInsertSchema(dealerRegistrations).omit({
  id: true,
  status: true,
  approvedBy: true,
  approvedAt: true,
  rejectionReason: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
});

export const dealerLoginSchema = z.object({
  username: z.string().min(1, "아이디를 입력해주세요"),
  password: z.string().min(1, "비밀번호를 입력해주세요"),
});

export const sendChatMessageSchema = z.object({
  documentId: z.number(),
  message: z.string().min(1, "메시지를 입력해주세요"),
  messageType: z.enum(['text', 'system']).default('text'),
});

export type DealerRegistrationForm = z.infer<typeof dealerRegistrationSchema>;
export type DealerLoginForm = z.infer<typeof dealerLoginSchema>;
export type SendChatMessageForm = z.infer<typeof sendChatMessageSchema>;

// 통신사 관리 인터페이스
export interface Carrier {
  id: number;
  name: string; // 통신사명 (예: "SK텔링크", "KT엠모바일")
  displayOrder?: number; // 정렬 순서
  isActive: boolean;
  isWired?: boolean; // 유선 통신사 여부
  bundleNumber?: string; // 결합 번호
  bundleCarrier?: string; // 결합 통신사
  documentRequired?: boolean; // 서류 업로드 필수 여부
  // 접수 신청 시 필수 입력 필드 설정
  requireCustomerName?: boolean; // 고객명 필수
  requireCustomerPhone?: boolean; // 연락처 필수
  requireCustomerEmail?: boolean; // 이메일 필수
  requireContactCode?: boolean; // 접점코드 필수
  requireCarrier?: boolean; // 통신사 필수
  requirePreviousCarrier?: boolean; // 이전통신사 필수
  requireDocumentUpload?: boolean; // 서류업로드 필수
  requireBundleNumber?: boolean; // 결합번호 필수
  requireBundleCarrier?: boolean; // 결합통신사 필수
  // 고객 유형별 지원 설정
  allowNewCustomer?: boolean; // 신규 고객 지원 여부
  allowPortIn?: boolean; // 번호이동 고객 지원 여부
  requireDesiredNumber?: boolean; // 희망번호 입력 필수 여부
  createdAt?: Date;
}

// 통신사 스키마
export const createCarrierSchema = z.object({
  name: z.string().min(1, "통신사명을 입력해주세요"),
  displayOrder: z.number().min(0, "정렬 순서는 0 이상이어야 합니다").default(0),
  isActive: z.boolean().default(true),
  isWired: z.boolean().default(false),
  bundleNumber: z.string().optional(),
  bundleCarrier: z.string().optional(),
  documentRequired: z.boolean().default(false),
  requireCustomerName: z.boolean().default(true),
  requireCustomerPhone: z.boolean().default(true),
  requireCustomerEmail: z.boolean().default(false),
  requireContactCode: z.boolean().default(true),
  requireCarrier: z.boolean().default(true),
  requirePreviousCarrier: z.boolean().default(false),
  requireDocumentUpload: z.boolean().default(false),
  requireBundleNumber: z.boolean().default(false),
  requireBundleCarrier: z.boolean().default(false),
  allowNewCustomer: z.boolean().default(true),
  allowPortIn: z.boolean().default(true),
  requireDesiredNumber: z.boolean().default(false),
});

export const updateCarrierSchema = createCarrierSchema.partial();

export type CreateCarrierForm = z.infer<typeof createCarrierSchema>;

//===============================================
// 영업팀 및 영업과장 관리 스키마
//===============================================

// 영업팀 관리 스키마
export const createSalesTeamSchema = z.object({
  teamName: z.string().min(1, "팀명을 입력해주세요"),
  teamCode: z.string().min(1, "팀 코드를 입력해주세요"),
  description: z.string().optional(),
});

export const updateSalesTeamSchema = createSalesTeamSchema.partial();

// 영업과장 관리 스키마
export const createSalesManagerSchema = z.object({
  teamId: z.number().min(1, "영업팀을 선택해주세요"),
  managerName: z.string().min(1, "이름을 입력해주세요"),
  managerCode: z.string().min(1, "코드를 입력해주세요"),
  username: z.string().min(3, "로그인 ID는 최소 3자 이상이어야 합니다"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  position: z.enum(['팀장', '과장', '대리'], { required_error: "직급을 선택해주세요" }),
  contactPhone: z.string().optional(),
  email: z.string().email("올바른 이메일을 입력해주세요").optional().or(z.literal("")),
});

export const updateSalesManagerSchema = createSalesManagerSchema.partial().extend({
  password: z.string().optional() // 비밀번호는 선택적으로 업데이트 가능
});

// 팀에 영업과장을 배정하는 스키마 (기존 계정을 선택하는 방식)
export const assignSalesManagerToTeamSchema = z.object({
  teamId: z.number().min(1, "영업팀을 선택해주세요"),
  salesManagerUserId: z.number().min(1, "영업과장 계정을 선택해주세요"),
  managerCode: z.string().min(1, "과장 코드를 입력해주세요"),
  position: z.enum(['팀장', '과장', '대리']).default('대리'),
  contactPhone: z.string().optional(),
  email: z.string().email("올바른 이메일을 입력해주세요").optional().or(z.literal(""))
});

// 접점 코드 매핑 스키마
export const createContactCodeMappingSchema = z.object({
  managerId: z.number().min(1, "영업과장을 선택해주세요"),
  carrier: z.string().min(1, "통신사를 입력해주세요"),
  contactCode: z.string().min(1, "접점 코드를 입력해주세요"),
});

export const updateContactCodeMappingSchema = createContactCodeMappingSchema.partial();

// 영업과장 로그인 스키마 (기존 로그인과 동일하지만 구분하기 위해)
export const salesManagerLoginSchema = z.object({
  username: z.string().min(3, "아이디는 최소 3자 이상이어야 합니다"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
});

// 타입 정의
export type CreateSalesTeamForm = z.infer<typeof createSalesTeamSchema>;
export type UpdateSalesTeamForm = z.infer<typeof updateSalesTeamSchema>;
export type CreateSalesManagerForm = z.infer<typeof createSalesManagerSchema>;
export type UpdateSalesManagerForm = z.infer<typeof updateSalesManagerSchema>;
export type CreateContactCodeMappingForm = z.infer<typeof createContactCodeMappingSchema>;
export type UpdateContactCodeMappingForm = z.infer<typeof updateContactCodeMappingSchema>;
export type SalesManagerLoginForm = z.infer<typeof salesManagerLoginSchema>;
export type UpdateCarrierForm = z.infer<typeof updateCarrierSchema>;

export const createPricingPolicySchema = z.object({
  carrier: z.string().min(1, "통신사를 선택하세요"),
  servicePlanName: z.string().min(1, "요금제명을 입력하세요"),
  commissionAmount: z.number().min(0, "커미션 금액을 입력하세요"),
  policyType: z.string().default("commission"),
  isActive: z.boolean().default(true),
});

export type CreatePricingPolicyForm = z.infer<typeof createPricingPolicySchema>;

// 단가표 정책 관리 인터페이스
export interface PricingPolicy {
  id: number;
  carrier: string; // 통신사
  servicePlanName: string; // 요금제명
  commissionAmount: number; // 커미션 금액
  policyType: string; // 정책 유형 (기본값: commission)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 접점코드 관리 인터페이스
export interface ContactCode {
  id: number;
  code: string; // 접점코드 (예: "부산해운대구")
  dealerName: string; // 개통방명 (판매점명)
  carrier: string; // 통신사
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}



// 접점코드 스키마
export const createContactCodeSchema = z.object({
  code: z.string().min(1, "접점코드를 입력해주세요"),
  dealerName: z.string().min(1, "개통방명을 입력해주세요"),
  carrier: z.string().min(1, "통신사를 선택해주세요"),
  isActive: z.boolean().default(true)
});

export const updateContactCodeSchema = createContactCodeSchema.partial();

export type CreateContactCodeForm = z.infer<typeof createContactCodeSchema>;
export type UpdateContactCodeForm = z.infer<typeof updateContactCodeSchema>;

// Additional Service Deduction Management
export interface AdditionalServiceDeduction {
  id: number;
  additionalServiceId: number;
  additionalServiceName: string;
  deductionAmount: number;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}




