import sqlite3 from 'sqlite3';
declare const db: sqlite3.Database;
declare const dbRun: (sql: string, params?: any[]) => Promise<sqlite3.RunResult>;
declare const dbGet: (sql: string, params?: any[]) => Promise<any>;
declare const dbAll: (sql: string, params?: any[]) => Promise<any[]>;
export declare function initDatabase(): Promise<void>;
export { db, dbRun, dbGet, dbAll };
//# sourceMappingURL=database.d.ts.map