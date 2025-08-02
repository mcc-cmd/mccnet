import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { eq, and, desc, sql, or, like, gte, lte, inArray, count } from 'drizzle-orm';
import { db } from './db';
import { 
  admins, salesTeams, salesManagers, contactCodeMappings, contactCodes,
  carriers, servicePlans, additionalServices
} from '@shared/schema';
import type {
  Admin,
  SalesTeam,
  SalesManager,
  ContactCodeMapping,
  ContactCode,
  Carrier,
  ServicePlan,
  AdditionalService,
  AuthSession,
  CreateSalesTeamForm,
  CreateSalesManagerForm,
  CreateContactCodeMappingForm,
  UpdateSalesTeamForm,
  UpdateSalesManagerForm,
  UpdateContactCodeMappingForm,
  CreateWorkerForm
} from '../shared/schema';

// 인메모리 세션 저장소 (임시)
const sessionStore: Map<string, AuthSession> = new Map();

// 인메모리 근무자 저장소 (임시)
const workerStore: Map<number, any> = new Map();

export interface IStorage {
  // 관리자 관련
  createAdmin(admin: { username: string; password: string; name: string }): Promise<Admin>;
  getAdminByUsername(username: string): Promise<Admin | undefined>;
  getAdminById(id: number): Promise<Admin | undefined>;
  authenticateAdmin(username: string, password: string): Promise<Admin | null>;
  
  // 기존 사용자 인증 (호환성)
  authenticateUser(username: string, password: string): Promise<any>;
  
  // 영업과장 인증
  authenticateSalesManager(username: string, password: string): Promise<SalesManager | null>;
  
  // 기존 시스템과의 호환성을 위한 메서드들
  getContactCodes(): Promise<any[]>;
  
  // 통신사 관련 메서드
  getCarriers(): Promise<Carrier[]>;
  createCarrier(data: any): Promise<Carrier>;
  updateCarrier(id: number, data: any): Promise<Carrier>;
  deleteCarrier(id: number): Promise<void>;
  
  // 서비스 플랜 관련 메서드
  getServicePlans(): Promise<ServicePlan[]>;
  createServicePlan(data: any): Promise<ServicePlan>;
  updateServicePlan(id: number, data: any): Promise<ServicePlan>;
  deleteServicePlan(id: number): Promise<void>;
  getServicePlansByCarrier(carrier: string): Promise<ServicePlan[]>;
  
  // 부가서비스 관련 메서드
  getAdditionalServices(): Promise<AdditionalService[]>;
  createAdditionalService(data: any): Promise<AdditionalService>;
  updateAdditionalService(id: number, data: any): Promise<AdditionalService>;
  deleteAdditionalService(id: number): Promise<void>;
  getDealers(): Promise<any[]>;
  getUsers(): Promise<any[]>;
  getAllUsers(): Promise<any[]>;
  createUser(userData: { username: string; password: string; name: string; userType: string }): Promise<any>;
  updateUser(id: number, userData: any): Promise<any>;
  deleteUser(id: number): Promise<void>;
  getDocuments(): Promise<any[]>;
  getDocumentTemplates(): Promise<any[]>;
  getSettlementUnitPrices(): Promise<any[]>;
  
  // 대시보드 통계 메서드들
  getDashboardStats(): Promise<any>;
  getTodayStats(): Promise<any>;
  getWorkerStats(): Promise<any[]>;
  getCarrierStats(): Promise<any[]>;
  getActivePricingTables(): Promise<any[]>;
  
  // 영업팀 관리
  createSalesTeam(data: CreateSalesTeamForm): Promise<SalesTeam>;
  getSalesTeams(): Promise<SalesTeam[]>;
  getSalesTeamById(id: number): Promise<SalesTeam | undefined>;
  getSalesTeamByName(teamName: string): Promise<SalesTeam | undefined>;
  updateSalesTeam(id: number, data: UpdateSalesTeamForm): Promise<SalesTeam>;
  deleteSalesTeam(id: number): Promise<void>;
  
  // 영업과장 관리
  createSalesManager(data: CreateSalesManagerForm): Promise<SalesManager>;
  getSalesManagers(): Promise<SalesManager[]>;
  getSalesManagerById(id: number): Promise<SalesManager | undefined>;
  getSalesManagerByUsername(username: string): Promise<SalesManager | undefined>;
  getSalesManagersByTeamId(teamId: number): Promise<SalesManager[]>;
  updateSalesManager(id: number, data: UpdateSalesManagerForm): Promise<SalesManager>;
  deleteSalesManager(id: number): Promise<void>;
  
  // 접점 코드 매핑 관리
  createContactCodeMapping(data: CreateContactCodeMappingForm): Promise<ContactCodeMapping>;
  getContactCodeMappings(): Promise<ContactCodeMapping[]>;
  getContactCodeMappingsByManagerId(managerId: number): Promise<ContactCodeMapping[]>;
  getContactCodeMappingsByContactCode(contactCode: string): Promise<ContactCodeMapping[]>;
  updateContactCodeMapping(id: number, data: UpdateContactCodeMappingForm): Promise<ContactCodeMapping>;
  deleteContactCodeMapping(id: number): Promise<void>;
  
  // 세션 관리
  createSession(userId: number, userType: 'admin' | 'sales_manager', managerId?: number, teamId?: number): Promise<string>;
  getSession(sessionId: string): Promise<AuthSession | undefined>;
  deleteSession(sessionId: string): Promise<void>;
  
  // 비밀번호 변경
  updateAdminPassword(adminId: number, newPassword: string): Promise<void>;
  updateSalesManagerPassword(managerId: number, newPassword: string): Promise<void>;
  updateUserPassword(userId: number, newPassword: string): Promise<void>;
  deleteSalesManager(managerId: number): Promise<void>;
  
  // 근무자 관리
  createWorker(data: CreateWorkerForm): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  
  // 관리자 관련 메서드
  async createAdmin(admin: { username: string; password: string; name: string }): Promise<Admin> {
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    const [result] = await db.insert(admins).values({
      username: admin.username,
      password: hashedPassword,
      name: admin.name,
    }).returning();
    return result;
  }

  async getAdminByUsername(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin;
  }

  async authenticateAdmin(username: string, password: string): Promise<Admin | null> {
    try {
      console.log('Authenticating admin:', username);
      const admin = await this.getAdminByUsername(username);
      console.log('Admin found:', admin ? 'yes' : 'no');
      
      if (!admin) return null;
      
      const isValidPassword = await bcrypt.compare(password, admin.password);
      console.log('Password valid:', isValidPassword);
      
      if (!isValidPassword) return null;
      
      return admin;
    } catch (error) {
      console.error('Admin auth error:', error);
      return null;
    }
  }

  // 영업팀 관리 메서드
  async createSalesTeam(data: CreateSalesTeamForm): Promise<SalesTeam> {
    const [result] = await db.insert(salesTeams).values({
      teamName: data.teamName,
      teamCode: data.teamCode,
      description: data.description,
    }).returning();
    return result;
  }

  async getSalesTeams(): Promise<SalesTeam[]> {
    return await db.select().from(salesTeams).where(eq(salesTeams.isActive, true)).orderBy(salesTeams.teamName);
  }

  async getSalesTeamById(id: number): Promise<SalesTeam | undefined> {
    const [team] = await db.select().from(salesTeams).where(eq(salesTeams.id, id));
    return team;
  }

  async getSalesTeamByName(teamName: string): Promise<SalesTeam | undefined> {
    const [team] = await db.select().from(salesTeams).where(
      and(eq(salesTeams.teamName, teamName), eq(salesTeams.isActive, true))
    );
    return team;
  }

  async updateSalesTeam(id: number, data: UpdateSalesTeamForm): Promise<SalesTeam> {
    const [result] = await db.update(salesTeams)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(salesTeams.id, id))
      .returning();
    return result;
  }

  async deleteSalesTeam(id: number): Promise<void> {
    await db.update(salesTeams)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(salesTeams.id, id));
  }

  // 영업과장 관리 메서드
  async createSalesManager(data: CreateSalesManagerForm): Promise<SalesManager> {
    // 중복 체크: username
    const existingByUsername = await this.getSalesManagerByUsername(data.username);
    if (existingByUsername) {
      throw new Error(`로그인 ID '${data.username}'는 이미 사용 중입니다.`);
    }

    // 중복 체크: managerCode
    const [existingByCode] = await db.select().from(salesManagers).where(
      and(eq(salesManagers.managerCode, data.managerCode), eq(salesManagers.isActive, true))
    );
    if (existingByCode) {
      throw new Error(`과장 코드 '${data.managerCode}'는 이미 사용 중입니다.`);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [result] = await db.insert(salesManagers).values({
      teamId: data.teamId,
      managerName: data.managerName,
      managerCode: data.managerCode,
      username: data.username,
      password: hashedPassword,
      position: data.position,
      contactPhone: data.contactPhone,
      email: data.email,
    }).returning();
    return result;
  }

  async getSalesManagers(): Promise<SalesManager[]> {
    return await db.select().from(salesManagers).where(eq(salesManagers.isActive, true)).orderBy(salesManagers.managerName);
  }

  async getSalesManagerById(id: number): Promise<SalesManager | undefined> {
    const [manager] = await db.select().from(salesManagers).where(eq(salesManagers.id, id));
    return manager;
  }

  async getSalesManagerByName(name: string): Promise<SalesManager | undefined> {
    const [manager] = await db.select().from(salesManagers).where(eq(salesManagers.managerName, name));
    return manager;
  }

  async getSalesManagerByUsername(username: string): Promise<SalesManager | undefined> {
    const [manager] = await db.select().from(salesManagers).where(
      and(eq(salesManagers.username, username), eq(salesManagers.isActive, true))
    );
    return manager;
  }

  async getSalesManagers(): Promise<SalesManager[]> {
    try {
      const managers = await db.select().from(salesManagers).where(eq(salesManagers.isActive, true));
      return managers;
    } catch (error) {
      console.error('getSalesManagers error:', error);
      return [];
    }
  }

  async getSalesManagersByTeamId(teamId: number): Promise<SalesManager[]> {
    return await db.select().from(salesManagers)
      .where(and(eq(salesManagers.teamId, teamId), eq(salesManagers.isActive, true)))
      .orderBy(salesManagers.managerName);
  }

  async updateSalesManager(id: number, data: UpdateSalesManagerForm): Promise<SalesManager> {
    // 중복 체크: username (자기 자신 제외)
    if (data.username) {
      const [existingByUsername] = await db.select().from(salesManagers).where(
        and(
          eq(salesManagers.username, data.username), 
          eq(salesManagers.isActive, true),
          sql`${salesManagers.id} != ${id}`
        )
      );
      if (existingByUsername) {
        throw new Error(`로그인 ID '${data.username}'는 이미 사용 중입니다.`);
      }
    }

    // 중복 체크: managerCode (자기 자신 제외)
    if (data.managerCode) {
      const [existingByCode] = await db.select().from(salesManagers).where(
        and(
          eq(salesManagers.managerCode, data.managerCode), 
          eq(salesManagers.isActive, true),
          sql`${salesManagers.id} != ${id}`
        )
      );
      if (existingByCode) {
        throw new Error(`과장 코드 '${data.managerCode}'는 이미 사용 중입니다.`);
      }
    }

    const [result] = await db.update(salesManagers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(salesManagers.id, id))
      .returning();
    return result;
  }

  async deleteSalesManager(id: number): Promise<void> {
    await db.update(salesManagers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(salesManagers.id, id));
  }

  // 접점 코드 매핑 관리 메서드
  async createContactCodeMapping(data: CreateContactCodeMappingForm): Promise<ContactCodeMapping> {
    const [result] = await db.insert(contactCodeMappings).values({
      managerId: data.managerId,
      carrier: data.carrier,
      contactCode: data.contactCode,
    }).returning();
    return result;
  }

  async getContactCodeMappings(): Promise<ContactCodeMapping[]> {
    return await db.select().from(contactCodeMappings)
      .where(eq(contactCodeMappings.isActive, true))
      .orderBy(contactCodeMappings.carrier, contactCodeMappings.contactCode);
  }

  async getContactCodeMappingsByManagerId(managerId: number): Promise<ContactCodeMapping[]> {
    return await db.select().from(contactCodeMappings)
      .where(and(eq(contactCodeMappings.managerId, managerId), eq(contactCodeMappings.isActive, true)))
      .orderBy(contactCodeMappings.carrier, contactCodeMappings.contactCode);
  }

  async getContactCodeMappingsByContactCode(contactCode: string): Promise<ContactCodeMapping[]> {
    return await db.select().from(contactCodeMappings)
      .where(and(eq(contactCodeMappings.contactCode, contactCode), eq(contactCodeMappings.isActive, true)));
  }

  async updateContactCodeMapping(id: number, data: UpdateContactCodeMappingForm): Promise<ContactCodeMapping> {
    const [result] = await db.update(contactCodeMappings)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(contactCodeMappings.id, id))
      .returning();
    return result;
  }

  async deleteContactCodeMapping(id: number): Promise<void> {
    await db.update(contactCodeMappings)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(contactCodeMappings.id, id));
  }

  // 세션 관리 메서드
  async createSession(userId: number, userType: 'admin' | 'sales_manager', managerId?: number, teamId?: number): Promise<string> {
    const sessionId = nanoid();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간 후 만료
    
    const session: AuthSession = {
      id: sessionId,
      userId,
      userType,
      managerId,
      teamId,
      expiresAt
    };
    
    sessionStore.set(sessionId, session);
    return sessionId;
  }

  async getSession(sessionId: string): Promise<AuthSession | undefined> {
    const session = sessionStore.get(sessionId);
    if (!session) return undefined;
    
    // 세션 만료 체크
    if (session.expiresAt < new Date()) {
      sessionStore.delete(sessionId);
      return undefined;
    }
    
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    sessionStore.delete(sessionId);
  }

  // 비밀번호 변경 메서드들
  async updateAdminPassword(adminId: number, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(admins)
      .set({ password: hashedPassword })
      .where(eq(admins.id, adminId));
  }

  async updateSalesManagerPassword(managerId: number, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.update(salesManagers)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(salesManagers.id, managerId));
  }

  async updateUserPassword(userId: number, newPassword: string): Promise<void> {
    // 근무자 비밀번호 변경 (메모리 저장소에서)
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    if (workerStore.has(userId)) {
      const worker = workerStore.get(userId);
      if (worker) {
        worker.password = hashedPassword;
        workerStore.set(userId, worker);
        return;
      }
    }
    
    throw new Error('해당 사용자를 찾을 수 없습니다.');
  }

  async deleteSalesManager(managerId: number): Promise<void> {
    await db.update(salesManagers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(salesManagers.id, managerId));
  }

  // 근무자 관리
  async createWorker(data: CreateWorkerForm): Promise<any> {
    // 중복 아이디 확인
    const existingAdmins = await db.select().from(admins).where(eq(admins.username, data.username));
    const existingSalesManagers = await db.select().from(salesManagers).where(eq(salesManagers.username, data.username));
    
    // 메모리에서 중복 근무자 확인
    const existingWorkers = Array.from(workerStore.values()).filter(worker => worker.username === data.username);
    
    if (existingAdmins.length > 0 || existingSalesManagers.length > 0 || existingWorkers.length > 0) {
      throw new Error('이미 존재하는 아이디입니다.');
    }
    
    // 기존 시스템 호환성을 위해 임시로 메모리 저장
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // 임시 근무자 정보 저장 (실제 시스템에서는 별도 데이터베이스 사용)
    const workerId = Date.now();
    const worker = {
      id: workerId,
      username: data.username,
      name: data.name,
      userType: 'worker',
      accountType: 'worker',
      displayName: data.name,
      affiliation: '근무자',
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };
    
    // 메모리 저장소에 저장
    workerStore.set(workerId, worker);
    
    return {
      id: worker.id,
      username: worker.username,
      name: worker.name,
      userType: 'worker'
    };
  }
  
  // 호환성을 위한 기존 사용자 인증 메서드 (임시)
  async authenticateUser(username: string, password: string): Promise<any> {
    // 관리자 인증 (관리자 계정 우선)
    const admin = await this.getAdminByUsername(username);
    if (admin && await bcrypt.compare(password, admin.password)) {
      return { id: admin.id, userType: 'admin' };
    }

    // 영업 과장 인증
    const salesManager = await this.getSalesManagerByUsername(username);
    if (salesManager && await bcrypt.compare(password, salesManager.password)) {
      return { id: salesManager.id, userType: 'sales_manager' };
    }

    // 근무자 인증 (메모리 저장소에서)
    const workers = Array.from(workerStore.values());
    const worker = workers.find(w => w.username === username);
    if (worker && await bcrypt.compare(password, worker.password)) {
      return { id: worker.id, userType: 'worker' };
    }

    return null;
  }
  
  async getAdminById(id: number): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }
  
  // 접점 코드 관련 메서드들
  async findContactCodeByCode(code: string): Promise<ContactCode | undefined> {
    try {
      const [contactCode] = await db.select().from(contactCodes).where(eq(contactCodes.code, code));
      return contactCode;
    } catch (error) {
      console.error('Find contact code error:', error);
      return undefined;
    }
  }

  async getContactCodes(): Promise<ContactCode[]> {
    try {
      const result = await db.select().from(contactCodes).where(eq(contactCodes.isActive, true)).orderBy(contactCodes.createdAt);
      return result;
    } catch (error) {
      console.error('Get contact codes error:', error);
      return [];
    }
  }

  async getContactCodesByCarrier(carrier: string): Promise<ContactCode[]> {
    try {
      const result = await db.select().from(contactCodes).where(
        and(
          eq(contactCodes.carrier, carrier),
          eq(contactCodes.isActive, true)
        )
      ).orderBy(contactCodes.createdAt);
      return result;
    } catch (error) {
      console.error('Get contact codes by carrier error:', error);
      return [];
    }
  }

  async createContactCode(contactCodeData: any): Promise<ContactCode> {
    try {
      console.log('Creating contact code in database:', contactCodeData);
      
      const [newContactCode] = await db.insert(contactCodes).values({
        code: contactCodeData.code,
        dealerName: contactCodeData.dealerName,
        carrier: contactCodeData.carrier,
        salesManagerId: contactCodeData.salesManagerId || null,
        salesManagerName: contactCodeData.salesManagerName || null,
        isActive: contactCodeData.isActive !== false,
      }).returning();
      
      console.log('Contact code created successfully:', newContactCode);
      return newContactCode;
    } catch (error) {
      console.error('Create contact code error:', error);
      throw new Error('접점코드 생성에 실패했습니다.');
    }
  }

  async updateContactCode(id: number, contactCodeData: any): Promise<ContactCode> {
    try {
      const [updatedContactCode] = await db.update(contactCodes)
        .set({
          ...contactCodeData,
          updatedAt: new Date(),
        })
        .where(eq(contactCodes.id, id))
        .returning();
      
      if (!updatedContactCode) {
        throw new Error('접점코드를 찾을 수 없습니다.');
      }
      
      return updatedContactCode;
    } catch (error) {
      console.error('Update contact code error:', error);
      throw new Error('접점코드 수정에 실패했습니다.');
    }
  }

  async deleteContactCode(id: number): Promise<void> {
    try {
      await db.update(contactCodes)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(contactCodes.id, id));
    } catch (error) {
      console.error('Delete contact code error:', error);
      throw new Error('접점코드 삭제에 실패했습니다.');
    }
  }
  
  // 통신사 관련 메서드
  async getCarriers(): Promise<Carrier[]> {
    try {
      const result = await db.select().from(carriers).orderBy(carriers.displayOrder, carriers.name);
      return result;
    } catch (error) {
      console.error('Get carriers error:', error);
      return [];
    }
  }

  async createCarrier(data: any): Promise<Carrier> {
    try {
      const [result] = await db.insert(carriers).values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return result;
    } catch (error) {
      console.error('Create carrier error:', error);
      throw new Error('통신사 생성에 실패했습니다.');
    }
  }

  async updateCarrier(id: number, data: any): Promise<Carrier> {
    try {
      const [result] = await db.update(carriers)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(carriers.id, id))
        .returning();
      
      if (!result) {
        throw new Error('통신사를 찾을 수 없습니다.');
      }
      
      return result;
    } catch (error) {
      console.error('Update carrier error:', error);
      throw new Error('통신사 수정에 실패했습니다.');
    }
  }

  async deleteCarrier(id: number): Promise<void> {
    try {
      await db.delete(carriers).where(eq(carriers.id, id));
    } catch (error) {
      console.error('Delete carrier error:', error);
      throw new Error('통신사 삭제에 실패했습니다.');
    }
  }

  // 서비스 플랜 관련 메서드
  async getServicePlans(): Promise<ServicePlan[]> {
    try {
      const result = await db.select().from(servicePlans)
        .where(eq(servicePlans.isActive, true))
        .orderBy(servicePlans.carrier, servicePlans.name);
      return result;
    } catch (error) {
      console.error('Get service plans error:', error);
      return [];
    }
  }

  async createServicePlan(data: any): Promise<ServicePlan> {
    try {
      const [result] = await db.insert(servicePlans).values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return result;
    } catch (error) {
      console.error('Create service plan error:', error);
      throw new Error('서비스 플랜 생성에 실패했습니다.');
    }
  }

  async updateServicePlan(id: number, data: any): Promise<ServicePlan> {
    try {
      const [result] = await db.update(servicePlans)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(servicePlans.id, id))
        .returning();
      
      if (!result) {
        throw new Error('서비스 플랜을 찾을 수 없습니다.');
      }
      
      return result;
    } catch (error) {
      console.error('Update service plan error:', error);
      throw new Error('서비스 플랜 수정에 실패했습니다.');
    }
  }

  async deleteServicePlan(id: number): Promise<void> {
    try {
      await db.update(servicePlans)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(servicePlans.id, id));
    } catch (error) {
      console.error('Delete service plan error:', error);
      throw new Error('서비스 플랜 삭제에 실패했습니다.');
    }
  }
  
  async getServicePlansByCarrier(carrier: string): Promise<ServicePlan[]> {
    try {
      const result = await db.select().from(servicePlans)
        .where(and(
          eq(servicePlans.carrier, carrier),
          eq(servicePlans.isActive, true)
        ))
        .orderBy(servicePlans.name);
      return result;
    } catch (error) {
      console.error('Get service plans by carrier error:', error);
      return [];
    }
  }
  
  // 부가서비스 관련 메서드
  async getAdditionalServices(): Promise<AdditionalService[]> {
    try {
      const result = await db.select().from(additionalServices)
        .where(eq(additionalServices.isActive, true))
        .orderBy(additionalServices.carrier, additionalServices.name);
      return result;
    } catch (error) {
      console.error('Get additional services error:', error);
      return [];
    }
  }

  async createAdditionalService(data: any): Promise<AdditionalService> {
    try {
      const [result] = await db.insert(additionalServices).values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      return result;
    } catch (error) {
      console.error('Create additional service error:', error);
      throw new Error('부가서비스 생성에 실패했습니다.');
    }
  }

  async updateAdditionalService(id: number, data: any): Promise<AdditionalService> {
    try {
      const [result] = await db.update(additionalServices)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(additionalServices.id, id))
        .returning();
      
      if (!result) {
        throw new Error('부가서비스를 찾을 수 없습니다.');
      }
      
      return result;
    } catch (error) {
      console.error('Update additional service error:', error);
      throw new Error('부가서비스 수정에 실패했습니다.');
    }
  }

  async deleteAdditionalService(id: number): Promise<void> {
    try {
      await db.update(additionalServices)
        .set({
          isActive: false,
          updatedAt: new Date(),
        })
        .where(eq(additionalServices.id, id));
    } catch (error) {
      console.error('Delete additional service error:', error);
      throw new Error('부가서비스 삭제에 실패했습니다.');
    }
  }
  
  async getDealers(): Promise<any[]> {
    return [];
  }
  
  async getUsers(): Promise<any[]> {
    try {
      // 관리자 목록 조회
      const adminList = await db.select().from(admins);
      
      // 영업과장 목록 조회
      const salesManagerList = await db.select({
        id: salesManagers.id,
        username: salesManagers.username,
        name: salesManagers.managerName,
        createdAt: salesManagers.createdAt,
        teamId: salesManagers.teamId,
        isActive: salesManagers.isActive
      }).from(salesManagers)
        .where(eq(salesManagers.isActive, true));

      // 메모리에서 근무자 목록 조회
      const workers = Array.from(workerStore.values());

      // 통합 사용자 목록 생성
      const allUsers = [
        ...adminList.map(admin => ({
          id: admin.id,
          username: admin.username,
          displayName: admin.name,
          userType: 'admin' as const,
          accountType: 'admin' as const,
          affiliation: '시스템',
          createdAt: admin.createdAt
        })),
        ...salesManagerList.map(manager => ({
          id: manager.id,
          username: manager.username,
          displayName: manager.name,
          userType: 'sales_manager' as const,
          accountType: 'sales_manager' as const,
          affiliation: manager.teamId === 1 ? 'DX 1팀' : manager.teamId === 2 ? 'DX 2팀' : '기타',
          createdAt: manager.createdAt
        })),
        ...workers.map(worker => ({
          id: worker.id,
          username: worker.username,
          displayName: worker.displayName,
          userType: 'worker' as const,
          accountType: 'worker' as const,
          affiliation: worker.affiliation,
          createdAt: worker.createdAt
        }))
      ];

      return allUsers;
    } catch (error) {
      console.error('getUsers error:', error);
      // 오류 시 기본 관리자 계정만 반환
      return [{
        id: 1,
        username: 'admin',
        displayName: '시스템 관리자',
        userType: 'admin' as const,
        accountType: 'admin' as const,
        affiliation: '시스템',
        createdAt: new Date()
      }];
    }
  }

  async getAllUsers(): Promise<any[]> {
    return this.getUsers();
  }

  async createUser(userData: { username: string; password: string; name: string; userType: string }): Promise<any> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    if (userData.userType === 'admin') {
      const [newAdmin] = await db.insert(admins).values({
        username: userData.username,
        password: hashedPassword,
        name: userData.name,
        isActive: true
      }).returning();
      
      return {
        id: newAdmin.id,
        username: newAdmin.username,
        displayName: newAdmin.name,
        userType: 'admin',
        accountType: 'admin',
        affiliation: '시스템',
        createdAt: newAdmin.createdAt
      };
    } else {
      throw new Error('해당 계정 유형은 시스템에서 관리됩니다. 시스템 관리자에게 문의하세요.');
    }
  }

  async updateUser(id: number, userData: any): Promise<any> {
    const updateData: any = {};
    
    if (userData.username) updateData.username = userData.username;
    if (userData.name) updateData.name = userData.name;
    if (userData.password) {
      updateData.password = await bcrypt.hash(userData.password, 10);
    }
    
    // 관리자 테이블에서 업데이트 시도
    const adminResult = await db.update(admins)
      .set(updateData)
      .where(eq(admins.id, id))
      .returning();
      
    if (adminResult.length > 0) {
      return adminResult[0];
    }
    
    throw new Error('사용자를 찾을 수 없습니다.');
  }

  async deleteUser(id: number): Promise<void> {
    // 관리자 삭제 (hard delete)
    const adminResult = await db.delete(admins)
      .where(eq(admins.id, id))
      .returning();
      
    if (adminResult.length > 0) {
      return;
    }
    
    // 영업과장 삭제 (soft delete)
    const managerResult = await db.update(salesManagers)
      .set({ isActive: false })
      .where(eq(salesManagers.id, id))
      .returning();
      
    if (managerResult.length > 0) {
      return;
    }
    
    throw new Error('사용자를 찾을 수 없습니다.');
  }
  
  async getDocuments(): Promise<any[]> {
    return [];
  }
  
  async getDocumentTemplates(): Promise<any[]> {
    return [];
  }
  
  async getSettlementUnitPrices(): Promise<any[]> {
    return [];
  }
  
  // 대시보드 통계 메서드들 (임시 구현)
  async getDashboardStats(): Promise<any> {
    return {
      totalDocuments: 0,
      pendingDocuments: 0,
      completedDocuments: 0,
      todayDocuments: 0
    };
  }
  
  async getTodayStats(): Promise<any> {
    return {
      todaySubmissions: 0,
      todayCompletions: 0,
      todayRevenue: 0
    };
  }
  
  async getWorkerStats(): Promise<any[]> {
    return [];
  }
  
  async getCarrierStats(): Promise<any[]> {
    return [];
  }
  
  async getActivePricingTables(): Promise<any[]> {
    return [];
  }

  // 통신사 관련 메서드들
  private carriers: any[] = [
    { id: 1, name: 'SK', isActive: true, createdAt: new Date() },
    { id: 2, name: 'KT', isActive: true, createdAt: new Date() },
    { id: 3, name: 'LG', isActive: true, createdAt: new Date() },
    { id: 4, name: 'SK알뜰', isActive: true, createdAt: new Date() },
    { id: 5, name: 'KT알뜰', isActive: true, createdAt: new Date() },
    { id: 6, name: 'LG알뜰', isActive: true, createdAt: new Date() }
  ];

  async getCarriers(): Promise<any[]> {
    return this.carriers.filter(carrier => carrier.isActive);
  }

  async createCarrier(carrierData: any): Promise<any> {
    console.log('Creating carrier:', carrierData);
    
    const newCarrier = {
      id: Date.now(),
      name: carrierData.name,
      isActive: true,
      createdAt: new Date(),
      ...carrierData
    };
    
    this.carriers.push(newCarrier);
    return newCarrier;
  }

  async updateCarrier(id: number, carrierData: any): Promise<any> {
    console.log('Updating carrier:', id, carrierData);
    
    const carrierIndex = this.carriers.findIndex(c => c.id === id);
    if (carrierIndex === -1) {
      throw new Error('통신사를 찾을 수 없습니다.');
    }
    
    this.carriers[carrierIndex] = {
      ...this.carriers[carrierIndex],
      ...carrierData,
      updatedAt: new Date()
    };
    
    return this.carriers[carrierIndex];
  }

  async deleteCarrier(id: number): Promise<void> {
    console.log('Deleting carrier:', id);
    
    const carrierIndex = this.carriers.findIndex(c => c.id === id);
    if (carrierIndex === -1) {
      throw new Error('통신사를 찾을 수 없습니다.');
    }
    
    // Soft delete - isActive를 false로 설정
    this.carriers[carrierIndex].isActive = false;
    this.carriers[carrierIndex].deletedAt = new Date();
  }

  // 중복 접수 확인 메서드
  async checkDuplicateDocument(params: {
    customerName: string;
    customerPhone: string;
    carrier: string;
    storeName?: string;
    contactCode?: string;
  }): Promise<any[]> {
    // 실제 데이터베이스에 documents 테이블이 있다면 이 로직을 사용
    // 현재는 빈 배열 반환 (기존 시스템과의 호환성을 위해)
    
    // 중복 확인 로직:
    // 1. 같은 달 (현재 년월)
    // 2. 같은 판매점 (storeName 또는 contactCode 기준)
    // 3. 같은 통신사 (carrier)
    // 4. 같은 명의 (customerName + customerPhone)
    // 5. 상태가 '접수관리' 또는 '개통완료'인 건만 체크
    
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    
    // 여기서는 임시로 빈 배열을 반환
    // 실제 구현에서는 데이터베이스 쿼리를 수행해야 함
    /*
    예시 쿼리:
    const duplicates = await db.select()
      .from(documents)
      .where(
        and(
          eq(documents.customerName, params.customerName),
          eq(documents.customerPhone, params.customerPhone),
          eq(documents.carrier, params.carrier),
          or(
            eq(documents.storeName, params.storeName),
            eq(documents.contactCode, params.contactCode)
          ),
          // 같은 달 조건
          sql`EXTRACT(YEAR FROM uploaded_at) = ${currentYear}`,
          sql`EXTRACT(MONTH FROM uploaded_at) = ${currentMonth}`,
          // 상태 조건 ('접수관리' 또는 '개통완료')
          or(
            eq(documents.activationStatus, '진행중'),
            eq(documents.activationStatus, '개통완료'),
            eq(documents.activationStatus, '개통')
          )
        )
      );
    */
    
    // 테스트를 위한 임시 중복 데이터 반환
    // 실제 환경에서는 위의 주석 처리된 쿼리를 사용해야 함
    
    // 특정 조건에서 중복 데이터를 시뮬레이션
    if (params.customerName === "홍길동" && params.carrier === "SK") {
      return [
        {
          id: 12345,
          customerName: params.customerName,
          customerPhone: params.customerPhone,
          carrier: params.carrier,
          storeName: params.storeName || "테스트 판매점",
          dealerName: "테스트 판매점",
          uploadedAt: new Date().toISOString(),
          activationStatus: "진행중"
        }
      ];
    }
    
    return [];
  }
  
  // 영업과장 인증
  async authenticateSalesManager(username: string, password: string): Promise<SalesManager | null> {
    try {
      console.log('Authenticating sales manager:', username);
      const manager = await this.getSalesManagerByUsername(username);
      console.log('Sales manager found:', manager ? 'yes' : 'no');
      
      if (!manager) return null;
      
      const isValidPassword = await bcrypt.compare(password, manager.password);
      console.log('Password valid:', isValidPassword);
      
      if (!isValidPassword) return null;
      
      return manager;
    } catch (error) {
      console.error('Sales manager auth error:', error);
      return null;
    }
  }
}

export const storage = new DatabaseStorage();