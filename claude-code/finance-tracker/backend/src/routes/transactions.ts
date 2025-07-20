import { Router } from 'express';
import { dbRun, dbGet, dbAll } from '../models/database';
import { Transaction, CreateTransactionRequest } from '../types';

const router = Router();

// GET /api/transactions - Get all transactions
router.get('/', async (req, res) => {
  try {
    const transactions = await dbAll(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.date DESC, t.created_at DESC
    `) as any[];

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
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /api/transactions - Create new transaction
router.post('/', async (req, res) => {
  try {
    const { amount, description, category_id, type, date }: CreateTransactionRequest = req.body;

    if (!amount || !description || !category_id || !type || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await dbRun(`
      INSERT INTO transactions (amount, description, category_id, type, date)
      VALUES (?, ?, ?, ?, ?)
    `, [amount, description, category_id, type, date]);

    const newTransactionData = await dbGet(`
      SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `, [(result as any).lastID]) as any;

    const formattedTransaction = {
      id: newTransactionData.id,
      amount: newTransactionData.amount,
      description: newTransactionData.description,
      category_id: newTransactionData.category_id,
      category: {
        id: newTransactionData.category_id,
        name: newTransactionData.category_name,
        color: newTransactionData.category_color,
        icon: newTransactionData.category_icon,
        type: newTransactionData.type
      },
      type: newTransactionData.type,
      date: newTransactionData.date,
      created_at: newTransactionData.created_at
    };

    res.status(201).json(formattedTransaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// DELETE /api/transactions/:id - Delete transaction
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM transactions WHERE id = ?', [id]);
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// GET /api/transactions/stats - Get transaction statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await dbGet(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COUNT(*) as transactions_count
      FROM transactions
    `) as any;

    const monthlyStats = await dbGet(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as monthly_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as monthly_expenses
      FROM transactions
      WHERE date >= date('now', 'start of month')
    `) as any;

    const goalsStats = await dbGet(`
      SELECT COUNT(*) as savings_goals_count
      FROM savings_goals
    `) as any;

    res.json({
      ...stats,
      ...monthlyStats,
      ...goalsStats,
      net_balance: stats.total_income - stats.total_expenses
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

export default router;