import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";

// Database schema types
export interface Admin {
  id: number;
  email: string;
  password: string;
  name: string;
  createdAt: Date;
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
  email: string;
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
  storeName?: string; // 판매점 이름
  carrier: string; // 통신사
  contactCode?: string; // 자동 할당된 접점 코드
  status: '접수' | '보완필요' | '완료';
  activationStatus: '대기' | '진행중' | '보완필요' | '개통' | '취소';
  filePath?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  uploadedAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
  activatedBy?: number; // 개통완료 처리한 근무자 ID
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
  additionalServiceIds?: string; // JSON 배열 형태로 저장
  registrationFee?: number;
  bundleDiscount?: number;
  totalMonthlyFee?: number;
  // 단말기 정보
  deviceModel?: string; // 단말기 기종
  simNumber?: string; // 유심번호
  subscriptionNumber?: string; // 가입번호/계약번호
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
  userType: 'admin' | 'user';
  userRole?: string;
  dealerId?: number;
  expiresAt: Date;
}

// Zod schemas for validation
export const loginSchema = z.object({
  email: z.string().email("올바른 이메일을 입력하세요"),
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
  email: z.string().email("올바른 이메일을 입력하세요"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  name: z.string().min(1, "이름을 입력하세요"),
});

export const createWorkerSchema = z.object({
  email: z.string().email("올바른 이메일을 입력하세요"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  name: z.string().min(1, "이름을 입력하세요"),
});

export const createDealerAccountSchema = z.object({
  kpNumber: z.string().min(1, "KP번호를 입력하세요"),
  email: z.string().email("올바른 이메일을 입력하세요"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  name: z.string().min(1, "이름을 입력하세요"),
});

export const createUserSchema = z.object({
  email: z.string().email("올바른 이메일을 입력하세요"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  name: z.string().min(1, "이름을 입력하세요"),
  role: z.enum(['dealer_store', 'dealer_worker']),
});

export const uploadDocumentSchema = z.object({
  customerName: z.string().min(1, "고객명을 입력하세요"),
  customerPhone: z.string().min(1, "연락처를 입력하세요"),
  storeName: z.string().optional(),
  carrier: z.string().min(1, "통신사를 선택하세요"),
  subscriptionNumber: z.string().optional(),
  notes: z.string().optional(),
});

export const updateDocumentStatusSchema = z.object({
  status: z.enum(['접수', '보완필요', '완료']),
  activationStatus: z.enum(['대기', '진행중', '개통', '취소']).optional(),
  notes: z.string().optional(),
});

export const updateActivationStatusSchema = z.object({
  activationStatus: z.enum(['대기', '진행중', '개통', '취소', '보완필요']),
  notes: z.string().optional(),
  supplementNotes: z.string().optional(), // 보완 상세 내용
  activatedBy: z.number().optional(), // 개통완료 처리한 근무자 ID
  supplementRequiredBy: z.number().optional(), // 보완 요청한 근무자 ID
  deviceModel: z.string().optional(), // 기기모델
  simNumber: z.string().optional(), // 유심번호
  subscriptionNumber: z.string().optional(), // 가입번호/계약번호
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
    email: string;
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
}

// Service Plans types and schemas
export interface ServicePlan {
  id: number;
  planName: string;
  carrier: string;
  planType: string; // 5G, LTE, etc.
  dataAllowance: string;
  monthlyFee: number;
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
  isActive: z.boolean().default(true),
});

export const createAdditionalServiceSchema = z.object({
  serviceName: z.string().min(1, "서비스명을 입력해주세요"),
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
  settlementDate: z.date().optional(),
});

export const updateSettlementSchema = createSettlementSchema.partial();

export type CreateSettlementForm = z.infer<typeof createSettlementSchema>;
export type UpdateSettlementForm = z.infer<typeof updateSettlementSchema>;




