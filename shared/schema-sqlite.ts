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
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  codeIdx: uniqueIndex("carrier_code_unique").on(table.code),
}));

// 문서 테이블
export const documents = sqliteTable("documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documentNumber: text("document_number"),
  customerName: text("customer_name").notNull(),
  customerType: text("customer_type").notNull(),
  carrierId: integer("carrier_id").references(() => carriers.id).notNull(),
  status: text("status").notNull().default('대기'),
  notes: text("notes"),
  settlementAmount: real("settlement_amount").default(0),
  fileName: text("file_name"),
  filePath: text("file_path"),
  fileSize: integer("file_size"),
  phoneNumber: text("phone_number"),
  dealerId: integer("dealer_id"),
  dealerName: text("dealer_name"),
  submittedById: integer("submitted_by_id"),
  submittedBy: text("submitted_by"),
  assignedTo: text("assigned_to"),
  assignedToId: integer("assigned_to_id"),
  lockedBy: text("locked_by"),
  lockedAt: text("locked_at"),
  canEdit: integer("can_edit", { mode: 'boolean' }).default(1),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
  desiredPhoneNumber: text("desired_phone_number"),
});

// 서비스 요금제 테이블
export const servicePlans = sqliteTable("service_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  carrierId: integer("carrier_id").references(() => carriers.id).notNull(),
  planName: text("plan_name").notNull(),
  planType: text("plan_type").notNull(),
  dataAmount: text("data_amount"),
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
  carrierId: integer("carrier_id").references(() => carriers.id).notNull(),
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
  carrierId: integer("carrier_id").references(() => carriers.id).notNull(),
  customerType: text("customer_type").notNull(),
  unitPrice: real("unit_price").notNull(),
  isActive: integer("is_active", { mode: 'boolean' }).default(1),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").default(sql`CURRENT_TIMESTAMP`),
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
export const createContactCodeMappingSchema = createInsertSchema(contactCodeMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateContactCodeMappingSchema = createContactCodeMappingSchema.partial();

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