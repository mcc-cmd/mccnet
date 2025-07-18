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
  createdAt: Date;
}

export interface User {
  id: number;
  dealerId: number;
  email: string;
  password: string;
  name: string;
  role: 'dealer_admin' | 'dealer_staff';
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
  status: '접수' | '보완필요' | '완료';
  activationStatus: '대기' | '진행중' | '개통' | '취소';
  filePath?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  uploadedAt: Date;
  updatedAt: Date;
  activatedAt?: Date;
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
  storeName: string;
  totalActivations: number;
  monthlyActivations: number;
  dealerId: number;
}

export interface AuthSession {
  id: string;
  userId: number;
  userType: 'admin' | 'user';
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
});

export const createUserSchema = z.object({
  dealerId: z.number().min(1, "대리점을 선택하세요"),
  email: z.string().email("올바른 이메일을 입력하세요"),
  password: z.string().min(6, "비밀번호는 최소 6자 이상이어야 합니다"),
  name: z.string().min(1, "이름을 입력하세요"),
  role: z.enum(['dealer_admin', 'dealer_staff']),
});

export const uploadDocumentSchema = z.object({
  customerName: z.string().min(1, "고객명을 입력하세요"),
  customerPhone: z.string().min(1, "연락처를 입력하세요"),
  storeName: z.string().optional(),
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
});

// Type exports
export type LoginForm = z.infer<typeof loginSchema>;
export type CreateDealerForm = z.infer<typeof createDealerSchema>;
export type CreateUserForm = z.infer<typeof createUserSchema>;
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
