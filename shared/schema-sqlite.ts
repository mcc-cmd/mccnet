import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { sql } from 'drizzle-orm';
import {
  sqliteTable,
  integer,
  text,
  real,
  blob,
  uniqueIndex,
  index
} from "drizzle-orm/sqlite-core";

//===============================================
// SQLite 데이터베이스 테이블 정의
//===============================================

// 세션 저장소 테이블 (필수)
export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess").notNull(),
    expire: text("expire").notNull(),
  },
  (table) => ({
    expireIdx: index("IDX_session_expire").on(table.expire),
  })
);

// 영업팀 테이블
export const salesTeams = sqliteTable("sales_teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamName: text("team_name").notNull(),
  teamCode: text("team_code").notNull(),
  isActive: integer("is_active", { mode: 'boolean' }).default(1),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  teamCodeIdx: uniqueIndex("team_code_unique").on(table.teamCode),
}));

// 영업과장 테이블
export const salesManagers = sqliteTable("sales_managers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  teamId: integer("team_id").references(() => salesTeams.id).notNull(),
  managerName: text("manager_name").notNull(),
  managerCode: text("manager_code").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  position: text("position").notNull().default('대리'),
  contactPhone: text("contact_phone"),
  email: text("email"),
  isActive: integer("is_active", { mode: 'boolean' }).default(1),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  managerCodeIdx: uniqueIndex("manager_code_unique").on(table.managerCode),
  usernameIdx: uniqueIndex("username_unique").on(table.username),
}));

// 접점 코드 테이블
export const contactCodes = sqliteTable("contact_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  dealerName: text("dealer_name").notNull(),
  realSalesPOS: text("real_sales_pos"), // 실판매POS 필드 추가
  carrier: text("carrier").notNull(),
  salesManagerId: integer("sales_manager_id").references(() => salesManagers.id),
  salesManagerName: text("sales_manager_name"),
  isActive: integer("is_active", { mode: 'boolean' }).default(1),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  codeIdx: uniqueIndex("contact_code_unique").on(table.code),
}));

// 접점 코드와 영업과장 매핑 테이블
export const contactCodeMappings = sqliteTable("contact_code_mappings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contactCodeId: integer("contact_code_id").references(() => contactCodes.id).notNull(),
  salesManagerId: integer("sales_manager_id").references(() => salesManagers.id).notNull(),
  isActive: integer("is_active", { mode: 'boolean' }).default(1),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// 관리자 테이블
export const admins = sqliteTable("admins", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  isActive: integer("is_active", { mode: 'boolean' }).default(1),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  usernameIdx: uniqueIndex("admin_username_unique").on(table.username),
}));

// 사용자 권한 테이블
export const userPermissions = sqliteTable("user_permissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  userType: text("user_type").notNull(), // 'admin', 'user', 'sales_manager'
  menuId: text("menu_id").notNull(), // 메뉴 식별자 (dashboard, documents, settlements, 등)
  canView: integer("can_view", { mode: 'boolean' }).default(0), // 보기 권한
  canEdit: integer("can_edit", { mode: 'boolean' }).default(0), // 수정 권한
  canDelete: integer("can_delete", { mode: 'boolean' }).default(0), // 삭제 권한
  isActive: integer("is_active", { mode: 'boolean' }).default(1),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userPermissionIdx: uniqueIndex("user_permission_unique").on(table.userId, table.userType, table.menuId),
}));

// 근무자 테이블
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default('user'),
  isActive: integer("is_active", { mode: 'boolean' }).default(1),
  canChangePassword: integer("can_change_password", { mode: 'boolean' }).default(1),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  usernameIdx: uniqueIndex("user_username_unique").on(table.username),
}));

// 통신사 테이블
export const carriers = sqliteTable("carriers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  code: text("code").notNull(),
  color: text("color").default('#0000FF'),
  supportNewCustomers: integer("support_new_customers", { mode: 'boolean' }).default(1),
  supportPortIn: integer("support_port_in", { mode: 'boolean' }).default(1),
  isActive: integer("is_active", { mode: 'boolean' }).default(1),
  displayOrder: integer("display_order").default(0),
  isWired: integer("is_wired", { mode: 'boolean' }).default(0),
  bundleNumber: text("bundle_number").default(''),
  bundleCarrier: text("bundle_carrier").default(''),
  documentRequired: integer("document_required", { mode: 'boolean' }).default(0),
  requireCustomerName: integer("require_customer_name", { mode: 'boolean' }).default(1),
  requireCustomerPhone: integer("require_customer_phone", { mode: 'boolean' }).default(0),
  requireCustomerEmail: integer("require_customer_email", { mode: 'boolean' }).default(0),
  requireContactCode: integer("require_contact_code", { mode: 'boolean' }).default(1),
  requireCarrier: integer("require_carrier", { mode: 'boolean' }).default(1),
  requirePreviousCarrier: integer("require_previous_carrier", { mode: 'boolean' }).default(1),
  requireDocumentUpload: integer("require_document_upload", { mode: 'boolean' }).default(0),
  requireBundleNumber: integer("require_bundle_number", { mode: 'boolean' }).default(0),
  requireBundleCarrier: integer("require_bundle_carrier", { mode: 'boolean' }).default(0),
  allowNewCustomer: integer("allow_new_customer", { mode: 'boolean' }).default(1),
  allowPortIn: integer("allow_port_in", { mode: 'boolean' }).default(1),
  requireDesiredNumber: integer("require_desired_number", { mode: 'boolean' }).default(0),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  codeIdx: uniqueIndex("carrier_code_unique").on(table.code),
}));

// 문서 테이블 - 실제 데이터베이스 구조에 맞춤
export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dealerId: integer("dealer_id").notNull(),
  customerName: text("customer_name").notNull(),
  customerType: text("customer_type").notNull(),
  customerPhone: text("customer_phone").notNull(),
  carrier: text("carrier").notNull(),
  activationStatus: text("activation_status").default('대기'),
  filePath: text("file_path"),
  notes: text("notes"),
  supplementNotes: text("supplement_notes"),
  dealerNotes: text("dealer_notes"),
  deviceModel: text("device_model"),
  simNumber: text("sim_number"),
  subscriptionNumber: text("subscription_number"),
  servicePlanId: text("service_plan_id"),
  additionalServiceIds: text("additional_service_ids"),
  settlementAmount: real("settlement_amount").default(0),
  registrationFeePrepaid: integer("registration_fee_prepaid", { mode: 'boolean' }).default(0),
  registrationFeePostpaid: integer("registration_fee_postpaid", { mode: 'boolean' }).default(0),
  registrationFeeInstallment: integer("registration_fee_installment", { mode: 'boolean' }).default(0),
  simFeePrepaid: integer("sim_fee_prepaid", { mode: 'boolean' }).default(0),
  simFeePostpaid: integer("sim_fee_postpaid", { mode: 'boolean' }).default(0),
  bundleApplied: integer("bundle_applied", { mode: 'boolean' }).default(0),
  bundleNotApplied: integer("bundle_not_applied", { mode: 'boolean' }).default(0),
  assignedWorkerId: integer("assigned_worker_id"),
  assignedAt: text("assigned_at"),
  activatedBy: integer("activated_by"),
  activatedByName: text("activated_by_name"),
  cancelledBy: integer("cancelled_by"),
  discardReason: text("discard_reason"),
  uploadedAt: text("uploaded_at").default(sql`CURRENT_TIMESTAMP`),
  activatedAt: text("activated_at"),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  documentNumber: text("document_number"),
  contactCode: text("contact_code"),
  previousCarrier: text("previous_carrier"),
  desiredNumber: text("desired_number"),
  status: text("status").default('접수'),
  fileName: text("file_name"),
  fileSize: integer("file_size"),
  userId: integer("user_id"),
  storeName: text("store_name"),
  customerEmail: text("customer_email"),
  bundleNumber: text("bundle_number"),
  bundleCarrier: text("bundle_carrier"),
  carrierId: integer("carrier_id"),
  phoneNumber: text("phone_number"),
  isDeleted: integer("is_deleted", { mode: 'boolean' }).default(0),
});

// 서비스 요금제 테이블
export const servicePlans = sqliteTable("service_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // 요금제명
  carrier: text("carrier").notNull(), // 통신사명
  planType: text("plan_type").notNull(),
  dataAllowance: text("data_allowance"), // dataAmount 대신 dataAllowance 사용
  monthlyFee: real("monthly_fee").notNull(),
  discountType: text("discount_type"),
  discountAmount: real("discount_amount").default(0),
  finalPrice: real("final_price"),
  isActive: integer("is_active", { mode: 'boolean' }).default(1),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// 추가 서비스 테이블
export const additionalServices = sqliteTable("additional_services", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  carrier: text("carrier").notNull(), // 통신사명
  serviceName: text("service_name").notNull(),
  serviceType: text("service_type").notNull(),
  monthlyFee: real("monthly_fee").notNull(),
  isActive: integer("is_active", { mode: 'boolean' }).default(1),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// 정산 단가 테이블
export const settlementUnitPrices = sqliteTable("settlement_unit_prices", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  servicePlanId: integer("service_plan_id").references(() => servicePlans.id).notNull(),
  newCustomerPrice: real("new_customer_price").notNull(),
  portInPrice: real("port_in_price").notNull(),
  isActive: integer("is_active", { mode: 'boolean' }).default(1),
  effectiveFrom: text("effective_from").default(sql`CURRENT_TIMESTAMP`),
  effectiveUntil: text("effective_until"),
  memo: text("memo"),
  createdBy: integer("created_by").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
});

// 통신사별 부가서비스 정산 정책 테이블
export const carrierServicePolicies = sqliteTable("carrier_service_policies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  carrier: text("carrier").notNull(), // 통신사명
  policyName: text("policy_name").notNull(), // 정책명 (예: "인터넷결합 미유치 시 차감")
  policyType: text("policy_type").notNull(), // "deduction" | "addition"
  serviceCategory: text("service_category").notNull(), // "internet", "tv", "security", "mobile" 등
  amount: real("amount").notNull(), // 차감/추가 금액
  description: text("description"), // 설명
  isActive: integer("is_active", { mode: 'boolean' }).default(1),
  effectiveFrom: text("effective_from").default(sql`CURRENT_TIMESTAMP`),
  effectiveUntil: text("effective_until"), // null이면 현재 유효
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  createdBy: integer("created_by").notNull(), // 생성한 관리자 ID
});

// 정산에 적용된 부가서비스 정책 로그 테이블
export const settlementServicePolicyLogs = sqliteTable("settlement_service_policy_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentId: integer("document_id").notNull(), // 문서 ID
  policyId: integer("policy_id").references(() => carrierServicePolicies.id), // 적용된 정책 ID
  policyType: text("policy_type").notNull(), // "deduction" | "addition"
  policyName: text("policy_name").notNull(), // 정책명 (스냅샷)
  amount: real("amount").notNull(), // 실제 적용된 금액
  reason: text("reason"), // 적용 사유
  appliedAt: text("applied_at").default(sql`CURRENT_TIMESTAMP`),
  appliedBy: integer("applied_by").notNull(), // 적용한 관리자 ID
});

//===============================================
// Zod 스키마 정의
//===============================================

// 영업팀 스키마
export const createSalesTeamSchema = createInsertSchema(salesTeams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSalesTeamSchema = createSalesTeamSchema.partial();

export type CreateSalesTeamForm = z.infer<typeof createSalesTeamSchema>;
export type UpdateSalesTeamForm = z.infer<typeof updateSalesTeamSchema>;
export type SalesTeam = typeof salesTeams.$inferSelect;

// 영업과장 스키마
export const createSalesManagerSchema = createInsertSchema(salesManagers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateSalesManagerSchema = createSalesManagerSchema.partial().omit({ password: true });

export type CreateSalesManagerForm = z.infer<typeof createSalesManagerSchema>;
export type UpdateSalesManagerForm = z.infer<typeof updateSalesManagerSchema>;
export type SalesManager = typeof salesManagers.$inferSelect;

// 접점 코드 스키마
export const createContactCodeSchema = createInsertSchema(contactCodes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateContactCodeSchema = createContactCodeSchema.partial();

export const createContactCodeMappingSchema = createInsertSchema(contactCodeMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateContactCodeMappingSchema = createContactCodeMappingSchema.partial();

export type CreateContactCodeForm = z.infer<typeof createContactCodeSchema>;
export type UpdateContactCodeForm = z.infer<typeof updateContactCodeSchema>;

export type CreateContactCodeMappingForm = z.infer<typeof createContactCodeMappingSchema>;
export type UpdateContactCodeMappingForm = z.infer<typeof updateContactCodeMappingSchema>;
export type ContactCodeMapping = typeof contactCodeMappings.$inferSelect;

// 관리자 스키마
export type Admin = typeof admins.$inferSelect;

// 근무자 스키마
export const createWorkerSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateWorkerForm = z.infer<typeof createWorkerSchema>;
export type User = typeof users.$inferSelect;

// 통신사 스키마
export const createCarrierSchema = createInsertSchema(carriers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCarrierSchema = createCarrierSchema.partial();

export type CreateCarrierForm = z.infer<typeof createCarrierSchema>;
export type UpdateCarrierForm = z.infer<typeof updateCarrierSchema>;
export type Carrier = typeof carriers.$inferSelect;

// 문서 스키마
export type Document = typeof documents.$inferSelect;

// 서비스 요금제 스키마
export type ServicePlan = typeof servicePlans.$inferSelect;
export type AdditionalService = typeof additionalServices.$inferSelect;
export type SettlementUnitPrice = typeof settlementUnitPrices.$inferSelect;
export type ContactCode = typeof contactCodes.$inferSelect;
export type CarrierServicePolicy = typeof carrierServicePolicies.$inferSelect;
export type SettlementServicePolicyLog = typeof settlementServicePolicyLogs.$inferSelect;

// 인증 세션 테이블 (데이터베이스 기반 세션 저장소)
export const authSessions = sqliteTable("auth_sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull(),
  userType: text("user_type").notNull(),
  userRole: text("user_role"),
  managerId: integer("manager_id"),
  teamId: integer("team_id"),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`)
}, (table) => ({
  expiresAtIdx: index("auth_session_expires_idx").on(table.expiresAt),
  userIdx: index("auth_session_user_idx").on(table.userId, table.userType),
}));

// 인증 세션 인터페이스
export interface AuthSession {
  id: string;
  userId: number;
  userType: 'admin' | 'user' | 'sales_manager';
  userRole?: string;
  dealerId?: number;
  managerId?: number;
  teamId?: number;
  expiresAt: Date;
}

// 인증 세션 타입
export type AuthSessionRecord = typeof authSessions.$inferSelect;

// 사용자 권한 타입
export type UserPermission = typeof userPermissions.$inferSelect;

// 사용자 권한 스키마
export const createUserPermissionSchema = createInsertSchema(userPermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateUserPermissionSchema = createUserPermissionSchema.partial();

export type CreateUserPermissionForm = z.infer<typeof createUserPermissionSchema>;
export type UpdateUserPermissionForm = z.infer<typeof updateUserPermissionSchema>;

// 메뉴 권한 정의
export const MENU_PERMISSIONS = {
  dashboard: { name: '대시보드', id: 'dashboard' },
  documents: { name: '문서 관리', id: 'documents' },
  settlements: { name: '정산 관리', id: 'settlements' },
  admin: { name: '관리자 패널', id: 'admin' },
  downloads: { name: '다운로드', id: 'downloads' },
  workers: { name: '근무자 관리', id: 'workers' },
  carriers: { name: '통신사 관리', id: 'carriers' },
  contact_codes: { name: '접점코드 관리', id: 'contact_codes' },
  reports: { name: '리포트', id: 'reports' },
} as const;

//===============================================
// 통신사 정책 관련 스키마
//===============================================

// 통신사별 부가서비스 정책 스키마
export const createCarrierServicePolicySchema = createInsertSchema(carrierServicePolicies).omit({
  id: true,
  createdBy: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  policyType: z.enum(['deduction', 'addition'], { 
    errorMap: () => ({ message: '정책 유형을 선택해주세요 (차감/추가)' }) 
  }),
  serviceCategory: z.enum(['internet', 'tv', 'security', 'mobile', 'bundle', 'other'], {
    errorMap: () => ({ message: '서비스 카테고리를 선택해주세요' })
  }),
  amount: z.number().min(0, '금액은 0 이상이어야 합니다'),
});

export const updateCarrierServicePolicySchema = createCarrierServicePolicySchema.partial();

export type CreateCarrierServicePolicyForm = z.infer<typeof createCarrierServicePolicySchema>;
export type UpdateCarrierServicePolicyForm = z.infer<typeof updateCarrierServicePolicySchema>;

// 정산 서비스 정책 로그 스키마
export const createSettlementServicePolicyLogSchema = createInsertSchema(settlementServicePolicyLogs).omit({
  id: true,
  appliedAt: true,
});

export type CreateSettlementServicePolicyLogForm = z.infer<typeof createSettlementServicePolicyLogSchema>;

// 서비스 카테고리 상수
export const SERVICE_CATEGORIES = {
  internet: { name: '인터넷', id: 'internet' },
  tv: { name: 'TV', id: 'tv' },
  security: { name: '보안', id: 'security' },
  mobile: { name: '모바일', id: 'mobile' },
  bundle: { name: '결합상품', id: 'bundle' },
  other: { name: '기타', id: 'other' },
} as const;

// 정책 유형 상수
export const POLICY_TYPES = {
  deduction: { name: '차감', id: 'deduction' },
  addition: { name: '추가', id: 'addition' },
} as const;