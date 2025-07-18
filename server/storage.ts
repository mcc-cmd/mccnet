import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import type {
  Admin,
  Dealer,
  User,
  Document,
  PricingTable,
  AuthSession,
  CreateDealerForm,
  CreateUserForm,
  UploadDocumentForm,
  UpdateDocumentStatusForm,
  DashboardStats
} from '../shared/schema';

const dbPath = path.join(process.cwd(), 'database.sqlite');
const db = new Database(dbPath);

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS dealers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('dealer_admin', 'dealer_staff')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dealer_id) REFERENCES dealers (id)
  );

  CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dealer_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    document_number TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    store_name TEXT,
    status TEXT NOT NULL CHECK (status IN ('접수', '보완필요', '완료')),
    activation_status TEXT NOT NULL DEFAULT '대기' CHECK (activation_status IN ('대기', '개통', '취소')),
    file_path TEXT,
    file_name TEXT,
    file_size INTEGER,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    activated_at DATETIME,
    notes TEXT,
    FOREIGN KEY (dealer_id) REFERENCES dealers (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  CREATE TABLE IF NOT EXISTS document_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('가입서류', '변경서류')),
    uploaded_by INTEGER NOT NULL,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    FOREIGN KEY (uploaded_by) REFERENCES admins (id)
  );

  CREATE TABLE IF NOT EXISTS auth_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'user')),
    dealer_id INTEGER,
    expires_at DATETIME NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_documents_dealer_id ON documents(dealer_id);
  CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
  CREATE INDEX IF NOT EXISTS idx_documents_activation_status ON documents(activation_status);
  CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON documents(uploaded_at);
  CREATE INDEX IF NOT EXISTS idx_documents_activated_at ON documents(activated_at);
  CREATE INDEX IF NOT EXISTS idx_documents_customer_name ON documents(customer_name);
  CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);
`);

// Create default admin if none exists
const adminExists = db.prepare('SELECT COUNT(*) as count FROM admins').get() as { count: number };
if (adminExists.count === 0) {
  const hashedPassword = bcrypt.hashSync('admin123!', 10);
  db.prepare('INSERT INTO admins (email, password, name) VALUES (?, ?, ?)').run(
    'admin@portal.com',
    hashedPassword,
    '시스템 관리자'
  );
}

export interface IStorage {
  // Authentication
  authenticateAdmin(email: string, password: string): Promise<Admin | null>;
  authenticateUser(email: string, password: string): Promise<{ user: User; dealer: Dealer } | null>;
  createSession(userId: number, userType: 'admin' | 'user', dealerId?: number): Promise<string>;
  getSession(sessionId: string): Promise<AuthSession | null>;
  deleteSession(sessionId: string): Promise<void>;
  
  // Admin operations
  getAdminById(id: number): Promise<Admin | null>;
  getUserById(id: number): Promise<(User & { dealerName: string }) | null>;
  createDealer(data: CreateDealerForm): Promise<Dealer>;
  createUser(data: CreateUserForm): Promise<User>;
  getDealers(): Promise<Dealer[]>;
  getUsers(dealerId?: number): Promise<Array<User & { dealerName: string }>>;
  
  // Document operations
  uploadDocument(data: UploadDocumentForm & { dealerId: number; userId: number; filePath: string; fileName: string; fileSize: number }): Promise<Document>;
  getDocuments(dealerId?: number, filters?: { status?: string; search?: string; startDate?: string; endDate?: string }): Promise<Array<Document & { dealerName: string; userName: string }>>;
  updateDocumentStatus(id: number, data: UpdateDocumentStatusForm): Promise<Document>;
  updateDocumentActivationStatus(id: number, data: any): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
  
  // Document templates
  uploadDocumentTemplate(data: { title: string; category: string; filePath: string; fileName: string; fileSize: number; uploadedBy: number }): Promise<any>;
  getDocumentTemplates(): Promise<any[]>;
  getDocumentTemplateById(id: number): Promise<any | null>;
  
  // Worker stats
  getWorkerStats(dealerId?: number): Promise<any[]>;
  
  // Dashboard stats
  getDashboardStats(dealerId?: number): Promise<DashboardStats>;
}

class SqliteStorage implements IStorage {
  async authenticateAdmin(email: string, password: string): Promise<Admin | null> {
    const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(email) as Admin | undefined;
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
      return null;
    }
    return admin;
  }

  async authenticateUser(email: string, password: string): Promise<{ user: User; dealer: Dealer } | null> {
    const result = db.prepare(`
      SELECT u.*, d.name as dealer_name, d.location, d.contact_email, d.contact_phone, d.created_at as dealer_created_at
      FROM users u
      JOIN dealers d ON u.dealer_id = d.id
      WHERE u.email = ?
    `).get(email) as any;
    
    if (!result || !bcrypt.compareSync(password, result.password)) {
      return null;
    }

    const user: User = {
      id: result.id,
      dealerId: result.dealer_id,
      email: result.email,
      password: result.password,
      name: result.name,
      role: result.role,
      createdAt: new Date(result.created_at)
    };

    const dealer: Dealer = {
      id: result.dealer_id,
      name: result.dealer_name,
      location: result.location,
      contactEmail: result.contact_email,
      contactPhone: result.contact_phone,
      createdAt: new Date(result.dealer_created_at)
    };

    return { user, dealer };
  }

  async createSession(userId: number, userType: 'admin' | 'user', dealerId?: number): Promise<string> {
    const sessionId = nanoid();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    db.prepare('INSERT INTO auth_sessions (id, user_id, user_type, dealer_id, expires_at) VALUES (?, ?, ?, ?, ?)').run(
      sessionId,
      userId,
      userType,
      dealerId || null,
      expiresAt.toISOString()
    );

    return sessionId;
  }

  async getSession(sessionId: string): Promise<AuthSession | null> {
    try {
      // Use a simpler datetime comparison
      const session = db.prepare('SELECT * FROM auth_sessions WHERE id = ? AND expires_at > ?').get(sessionId, new Date().toISOString()) as any;
      if (!session) return null;

      return {
        id: session.id,
        userId: session.user_id,
        userType: session.user_type,
        dealerId: session.dealer_id,
        expiresAt: new Date(session.expires_at)
      };
    } catch (error) {
      console.error('Error getting session:', error);
      return null; // Return null instead of throwing to prevent crashes
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    db.prepare('DELETE FROM auth_sessions WHERE id = ?').run(sessionId);
  }

  async getAdminById(id: number): Promise<Admin | null> {
    const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(id) as Admin | undefined;
    return admin || null;
  }

  async getUserById(id: number): Promise<(User & { dealerName: string }) | null> {
    const user = db.prepare(`
      SELECT u.*, d.name as dealer_name
      FROM users u
      JOIN dealers d ON u.dealer_id = d.id
      WHERE u.id = ?
    `).get(id) as any;
    
    if (!user) return null;
    
    return {
      id: user.id,
      dealerId: user.dealer_id,
      email: user.email,
      password: user.password,
      name: user.name,
      role: user.role,
      createdAt: new Date(user.created_at),
      dealerName: user.dealer_name
    };
  }

  async createDealer(data: CreateDealerForm): Promise<Dealer> {
    const insertResult = db.prepare('INSERT INTO dealers (name, location, contact_email, contact_phone) VALUES (?, ?, ?, ?)').run(
      data.name,
      data.location,
      data.contactEmail,
      data.contactPhone
    );

    const result = db.prepare('SELECT * FROM dealers WHERE id = ?').get(insertResult.lastInsertRowid) as any;

    return {
      id: result.id,
      name: result.name,
      location: result.location,
      contactEmail: result.contact_email,
      contactPhone: result.contact_phone,
      createdAt: new Date(result.created_at)
    };
  }

  async createUser(data: CreateUserForm): Promise<User> {
    const hashedPassword = bcrypt.hashSync(data.password, 10);
    const insertResult = db.prepare('INSERT INTO users (dealer_id, email, password, name, role) VALUES (?, ?, ?, ?, ?)').run(
      data.dealerId,
      data.email,
      hashedPassword,
      data.name,
      data.role
    );

    const result = db.prepare('SELECT * FROM users WHERE id = ?').get(insertResult.lastInsertRowid) as any;

    return {
      id: result.id,
      dealerId: result.dealer_id,
      email: result.email,
      password: result.password,
      name: result.name,
      role: result.role,
      createdAt: new Date(result.created_at)
    };
  }

  async getDealers(): Promise<Dealer[]> {
    const dealers = db.prepare('SELECT * FROM dealers ORDER BY name').all() as any[];
    return dealers.map(d => ({
      id: d.id,
      name: d.name,
      location: d.location,
      contactEmail: d.contact_email,
      contactPhone: d.contact_phone,
      createdAt: new Date(d.created_at)
    }));
  }

  async getUsers(dealerId?: number): Promise<Array<User & { dealerName: string }>> {
    let query = `
      SELECT u.*, d.name as dealer_name
      FROM users u
      JOIN dealers d ON u.dealer_id = d.id
    `;
    let params: any[] = [];

    if (dealerId) {
      query += ' WHERE u.dealer_id = ?';
      params.push(dealerId);
    }

    query += ' ORDER BY u.name';

    const users = db.prepare(query).all(...params) as any[];
    return users.map(u => ({
      id: u.id,
      dealerId: u.dealer_id,
      email: u.email,
      password: u.password,
      name: u.name,
      role: u.role,
      createdAt: new Date(u.created_at),
      dealerName: u.dealer_name
    }));
  }

  async uploadDocument(data: UploadDocumentForm & { dealerId: number; userId: number; filePath?: string | null; fileName?: string | null; fileSize?: number | null }): Promise<Document> {
    const documentNumber = `DOC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    
    const insertResult = db.prepare(`
      INSERT INTO documents (dealer_id, user_id, document_number, customer_name, customer_phone, store_name, status, activation_status, file_path, file_name, file_size, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.dealerId,
      data.userId,
      documentNumber,
      data.customerName,
      data.customerPhone,
      data.storeName || null,
      '접수',
      '대기',
      data.filePath || null,
      data.fileName || null,
      data.fileSize || null,
      data.notes || null
    );

    const result = db.prepare('SELECT * FROM documents WHERE id = ?').get(insertResult.lastInsertRowid) as any;

    return {
      id: result.id,
      dealerId: result.dealer_id,
      userId: result.user_id,
      documentNumber: result.document_number,
      customerName: result.customer_name,
      customerPhone: result.customer_phone,
      storeName: result.store_name,
      status: result.status,
      activationStatus: result.activation_status,
      filePath: result.file_path,
      fileName: result.file_name,
      fileSize: result.file_size,
      uploadedAt: new Date(result.uploaded_at),
      updatedAt: new Date(result.updated_at),
      activatedAt: result.activated_at ? new Date(result.activated_at) : undefined,
      notes: result.notes
    };
  }

  async getDocuments(dealerId?: number, filters?: { status?: string; search?: string; startDate?: string; endDate?: string }): Promise<Array<Document & { dealerName: string; userName: string }>> {
    let query = `
      SELECT d.*, dealers.name as dealer_name, u.name as user_name
      FROM documents d
      JOIN dealers ON d.dealer_id = dealers.id
      JOIN users u ON d.user_id = u.id
      WHERE 1=1
    `;
    let params: any[] = [];

    if (dealerId) {
      query += ' AND d.dealer_id = ?';
      params.push(dealerId);
    }

    if (filters?.status) {
      query += ' AND d.status = ?';
      params.push(filters.status);
    }

    if (filters?.search) {
      query += ' AND (d.customer_name LIKE ? OR d.document_number LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    if (filters?.startDate) {
      query += ' AND date(d.uploaded_at) >= ?';
      params.push(filters.startDate);
    }

    if (filters?.endDate) {
      query += ' AND date(d.uploaded_at) <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY d.uploaded_at DESC';

    const documents = db.prepare(query).all(...params) as any[];
    return documents.map(d => ({
      id: d.id,
      dealerId: d.dealer_id,
      userId: d.user_id,
      documentNumber: d.document_number,
      customerName: d.customer_name,
      customerPhone: d.customer_phone,
      storeName: d.store_name,
      status: d.status,
      activationStatus: d.activation_status || '대기',
      filePath: d.file_path,
      fileName: d.file_name,
      fileSize: d.file_size,
      uploadedAt: new Date(d.uploaded_at),
      updatedAt: new Date(d.updated_at),
      activatedAt: d.activated_at ? new Date(d.activated_at) : undefined,
      notes: d.notes,
      dealerName: d.dealer_name,
      userName: d.user_name
    }));
  }

  async updateDocumentStatus(id: number, data: UpdateDocumentStatusForm): Promise<Document> {
    let updateQuery = `
      UPDATE documents 
      SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    `;
    let params: any[] = [data.status, data.notes || null];

    if (data.activationStatus) {
      updateQuery += `, activation_status = ?`;
      params.push(data.activationStatus);
      
      if (data.activationStatus === '개통' || data.activationStatus === '취소') {
        updateQuery += `, activated_at = CURRENT_TIMESTAMP`;
      }
    }

    updateQuery += ` WHERE id = ?`;
    params.push(id);

    db.prepare(updateQuery).run(...params);
    const result = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;

    return {
      id: result.id,
      dealerId: result.dealer_id,
      userId: result.user_id,
      documentNumber: result.document_number,
      customerName: result.customer_name,
      customerPhone: result.customer_phone,
      storeName: result.store_name,
      status: result.status,
      activationStatus: result.activation_status,
      filePath: result.file_path,
      fileName: result.file_name,
      fileSize: result.file_size,
      uploadedAt: new Date(result.uploaded_at),
      updatedAt: new Date(result.updated_at),
      activatedAt: result.activated_at ? new Date(result.activated_at) : undefined,
      notes: result.notes
    };
  }

  async updateDocumentActivationStatus(id: number, data: any): Promise<Document> {
    let updateQuery = `
      UPDATE documents 
      SET activation_status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    `;
    let params: any[] = [data.activationStatus, data.notes || null];

    if (data.activationStatus === '개통' || data.activationStatus === '취소') {
      updateQuery += `, activated_at = CURRENT_TIMESTAMP`;
    }

    updateQuery += ` WHERE id = ?`;
    params.push(id);

    db.prepare(updateQuery).run(...params);
    const result = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any;

    return {
      id: result.id,
      dealerId: result.dealer_id,
      userId: result.user_id,
      documentNumber: result.document_number,
      customerName: result.customer_name,
      customerPhone: result.customer_phone,
      storeName: result.store_name,
      status: result.status,
      activationStatus: result.activation_status,
      filePath: result.file_path,
      fileName: result.file_name,
      fileSize: result.file_size,
      uploadedAt: new Date(result.uploaded_at),
      updatedAt: new Date(result.updated_at),
      activatedAt: result.activated_at ? new Date(result.activated_at) : undefined,
      notes: result.notes
    };
  }

  async deleteDocument(id: number): Promise<void> {
    const document = db.prepare('SELECT file_path FROM documents WHERE id = ?').get(id) as { file_path: string } | undefined;
    if (document) {
      try {
        fs.unlinkSync(document.file_path);
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  }

  async uploadPricingTable(data: { title: string; filePath: string; fileName: string; fileSize: number; uploadedBy: number }): Promise<PricingTable> {
    // Deactivate all previous pricing tables
    db.prepare('UPDATE pricing_tables SET is_active = false').run();

    const insertResult = db.prepare(`
      INSERT INTO pricing_tables (title, file_name, file_path, file_size, uploaded_by, is_active)
      VALUES (?, ?, ?, ?, ?, true)
    `).run(
      data.title,
      data.fileName,
      data.filePath,
      data.fileSize,
      data.uploadedBy
    );

    const result = db.prepare('SELECT * FROM pricing_tables WHERE id = ?').get(insertResult.lastInsertRowid) as any;

    return {
      id: result.id,
      title: result.title,
      fileName: result.file_name,
      filePath: result.file_path,
      fileSize: result.file_size,
      uploadedBy: result.uploaded_by,
      uploadedAt: new Date(result.uploaded_at),
      isActive: result.is_active
    };
  }

  async getPricingTables(): Promise<PricingTable[]> {
    const tables = db.prepare('SELECT * FROM pricing_tables ORDER BY uploaded_at DESC').all() as any[];
    return tables.map(t => ({
      id: t.id,
      title: t.title,
      fileName: t.file_name,
      filePath: t.file_path,
      fileSize: t.file_size,
      uploadedBy: t.uploaded_by,
      uploadedAt: new Date(t.uploaded_at),
      isActive: t.is_active
    }));
  }

  async getActivePricingTable(): Promise<PricingTable | null> {
    const table = db.prepare('SELECT * FROM pricing_tables WHERE is_active = true ORDER BY uploaded_at DESC LIMIT 1').get() as any;
    if (!table) return null;

    return {
      id: table.id,
      title: table.title,
      fileName: table.file_name,
      filePath: table.file_path,
      fileSize: table.file_size,
      uploadedBy: table.uploaded_by,
      uploadedAt: new Date(table.uploaded_at),
      isActive: table.is_active
    };
  }

  async getDashboardStats(dealerId?: number): Promise<DashboardStats> {
    let totalQuery = 'SELECT COUNT(*) as count FROM documents';
    let pendingQuery = 'SELECT COUNT(*) as count FROM documents WHERE status = "접수"';
    let completedQuery = 'SELECT COUNT(*) as count FROM documents WHERE status = "완료"';
    let thisWeekQuery = 'SELECT COUNT(*) as count FROM documents WHERE date(uploaded_at) >= date("now", "-7 days")';
    let thisMonthQuery = 'SELECT COUNT(*) as count FROM documents WHERE date(uploaded_at) >= date("now", "start of month")';
    let activatedQuery = 'SELECT COUNT(*) as count FROM documents WHERE activation_status = "개통" AND date(activated_at) >= date("now", "start of month")';
    let canceledQuery = 'SELECT COUNT(*) as count FROM documents WHERE activation_status = "취소" AND date(activated_at) >= date("now", "start of month")';
    let pendingActivationsQuery = 'SELECT COUNT(*) as count FROM documents WHERE activation_status = "대기"';
    
    if (dealerId) {
      const dealerFilter = ' WHERE dealer_id = ?';
      const dealerFilterAnd = ' AND dealer_id = ?';
      
      totalQuery += dealerFilter;
      pendingQuery += dealerFilterAnd;
      completedQuery += dealerFilterAnd;
      thisWeekQuery += dealerFilterAnd;
      thisMonthQuery += dealerFilterAnd;
      activatedQuery += dealerFilterAnd;
      canceledQuery += dealerFilterAnd;
      pendingActivationsQuery += dealerFilterAnd;
    }

    const total = db.prepare(totalQuery).get(dealerId || undefined) as { count: number };
    const pending = db.prepare(pendingQuery).get(dealerId || undefined) as { count: number };
    const completed = db.prepare(completedQuery).get(dealerId || undefined) as { count: number };
    const thisWeek = db.prepare(thisWeekQuery).get(dealerId || undefined) as { count: number };
    const thisMonth = db.prepare(thisMonthQuery).get(dealerId || undefined) as { count: number };
    const activated = db.prepare(activatedQuery).get(dealerId || undefined) as { count: number };
    const canceled = db.prepare(canceledQuery).get(dealerId || undefined) as { count: number };
    const pendingActivations = db.prepare(pendingActivationsQuery).get(dealerId || undefined) as { count: number };

    return {
      totalDocuments: total.count,
      pendingDocuments: pending.count,
      completedDocuments: completed.count,
      thisWeekSubmissions: thisWeek.count,
      thisMonthSubmissions: thisMonth.count,
      activatedCount: activated.count,
      canceledCount: canceled.count,
      pendingActivations: pendingActivations.count
    };
  }

  async uploadDocumentTemplate(data: { title: string; category: string; filePath: string; fileName: string; fileSize: number; uploadedBy: number }): Promise<any> {
    const insertResult = db.prepare(`
      INSERT INTO document_templates (title, file_name, file_path, file_size, category, uploaded_by, is_active)
      VALUES (?, ?, ?, ?, ?, ?, true)
    `).run(
      data.title,
      data.fileName,
      data.filePath,
      data.fileSize,
      data.category,
      data.uploadedBy
    );

    const result = db.prepare('SELECT * FROM document_templates WHERE id = ?').get(insertResult.lastInsertRowid) as any;

    return {
      id: result.id,
      title: result.title,
      fileName: result.file_name,
      filePath: result.file_path,
      fileSize: result.file_size,
      category: result.category,
      uploadedBy: result.uploaded_by,
      uploadedAt: new Date(result.uploaded_at),
      isActive: result.is_active
    };
  }

  async getDocumentTemplates(): Promise<any[]> {
    const templates = db.prepare('SELECT * FROM document_templates WHERE is_active = true ORDER BY category, uploaded_at DESC').all() as any[];
    return templates.map(t => ({
      id: t.id,
      title: t.title,
      fileName: t.file_name,
      filePath: t.file_path,
      fileSize: t.file_size,
      category: t.category,
      uploadedBy: t.uploaded_by,
      uploadedAt: new Date(t.uploaded_at),
      isActive: t.is_active
    }));
  }

  async getDocumentTemplateById(id: number): Promise<any | null> {
    const template = db.prepare('SELECT * FROM document_templates WHERE id = ? AND is_active = true').get(id) as any;
    if (!template) return null;

    return {
      id: template.id,
      title: template.title,
      fileName: template.file_name,
      filePath: template.file_path,
      fileSize: template.file_size,
      category: template.category,
      uploadedBy: template.uploaded_by,
      uploadedAt: new Date(template.uploaded_at),
      isActive: template.is_active
    };
  }

  async getWorkerStats(dealerId?: number): Promise<any[]> {
    let query = `
      SELECT 
        store_name,
        COUNT(*) as total_activations,
        SUM(CASE WHEN date(activated_at) >= date('now', 'start of month') THEN 1 ELSE 0 END) as monthly_activations,
        dealer_id
      FROM documents 
      WHERE activation_status = '개통' AND store_name IS NOT NULL
    `;
    
    if (dealerId) {
      query += ' AND dealer_id = ?';
    }
    
    query += ' GROUP BY store_name, dealer_id ORDER BY monthly_activations DESC';
    
    const results = db.prepare(query).all(dealerId || undefined) as any[];
    
    return results.map(r => ({
      storeName: r.store_name,
      totalActivations: r.total_activations,
      monthlyActivations: r.monthly_activations,
      dealerId: r.dealer_id
    }));
  }
}

export const storage = new SqliteStorage();
