import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { eq, and, desc, sql, or, like, gte, lte, inArray } from 'drizzle-orm';
import { db } from './db';
import { 
  admins, salesTeams, salesManagers, contactCodeMappings
} from '@shared/schema';
import type {
  Admin,
  SalesTeam,
  SalesManager,
  ContactCodeMapping,
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
  getServicePlans(): Promise<any[]>;
  getServicePlansByCarrier(carrier: string): Promise<any[]>;
  getAdditionalServices(): Promise<any[]>;
  getDealers(): Promise<any[]>;
  getUsers(): Promise<any[]>;
  getAllUsers(): Promise<any[]>;
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
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const [result] = await db.insert(salesManagers).values({
      teamId: data.teamId,
      managerName: data.managerName,
      managerCode: data.managerCode,
      username: data.username,
      password: hashedPassword,
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

  async getSalesManagerByUsername(username: string): Promise<SalesManager | undefined> {
    const [manager] = await db.select().from(salesManagers).where(
      and(eq(salesManagers.username, username), eq(salesManagers.isActive, true))
    );
    return manager;
  }

  async getSalesManagersByTeamId(teamId: number): Promise<SalesManager[]> {
    return await db.select().from(salesManagers)
      .where(and(eq(salesManagers.teamId, teamId), eq(salesManagers.isActive, true)))
      .orderBy(salesManagers.managerName);
  }

  async updateSalesManager(id: number, data: UpdateSalesManagerForm): Promise<SalesManager> {
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
    // 기존 사용자 시스템의 비밀번호 변경 (구현 필요시 추가)
    throw new Error('일반 사용자 비밀번호 변경은 추후 구현 예정입니다.');
  }

  async deleteSalesManager(managerId: number): Promise<void> {
    await db.update(salesManagers)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(salesManagers.id, managerId));
  }

  // 근무자 관리
  async createWorker(data: CreateWorkerForm): Promise<any> {
    // 기존 시스템과의 연동을 위해 안내 메시지 반환
    throw new Error('근무자 계정은 기존 시스템에서 관리됩니다. 시스템 관리자에게 문의하세요.');
  }
  
  // 호환성을 위한 기존 사용자 인증 메서드 (임시)
  async authenticateUser(username: string, password: string): Promise<any> {
    return null; // 아직 구현되지 않음
  }
  
  async getAdminById(id: number): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.id, id));
    return admin;
  }
  
  // 기존 시스템과의 호환성을 위한 빈 메서드들 (임시)
  async getContactCodes(): Promise<any[]> {
    return [];
  }
  
  async getServicePlans(): Promise<any[]> {
    return [];
  }
  
  async getServicePlansByCarrier(carrier: string): Promise<any[]> {
    return [];
  }
  
  async getAdditionalServices(): Promise<any[]> {
    return [];
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