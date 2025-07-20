"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../models/database");
const router = (0, express_1.Router)();
// GET /api/transactions - Get all transactions
router.get('/', async (req, res) => {
    try {
        const transactions = await (0, database_1.dbAll)(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.date DESC, t.created_at DESC
    `);
        const formattedTransactions = transactions.map(t => ({
            id: t.id,
            amount: t.amount,
            description: t.description,
            category_id: t.category_id,
            category: {
                id: t.category_id,
                name: t.category_name,
                color: t.category_color,
                icon: t.category_icon,
                type: t.type
            },
            type: t.type,
            date: t.date,
            created_at: t.created_at
        }));
        res.json(formattedTransactions);
    }
    catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});
// POST /api/transactions - Create new transaction
router.post('/', async (req, res) => {
    try {
        const { amount, description, category_id, type, date } = req.body;
        if (!amount || !description || !category_id || !type || !date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const result = await (0, database_1.dbRun)(`
      INSERT INTO transactions (amount, description, category_id, type, date)
      VALUES (?, ?, ?, ?, ?)
    `, [amount, description, category_id, type, date]);
        const newTransaction = await (0, database_1.dbGet)(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `, [result.lastID]);
        res.status(201).json(newTransaction);
    }
    catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
});
// DELETE /api/transactions/:id - Delete transaction
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await (0, database_1.dbRun)('DELETE FROM transactions WHERE id = ?', [id]);
        res.json({ message: 'Transaction deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ error: 'Failed to delete transaction' });
    }
});
// GET /api/transactions/stats - Get transaction statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await (0, database_1.dbGet)(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COUNT(*) as transactions_count
      FROM transactions
    `);
        const monthlyStats = await (0, database_1.dbGet)(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as monthly_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as monthly_expenses
      FROM transactions
      WHERE date >= date('now', 'start of month')
    `);
        res.json({
            ...stats,
            ...monthlyStats,
            net_balance: stats.total_income - stats.total_expenses
        });
    }
    catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});
exports.default = router;
//# sourceMappingURL=transactions.js.map