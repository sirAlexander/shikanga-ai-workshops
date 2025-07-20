"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbAll = exports.dbGet = exports.dbRun = exports.db = void 0;
exports.initDatabase = initDatabase;
const sqlite3_1 = __importDefault(require("sqlite3"));
const db = new sqlite3_1.default.Database('./finance_tracker.db');
exports.db = db;
// Promisify database methods with proper typing
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err)
                reject(err);
            else
                resolve(this);
        });
    });
};
exports.dbRun = dbRun;
const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err)
                reject(err);
            else
                resolve(row);
        });
    });
};
exports.dbGet = dbGet;
const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err)
                reject(err);
            else
                resolve(rows);
        });
    });
};
exports.dbAll = dbAll;
async function initDatabase() {
    try {
        // Create categories table
        await dbRun(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        color TEXT NOT NULL DEFAULT '#6B7280',
        icon TEXT DEFAULT 'folder',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Create transactions table
        await dbRun(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount DECIMAL(10,2) NOT NULL,
        description TEXT NOT NULL,
        category_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
        date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories (id)
      )
    `);
        // Create savings_goals table
        await dbRun(`
      CREATE TABLE IF NOT EXISTS savings_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        target_amount DECIMAL(10,2) NOT NULL,
        current_amount DECIMAL(10,2) DEFAULT 0,
        deadline DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Insert default categories if they don't exist
        const defaultCategories = [
            { name: 'Salary', type: 'income', color: '#10B981', icon: 'currency-dollar' },
            { name: 'Freelance', type: 'income', color: '#8B5CF6', icon: 'briefcase' },
            { name: 'Groceries', type: 'expense', color: '#F59E0B', icon: 'shopping-cart' },
            { name: 'Transportation', type: 'expense', color: '#3B82F6', icon: 'truck' },
            { name: 'Entertainment', type: 'expense', color: '#EF4444', icon: 'film' },
            { name: 'Utilities', type: 'expense', color: '#6B7280', icon: 'home' },
            { name: 'Healthcare', type: 'expense', color: '#EC4899', icon: 'heart' },
            { name: 'Education', type: 'expense', color: '#14B8A6', icon: 'academic-cap' }
        ];
        for (const category of defaultCategories) {
            await dbRun(`
        INSERT OR IGNORE INTO categories (name, type, color, icon)
        VALUES (?, ?, ?, ?)
      `, [category.name, category.type, category.color, category.icon]);
        }
        console.log('✅ Database initialized successfully');
    }
    catch (error) {
        console.error('❌ Error initializing database:', error);
        throw error;
    }
}
//# sourceMappingURL=database.js.map