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
  dealerId: number;
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
  status: '접수' | '보완필요' | '완료';
  activationStatus: '대기' | '진행중' | '개통' | '취소';
  filePath?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  uploadedAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
  activatedBy?: number; // 개통완료 처리한 근무자 ID
  notes?: string;
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
});

export const createAdminSchema = z.object({
  email: z.string().email("올바른 이메일을 입력하세요"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  name: z.string().min(1, "이름을 입력하세요"),
});

export const createWorkerSchema = z.object({
  dealerId: z.number().min(1, "대리점을 선택하세요"),
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
  dealerId: z.number().min(1, "대리점을 선택하세요"),
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
  notes: z.string().optional(),
});

export const updateDocumentStatusSchema = z.object({
  status: z.enum(['접수', '보완필요', '완료']),
  activationStatus: z.enum(['대기', '진행중', '개통', '취소']).optional(),
  notes: z.string().optional(),
});

export const updateActivationStatusSchema = z.object({
  activationStatus: z.enum(['대기', '진행중', '개통', '취소']),
  notes: z.string().optional(),
  activatedBy: z.number().optional(), // 개통완료 처리한 근무자 ID
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
