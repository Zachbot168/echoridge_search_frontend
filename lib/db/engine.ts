import type { DBConfig } from '@/types/db';

let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

interface Database {
  exec(sql: string): void;
  prepare(sql: string): Statement;
  transaction<T>(fn: () => T): T;
  close(): void;
}

interface Statement {
  bind(params: any[]): Statement;
  run(): { changes: number; lastInsertRowid: number };
  get<T = any>(): T | undefined;
  all<T = any>(): T[];
  finalize(): void;
}

// Load SQLite WASM based on environment config
async function loadSQLiteWASM(): Promise<any> {
  const driver = process.env.NEXT_PUBLIC_DB_DRIVER || 'sqlite-wasm';
  
  if (driver === 'sqlite-wasm') {
    // Dynamic import for client-side only
    if (typeof window === 'undefined') {
      throw new Error('SQLite WASM can only be used in browser environment');
    }
    
    // @ts-ignore - Dynamic import
    const sqlite3InitModule = (await import('@sqlite.org/sqlite-wasm')).default;
    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error,
    });
    
    return sqlite3;
  } else {
    // Fallback to IndexedDB-based SQL.js or other driver
    throw new Error(`Database driver ${driver} not implemented yet`);
  }
}

// Initialize database with schema
export async function initDatabase(): Promise<Database> {
  // Return existing instance if available
  if (dbInstance) {
    return dbInstance;
  }
  
  // Return ongoing initialization if in progress
  if (initPromise) {
    return initPromise;
  }
  
  // Start new initialization
  initPromise = (async () => {
    try {
      const sqlite3 = await loadSQLiteWASM();
      
      // Create database instance
      const db = new sqlite3.oo1.DB('/echoridge.db', 'ct');
      
      // Create wrapper with our interface
      const wrapper: Database = {
        exec(sql: string) {
          db.exec(sql);
        },
        
        prepare(sql: string): Statement {
          const stmt = db.prepare(sql);
          return {
            bind(params: any[]) {
              stmt.bind(params);
              return this;
            },
            run() {
              stmt.step();
              const result = {
                changes: db.changes(),
                lastInsertRowid: Number(db.lastInsertRowid),
              };
              stmt.reset();
              return result;
            },
            get<T = any>(): T | undefined {
              if (stmt.step()) {
                const row = stmt.get({});
                stmt.reset();
                return row as T;
              }
              stmt.reset();
              return undefined;
            },
            all<T = any>(): T[] {
              const rows: T[] = [];
              while (stmt.step()) {
                rows.push(stmt.get({}) as T);
              }
              stmt.reset();
              return rows;
            },
            finalize() {
              stmt.finalize();
            },
          };
        },
        
        transaction<T>(fn: () => T): T {
          db.exec('BEGIN');
          try {
            const result = fn();
            db.exec('COMMIT');
            return result;
          } catch (error) {
            db.exec('ROLLBACK');
            throw error;
          }
        },
        
        close() {
          db.close();
        },
      };
      
      // Enable foreign keys
      wrapper.exec('PRAGMA foreign_keys = ON');
      
      // Set journal mode for better performance
      wrapper.exec('PRAGMA journal_mode = WAL');
      
      // Store instance
      dbInstance = wrapper;
      
      return wrapper;
    } catch (error) {
      initPromise = null;
      throw error;
    }
  })();
  
  return initPromise;
}

// Get database instance (must be initialized first)
export function getDatabase(): Database {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return dbInstance;
}

// Close database connection
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    initPromise = null;
  }
}

// Check if database is initialized
export function isDatabaseInitialized(): boolean {
  return dbInstance !== null;
}

// Get database configuration from environment
export function getDBConfig(): DBConfig {
  return {
    driver: (process.env.NEXT_PUBLIC_DB_DRIVER || 'sqlite-wasm') as 'sqlite-wasm' | 'indexeddb',
    tenantMode: 'universal', // Always universal for this implementation
    audienceScope: (process.env.NEXT_PUBLIC_AUDIENCE_SCOPE || 'public') as 'public' | 'partner' | 'enterprise',
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://api.echoridge.example',
  };
}

// Utility to format dates for SQLite
export function toSQLiteDate(date: Date = new Date()): string {
  return date.toISOString();
}

// Utility to parse SQLite dates
export function fromSQLiteDate(dateStr: string): Date {
  return new Date(dateStr);
}