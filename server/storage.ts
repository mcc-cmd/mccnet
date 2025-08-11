import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { eq, and, desc, sql, or, like, gte, lte, lt, inArray, count, isNull, isNotNull, ne } from 'drizzle-orm';
import { db } from './db';
import { 
  admins, salesTeams, salesManagers, contactCodeMappings, contactCodes,
  carriers, servicePlans, additionalServices, documents, users, settlementUnitPrices,
  authSessions
} from '../shared/schema-sqlite';
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
  CreateWorkerForm,
  SettlementUnitPrice
} from '../shared/schema-sqlite';

// 인메모리 세션 저장소 (임시)
// 메모리 기반 세션 저장소 제거 - 데이터베이스 기반으로 교체

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
  getSalesManagerByCode(managerCode: string): Promise<SalesManager | undefined>;
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
  
  // 사용 가능한 영업과장 계정 조회 (조직관리용)
  getAvailableManagers(): Promise<SalesManager[]>;
  assignManagerToTeam(managerId: number, teamId: number): Promise<SalesManager>;
  
  // 근무자 관리
  createWorker(data: CreateWorkerForm): Promise<any>;
  
  // 문서 관련 업데이트 메서드들
  updateDocumentNotes(id: number, notes: string): Promise<void>;
  updateDocumentSettlementAmount(id: number, settlementAmount: number): Promise<void>;
  getDocument(id: number): Promise<any>;
  
  // 영업과장 계정 관리 (관리자 패널에서 생성된 계정들)
  getUnassignedSalesManagerAccounts(): Promise<any[]>;
  assignSalesManagerToTeam(data: any): Promise<any>;
  
  // 사용자 권한 관리
  getUserPermissions(userId: number, userType: string): Promise<any[]>;
  updateUserPermissions(userId: number, userType: string, permissions: any[]): Promise<void>;
  getAllUsersForPermissions(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  
  constructor() {
    // KT 통신사 기본 설정 초기화 (ID 9번은 KT)
    this.carrierFieldSettings.set(9, {
      displayOrder: 1,
      isWired: false,
      bundleNumber: '',
      bundleCarrier: '',
      documentRequired: false,
      requireCustomerName: true,
      requireCustomerPhone: true, // KT는 연락처 필수
      requireCustomerEmail: false,
      requireContactCode: true,
      requireCarrier: true,
      requirePreviousCarrier: true,
      requireDocumentUpload: false,
      requireBundleNumber: false,
      requireBundleCarrier: false,
      allowNewCustomer: true,
      allowPortIn: true,
      requireDesiredNumber: false
    });
  }
  
  // 관리자 관련 메서드
  async createAdmin(admin: { username: string; password: string; name: string }): Promise<Admin> {
    // 중복 아이디 체크
    const existingAdmin = await this.getAdminByUsername(admin.username);
    if (existingAdmin) {
      throw new Error('이미 존재하는 아이디입니다.');
    }
    
    // 영업과장과 근무자에서도 중복 체크
    const existingManager = await this.getSalesManagerByUsername(admin.username);
    if (existingManager) {
      throw new Error('이미 존재하는 아이디입니다.');
    }
    
    const existingUser = await this.getUserByUsername(admin.username);
    if (existingUser) {
      throw new Error('이미 존재하는 아이디입니다.');
    }
    
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

  async getUserByUsername(username: string): Promise<any | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getSalesManagerByUsername(username: string): Promise<any | undefined> {
    const [manager] = await db.select().from(salesManagers).where(eq(salesManagers.username, username));
    return manager;
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
    }).returning();
    return result;
  }

  async getSalesTeams(): Promise<SalesTeam[]> {
    return await db.select().from(salesTeams).where(eq(salesTeams.isActive, 1)).orderBy(salesTeams.teamName);
  }

  async getSalesTeamById(id: number): Promise<SalesTeam | undefined> {
    const [team] = await db.select().from(salesTeams).where(eq(salesTeams.id, id));
    return team;
  }

  async getSalesTeamByName(teamName: string): Promise<SalesTeam | undefined> {
    const [team] = await db.select().from(salesTeams).where(
      and(eq(salesTeams.teamName, teamName), eq(salesTeams.isActive, 1))
    );
    return team;
  }

  async updateSalesTeam(id: number, data: UpdateSalesTeamForm): Promise<SalesTeam> {
    const [result] = await db.update(salesTeams)
      .set(data)
      .where(eq(salesTeams.id, id))
      .returning();
    return result;
  }

  async deleteSalesTeam(id: number): Promise<void> {
    await db.update(salesTeams)
      .set({ isActive: 0 })
      .where(eq(salesTeams.id, id));
  }

  // 영업과장 관리 메서드
  async createSalesManager(data: CreateSalesManagerForm): Promise<SalesManager> {
    try {
      // 중복 아이디 체크
      const existingAdmin = await this.getAdminByUsername(data.username);
      if (existingAdmin) {
        throw new Error('이미 존재하는 아이디입니다.');
      }
      
      const existingManager = await this.getSalesManagerByUsername(data.username);
      if (existingManager) {
        throw new Error('이미 존재하는 아이디입니다.');
      }
      
      const existingUser = await this.getUserByUsername(data.username);
      if (existingUser) {
        throw new Error('이미 존재하는 아이디입니다.');
      }
      
      const hashedPassword = await bcrypt.hash(data.password, 10);
      
      // team 이름을 teamId로 변환 (공백 제거하여 매칭)
      const normalizedTeamName = data.team.replace(/\s+/g, '');
      let teamId = 2; // 기본값 DX1팀
      if (normalizedTeamName === 'DX2팀') {
        teamId = 3;
      }
      
      const [result] = await db.insert(salesManagers).values({
        teamId: teamId,
        managerName: data.name,
        managerCode: data.username,
        username: data.username,
        password: hashedPassword,
      }).returning();
      return result;
    } catch (error) {
      console.error('Sales manager creation error:', error);
      throw error;
    }
  }

  async getSalesManagers(): Promise<SalesManager[]> {
    return await db.select().from(salesManagers).where(eq(salesManagers.isActive, 1)).orderBy(salesManagers.managerName);
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
      and(eq(salesManagers.username, username), eq(salesManagers.isActive, 1))
    );
    return manager;
  }

  async getSalesManagerByCode(managerCode: string): Promise<SalesManager | undefined> {
    const [manager] = await db.select().from(salesManagers).where(
      and(eq(salesManagers.managerCode, managerCode), eq(salesManagers.isActive, 1))
    );
    return manager;
  }

  async getAvailableManagers(): Promise<SalesManager[]> {
    try {
      const managers = await db.select().from(salesManagers).where(eq(salesManagers.isActive, 1));
      return managers;
    } catch (error) {
      console.error('getAvailableManagers error:', error);
      return [];
    }
  }

  async getSalesManagersByTeamId(teamId: number): Promise<SalesManager[]> {
    return await db.select().from(salesManagers)
      .where(and(eq(salesManagers.teamId, teamId), eq(salesManagers.isActive, 1)))
      .orderBy(salesManagers.managerName);
  }

  async updateSalesManager(id: number, data: UpdateSalesManagerForm): Promise<SalesManager> {
    console.log('updateSalesManager called with:', { id, data });
    
    // 중복 체크: username (자기 자신 제외)
    if (data.username) {
      const [existingByUsername] = await db.select().from(salesManagers).where(
        and(
          eq(salesManagers.username, data.username), 
          eq(salesManagers.isActive, 1),
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

    // 비밀번호 해시화 (제공된 경우에만)
    const updateData = { ...data };
    if (data.password && data.password.trim() !== '') {
      updateData.password = await bcrypt.hash(data.password, 10);
    } else {
      // 비밀번호가 빈 문자열이면 업데이트하지 않음
      delete updateData.password;
    }

    console.log('Final updateData:', updateData);

    const [result] = await db.update(salesManagers)
      .set(updateData)
      .where(eq(salesManagers.id, id))
      .returning();
    
    console.log('Update result:', result);
    return result;
  }

  async deleteSalesManager(id: number): Promise<void> {
    await db.update(salesManagers)
      .set({ isActive: 0 })
      .where(eq(salesManagers.id, id));
  }

  async assignManagerToTeam(managerId: number, teamId: number): Promise<SalesManager> {
    const [result] = await db.update(salesManagers)
      .set({ teamId })
      .where(eq(salesManagers.id, managerId))
      .returning();
    return result;
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
      .where(eq(contactCodeMappings.isActive, 1))
      .orderBy(contactCodeMappings.carrier, contactCodeMappings.contactCode);
  }

  async getContactCodeMappingsByManagerId(managerId: number): Promise<ContactCodeMapping[]> {
    return await db.select().from(contactCodeMappings)
      .where(and(eq(contactCodeMappings.managerId, managerId), eq(contactCodeMappings.isActive, 1)))
      .orderBy(contactCodeMappings.carrier, contactCodeMappings.contactCode);
  }

  async getContactCodeMappingsByContactCode(contactCode: string): Promise<ContactCodeMapping[]> {
    return await db.select().from(contactCodeMappings)
      .where(and(eq(contactCodeMappings.contactCode, contactCode), eq(contactCodeMappings.isActive, 1)));
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
      .set(data)
      .where(eq(contactCodeMappings.id, id))
      .returning();
    return result;
  }

  async deleteContactCodeMapping(id: number): Promise<void> {
    await db.update(contactCodeMappings)
      .set({ isActive: 0 })
      .where(eq(contactCodeMappings.id, id));
  }

  // 세션 관리 메서드 (데이터베이스 기반)
  async createSession(userId: number, userType: 'admin' | 'sales_manager' | 'user', managerId?: number, teamId?: number, userRole?: string): Promise<string> {
    const sessionId = nanoid();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간 후 만료
    
    console.log('Creating database session:', { sessionId: sessionId.substring(0, 8) + '...', userId, userType, managerId, teamId });
    
    try {
      await db.insert(authSessions).values({
        id: sessionId,
        userId,
        userType,
        userRole,
        managerId,
        teamId,
        expiresAt: expiresAt.toISOString()
      });
      
      console.log('Database session created successfully');
      return sessionId;
    } catch (error) {
      console.error('Failed to create database session:', error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<AuthSession | undefined> {
    console.log('Getting database session:', sessionId?.substring(0, 8) + '...');
    
    try {
      const [sessionRecord] = await db.select()
        .from(authSessions)
        .where(eq(authSessions.id, sessionId))
        .limit(1);
      
      if (!sessionRecord) {
        console.log('Database session not found');
        return undefined;
      }
      
      const session: AuthSession = {
        id: sessionRecord.id,
        userId: sessionRecord.userId,
        userType: sessionRecord.userType as 'admin' | 'user' | 'sales_manager',
        userRole: sessionRecord.userRole || undefined,
        managerId: sessionRecord.managerId || undefined,
        teamId: sessionRecord.teamId || undefined,
        expiresAt: new Date(sessionRecord.expiresAt)
      };
      
      // 세션 만료 체크
      if (session.expiresAt < new Date()) {
        console.log('Database session expired, deleting');
        await this.deleteSession(sessionId);
        return undefined;
      }
      
      console.log('Database session found:', { userId: session.userId, userType: session.userType });
      return session;
    } catch (error) {
      console.error('Failed to get database session:', error);
      return undefined;
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    console.log('Deleting database session:', sessionId?.substring(0, 8) + '...');
    
    try {
      await db.delete(authSessions)
        .where(eq(authSessions.id, sessionId));
      console.log('Database session deleted successfully');
    } catch (error) {
      console.error('Failed to delete database session:', error);
    }
  }

  // 사용자 정보 조회 메서드 (개통처리자 이름 조회용)
  async getUserById(userId: number): Promise<{ id: number; name: string; username: string; userType: string } | null> {
    try {
      console.log('getUserById called with userId:', userId);
      
      // 먼저 관리자 테이블에서 조회
      const adminResults = await db.select({
        id: admins.id,
        name: admins.name,
        username: admins.username
      })
      .from(admins)
      .where(eq(admins.id, userId))
      .limit(1);

      console.log('Admin query results:', adminResults);
      
      if (adminResults.length > 0) {
        const admin = adminResults[0];
        return {
          ...admin,
          userType: 'admin'
        };
      }

      // 영업과장 테이블에서 조회
      const salesManagerResults = await db.select({
        id: salesManagers.id,
        name: salesManagers.managerName,
        username: salesManagers.username
      })
      .from(salesManagers)
      .where(eq(salesManagers.id, userId))
      .limit(1);

      console.log('Sales Manager query results:', salesManagerResults);
      
      if (salesManagerResults.length > 0) {
        const manager = salesManagerResults[0];
        return {
          id: manager.id,
          name: manager.name,
          username: manager.username,
          userType: 'sales_manager'
        };
      }

      // 일반 사용자 테이블에서 조회
      const userResults = await db.select({
        id: users.id,
        name: users.name,
        username: users.username
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

      console.log('User query results:', userResults);

      if (userResults.length > 0) {
        const user = userResults[0];
        return {
          ...user,
          userType: 'user'
        };
      }

      console.log('No user found with ID:', userId);
      return null;
    } catch (error) {
      console.error('getUserById error:', error);
      return null;
    }
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

  async changeUserRole(userId: number, newAccountType: 'admin' | 'sales_manager' | 'worker'): Promise<void> {
    // 먼저 사용자가 어느 테이블에 있는지 확인
    const adminUser = await db.select().from(admins).where(eq(admins.id, userId)).limit(1);
    const salesManagerUser = await db.select().from(salesManagers).where(eq(salesManagers.id, userId)).limit(1);
    const workerUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    let currentUser: any = null;
    let currentTable: 'admin' | 'sales_manager' | 'worker' | null = null;

    if (adminUser.length > 0) {
      currentUser = adminUser[0];
      currentTable = 'admin';
    } else if (salesManagerUser.length > 0) {
      currentUser = salesManagerUser[0];
      currentTable = 'sales_manager';
    } else if (workerUser.length > 0) {
      currentUser = workerUser[0];
      currentTable = 'worker';
    }

    if (!currentUser) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    // 이미 같은 역할이면 아무것도 하지 않음
    if (currentTable === newAccountType) {
      return;
    }

    // 현재 테이블에서 사용자 삭제
    if (currentTable === 'admin') {
      await db.delete(admins).where(eq(admins.id, userId));
    } else if (currentTable === 'sales_manager') {
      await db.delete(salesManagers).where(eq(salesManagers.id, userId));
    } else if (currentTable === 'worker') {
      await db.delete(users).where(eq(users.id, userId));
    }

    // 새로운 테이블에 사용자 추가
    if (newAccountType === 'admin') {
      await db.insert(admins).values({
        username: currentUser.username,
        password: currentUser.password,
        name: currentUser.name || currentUser.managerName,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else if (newAccountType === 'sales_manager') {
      // DX 1팀을 기본값으로 설정
      const defaultTeam = await db.select().from(salesTeams).where(eq(salesTeams.teamName, 'DX 1팀')).limit(1);
      const teamId = defaultTeam.length > 0 ? defaultTeam[0].id : 1;
      
      await db.insert(salesManagers).values({
        username: currentUser.username,
        password: currentUser.password,
        managerName: currentUser.name || currentUser.managerName,
        teamId: teamId,
        managerCode: `${Date.now()}_${currentUser.username}`,
        position: '대리',
        contactPhone: '',
        email: '',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else if (newAccountType === 'worker') {
      await db.insert(users).values({
        username: currentUser.username,
        password: currentUser.password,
        name: currentUser.name || currentUser.managerName,
        role: 'user',
        canChangePassword: 1,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  // 근무자 관리
  async createWorker(data: CreateWorkerForm): Promise<any> {
    // 중복 아이디 확인
    const existingAdmins = await db.select().from(admins).where(eq(admins.username, data.username));
    const existingSalesManagers = await db.select().from(salesManagers).where(eq(salesManagers.username, data.username));
    const existingUsers = await db.select().from(users).where(eq(users.username, data.username));
    
    if (existingAdmins.length > 0 || existingSalesManagers.length > 0 || existingUsers.length > 0) {
      throw new Error('이미 존재하는 아이디입니다.');
    }
    
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [result] = await db.insert(users).values({
      username: data.username,
      password: hashedPassword,
      name: data.name,
      role: data.role || 'user',
      canChangePassword: data.canChangePassword ? 1 : 0,
    }).returning();
    
    return {
      id: result.id,
      username: result.username,
      name: result.name,
      userType: 'worker'
    };
  }
  
  // 호환성을 위한 기존 사용자 인증 메서드 (임시)
  async authenticateUser(username: string, password: string): Promise<any> {
    // 영업과장 인증 먼저 시도
    console.log('Starting sales manager authentication for:', username);
    try {
      console.log('Querying sales_managers table...');
      const managers = await db.select().from(salesManagers).where(eq(salesManagers.username, username)).limit(1);
      console.log('Sales manager query result:', managers);
      
      if (managers.length > 0) {
        const manager = managers[0];
        console.log('Manager found, checking password...');
        const passwordMatch = await bcrypt.compare(password, manager.password);
        console.log('Password match:', passwordMatch);
        
        if (passwordMatch) {
          console.log('Sales manager authentication successful - id:', manager.id, 'name:', manager.managerName);
          return { 
            id: manager.id, 
            name: manager.managerName,
            userType: 'sales_manager',
            teamId: manager.teamId
          };
        } else {
          console.log('Password does not match for sales manager');
        }
      } else {
        console.log('No sales manager found with username:', username);
      }
    } catch (error) {
      console.error('Sales manager authentication error:', error);
    }

    // 일반 사용자 인증 (users 테이블에서)
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
      if (user && await bcrypt.compare(password, user.password)) {
        // role이 'worker'인 경우 userRole을 'dealer_worker'로 설정
        const userRole = user.role === 'worker' ? 'dealer_worker' : undefined;
        console.log('User authentication successful - role:', user.role, 'userRole:', userRole);
        return { 
          id: user.id, 
          name: user.name,
          userType: 'user',
          userRole: userRole
        };
      }
    } catch (error) {
      console.error('User authentication error:', error);
    }

    // 근무자 인증 (메모리 저장소에서)
    const workers = Array.from(workerStore.values());
    const worker = workers.find(w => w.username === username);
    if (worker && await bcrypt.compare(password, worker.password)) {
      return { 
        id: worker.id, 
        userType: 'user',
        userRole: 'dealer_worker',
        name: worker.name
      };
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
      // 먼저 정확한 코드 일치 검색
      let [contactCode] = await db.select().from(contactCodes).where(
        eq(contactCodes.code, code)
      );
      
      // 정확한 코드가 없으면 대리점명으로 검색
      if (!contactCode) {
        [contactCode] = await db.select().from(contactCodes).where(
          like(contactCodes.dealerName, `%${code}%`)
        );
      }
      
      return contactCode;
    } catch (error) {
      console.error('Find contact code error:', error);
      return undefined;
    }
  }

  async searchContactCodes(query: string): Promise<ContactCode[]> {
    try {
      const results = await db.select().from(contactCodes).where(
        and(
          eq(contactCodes.isActive, true),
          or(
            like(contactCodes.code, `%${query}%`),
            like(contactCodes.dealerName, `%${query}%`)
          )
        )
      ).orderBy(contactCodes.code).limit(10);
      
      return results;
    } catch (error) {
      console.error('Search contact codes error:', error);
      return [];
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
        realSalesPOS: contactCodeData.realSalesPOS || null,
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
      console.log(`💾 Updating contact code ${id} in database:`, contactCodeData);
      
      const [updatedContactCode] = await db.update(contactCodes)
        .set(contactCodeData)
        .where(eq(contactCodes.id, id))
        .returning();
      
      if (!updatedContactCode) {
        throw new Error('접점코드를 찾을 수 없습니다.');
      }
      
      console.log(`✅ Database update successful for contact code ${id}:`, updatedContactCode);
      return updatedContactCode;
    } catch (error) {
      console.error('Update contact code error:', error);
      throw new Error('접점코드 수정에 실패했습니다.');
    }
  }

  async deleteContactCode(id: number): Promise<void> {
    try {
      await db.update(contactCodes)
        .set({ isActive: 0 })
        .where(eq(contactCodes.id, id));
    } catch (error) {
      console.error('Delete contact code error:', error);
      throw new Error('접점코드 삭제에 실패했습니다.');
    }
  }
  
  // 통신사 관련 메서드
  async getCarriers(): Promise<Carrier[]> {
    try {
      const result = await db.select().from(carriers)
        .where(eq(carriers.isActive, true))
        .orderBy(carriers.displayOrder, carriers.name);
      
      // Boolean 값들을 JavaScript Boolean으로 변환하여 반환
      return result.map(carrier => ({
        ...carrier,
        supportNewCustomers: Boolean(carrier.supportNewCustomers),
        supportPortIn: Boolean(carrier.supportPortIn),
        isActive: Boolean(carrier.isActive),
        isWired: Boolean(carrier.isWired),
        documentRequired: Boolean(carrier.documentRequired),
        requireCustomerName: Boolean(carrier.requireCustomerName),
        requireCustomerPhone: Boolean(carrier.requireCustomerPhone),
        requireCustomerEmail: Boolean(carrier.requireCustomerEmail),
        requireContactCode: Boolean(carrier.requireContactCode),
        requireCarrier: Boolean(carrier.requireCarrier),
        requirePreviousCarrier: Boolean(carrier.requirePreviousCarrier),
        requireDocumentUpload: Boolean(carrier.requireDocumentUpload),
        requireBundleNumber: Boolean(carrier.requireBundleNumber),
        requireBundleCarrier: Boolean(carrier.requireBundleCarrier),
        allowNewCustomer: Boolean(carrier.allowNewCustomer),
        allowPortIn: Boolean(carrier.allowPortIn),
        requireDesiredNumber: Boolean(carrier.requireDesiredNumber)
      })) as Carrier[];
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



  async deleteCarrier(id: number): Promise<void> {
    try {
      await db.delete(carriers).where(eq(carriers.id, id));
    } catch (error) {
      console.error('Delete carrier error:', error);
      throw new Error('통신사 삭제에 실패했습니다.');
    }
  }

  // 서비스 플랜 관련 메서드
  async getServicePlans(): Promise<any[]> {
    try {
      const result = await db.select().from(servicePlans)
        .where(eq(servicePlans.isActive, true))
        .orderBy(servicePlans.carrier);
      
      // DB의 name 필드를 planName으로 매핑
      return result.map(plan => ({
        ...plan,
        planName: plan.name
      }));
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).returning();
      
      // DB의 name 필드를 planName으로 매핑하여 반환
      return {
        ...result,
        planName: result.name
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
        name: data.planName || data.name,
        carrier: data.carrier,
        planType: data.planType,
        dataAllowance: data.dataAllowance,
        monthlyFee: data.monthlyFee,
        isActive: data.isActive,
        updatedAt: new Date().toISOString(),
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
        planName: result.name
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
          updatedAt: new Date().toISOString(),
        })
        .where(eq(servicePlans.id, id));
    } catch (error) {
      console.error('Delete service plan error:', error);
      throw new Error('서비스 플랜 삭제에 실패했습니다.');
    }
  }
  
  async getServicePlansByCarrier(carrier: string): Promise<ServicePlan[]> {
    try {
      console.log('Service plans query for carrier:', carrier);
      const result = await db.select().from(servicePlans)
        .where(and(
          eq(servicePlans.carrier, carrier),
          eq(servicePlans.isActive, true)
        ))
        .orderBy(servicePlans.name);
      
      console.log(`Found ${result.length} service plans for carrier: ${carrier}`);
      
      // DB의 name 필드를 planName으로 매핑
      return result.map(plan => ({
        ...plan,
        planName: plan.name
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
          planName: result.name
        } as ServicePlan;
      }
      return undefined;
    } catch (error) {
      console.error('Find service plan by name and carrier error:', error);
      return undefined;
    }
  }
  
  // 부가서비스 관련 메서드
  async getAdditionalServices(): Promise<any[]> {
    try {
      const result = await db.select().from(additionalServices)
        .where(eq(additionalServices.isActive, true))
        .orderBy(additionalServices.carrier);
      return result;
    } catch (error) {
      console.error('Get additional services error:', error);
      return [];
    }
  }

  async createAdditionalService(data: any): Promise<AdditionalService> {
    try {
      const [result] = await db.insert(additionalServices).values(data).returning();
      return result;
    } catch (error) {
      console.error('Create additional service error:', error);
      throw new Error('부가서비스 생성에 실패했습니다.');
    }
  }

  async updateAdditionalService(id: number, data: any): Promise<AdditionalService> {
    try {
      const [result] = await db.update(additionalServices)
        .set(data)
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
          isActive: 0,
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
      const adminList = await db.select().from(admins).where(eq(admins.isActive, 1));
      
      // 영업과장 목록 조회 (sales_teams와 JOIN하여 팀 이름 가져오기)
      const salesManagerList = await db.select({
        id: salesManagers.id,
        username: salesManagers.username,
        name: salesManagers.managerName,
        createdAt: salesManagers.createdAt,
        teamId: salesManagers.teamId,
        teamName: salesTeams.teamName,
        isActive: salesManagers.isActive
      }).from(salesManagers)
        .leftJoin(salesTeams, eq(salesManagers.teamId, salesTeams.id))
        .where(eq(salesManagers.isActive, 1));

      // 근무자 목록 조회 (데이터베이스에서)
      const workersList = await db.select().from(users).where(eq(users.isActive, 1));

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
          affiliation: manager.teamName || '기타',
          createdAt: manager.createdAt
        })),
        ...workersList.map(worker => ({
          id: worker.id,
          username: worker.username,
          displayName: worker.name,
          userType: 'worker' as const,
          accountType: 'worker' as const,
          affiliation: '근무자',
          createdAt: worker.createdAt
        }))
      ];

      console.log('getUsers - Sales Manager List:', salesManagerList);

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
    if (userData.role) updateData.role = userData.role;
    if (userData.userType) updateData.userType = userData.userType;
    if (userData.team !== undefined) updateData.team = userData.team;
    
    console.log('UpdateUser - Attempting to update user:', id, 'with data:', updateData);
    
    // 먼저 users 테이블에서 업데이트 시도
    try {
      const userResult = await db.update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();
        
      if (userResult.length > 0) {
        console.log('UpdateUser - Successfully updated user in users table:', userResult[0]);
        return userResult[0];
      }
    } catch (error) {
      console.log('UpdateUser - Failed to update users table:', error);
    }
    
    // users 테이블에 없으면 관리자 테이블에서 업데이트 시도
    try {
      const adminUpdateData = { ...updateData };
      // admins 테이블에는 role, userType, team 필드가 없으므로 제거
      delete adminUpdateData.role;
      delete adminUpdateData.userType;
      delete adminUpdateData.team;
      
      const adminResult = await db.update(admins)
        .set(adminUpdateData)
        .where(eq(admins.id, id))
        .returning();
        
      if (adminResult.length > 0) {
        console.log('UpdateUser - Successfully updated user in admins table:', adminResult[0]);
        return adminResult[0];
      }
    } catch (error) {
      console.log('UpdateUser - Failed to update admins table:', error);
    }
    
    throw new Error('사용자를 찾을 수 없습니다.');
  }

  async deleteUser(id: number): Promise<void> {
    try {
      console.log('Attempting to delete user with id:', id);
      
      // 1. users 테이블에서 삭제 시도 (일반 사용자)
      const userResult = await db.delete(users)
        .where(eq(users.id, id))
        .returning();
        
      if (userResult.length > 0) {
        console.log('Deleted user from users table:', userResult[0]);
        return;
      }
      
      // 2. 관리자 삭제 시도 (hard delete)
      const adminResult = await db.delete(admins)
        .where(eq(admins.id, id))
        .returning();
        
      if (adminResult.length > 0) {
        console.log('Deleted admin user:', adminResult[0]);
        return;
      }
      
      // 3. 영업과장 삭제 시도 (soft delete)
      const managerResult = await db.update(salesManagers)
        .set({ isActive: false })
        .where(eq(salesManagers.id, id))
        .returning();
        
      if (managerResult.length > 0) {
        console.log('Deactivated sales manager:', managerResult[0]);
        return;
      }
      
      // 4. 근무자는 인메모리 저장소에서 삭제
      if (workerStore.has(id)) {
        workerStore.delete(id);
        console.log('Deleted worker from memory store');
        return;
      }
      
      throw new Error('사용자를 찾을 수 없습니다.');
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  }
  
  async getDocuments(filters?: {
    status?: string;
    activationStatus?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    carrier?: string;
    dealerId?: number;
    workerId?: number;
  }): Promise<any[]> {
    try {
      // 기본 쿼리로 모든 문서 조회 (orderBy 제거)
      let result = await db.select().from(documents);
      
      // 필터 적용 (메모리에서 처리)
      if (filters) {
        if (filters.status) {
          result = result.filter(doc => doc.status === filters.status);
        }
        
        if (filters.activationStatus) {
          const statuses = filters.activationStatus.split(',').map(s => s.trim());
          result = result.filter(doc => {
            const docStatus = doc.activationStatus || '대기'; // 기본값을 '대기'로 설정
            return statuses.includes(docStatus);
          });
        }
        
        if (filters.search) {
          result = result.filter(doc => 
            doc.customerName?.includes(filters.search!) ||
            doc.documentNumber?.includes(filters.search!) ||
            doc.contactCode?.includes(filters.search!) ||
            (doc.customerPhone && doc.customerPhone.includes(filters.search!))
          );
        }
        
        if (filters.contactCode) {
          result = result.filter(doc => 
            doc.contactCode?.includes(filters.contactCode!) ||
            doc.storeName?.includes(filters.contactCode!)
          );
        }
        
        if (filters.carrier) {
          result = result.filter(doc => doc.carrier === filters.carrier);
        }
        
        if (filters.dealerId) {
          result = result.filter(doc => doc.dealerId === filters.dealerId);
        }
        
        if (filters.workerId) {
          result = result.filter(doc => doc.activatedBy === filters.workerId);
        }
        
        if (filters.startDate) {
          const startDate = new Date(filters.startDate);
          result = result.filter(doc => new Date(doc.uploadedAt) >= startDate);
        }
        
        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          result = result.filter(doc => new Date(doc.uploadedAt) <= endDate);
        }
      }
      
      console.log('Documents found:', result.length);
      
      // 날짜순 정렬 (최신순)
      result = result.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
      
      // 각 문서에 대해 서비스 플랜명과 판매점명 조회
      const documentsWithDetails = await Promise.all(
        result.map(async (doc) => {
          let servicePlanName = null;
          let storeName = '미확인';
          
          // servicePlanId가 있으면 서비스 플랜명 조회
          if (doc.servicePlanId) {
            try {
              // 문자열 ID를 숫자로 변환
              const planId = typeof doc.servicePlanId === 'string' 
                ? parseFloat(doc.servicePlanId) 
                : doc.servicePlanId;
              
              if (!isNaN(planId)) {
                const [servicePlan] = await db.select().from(servicePlans)
                  .where(eq(servicePlans.id, Math.floor(planId)))
                  .limit(1);
                
                if (servicePlan) {
                  servicePlanName = servicePlan.name;
                }
              }
            } catch (error) {
              console.error('Error fetching service plan name for doc', doc.id, ':', error);
            }
          }
          
          // contactCode가 있으면 판매점명 조회
          if (doc.contactCode) {
            try {
              const [contactCodeResult] = await db.select()
                .from(contactCodes)
                .where(eq(contactCodes.code, doc.contactCode))
                .limit(1);
              
              if (contactCodeResult) {
                storeName = contactCodeResult.dealerName;
              }
            } catch (error) {
              console.error('Error fetching store name for doc', doc.id, ':', error);
            }
          }
          
          return {
            id: doc.id,
            documentNumber: doc.documentNumber,
            customerName: doc.customerName,
            customerPhone: doc.customerPhone || '',
            contactCode: doc.contactCode,
            carrier: doc.carrier,
            previousCarrier: doc.previousCarrier,
            customerType: doc.customerType,
            desiredNumber: doc.desiredNumber,
            status: doc.status,
            activationStatus: doc.activationStatus,
            uploadedAt: doc.uploadedAt,
            updatedAt: doc.updatedAt,
            activatedAt: doc.activatedAt,
            notes: doc.notes,
            dealerId: doc.dealerId,
            userId: doc.userId,
            assignedWorkerId: doc.assignedWorkerId,
            filePath: doc.filePath,
            fileName: doc.fileName,
            fileSize: doc.fileSize,
            dealerNotes: doc.dealerNotes,
            subscriptionNumber: doc.subscriptionNumber,
            servicePlanId: doc.servicePlanId,
            deviceModel: doc.deviceModel,
            simNumber: doc.simNumber,
            settlementAmount: doc.settlementAmount,
            activatedBy: doc.activatedBy,
            activatedByName: doc.activatedByName,
            cancelledBy: doc.cancelledBy,
            assignedAt: doc.assignedAt,
            dealerName: '미확인',
            servicePlanName: servicePlanName,
            storeName: storeName
          };
        })
      );
      
      return documentsWithDetails;
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

  async findDuplicateDocuments(params: {
    customerName: string;
    customerPhone: string;
    carrier: string;
    storeName: string;
    contactCode: string;
    monthStart: string;
    monthEnd: string;
  }): Promise<any[]> {
    try {
      // 모든 문서를 가져와서 메모리에서 필터링
      const allDocs = await db.select().from(documents);
      const startDate = new Date(params.monthStart);
      const endDate = new Date(params.monthEnd);
      
      const duplicates = allDocs.filter(doc => 
        doc.customerName === params.customerName &&
        doc.customerPhone === params.customerPhone &&
        doc.carrier === params.carrier &&
        new Date(doc.uploadedAt) >= startDate &&
        new Date(doc.uploadedAt) <= endDate
      );
      
      return duplicates;
    } catch (error) {
      console.error('Error finding duplicate documents:', error);
      return [];
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
        updatedAt: new Date().toISOString()
      };

      // 상태별 특별 처리
      if (data.activationStatus === '개통') {
        updateData.activatedAt = new Date().toISOString();
        updateData.activatedBy = workerId || data.activatedBy;
        updateData.activatedByName = data.activatedByName;
        updateData.servicePlanId = data.servicePlanId;
        updateData.servicePlanName = data.servicePlanName;
        updateData.additionalServiceIds = data.additionalServiceIds ? JSON.stringify(data.additionalServiceIds) : null;
        updateData.registrationFee = data.registrationFee;
        updateData.registrationFeePrepaid = data.registrationFeePrepaid ? 1 : 0;
        updateData.registrationFeePostpaid = data.registrationFeePostpaid ? 1 : 0;
        updateData.registrationFeeInstallment = data.registrationFeeInstallment ? 1 : 0;
        updateData.simFeePrepaid = data.simFeePrepaid ? 1 : 0;
        updateData.simFeePostpaid = data.simFeePostpaid ? 1 : 0;
        updateData.bundleApplied = data.bundleApplied ? 1 : 0;
        updateData.bundleNotApplied = data.bundleNotApplied ? 1 : 0;
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
        updateData.assignedAt = new Date().toISOString();
      } else if (data.activationStatus === '폐기') {
        updateData.discardReason = data.discardReason;
      } else if (data.activationStatus === '보완필요') {
        updateData.supplementRequired = data.supplementRequired;
        updateData.supplementNotes = data.supplementNotes;
        updateData.supplementRequiredBy = workerId;
        updateData.supplementRequiredAt = new Date().toISOString();
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
        updatedAt: new Date().toISOString()
      };

      // 서비스 플랜 관련 데이터 업데이트
      if (data.servicePlanId !== undefined) updateData.servicePlanId = data.servicePlanId;
      if (data.additionalServiceIds !== undefined) updateData.additionalServiceIds = Array.isArray(data.additionalServiceIds) ? JSON.stringify(data.additionalServiceIds) : data.additionalServiceIds;
      if (data.registrationFeePrepaid !== undefined) updateData.registrationFeePrepaid = data.registrationFeePrepaid ? 1 : 0;
      if (data.registrationFeePostpaid !== undefined) updateData.registrationFeePostpaid = data.registrationFeePostpaid ? 1 : 0;
      if (data.registrationFeeInstallment !== undefined) updateData.registrationFeeInstallment = data.registrationFeeInstallment ? 1 : 0;
      if (data.simFeePrepaid !== undefined) updateData.simFeePrepaid = data.simFeePrepaid ? 1 : 0;
      if (data.simFeePostpaid !== undefined) updateData.simFeePostpaid = data.simFeePostpaid ? 1 : 0;
      if (data.bundleApplied !== undefined) updateData.bundleApplied = data.bundleApplied ? 1 : 0;
      if (data.bundleNotApplied !== undefined) updateData.bundleNotApplied = data.bundleNotApplied ? 1 : 0;
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
      await db.update(settlementUnitPrices)
        .set({ 
          isActive: 0, // SQLite에서는 boolean을 0/1로 처리
          effectiveUntil: new Date().toISOString()
        })
        .where(and(
          eq(settlementUnitPrices.servicePlanId, data.servicePlanId),
          eq(settlementUnitPrices.isActive, 1)
        ));

      // 새 단가 등록
      const [created] = await db.insert(settlementUnitPrices)
        .values({
          servicePlanId: data.servicePlanId,
          newCustomerPrice: data.newCustomerPrice,
          portInPrice: data.portInPrice,
          effectiveFrom: data.effectiveFrom ? data.effectiveFrom.toISOString() : new Date().toISOString(),
          memo: data.memo || '',
          createdBy: data.createdBy,
          isActive: 1 // SQLite에서는 boolean을 0/1로 처리
        })
        .returning();
      
      // Add carrier and servicePlanName by joining
      const [servicePlan] = await db.select().from(servicePlans).where(eq(servicePlans.id, data.servicePlanId));
      
      // 정산단가 생성 시에는 기존 문서를 업데이트하지 않음 (새로운 단가는 향후 개통건부터 적용)
      
      return {
        id: created.id,
        servicePlanId: created.servicePlanId,
        newCustomerPrice: created.newCustomerPrice,
        portInPrice: created.portInPrice,
        isActive: created.isActive,
        effectiveFrom: created.effectiveFrom,
        effectiveUntil: created.effectiveUntil,
        memo: created.memo,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        createdBy: created.createdBy,
        carrier: servicePlan?.carrier || '',
        servicePlanName: servicePlan?.planName || ''
      };
    } catch (error) {
      console.error('Error creating settlement unit price:', error);
      throw new Error('정산단가 생성에 실패했습니다.');
    }
  }

  async getActiveSettlementUnitPrices(): Promise<any[]> {
    try {
      const result = await db.all(sql`
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
        WHERE sup.is_active = 1
        ORDER BY sup.created_at DESC
      `);

      return result.map((row: any) => ({
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

  // 해당 요금제의 개통완료 문서들의 정산금액을 새로운 단가로 업데이트
  async updateSettlementAmountsForServicePlan(servicePlanId: number, newCustomerPrice: number, portInPrice: number): Promise<void> {
    try {
      // 해당 요금제의 개통완료 문서들 조회 (LIKE 사용하여 부동소수점 문제 해결)
      const result = await db.all(sql`
        SELECT id, previous_carrier, carrier, customer_name
        FROM documents 
        WHERE (service_plan_id = ${servicePlanId.toString()} OR service_plan_id LIKE ${servicePlanId + '.%'})
        AND activation_status = '개통'
      `);

      console.log(`Found ${result.length} completed documents for service plan ${servicePlanId}`);

      // 각 문서의 정산금액 업데이트
      for (const doc of result) {
        // 번호이동 여부 확인
        const isPortIn = doc.previous_carrier && doc.previous_carrier !== doc.carrier;
        const settlementAmount = isPortIn ? portInPrice : newCustomerPrice;

        // 정산금액 업데이트
        await db.run(sql`
          UPDATE documents 
          SET settlement_amount = ${settlementAmount}, updated_at = ${new Date().toISOString()}
          WHERE id = ${doc.id}
        `);

        console.log(`Updated settlement amount for document ${doc.id} (${doc.customer_name}): ${settlementAmount}`);
      }
    } catch (error) {
      console.error('Error updating settlement amounts for service plan:', error);
    }
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
  
  // 영업과장 소속 판매점 조회 유틸리티 메서드
  async getSalesManagerDealerCodes(salesManagerId: number): Promise<string[]> {
    try {
      // Drizzle ORM을 사용한 조회
      const result = await db.select({ code: contactCodes.code })
        .from(contactCodes)
        .where(eq(contactCodes.salesManagerId, salesManagerId));
      
      const codes = result.map((r: any) => r.code);
      console.log('Found contact codes for manager', salesManagerId, ':', codes);
      return codes;
    } catch (error) {
      console.error('Get sales manager dealer codes error:', error);
      return [];
    }
  }

  // 대시보드 통계 메서드들
  async getDashboardStats(dealerId?: number, userId?: number, userType?: string, startDate?: string, endDate?: string, salesManagerId?: number): Promise<any> {
    try {
      const today = new Date();
      const todayStart = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0') + ' 00:00:00';
      const todayEnd = today.getFullYear() + '-' + 
        String(today.getMonth() + 1).padStart(2, '0') + '-' + 
        String(today.getDate()).padStart(2, '0') + ' 23:59:59';

      // 당일 전체 접수 건수
      const todayTotal = await db.select({ count: sql`count(*)` })
        .from(documents)
        .where(
          and(
            gte(documents.uploadedAt, todayStart),
            lte(documents.uploadedAt, todayEnd)
          )
        );

      // 당일 접수 중 폐기/취소된 건수
      const todayDiscarded = await db.select({ count: sql`count(*)` })
        .from(documents)
        .where(
          and(
            gte(documents.uploadedAt, todayStart),
            lte(documents.uploadedAt, todayEnd),
            inArray(documents.activationStatus, ['폐기', '취소'])
          )
        );

      // 당일 개통 완료 건수 (신규/번호이동 구분) - ISO 문자열 형식으로 수정
      const todayStartISO = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const todayEndISO = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

      const todayCompletions = await db.select({
        customerType: documents.customerType,
        count: sql`count(*)`
      })
        .from(documents)
        .where(
          and(
            gte(documents.activatedAt, todayStartISO),
            lt(documents.activatedAt, todayEndISO),
            eq(documents.activationStatus, '개통')
          )
        )
        .groupBy(documents.customerType);

      // 전체 통계 (상태별 세부 분류)
      const totalStats = await db.select({
        total: sql`count(*)`,
        pending: sql`count(case when activation_status = '대기' then 1 end)`,
        inProgress: sql`count(case when activation_status = '진행중' then 1 end)`,
        workRequest: sql`count(case when activation_status = '업무요청중' then 1 end)`,
        activated: sql`count(case when activation_status = '개통' then 1 end)`,
        cancelled: sql`count(case when activation_status = '취소' then 1 end)`,
        needsReview: sql`count(case when activation_status = '보완필요' then 1 end)`,
        otherCompleted: sql`count(case when activation_status = '기타완료' then 1 end)`,
        discarded: sql`count(case when activation_status = '폐기' then 1 end)`
      }).from(documents);

      return {
        totalDocuments: parseInt(String(totalStats[0]?.total || 0)),
        pendingActivations: parseInt(String(totalStats[0]?.pending || 0)),
        inProgressCount: parseInt(String(totalStats[0]?.inProgress || 0)),
        workRequestCount: parseInt(String(totalStats[0]?.workRequest || 0)),
        activatedCount: parseInt(String(totalStats[0]?.activated || 0)),
        canceledCount: parseInt(String(totalStats[0]?.cancelled || 0)),
        needsReviewCount: parseInt(String(totalStats[0]?.needsReview || 0)),
        otherCompletedCount: parseInt(String(totalStats[0]?.otherCompleted || 0)),
        discardedCount: parseInt(String(totalStats[0]?.discarded || 0)),
        todaySubmissions: parseInt(String(todayTotal[0]?.count || 0)),
        todayDiscarded: parseInt(String(todayDiscarded[0]?.count || 0)),
        todayCompletions: {
          new: parseInt(String(todayCompletions.find(c => c.customerType === 'new')?.count || 0)),
          portIn: parseInt(String(todayCompletions.find(c => c.customerType === 'port-in')?.count || 0)),
          total: todayCompletions.reduce((sum, c) => sum + parseInt(String(c.count)), 0)
        }
      };
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      return {
        totalDocuments: 0,
        pendingActivations: 0,
        inProgressCount: 0,
        workRequestCount: 0,
        activatedCount: 0,
        canceledCount: 0,
        needsReviewCount: 0,
        otherCompletedCount: 0,
        discardedCount: 0,
        todaySubmissions: 0,
        todayDiscarded: 0,
        todayCompletions: { new: 0, portIn: 0, total: 0 }
      };
    }
  }
  
  async getTodayStats(workerId?: number, salesManagerId?: number): Promise<any> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
      console.log('Today stats for date:', today, 'workerId:', workerId, 'salesManagerId:', salesManagerId);

      // 영업과장의 판매점 코드 조회 (필터링용)
      let dealerCodes: string[] = [];
      if (salesManagerId) {
        dealerCodes = await this.getSalesManagerDealerCodes(salesManagerId);
        console.log('Sales manager dealer codes:', dealerCodes);
      }

      // 당일 접수 건수 - 영업과장인 경우 해당 판매점만, 근무자/관리자는 기존 로직
      let todaySubmissions;
      if (salesManagerId && dealerCodes.length > 0) {
        // 영업과장은 자신이 담당하는 판매점 접점코드에 해당하는 문서만 조회
        const todaySubmissionsQuery = await db.select({ count: sql`count(*)` })
          .from(documents)
          .where(and(
            sql`date(uploaded_at) = date('now')`,
            inArray(documents.contactCode, dealerCodes)
          ));
        todaySubmissions = {rows: todaySubmissionsQuery};
        console.log('Sales manager today submissions query result:', todaySubmissionsQuery);
      } else if (salesManagerId && dealerCodes.length === 0) {
        // 접점코드가 없는 영업과장은 아무 데이터도 조회할 수 없음
        todaySubmissions = {rows: [{count: 0}]};
      } else {
        const result = await db.select({ count: sql`count(*)` })
          .from(documents)
          .where(sql`date(uploaded_at) = date('now')`);
        todaySubmissions = {rows: result};
      }

      // 당일 개통 완료 건수 - 근무자는 자신이 처리한 건만, 영업과장은 해당 판매점만, 관리자는 전체
      let todayCompletions;
      if (workerId) {
        const result = await db.select({ count: sql`count(*)` })
          .from(documents)
          .where(and(
            sql`date(activated_at) = date('now')`,
            eq(documents.activationStatus, '개통'),
            eq(documents.activatedBy, workerId)
          ));
        todayCompletions = {rows: result};
      } else if (salesManagerId && dealerCodes.length > 0) {
        const todayCompletionsQuery = await db.select({ count: sql`count(*)` })
          .from(documents)
          .where(and(
            sql`date(activated_at) = date('now')`,
            eq(documents.activationStatus, '개통'),
            inArray(documents.contactCode, dealerCodes)
          ));
        todayCompletions = {rows: todayCompletionsQuery};
        console.log('Sales manager today completions query result:', todayCompletionsQuery);
      } else if (salesManagerId && dealerCodes.length === 0) {
        todayCompletions = {rows: [{count: 0}]};
      } else {
        const result = await db.select({ count: sql`count(*)` })
          .from(documents)
          .where(and(
            sql`date(activated_at) = date('now')`,
            eq(documents.activationStatus, '개통')
          ));
        todayCompletions = {rows: result};
      }

      // 기타완료 건수 - 근무자는 자신이 처리한 건만, 영업과장은 해당 판매점만, 관리자는 전체
      let todayOtherCompleted;
      if (workerId) {
        const result = await db.select({ count: sql`count(*)` })
          .from(documents)
          .where(and(
            sql`date(activated_at) = date('now')`,
            eq(documents.activationStatus, '기타완료'),
            eq(documents.activatedBy, workerId)
          ));
        todayOtherCompleted = {rows: result};
      } else if (salesManagerId && dealerCodes.length > 0) {
        const todayOtherCompletedQuery = await db.select({ count: sql`count(*)` })
          .from(documents)
          .where(and(
            sql`date(activated_at) = date('now')`,
            eq(documents.activationStatus, '기타완료'),
            inArray(documents.contactCode, dealerCodes)
          ));
        todayOtherCompleted = {rows: todayOtherCompletedQuery};
        console.log('Sales manager today other completed query result:', todayOtherCompletedQuery);
      } else if (salesManagerId && dealerCodes.length === 0) {
        todayOtherCompleted = {rows: [{count: 0}]};
      } else {
        const result = await db.select({ count: sql`count(*)` })
          .from(documents)
          .where(and(
            sql`date(activated_at) = date('now')`,
            eq(documents.activationStatus, '기타완료')
          ));
        todayOtherCompleted = {rows: result};
      }

      // 당일 정산 금액 (근무자별 필터링)
      let todayRevenue;
      if (workerId) {
        todayRevenue = await db.select({
          total: sql`sum(case when settlement_amount is not null then settlement_amount else 0 end)`
        })
          .from(documents)
          .where(
            and(
              sql`date(activated_at) = date('now')`,
              eq(documents.activationStatus, '개통'),
              eq(documents.activatedBy, workerId)
            )
          );
      } else {
        todayRevenue = await db.select({
          total: sql`sum(case when settlement_amount is not null then settlement_amount else 0 end)`
        })
          .from(documents)
          .where(
            and(
              sql`date(activated_at) = date('now')`,
              eq(documents.activationStatus, '개통')
            )
          );
      }

      const result = {
        todaySubmissions: parseInt(String(todaySubmissions.rows?.[0]?.count || 0)),
        todayCompletions: parseInt(String(todayCompletions.rows?.[0]?.count || 0)),
        todayOtherCompleted: parseInt(String(todayOtherCompleted.rows?.[0]?.count || 0)),
        todayRevenue: parseInt(String(todayRevenue[0]?.total || 0))
      };

      console.log('Today stats result:', result);
      return result;
    } catch (error) {
      console.error('Get today stats error:', error);
      return {
        todaySubmissions: 0,
        todayCompletions: 0,
        todayOtherCompleted: 0,
        todayRevenue: 0
      };
    }
  }
  
  async getWorkerStats(startDate?: string, endDate?: string): Promise<any[]> {
    try {
      console.log('Get worker stats with dates:', startDate, endDate);
      
      let whereConditions = [
        eq(documents.activationStatus, '개통'),
        isNotNull(documents.activatedByName)
      ];
      
      if (startDate && endDate) {
        whereConditions.push(
          and(
            sql`date(activated_at) >= ${startDate}`,
            sql`date(activated_at) <= ${endDate}`
          )
        );
      } else if (startDate) {
        whereConditions.push(sql`date(activated_at) >= ${startDate}`);
      } else if (endDate) {
        whereConditions.push(sql`date(activated_at) <= ${endDate}`);
      }

      // activated_by_name을 기준으로 통계 집계 (더 정확함)
      const workerStats = await db.select({
        workerName: documents.activatedByName,
        workerId: documents.activatedBy,
        count: sql`count(*)`
      })
        .from(documents)
        .where(and(...whereConditions))
        .groupBy(documents.activatedByName)
        .orderBy(sql`count(*) DESC`);

      // 결과 정리
      const result = [];
      for (const stat of workerStats) {
        if (stat.workerName) {
          result.push({
            workerId: stat.workerId,
            workerName: stat.workerName,
            count: parseInt(String(stat.count || 0))
          });
        }
      }

      console.log('Worker stats result:', result);
      return result;
    } catch (error) {
      console.error('Get worker stats error:', error);
      return [];
    }
  }

  // 당월 개통현황 조회 (근무자별)
  async getMonthlyActivationStats(workerId?: number, salesManagerId?: number): Promise<any> {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const monthStart = `${year}-${month.toString().padStart(2, '0')}-01`;
      
      console.log('Monthly activation stats for:', monthStart, 'workerId:', workerId, 'salesManagerId:', salesManagerId);

      // 영업과장의 판매점 코드 조회 (필터링용)
      let dealerCodes: string[] = [];
      if (salesManagerId) {
        dealerCodes = await this.getSalesManagerDealerCodes(salesManagerId);
        console.log('Sales manager dealer codes for monthly activation stats:', dealerCodes);
      }

      // 월별 통신사별 개통 현황
      let conditions = [
        sql`date(activated_at) >= ${monthStart}`,
        sql`date(activated_at) < date(${monthStart}, '+1 month')`,
        eq(documents.activationStatus, '개통')
      ];

      if (workerId) {
        // 근무자: 자신이 처리한 건만 조회
        conditions.push(eq(documents.activatedBy, workerId));
      } else if (salesManagerId && dealerCodes.length > 0) {
        // 영업과장: 해당 판매점만 조회
        conditions.push(inArray(documents.dealerCode, dealerCodes));
      }

      const carrierStats = await db.select({
        carrier: documents.carrier,
        count: sql`count(*)`
      })
        .from(documents)
        .where(and(...conditions))
        .groupBy(documents.carrier);

      // 결과를 배열로 변환하고 카운트를 숫자로 변환
      const result = carrierStats.map(stat => ({
        carrier: stat.carrier || '미분류',
        count: parseInt(String(stat.count || 0))
      }));

      console.log('Monthly activation stats result:', result);
      return result;
    } catch (error) {
      console.error('Get monthly activation stats error:', error);
      return [];
    }
  }

  async getMonthlyStatusStats(workerId?: number, salesManagerId?: number): Promise<any> {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const monthStart = `${year}-${month.toString().padStart(2, '0')}-01`;
      
      console.log('Monthly status stats for:', monthStart, 'workerId:', workerId, 'salesManagerId:', salesManagerId);

      // 영업과장의 판매점 코드 조회 (필터링용)
      let dealerCodes: string[] = [];
      if (salesManagerId) {
        dealerCodes = await this.getSalesManagerDealerCodes(salesManagerId);
        console.log('Sales manager dealer codes for monthly status stats:', dealerCodes);
      }

      let monthlyStats;
      
      if (salesManagerId && dealerCodes.length > 0) {
        // 영업과장인 경우: 담당 판매점만 조회
        let query = `
          SELECT 
            count(*) as total,
            count(case when activation_status = '대기' then 1 end) as pending,
            count(case when activation_status = '진행중' then 1 end) as inProgress,
            count(case when activation_status = '업무요청중' then 1 end) as workRequest,
            count(case when activation_status = '개통' then 1 end) as activated,
            count(case when activation_status = '취소' then 1 end) as cancelled,
            count(case when activation_status = '보완필요' then 1 end) as needsReview,
            count(case when activation_status = '기타완료' then 1 end) as otherCompleted,
            count(case when activation_status = '폐기' then 1 end) as discarded
          FROM documents 
          WHERE date(uploaded_at) >= '${monthStart}'
            AND date(uploaded_at) < date('${monthStart}', '+1 month')
            AND contact_code IN (${dealerCodes.map(code => `'${code.replace(/'/g, "''")}'`).join(',')})
        `;
        
        const result = await db.all(sql.raw(query));
        monthlyStats = result;
      } else if (salesManagerId && dealerCodes.length === 0) {
        // 영업과장인데 담당 판매점이 없는 경우
        monthlyStats = [{
          total: 0, pending: 0, inProgress: 0, workRequest: 0,
          activated: 0, cancelled: 0, needsReview: 0, otherCompleted: 0, discarded: 0
        }];
      } else {
        // 관리자나 근무자인 경우: 전체 조회
        let conditions = [
          sql`date(uploaded_at) >= ${monthStart}`,
          sql`date(uploaded_at) < date(${monthStart}, '+1 month')`
        ];

        // 근무자인 경우 자신이 처리한 건만 조회 (완료된 건들은 activatedBy로 필터링)
        if (workerId) {
          conditions.push(
            or(
              // 완료되지 않은 상태 (모든 근무자가 볼 수 있음)
              eq(documents.activationStatus, '대기'),
              eq(documents.activationStatus, '진행중'),
              eq(documents.activationStatus, '업무요청중'),
              eq(documents.activationStatus, '보완필요'),
              // 완료된 상태는 자신이 처리한 건만
              and(
                or(
                  eq(documents.activationStatus, '개통'),
                  eq(documents.activationStatus, '취소'),
                  eq(documents.activationStatus, '기타완료'),
                  eq(documents.activationStatus, '폐기')
                ),
                eq(documents.activatedBy, workerId)
              )
            )
          );
        }

        monthlyStats = await db.select({
          total: sql`count(*)`,
          pending: sql`count(case when activation_status = '대기' then 1 end)`,
          inProgress: sql`count(case when activation_status = '진행중' then 1 end)`,
          workRequest: sql`count(case when activation_status = '업무요청중' then 1 end)`,
          activated: sql`count(case when activation_status = '개통' then 1 end)`,
          cancelled: sql`count(case when activation_status = '취소' then 1 end)`,
          needsReview: sql`count(case when activation_status = '보완필요' then 1 end)`,
          otherCompleted: sql`count(case when activation_status = '기타완료' then 1 end)`,
          discarded: sql`count(case when activation_status = '폐기' then 1 end)`
        })
        .from(documents)
        .where(and(...conditions));
      }

      const result = {
        totalDocuments: parseInt(String(monthlyStats[0]?.total || 0)),
        pendingActivations: parseInt(String(monthlyStats[0]?.pending || 0)),
        inProgressCount: parseInt(String(monthlyStats[0]?.inProgress || 0)),
        workRequestCount: parseInt(String(monthlyStats[0]?.workRequest || 0)),
        activatedCount: parseInt(String(monthlyStats[0]?.activated || 0)),
        canceledCount: parseInt(String(monthlyStats[0]?.cancelled || 0)),
        needsReviewCount: parseInt(String(monthlyStats[0]?.needsReview || 0)),
        otherCompletedCount: parseInt(String(monthlyStats[0]?.otherCompleted || 0)),
        discardedCount: parseInt(String(monthlyStats[0]?.discarded || 0))
      };

      console.log('Monthly status stats result:', result);
      return result;
    } catch (error) {
      console.error('Get monthly status stats error:', error);
      return {
        totalDocuments: 0,
        pendingActivations: 0,
        inProgressCount: 0,
        workRequestCount: 0,
        activatedCount: 0,
        canceledCount: 0,
        needsReviewCount: 0,
        otherCompletedCount: 0,
        discardedCount: 0
      };
    }
  }
  
  async getCarrierStats(startDate?: string, endDate?: string, salesManagerId?: number): Promise<any[]> {
    try {
      console.log('Get carrier stats with dates:', startDate, endDate, 'salesManagerId:', salesManagerId);
      
      // 영업과장의 판매점 코드 조회 (필터링용)
      let dealerCodes: string[] = [];
      if (salesManagerId) {
        dealerCodes = await this.getSalesManagerDealerCodes(salesManagerId);
        console.log('Sales manager dealer codes for carrier stats:', dealerCodes);
      }
      
      let carrierStats;
      
      if (salesManagerId && dealerCodes.length > 0) {
        // 영업과장인 경우: 담당 판매점의 개통 완료 문서만 조회하며 판매점 정보도 포함
        let query = `
          SELECT 
            carrier, 
            contact_code,
            count(*) as count 
          FROM documents 
          WHERE activation_status = '개통'
            AND contact_code IN (${dealerCodes.map(code => `'${code.replace(/'/g, "''")}'`).join(',')})
        `;
        
        if (startDate && endDate) {
          query += ` AND date(activated_at) >= '${startDate}' AND date(activated_at) <= '${endDate}'`;
        } else if (startDate) {
          query += ` AND date(activated_at) >= '${startDate}'`;
        } else if (endDate) {
          query += ` AND date(activated_at) <= '${endDate}'`;
        }
        
        query += ` GROUP BY carrier, contact_code ORDER BY carrier, count(*) DESC`;
        
        carrierStats = await db.all(sql.raw(query));
      } else if (salesManagerId && dealerCodes.length === 0) {
        // 영업과장인데 담당 판매점이 없는 경우
        carrierStats = [];
      } else {
        // 관리자나 근무자인 경우: 전체 개통 완료 문서 조회
        let whereConditions = [eq(documents.activationStatus, '개통')];
        
        if (startDate && endDate) {
          whereConditions.push(
            and(
              sql`date(activated_at) >= ${startDate}`,
              sql`date(activated_at) <= ${endDate}`
            )
          );
        } else if (startDate) {
          whereConditions.push(sql`date(activated_at) >= ${startDate}`);
        } else if (endDate) {
          whereConditions.push(sql`date(activated_at) <= ${endDate}`);
        }

        carrierStats = await db.select({
          carrier: documents.carrier,
          count: sql`count(*)`
        })
          .from(documents)
          .where(and(...whereConditions))
          .groupBy(documents.carrier)
          .orderBy(sql`count(*) DESC`);
      }

      // 신규/번호이동별 세부 통계도 함께 조회
      let carrierDetailStats;
      
      if (salesManagerId && dealerCodes.length > 0) {
        // 영업과장인 경우: 담당 판매점의 개통 완료 문서만 조회하여 신규/번호이동 구분
        let detailQuery = `
          SELECT 
            carrier,
            contact_code,
            customer_type,
            count(*) as count 
          FROM documents 
          WHERE activation_status = '개통'
            AND contact_code IN (${dealerCodes.map(code => `'${code.replace(/'/g, "''")}'`).join(',')})
        `;
        
        if (startDate && endDate) {
          detailQuery += ` AND date(activated_at) >= '${startDate}' AND date(activated_at) <= '${endDate}'`;
        } else if (startDate) {
          detailQuery += ` AND date(activated_at) >= '${startDate}'`;
        } else if (endDate) {
          detailQuery += ` AND date(activated_at) <= '${endDate}'`;
        }
        
        detailQuery += ` GROUP BY carrier, contact_code, customer_type ORDER BY carrier, contact_code, customer_type`;
        
        carrierDetailStats = await db.all(sql.raw(detailQuery));
      } else if (salesManagerId && dealerCodes.length === 0) {
        carrierDetailStats = [];
      } else {
        // 관리자나 근무자인 경우: 전체 개통 완료 문서 조회
        let whereConditions = [eq(documents.activationStatus, '개통')];
        
        if (startDate && endDate) {
          whereConditions.push(
            and(
              sql`date(activated_at) >= ${startDate}`,
              sql`date(activated_at) <= ${endDate}`
            )
          );
        } else if (startDate) {
          whereConditions.push(sql`date(activated_at) >= ${startDate}`);
        } else if (endDate) {
          whereConditions.push(sql`date(activated_at) <= ${endDate}`);
        }

        carrierDetailStats = await db.select({
          carrier: documents.carrier,
          customer_type: documents.customerType,
          count: sql`count(*)`
        })
          .from(documents)
          .where(and(...whereConditions))
          .groupBy(documents.carrier, documents.customerType)
          .orderBy(documents.carrier, documents.customerType);
      }
      
      // 통신사별로 신규/번호이동 통계를 정리하고 판매점별 상세 정보 포함
      const carrierMap = new Map();
      
      // 먼저 carrierStats에서 통신사별 판매점 정보를 구성
      carrierStats.forEach((stat: any) => {
        const carrier = stat.carrier || '미분류';
        const contactCode = stat.contact_code;
        const count = parseInt(String(stat.count || 0));
        
        if (!carrierMap.has(carrier)) {
          carrierMap.set(carrier, {
            carrier,
            newCustomer: 0,
            portIn: 0,
            total: 0,
            dealers: []
          });
        }
        
        const carrierData = carrierMap.get(carrier);
        carrierData.total += count;
        
        // 판매점별 정보 초기화
        carrierData.dealers.push({
          contactCode,
          newCustomer: 0,
          portIn: 0,
          total: count
        });
      });
      
      // 그 다음 상세 통계에서 신규/번호이동 정보를 업데이트
      carrierDetailStats.forEach((stat: any) => {
        const carrier = stat.carrier || '미분류';
        const contactCode = stat.contact_code;
        const customerType = stat.customer_type;
        const count = parseInt(String(stat.count || 0));
        
        if (carrierMap.has(carrier)) {
          const carrierData = carrierMap.get(carrier);
          
          // 통신사 전체 통계 업데이트
          if (customerType === 'new') {
            carrierData.newCustomer += count;
          } else if (customerType === 'port-in') {
            carrierData.portIn += count;
          }
          
          // 해당 판매점의 상세 정보 업데이트
          const dealerInfo = carrierData.dealers.find((d: any) => d.contactCode === contactCode);
          if (dealerInfo) {
            if (customerType === 'new') {
              dealerInfo.newCustomer += count;
            } else if (customerType === 'port-in') {
              dealerInfo.portIn += count;
            }
          }
        }
      });

      const result = Array.from(carrierMap.values());
      console.log('Carrier stats result:', result);
      return result;
    } catch (error) {
      console.error('Get carrier stats error:', error);
      return [];
    }
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

  // 통신사별 필드 설정을 메모리에 저장
  private carrierFieldSettings: Map<number, any> = new Map();

  // 통신사 설정을 메모리에 저장
  private carrierSettings: Map<number, any> = new Map();



  async getCarrierById(id: number): Promise<any> {
    try {
      const result = await db.select().from(carriers).where(eq(carriers.id, id)).limit(1);
      
      if (result.length === 0) {
        return null;
      }
      
      const carrier = result[0];
      
      return {
        ...carrier,
        // Boolean 값들을 JavaScript Boolean으로 변환하여 반환
        supportNewCustomers: Boolean(carrier.supportNewCustomers),
        supportPortIn: Boolean(carrier.supportPortIn),
        isActive: Boolean(carrier.isActive),
        isWired: Boolean(carrier.isWired),
        documentRequired: Boolean(carrier.documentRequired),
        requireCustomerName: Boolean(carrier.requireCustomerName),
        requireCustomerPhone: Boolean(carrier.requireCustomerPhone),
        requireCustomerEmail: Boolean(carrier.requireCustomerEmail),
        requireContactCode: Boolean(carrier.requireContactCode),
        requireCarrier: Boolean(carrier.requireCarrier),
        requirePreviousCarrier: Boolean(carrier.requirePreviousCarrier),
        requireDocumentUpload: Boolean(carrier.requireDocumentUpload),
        requireBundleNumber: Boolean(carrier.requireBundleNumber),
        requireBundleCarrier: Boolean(carrier.requireBundleCarrier),
        allowNewCustomer: Boolean(carrier.allowNewCustomer),
        allowPortIn: Boolean(carrier.allowPortIn),
        requireDesiredNumber: Boolean(carrier.requireDesiredNumber)
      };
    } catch (error) {
      console.error('Error getting carrier by ID:', error);
      return null;
    }
  }

  async createCarrier(carrierData: any): Promise<any> {
    console.log('Creating carrier:', carrierData);
    
    try {
      // Boolean 값들을 정수로 변환
      const insertData = {
        name: carrierData.name,
        code: carrierData.code || carrierData.name.replace(/[^a-zA-Z0-9가-힣]/g, ''),
        color: carrierData.color || '#0000FF',
        supportNewCustomers: carrierData.supportNewCustomers ? 1 : 0,
        supportPortIn: carrierData.supportPortIn ? 1 : 0,
        isActive: carrierData.isActive ? 1 : 0,
      };
      
      // 데이터베이스에 저장
      const [newCarrier] = await db.insert(carriers).values(insertData).returning();
      
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
      // 모든 필드를 데이터베이스에 직접 저장
      const updateData: any = {
        name: carrierData.name,
        code: carrierData.code || carrierData.name?.replace(/[^a-zA-Z0-9가-힣]/g, ''),
        color: carrierData.color || '#0000FF',
        supportNewCustomers: carrierData.supportNewCustomers ? 1 : 0,
        supportPortIn: carrierData.supportPortIn ? 1 : 0,
        isActive: carrierData.isActive !== undefined ? (carrierData.isActive ? 1 : 0) : 1,
        displayOrder: carrierData.displayOrder || 0,
        isWired: carrierData.isWired ? 1 : 0,
        bundleNumber: carrierData.bundleNumber || '',
        bundleCarrier: carrierData.bundleCarrier || '',
        documentRequired: carrierData.documentRequired ? 1 : 0,
        requireCustomerName: carrierData.requireCustomerName !== undefined ? (carrierData.requireCustomerName ? 1 : 0) : 1,
        requireCustomerPhone: carrierData.requireCustomerPhone ? 1 : 0,
        requireCustomerEmail: carrierData.requireCustomerEmail ? 1 : 0,
        requireContactCode: carrierData.requireContactCode !== undefined ? (carrierData.requireContactCode ? 1 : 0) : 1,
        requireCarrier: carrierData.requireCarrier !== undefined ? (carrierData.requireCarrier ? 1 : 0) : 1,
        requirePreviousCarrier: carrierData.requirePreviousCarrier !== undefined ? (carrierData.requirePreviousCarrier ? 1 : 0) : 1,
        requireDocumentUpload: carrierData.requireDocumentUpload ? 1 : 0,
        requireBundleNumber: carrierData.requireBundleNumber ? 1 : 0,
        requireBundleCarrier: carrierData.requireBundleCarrier ? 1 : 0,
        allowNewCustomer: carrierData.allowNewCustomer ? 1 : 0,
        allowPortIn: carrierData.allowPortIn ? 1 : 0,
        requireDesiredNumber: carrierData.requireDesiredNumber ? 1 : 0,
        updatedAt: new Date().toISOString()
      };
      
      const [updatedCarrier] = await db.update(carriers)
        .set(updateData)
        .where(eq(carriers.id, id))
        .returning();
      
      if (!updatedCarrier) {
        throw new Error('통신사를 찾을 수 없습니다.');
      }
      
      // 메모리 맵은 더 이상 사용하지 않고 데이터베이스에서 직접 조회
      return {
        ...updatedCarrier,
        // Boolean 값들을 다시 Boolean으로 변환
        supportNewCustomers: Boolean(updatedCarrier.supportNewCustomers),
        supportPortIn: Boolean(updatedCarrier.supportPortIn),
        isActive: Boolean(updatedCarrier.isActive),
        isWired: Boolean(updatedCarrier.isWired),
        documentRequired: Boolean(updatedCarrier.documentRequired),
        requireCustomerName: Boolean(updatedCarrier.requireCustomerName),
        requireCustomerPhone: Boolean(updatedCarrier.requireCustomerPhone),
        requireCustomerEmail: Boolean(updatedCarrier.requireCustomerEmail),
        requireContactCode: Boolean(updatedCarrier.requireContactCode),
        requireCarrier: Boolean(updatedCarrier.requireCarrier),
        requirePreviousCarrier: Boolean(updatedCarrier.requirePreviousCarrier),
        requireDocumentUpload: Boolean(updatedCarrier.requireDocumentUpload),
        requireBundleNumber: Boolean(updatedCarrier.requireBundleNumber),
        requireBundleCarrier: Boolean(updatedCarrier.requireBundleCarrier),
        allowNewCustomer: Boolean(updatedCarrier.allowNewCustomer),
        allowPortIn: Boolean(updatedCarrier.allowPortIn),
        requireDesiredNumber: Boolean(updatedCarrier.requireDesiredNumber)
      };

    } catch (error) {
      console.error('Error updating carrier in DB:', error);
      throw new Error('통신사 수정에 실패했습니다: ' + error.message);
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
        gte(documents.uploadedAt, monthStart),
        lte(documents.uploadedAt, monthEnd)
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
          try {
            const contactCodeResult = await db.select({
              dealerName: contactCodes.dealerName
            })
            .from(contactCodes)
            .where(eq(contactCodes.code, doc.contactCode))
            .limit(1);
            
            if (contactCodeResult.length > 0) {
              dealerName = contactCodeResult[0].dealerName;
            }
          } catch (error) {
            console.log('Contact code lookup in duplicate check error:', error);
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

      // contactCode가 있으면 해당하는 판매점명 조회
      let storeName = data.storeName || null;
      if (data.contactCode) {
        try {
          const contactCodeResult = await db.select({
            dealerName: contactCodes.dealerName
          })
          .from(contactCodes)
          .where(eq(contactCodes.code, data.contactCode))
          .limit(1);
          
          if (contactCodeResult.length > 0) {
            storeName = contactCodeResult[0].dealerName;
          }
        } catch (error) {
          console.log('Contact code lookup error:', error);
        }
      }

      // 데이터베이스에 문서 삽입
      const [document] = await db.insert(documents).values({
        dealerId: data.dealerId || 1, // 기본 딜러 ID
        userId: data.userId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail || null,
        contactCode: data.contactCode || null,
        storeName: storeName,
        carrier: data.carrier,
        previousCarrier: data.previousCarrier || null,
        customerType: data.customerType || 'new',
        desiredNumber: data.desiredNumber || null,
        bundleNumber: data.bundleNumber || null,
        bundleCarrier: data.bundleCarrier || null,
        notes: data.notes || null,
        filePath: data.filePath || null,
        fileName: data.fileName || null,
        fileSize: data.fileSize || null,
        activationStatus: '대기',
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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
        customerType: document.customerType,
        desiredNumber: document.desiredNumber,
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
        .set({ 
          settlementAmount: settlementAmount.toString(),  // Convert to string for SQLite
          updatedAt: new Date().toISOString()             // Convert to string for SQLite
        })
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

  // 관리자 패널에서 생성된 영업과장 계정 중 팀에 배정되지 않은 계정들 조회
  async getUnassignedSalesManagerAccounts(): Promise<any[]> {
    try {
      // admins 테이블에서 영업과장 계정을 조회 (salesManagers 테이블에 없는 계정들)
      const unassignedAccounts = await db
        .select({
          id: admins.id,
          username: admins.username,
          name: admins.name,
          isActive: admins.isActive,
          createdAt: admins.createdAt
        })
        .from(admins)
        .leftJoin(salesManagers, eq(salesManagers.username, admins.username))
        .where(
          and(
            eq(admins.isActive, true),
            isNull(salesManagers.id) // 팀에 배정되지 않은 계정
          )
        )
        .orderBy(admins.createdAt);

      return unassignedAccounts;
    } catch (error) {
      console.error('Error getting unassigned sales manager accounts:', error);
      return [];
    }
  }

  // 관리자 패널에서 생성된 영업과장 계정을 팀에 배정
  async assignSalesManagerToTeam(data: any): Promise<any> {
    try {
      // 선택된 관리자 계정 정보 조회
      const [adminAccount] = await db
        .select()
        .from(admins)
        .where(eq(admins.id, data.salesManagerUserId));

      if (!adminAccount) {
        throw new Error('선택된 영업과장 계정을 찾을 수 없습니다.');
      }

      // salesManagers 테이블에 배정 정보 추가
      const [result] = await db.insert(salesManagers).values({
        teamId: data.teamId,
        managerName: adminAccount.name,
        managerCode: data.managerCode,
        username: adminAccount.username,
        password: adminAccount.password, // 기존 암호화된 비밀번호 사용
        position: data.position || '대리',
        contactPhone: data.contactPhone || '',
        email: data.email || '',
        isActive: true
      }).returning();

      return result;
    } catch (error) {
      console.error('Error assigning sales manager to team:', error);
      throw error;
    }
  }

  // 영업과장 정보 업데이트
  async updateSalesManager(id: number, data: UpdateSalesManagerForm): Promise<SalesManager> {
    console.log('updateSalesManager called with:', { id, data });
    
    // 중복 체크: username (자기 자신 제외)
    if (data.username) {
      const [existingByUsername] = await db.select().from(salesManagers).where(
        and(
          eq(salesManagers.username, data.username), 
          eq(salesManagers.isActive, 1),
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

    // 비밀번호 해시화 (제공된 경우에만)
    const updateData = { ...data };
    if (data.password && data.password.trim() !== '') {
      updateData.password = await bcrypt.hash(data.password, 10);
    } else {
      // 비밀번호가 빈 문자열이면 업데이트하지 않음
      delete updateData.password;
    }

    console.log('Final updateData:', updateData);

    const [result] = await db.update(salesManagers)
      .set(updateData)
      .where(eq(salesManagers.id, id))
      .returning();
    
    console.log('Update result:', result);
    return result;
  }

  // 사용자 권한 관리 메서드
  async getUserPermissions(userId: number, userType: string): Promise<any[]> {
    try {
      const permissions = await db.select().from(userPermissions)
        .where(and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.userType, userType),
          eq(userPermissions.isActive, 1)
        ));
      return permissions;
    } catch (error) {
      console.error('Get user permissions error:', error);
      return [];
    }
  }

  async updateUserPermissions(userId: number, userType: string, permissions: any[]): Promise<void> {
    try {
      // 기존 권한 모두 삭제
      await db.delete(userPermissions)
        .where(and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.userType, userType)
        ));

      // 새 권한 삽입
      if (permissions.length > 0) {
        const insertData = permissions.map(perm => ({
          userId,
          userType,
          menuId: perm.menuId,
          canView: perm.canView ? 1 : 0,
          canEdit: perm.canEdit ? 1 : 0,
          canDelete: perm.canDelete ? 1 : 0,
          isActive: 1
        }));

        await db.insert(userPermissions).values(insertData);
      }
    } catch (error) {
      console.error('Update user permissions error:', error);
      throw error;
    }
  }

  async getAllUsersForPermissions(): Promise<any[]> {
    try {
      // 관리자 조회
      const adminUsers = await db.select({
        id: admins.id,
        name: admins.name,
        username: admins.username,
        userType: sql`'admin'`.as('userType'),
        isActive: admins.isActive
      }).from(admins).where(eq(admins.isActive, 1));

      // 영업과장 조회
      const managerUsers = await db.select({
        id: salesManagers.id,
        name: salesManagers.managerName,
        username: salesManagers.username,
        userType: sql`'sales_manager'`.as('userType'),
        isActive: salesManagers.isActive
      }).from(salesManagers).where(eq(salesManagers.isActive, 1));

      // 근무자 조회
      const workerUsers = await db.select({
        id: users.id,
        name: users.name,
        username: users.username,
        userType: sql`'user'`.as('userType'),
        isActive: users.isActive
      }).from(users).where(eq(users.isActive, 1));

      // 모든 사용자 통합
      return [
        ...adminUsers,
        ...managerUsers,
        ...workerUsers
      ];
    } catch (error) {
      console.error('Get all users for permissions error:', error);
      return [];
    }
  }
}

export const storage = new DatabaseStorage();