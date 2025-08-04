import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { eq, and, desc, sql, or, like, gte, lte, inArray, count } from 'drizzle-orm';
import { db } from './db';
import { 
  admins, salesTeams, salesManagers, contactCodeMappings, contactCodes,
  carriers, servicePlans, additionalServices, documents
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
  getContactCodeByCode(contactCode: string): Promise<any>;
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
  
  // 문서 관련 업데이트 메서드들
  updateDocumentNotes(id: number, notes: string): Promise<void>;
  updateDocumentSettlementAmount(id: number, settlementAmount: number): Promise<void>;
  getDocument(id: number): Promise<any>;
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

  async getContactCodeByCode(contactCode: string): Promise<any> {
    const [result] = await db.select({
      dealerName: contactCodes.dealerName,
      contactCode: contactCodes.code,
      carrier: contactCodes.carrier
    })
    .from(contactCodes)
    .where(eq(contactCodes.code, contactCode))
    .limit(1);
    
    return result;
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
      
      // DB 스네이크케이스 필드를 카멜케이스로 변환
      return result.map(carrier => ({
        ...carrier,
        allowNewCustomer: carrier.allow_new_customer,
        allowPortIn: carrier.allow_port_in,
        requireDesiredNumber: carrier.require_desired_number,
        allow_new_customer: undefined,
        allow_port_in: undefined,
        require_desired_number: undefined
      } as any)) as Carrier[];
    } catch (error) {
      console.error('Get carriers error:', error);
      return [];
    }
  }

  async createCarrier(data: any): Promise<Carrier> {
    try {
      // 카멜케이스를 스네이크케이스로 변환
      const dbData = {
        ...data,
        allow_new_customer: data.allowNewCustomer,
        allow_port_in: data.allowPortIn,
        require_desired_number: data.requireDesiredNumber,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // 카멜케이스 필드 제거
      delete dbData.allowNewCustomer;
      delete dbData.allowPortIn;
      delete dbData.requireDesiredNumber;
      
      const [result] = await db.insert(carriers).values(dbData).returning();
      
      // 응답에서 스네이크케이스를 카멜케이스로 변환
      return {
        ...result,
        allowNewCustomer: result.allow_new_customer,
        allowPortIn: result.allow_port_in,
        requireDesiredNumber: result.require_desired_number,
        allow_new_customer: undefined,
        allow_port_in: undefined,
        require_desired_number: undefined
      } as any as Carrier;
    } catch (error) {
      console.error('Create carrier error:', error);
      throw new Error('통신사 생성에 실패했습니다.');
    }
  }

  async updateCarrier(id: number, data: any): Promise<Carrier> {
    try {
      // 카멜케이스를 스네이크케이스로 변환
      const dbData = {
        ...data,
        allow_new_customer: data.allowNewCustomer,
        allow_port_in: data.allowPortIn,
        require_desired_number: data.requireDesiredNumber,
        updatedAt: new Date(),
      };
      
      // 카멜케이스 필드 제거
      delete dbData.allowNewCustomer;
      delete dbData.allowPortIn;
      delete dbData.requireDesiredNumber;
      
      const [result] = await db.update(carriers)
        .set(dbData)
        .where(eq(carriers.id, id))
        .returning();
      
      if (!result) {
        throw new Error('통신사를 찾을 수 없습니다.');
      }
      
      // 응답에서 스네이크케이스를 카멜케이스로 변환
      return {
        ...result,
        allowNewCustomer: result.allow_new_customer,
        allowPortIn: result.allow_port_in,
        requireDesiredNumber: result.require_desired_number,
        allow_new_customer: undefined,
        allow_port_in: undefined,
        require_desired_number: undefined
      } as any as Carrier;
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
      
      // DB의 name 필드를 planName으로 매핑
      return result.map(plan => ({
        ...plan,
        planName: plan.name,
        name: undefined // name 필드 제거
      })) as ServicePlan[];
    } catch (error) {
      console.error('Get service plans error:', error);
      return [];
    }
  }

  async createServicePlan(data: any): Promise<ServicePlan> {
    try {
      console.log('Creating service plan:', data);
      const [result] = await db.insert(servicePlans).values({
        name: data.planName || data.name,
        carrier: data.carrier,
        planType: data.planType || 'LTE',
        dataAllowance: data.dataAllowance || '',
        monthlyFee: data.monthlyFee || 0,
        isActive: data.isActive !== false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      // DB의 name 필드를 planName으로 매핑하여 반환
      return {
        ...result,
        planName: result.name,
        name: undefined // name 필드 제거
      } as ServicePlan;
    } catch (error) {
      console.error('Create service plan error:', error);
      throw new Error('서비스 플랜 생성에 실패했습니다.');
    }
  }

  async updateServicePlan(id: number, data: any): Promise<ServicePlan> {
    try {
      // planName을 name으로 변환하여 DB에 저장
      const updateData = {
        ...data,
        name: data.planName || data.name,
        planName: undefined, // planName 필드 제거
        updatedAt: new Date(),
      };
      
      const [result] = await db.update(servicePlans)
        .set(updateData)
        .where(eq(servicePlans.id, id))
        .returning();
      
      if (!result) {
        throw new Error('서비스 플랜을 찾을 수 없습니다.');
      }
      
      // DB의 name 필드를 planName으로 매핑하여 반환
      return {
        ...result,
        planName: result.name,
        name: undefined // name 필드 제거
      } as ServicePlan;
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
      
      // DB의 name 필드를 planName으로 매핑
      return result.map(plan => ({
        ...plan,
        planName: plan.name,
        name: undefined // name 필드 제거
      })) as ServicePlan[];
    } catch (error) {
      console.error('Get service plans by carrier error:', error);
      return [];
    }
  }

  async findServicePlanByNameAndCarrier(planName: string, carrier: string): Promise<ServicePlan | undefined> {
    try {
      const [result] = await db.select().from(servicePlans)
        .where(and(
          eq(servicePlans.name, planName),
          eq(servicePlans.carrier, carrier),
          eq(servicePlans.isActive, true)
        ));
      
      if (result) {
        // DB의 name 필드를 planName으로 매핑
        return {
          ...result,
          planName: result.name,
          name: undefined // name 필드 제거
        } as ServicePlan;
      }
      return undefined;
    } catch (error) {
      console.error('Find service plan by name and carrier error:', error);
      return undefined;
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
  
  async getDocuments(filters?: {
    status?: string;
    activationStatus?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    carrier?: string;
    dealerId?: number;
  }): Promise<any[]> {
    try {
      // First, get all documents with dealer information
      let query = db.select({
        id: documents.id,
        documentNumber: documents.documentNumber,
        customerName: documents.customerName,
        customerPhone: documents.customerPhone,
        contactCode: documents.contactCode,
        carrier: documents.carrier,
        previousCarrier: documents.previousCarrier,
        status: documents.status,
        activationStatus: documents.activationStatus,
        uploadedAt: documents.uploadedAt,
        updatedAt: documents.updatedAt,
        activatedAt: documents.activatedAt,
        notes: documents.notes,
        dealerId: documents.dealerId,
        userId: documents.userId,
        assignedWorkerId: documents.assignedWorkerId,
        filePath: documents.filePath,
        fileName: documents.fileName,
        fileSize: documents.fileSize,
        dealerNotes: documents.dealerNotes,
        subscriptionNumber: documents.subscriptionNumber,
        servicePlanId: documents.servicePlanId,
        deviceModel: documents.deviceModel,
        simNumber: documents.simNumber,
        settlementAmount: documents.settlementAmount
      }).from(documents);

      const conditions = [];

      if (filters) {
        if (filters.status) {
          conditions.push(eq(documents.status, filters.status));
        }

        if (filters.activationStatus) {
          const statuses = filters.activationStatus.split(',').map(s => s.trim());
          conditions.push(inArray(documents.activationStatus, statuses));
        }

        if (filters.search) {
          conditions.push(
            or(
              like(documents.customerName, `%${filters.search}%`),
              like(documents.customerPhone, `%${filters.search}%`),
              like(documents.documentNumber, `%${filters.search}%`),
              like(documents.contactCode, `%${filters.search}%`)
            )
          );
        }

        if (filters.startDate) {
          conditions.push(gte(documents.uploadedAt, new Date(filters.startDate)));
        }

        if (filters.endDate) {
          conditions.push(lte(documents.uploadedAt, new Date(filters.endDate)));
        }

        if (filters.carrier) {
          conditions.push(eq(documents.carrier, filters.carrier));
        }

        if (filters.dealerId) {
          conditions.push(eq(documents.dealerId, filters.dealerId));
        }
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const result = await query.orderBy(desc(documents.uploadedAt));
      console.log('Documents found:', result.length);
      
      // Add dealer name from contact codes
      const documentsWithDealerName = await Promise.all(result.map(async (doc) => {
        // Get dealer name from contact codes table
        const contactCodeResult = await db.select({
          dealerName: contactCodes.dealerName
        })
        .from(contactCodes)
        .where(eq(contactCodes.code, doc.contactCode))
        .limit(1);
        
        return {
          ...doc,
          dealerName: contactCodeResult.length > 0 ? contactCodeResult[0].dealerName : '미확인'
        };
      }));
      
      return documentsWithDealerName;
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw new Error('문서 조회에 실패했습니다.');
    }
  }
  
  async getDocumentTemplates(): Promise<any[]> {
    return [];
  }

  // 문서 개별 조회
  async getDocument(id: number): Promise<any | undefined> {
    try {
      const [document] = await db.select().from(documents).where(eq(documents.id, id));
      return document;
    } catch (error) {
      console.error('Error fetching document:', error);
      return undefined;
    }
  }

  // 문서 삭제
  async deleteDocument(id: number): Promise<void> {
    try {
      await db.delete(documents).where(eq(documents.id, id));
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error('문서 삭제에 실패했습니다.');
    }
  }

  // 문서 상태 업데이트
  async updateDocumentStatus(id: number, data: any): Promise<any> {
    try {
      const [updatedDocument] = await db.update(documents)
        .set({
          status: data.status,
          notes: data.notes || null,
          updatedAt: new Date()
        })
        .where(eq(documents.id, id))
        .returning();
      return updatedDocument;
    } catch (error) {
      console.error('Error updating document status:', error);
      throw new Error('문서 상태 업데이트에 실패했습니다.');
    }
  }

  // 문서 개통 상태 업데이트
  async updateDocumentActivationStatus(id: number, data: any, workerId?: number): Promise<any> {
    try {
      const updateData: any = {
        activationStatus: data.activationStatus,
        updatedAt: new Date()
      };

      // 상태별 특별 처리
      if (data.activationStatus === '개통') {
        updateData.activatedAt = new Date();
        updateData.activatedBy = workerId || data.activatedBy;
        updateData.servicePlanId = data.servicePlanId;
        updateData.servicePlanName = data.servicePlanName;
        updateData.additionalServiceIds = data.additionalServiceIds ? JSON.stringify(data.additionalServiceIds) : null;
        updateData.registrationFee = data.registrationFee;
        updateData.registrationFeePrepaid = data.registrationFeePrepaid || false;
        updateData.registrationFeePostpaid = data.registrationFeePostpaid || false;
        updateData.registrationFeeInstallment = data.registrationFeeInstallment || false;
        updateData.simFeePrepaid = data.simFeePrepaid || false;
        updateData.simFeePostpaid = data.simFeePostpaid || false;
        updateData.bundleApplied = data.bundleApplied || false;
        updateData.bundleNotApplied = data.bundleNotApplied || false;
        updateData.bundleDiscount = data.bundleDiscount;
        updateData.totalMonthlyFee = data.totalMonthlyFee;
        updateData.deviceModel = data.deviceModel;
        updateData.simNumber = data.simNumber;
        updateData.subscriptionNumber = data.subscriptionNumber;
        updateData.dealerNotes = data.dealerNotes;
      } else if (data.activationStatus === '취소') {
        updateData.cancelledBy = workerId || data.cancelledBy;
      } else if (data.activationStatus === '진행중') {
        updateData.assignedWorkerId = workerId;
        updateData.assignedAt = new Date();
      } else if (data.activationStatus === '폐기') {
        updateData.discardReason = data.discardReason;
      } else if (data.activationStatus === '보완필요') {
        updateData.supplementRequired = data.supplementRequired;
        updateData.supplementNotes = data.supplementNotes;
        updateData.supplementRequiredBy = workerId;
        updateData.supplementRequiredAt = new Date();
      }

      // 추가 필드들
      if (data.notes !== undefined) updateData.notes = data.notes;

      const [updatedDocument] = await db.update(documents)
        .set(updateData)
        .where(eq(documents.id, id))
        .returning();

      return updatedDocument;
    } catch (error) {
      console.error('Error updating document activation status:', error);
      throw new Error('문서 개통 상태 업데이트에 실패했습니다.');
    }
  }

  async updateDocumentServicePlanDirect(id: number, data: any): Promise<any> {
    try {
      const updateData: any = {
        updatedAt: new Date()
      };

      // 서비스 플랜 관련 데이터 업데이트
      if (data.servicePlanId !== undefined) updateData.servicePlanId = data.servicePlanId;
      if (data.additionalServiceIds !== undefined) updateData.additionalServiceIds = data.additionalServiceIds;
      if (data.registrationFeePrepaid !== undefined) updateData.registrationFeePrepaid = data.registrationFeePrepaid;
      if (data.registrationFeePostpaid !== undefined) updateData.registrationFeePostpaid = data.registrationFeePostpaid;
      if (data.registrationFeeInstallment !== undefined) updateData.registrationFeeInstallment = data.registrationFeeInstallment;
      if (data.simFeePrepaid !== undefined) updateData.simFeePrepaid = data.simFeePrepaid;
      if (data.simFeePostpaid !== undefined) updateData.simFeePostpaid = data.simFeePostpaid;
      if (data.bundleApplied !== undefined) updateData.bundleApplied = data.bundleApplied;
      if (data.bundleNotApplied !== undefined) updateData.bundleNotApplied = data.bundleNotApplied;
      if (data.deviceModel !== undefined) updateData.deviceModel = data.deviceModel;
      if (data.simNumber !== undefined) updateData.simNumber = data.simNumber;
      if (data.subscriptionNumber !== undefined) updateData.subscriptionNumber = data.subscriptionNumber;
      if (data.dealerNotes !== undefined) updateData.dealerNotes = data.dealerNotes;

      const [updatedDocument] = await db.update(documents)
        .set(updateData)
        .where(eq(documents.id, id))
        .returning();

      return updatedDocument;
    } catch (error) {
      console.error('Error updating document service plan:', error);
      throw new Error('문서 서비스 플랜 업데이트에 실패했습니다.');
    }
  }
  
  // 정산단가 관리
  async getSettlementUnitPrices(): Promise<SettlementUnitPrice[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          sup.id, 
          sup.service_plan_id as "servicePlanId",
          sup.new_customer_price as "newCustomerPrice",
          sup.port_in_price as "portInPrice", 
          sup.is_active as "isActive",
          sup.effective_from as "effectiveFrom",
          sup.effective_until as "effectiveUntil",
          sup.memo,
          sup.created_at as "createdAt",
          sup.updated_at as "updatedAt",
          sup.created_by as "createdBy",
          sp.carrier,
          sp.name as "servicePlanName"
        FROM settlement_unit_prices sup
        LEFT JOIN service_plans sp ON sup.service_plan_id = sp.id
        ORDER BY sup.created_at DESC
      `);

      return result.rows.map((row: any) => ({
        ...row,
        newCustomerPrice: Number(row.newCustomerPrice),
        portInPrice: Number(row.portInPrice)
      }));
    } catch (error) {
      console.error('Get settlement unit prices error:', error);
      return [];
    }
  }

  async createSettlementUnitPrice(data: {
    servicePlanId: number;
    newCustomerPrice: number;
    portInPrice: number;
    effectiveFrom?: Date;
    memo?: string;
    createdBy: number;
  }): Promise<SettlementUnitPrice> {
    try {
      // 기존 활성 단가 비활성화
      await db.execute(sql`
        UPDATE settlement_unit_prices 
        SET is_active = false, effective_until = NOW()
        WHERE service_plan_id = ${data.servicePlanId} AND is_active = true
      `);

      // 새 단가 등록
      const result = await db.execute(sql`
        INSERT INTO settlement_unit_prices 
        (service_plan_id, new_customer_price, port_in_price, effective_from, memo, created_by)
        VALUES (${data.servicePlanId}, ${data.newCustomerPrice}, ${data.portInPrice}, ${data.effectiveFrom || new Date()}, ${data.memo || ''}, ${data.createdBy})
        RETURNING id, service_plan_id as service_plan_id, 
          new_customer_price, port_in_price,
          is_active, effective_from,
          effective_until, memo,
          created_at, updated_at,
          created_by
      `);

      const created = result.rows[0] as any;
      
      // Add carrier and servicePlanName by joining
      const servicePlan = await this.getServicePlan(data.servicePlanId);
      return {
        id: created.id,
        servicePlanId: created.service_plan_id,
        newCustomerPrice: Number(created.new_customer_price),
        portInPrice: Number(created.port_in_price),
        isActive: created.is_active,
        effectiveFrom: created.effective_from,
        effectiveUntil: created.effective_until,
        memo: created.memo,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
        createdBy: created.created_by,
        carrier: servicePlan?.carrier || '',
        servicePlanName: servicePlan?.planName || ''
      };
    } catch (error) {
      console.error('Error creating settlement unit price:', error);
      throw new Error('정산단가 생성에 실패했습니다.');
    }
  }

  async getActiveSettlementUnitPrices(): Promise<SettlementUnitPrice[]> {
    try {
      const result = await db.execute(sql`
        SELECT 
          sup.id, 
          sup.service_plan_id as "servicePlanId",
          sup.new_customer_price as "newCustomerPrice",
          sup.port_in_price as "portInPrice", 
          sup.is_active as "isActive",
          sup.effective_from as "effectiveFrom",
          sup.effective_until as "effectiveUntil",
          sup.memo,
          sup.created_at as "createdAt",
          sup.updated_at as "updatedAt",
          sup.created_by as "createdBy",
          sp.carrier,
          sp.name as "servicePlanName"
        FROM settlement_unit_prices sup
        LEFT JOIN service_plans sp ON sup.service_plan_id = sp.id
        WHERE sup.is_active = true
        ORDER BY sup.created_at DESC
      `);

      return result.rows.map((row: any) => ({
        ...row,
        newCustomerPrice: Number(row.newCustomerPrice),
        portInPrice: Number(row.portInPrice)
      }));
    } catch (error) {
      console.error('Get active settlement unit prices error:', error);
      return [];
    }
  }

  async updateSettlementUnitPrice(servicePlanId: number, data: {
    newCustomerPrice: number;
    portInPrice: number;
    effectiveFrom?: Date;
    memo?: string;
    updatedBy: number;
  }): Promise<SettlementUnitPrice> {
    // 새로운 단가 생성 (기존 방식과 동일)
    return this.createSettlementUnitPrice({
      servicePlanId,
      newCustomerPrice: data.newCustomerPrice,
      portInPrice: data.portInPrice,
      effectiveFrom: data.effectiveFrom,
      memo: data.memo,
      createdBy: data.updatedBy
    });
  }

  async deleteSettlementUnitPrice(servicePlanId: number): Promise<void> {
    await db.execute(sql`
      UPDATE settlement_unit_prices 
      SET is_active = false, effective_until = NOW()
      WHERE service_plan_id = ${servicePlanId} AND is_active = true
    `);
  }

  async getSettlementUnitPriceByServicePlan(servicePlanId: number): Promise<SettlementUnitPrice | null> {
    try {
      const result = await db.execute(sql`
        SELECT 
          sup.id, 
          sup.service_plan_id as "servicePlanId",
          sup.new_customer_price as "newCustomerPrice",
          sup.port_in_price as "portInPrice", 
          sup.is_active as "isActive",
          sup.effective_from as "effectiveFrom",
          sup.effective_until as "effectiveUntil",
          sup.memo,
          sup.created_at as "createdAt",
          sup.updated_at as "updatedAt",
          sup.created_by as "createdBy",
          sp.carrier,
          sp.name as "servicePlanName"
        FROM settlement_unit_prices sup
        LEFT JOIN service_plans sp ON sup.service_plan_id = sp.id
        WHERE sup.service_plan_id = ${servicePlanId} AND sup.is_active = true
        ORDER BY sup.created_at DESC
        LIMIT 1
      `);

      if (result.rows.length === 0) return null;

      const row = result.rows[0] as any;
      return {
        ...row,
        newCustomerPrice: Number(row.newCustomerPrice),
        portInPrice: Number(row.portInPrice)
      };
    } catch (error) {
      console.error('Get settlement unit price by service plan error:', error);
      return null;
    }
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
    try {
      const result = await db.select().from(carriers).where(eq(carriers.isActive, true));
      return result;
    } catch (error) {
      console.error('Error getting carriers from DB:', error);
      // 데이터베이스 연결 실패 시 메모리 기본값 반환
      return this.carriers.filter(carrier => carrier.isActive);
    }
  }

  async createCarrier(carrierData: any): Promise<any> {
    console.log('Creating carrier:', carrierData);
    
    try {
      // 데이터베이스에 저장
      const [newCarrier] = await db.insert(carriers).values({
        name: carrierData.name,
        displayOrder: carrierData.displayOrder || 0,
        isActive: carrierData.isActive ?? true,
        isWired: carrierData.isWired ?? false,
        bundleNumber: carrierData.bundleNumber || '',
        bundleCarrier: carrierData.bundleCarrier || '',
        documentRequired: carrierData.documentRequired ?? false,
        requireCustomerName: carrierData.requireCustomerName ?? true,
        requireCustomerPhone: carrierData.requireCustomerPhone ?? true,
        requireCustomerEmail: carrierData.requireCustomerEmail ?? false,
        requireContactCode: carrierData.requireContactCode ?? true,
        requireCarrier: carrierData.requireCarrier ?? true,
        requirePreviousCarrier: carrierData.requirePreviousCarrier ?? true,
        requireDocumentUpload: carrierData.requireDocumentUpload ?? false,
        requireBundleNumber: carrierData.requireBundleNumber ?? false,
        requireBundleCarrier: carrierData.requireBundleCarrier ?? false,
      }).returning();
      
      return newCarrier;
    } catch (error) {
      console.error('Error creating carrier in DB:', error);
      // 데이터베이스 저장 실패 시 메모리에만 저장
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
  }

  async updateCarrier(id: number, carrierData: any): Promise<any> {
    console.log('Updating carrier:', id, carrierData);
    
    try {
      const [updatedCarrier] = await db.update(carriers)
        .set({
          name: carrierData.name,
          displayOrder: carrierData.displayOrder,
          isActive: carrierData.isActive,
          isWired: carrierData.isWired,
          bundleNumber: carrierData.bundleNumber,
          bundleCarrier: carrierData.bundleCarrier,
          documentRequired: carrierData.documentRequired,
          requireCustomerName: carrierData.requireCustomerName,
          requireCustomerPhone: carrierData.requireCustomerPhone,
          requireCustomerEmail: carrierData.requireCustomerEmail,
          requireContactCode: carrierData.requireContactCode,
          requireCarrier: carrierData.requireCarrier,
          requirePreviousCarrier: carrierData.requirePreviousCarrier,
          requireDocumentUpload: carrierData.requireDocumentUpload,
          requireBundleNumber: carrierData.requireBundleNumber,
          requireBundleCarrier: carrierData.requireBundleCarrier,
          updatedAt: new Date()
        })
        .where(eq(carriers.id, id))
        .returning();
      
      if (!updatedCarrier) {
        throw new Error('통신사를 찾을 수 없습니다.');
      }
      
      return updatedCarrier;
    } catch (error) {
      console.error('Error updating carrier in DB:', error);
      // 메모리 방식으로 폴백
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
  }

  async deleteCarrier(id: number): Promise<void> {
    console.log('Deleting carrier:', id);
    
    try {
      const [deletedCarrier] = await db.update(carriers)
        .set({ isActive: false, deletedAt: new Date() })
        .where(eq(carriers.id, id))
        .returning();
      
      if (!deletedCarrier) {
        throw new Error('통신사를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('Error deleting carrier in DB:', error);
      // 메모리 방식으로 폴백
      const carrierIndex = this.carriers.findIndex(c => c.id === id);
      if (carrierIndex === -1) {
        throw new Error('통신사를 찾을 수 없습니다.');
      }
      
      this.carriers[carrierIndex].isActive = false;
      this.carriers[carrierIndex].deletedAt = new Date();
    }
  }

  async getCarriersFromDocuments(): Promise<string[]> {
    try {
      // 데이터베이스에서 고유한 통신사 목록 조회
      const result = await db.selectDistinct({ carrier: documents.carrier })
        .from(documents)
        .where(ne(documents.carrier, ''))
        .orderBy(documents.carrier);
      
      return result.map(row => row.carrier);
    } catch (error) {
      console.error('Error getting carriers from documents in DB:', error);
      // 폴백으로 기본 통신사 목록 반환
      return ['SK', 'KT', 'LG', 'SK알뜰', 'KT알뜰', 'LG알뜰'];
    }
  }

  // 중복 접수 확인 메서드 (새로운 인터페이스)
  async findDuplicateDocuments(params: {
    customerName: string;
    customerPhone: string;
    carrier: string;
    storeName?: string;
    contactCode?: string;
    monthStart: string;
    monthEnd: string;
  }): Promise<any[]> {
    try {
      const { customerName, customerPhone, carrier, storeName, contactCode, monthStart, monthEnd } = params;
      
      console.log('Checking duplicates with params:', params);
      
      // 기본 조건: 고객명, 연락처, 통신사, 현재 월
      const baseConditions = [
        eq(documents.customerName, customerName),
        eq(documents.customerPhone, customerPhone),
        eq(documents.carrier, carrier),
        gte(documents.uploadedAt, new Date(monthStart)),
        lte(documents.uploadedAt, new Date(monthEnd))
      ];
      
      // 판매점명 조건 추가 (storeName 또는 contactCode 중 하나라도 있으면)
      if (storeName) {
        baseConditions.push(eq(documents.storeName, storeName));
      }
      
      const duplicates = await db
        .select()
        .from(documents)
        .where(and(...baseConditions))
        .orderBy(desc(documents.uploadedAt));
      
      console.log('Found duplicates:', duplicates.length);
      return duplicates;
    } catch (error) {
      console.error('Error in findDuplicateDocuments:', error);
      throw error;
    }
  }

  // 중복 접수 확인 메서드 (기존 인터페이스)
  async checkDuplicateDocument(params: {
    customerName: string;
    customerPhone: string;
    carrier: string;
    storeName?: string;
    contactCode?: string;
  }): Promise<any[]> {
    try {
      // 중복 확인 로직:
      // 1. 같은 달 (현재 년월)
      // 2. 같은 판매점 (storeName 또는 contactCode 기준)
      // 3. 같은 통신사 (carrier)
      // 4. 같은 명의 (customerName + customerPhone)
      // 5. 활성 상태인 건만 체크
      
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;
      
      // 조건 배열
      const conditions = [
        eq(documents.customerName, params.customerName),
        eq(documents.customerPhone, params.customerPhone),
        eq(documents.carrier, params.carrier),
        // 같은 달 조건
        sql`EXTRACT(YEAR FROM ${documents.uploadedAt}) = ${currentYear}`,
        sql`EXTRACT(MONTH FROM ${documents.uploadedAt}) = ${currentMonth}`,
        // 접수상태는 '접수'이고 활성화상태는 진행중이거나 개통완료인 건들
        eq(documents.status, '접수'),
        or(
          eq(documents.activationStatus, '진행중'),
          eq(documents.activationStatus, '개통완료'),
          eq(documents.activationStatus, '개통'),
          eq(documents.activationStatus, '업무요청중')
        )
      ];
      
      // 판매점 조건 추가
      if (params.storeName) {
        conditions.push(eq(documents.storeName, params.storeName));
      }
      if (params.contactCode) {
        conditions.push(eq(documents.contactCode, params.contactCode));
      }
      
      const duplicates = await db.select({
        id: documents.id,
        customerName: documents.customerName,
        customerPhone: documents.customerPhone,
        carrier: documents.carrier,
        storeName: documents.storeName,
        contactCode: documents.contactCode,
        uploadedAt: documents.uploadedAt,
        activationStatus: documents.activationStatus,
        status: documents.status
      })
      .from(documents)
      .where(and(...conditions))
      .limit(10); // 최대 10건까지만 반환
      
      // 각 중복 건에 대해 판매점명 추가
      const duplicatesWithDealerName = await Promise.all(duplicates.map(async (doc) => {
        let dealerName = doc.storeName || '미확인';
        
        if (doc.contactCode) {
          const contactCodeResult = await db.select({
            dealerName: contactCodes.dealerName
          })
          .from(contactCodes)
          .where(eq(contactCodes.code, doc.contactCode))
          .limit(1);
          
          if (contactCodeResult.length > 0) {
            dealerName = contactCodeResult[0].dealerName;
          }
        }
        
        return {
          ...doc,
          dealerName
        };
      }));
      
      return duplicatesWithDealerName;
    } catch (error) {
      console.error('중복 접수 확인 오류:', error);
      return [];
    }
  }
  
  // 문서 업로드 메서드 추가
  async uploadDocument(data: any): Promise<any> {
    try {
      console.log('Uploading document:', data);
      
      // 문서 번호 생성 (년월일 + 순번)
      const today = new Date();
      const datePrefix = today.getFullYear().toString() + 
                        (today.getMonth() + 1).toString().padStart(2, '0') + 
                        today.getDate().toString().padStart(2, '0');
      
      // 오늘 날짜로 시작하는 문서 수 확인
      const countResult = await db.select({ count: count() })
        .from(documents)
        .where(like(documents.documentNumber, `${datePrefix}%`));
      const todayCount = parseInt(String(countResult[0]?.count || 0));
      const documentNumber = `${datePrefix}${(todayCount + 1).toString().padStart(4, '0')}`;

      // 데이터베이스에 문서 삽입
      const [document] = await db.insert(documents).values({
        dealerId: data.dealerId || null,
        userId: data.userId,
        documentNumber: documentNumber,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        contactCode: data.contactCode || null,
        carrier: data.carrier,
        previousCarrier: data.previousCarrier || null,
        notes: data.notes || null,
        filePath: data.filePath || null,
        fileName: data.fileName || null,
        fileSize: data.fileSize || null,
        status: '접수',
        activationStatus: '대기'
      }).returning();
      console.log('Document saved to database:', document);
      
      return {
        id: document.id,
        documentNumber: document.documentNumber,
        customerName: document.customerName,
        customerPhone: document.customerPhone,
        contactCode: document.contactCode,
        carrier: document.carrier,
        previousCarrier: document.previousCarrier,
        status: document.status,
        activationStatus: document.activationStatus,
        uploadedAt: document.uploadedAt,
        updatedAt: document.updatedAt
      };
    } catch (error) {
      console.error('Document upload error:', error);
      throw new Error('문서 업로드에 실패했습니다.');
    }
  }

  // 부가서비스 공제 관련 메서드 추가
  async getAdditionalServiceDeductions(): Promise<any[]> {
    try {
      // 실제 구현에서는 데이터베이스에서 조회
      return [];
    } catch (error) {
      console.error('Get additional service deductions error:', error);
      return [];
    }
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

  // 문서 관련 업데이트 메서드들
  async updateDocumentNotes(id: number, notes: string): Promise<void> {
    try {
      await db.update(documents)
        .set({ notes, updatedAt: new Date() })
        .where(eq(documents.id, id));
    } catch (error) {
      console.error('Document notes update error:', error);
      throw new Error('문서 작업내용 업데이트에 실패했습니다.');
    }
  }

  async updateDocumentSettlementAmount(id: number, settlementAmount: number): Promise<void> {
    try {
      await db.update(documents)
        .set({ settlementAmount, updatedAt: new Date() })
        .where(eq(documents.id, id));
    } catch (error) {
      console.error('Document settlement amount update error:', error);
      throw new Error('정산 금액 업데이트에 실패했습니다.');
    }
  }

  async getDocument(id: number): Promise<any> {
    try {
      const [document] = await db.select()
        .from(documents)
        .where(eq(documents.id, id));
      return document;
    } catch (error) {
      console.error('Get document error:', error);
      throw new Error('문서 조회에 실패했습니다.');
    }
  }
}

export const storage = new DatabaseStorage();