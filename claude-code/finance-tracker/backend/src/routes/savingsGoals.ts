import { Router } from 'express';
import { dbRun, dbGet, dbAll } from '../models/database';
import { SavingsGoal, CreateSavingsGoalRequest } from '../types';

const router = Router();

// GET /api/savings-goals - Get all savings goals
router.get('/', async (req, res) => {
  try {
    const goals = await dbAll(`
      SELECT * FROM savings_goals
      ORDER BY created_at DESC
    `) as any[];

    const formattedGoals = goals.map(goal => ({
      ...goal,
      progress_percentage: goal.target_amount > 0 
        ? Math.round((goal.current_amount / goal.target_amount) * 100)
        : 0
    }));

    res.json(formattedGoals);
  } catch (error) {
    console.error('Error fetching savings goals:', error);
    res.status(500).json({ error: 'Failed to fetch savings goals' });
  }
});

// POST /api/savings-goals - Create new savings goal
router.post('/', async (req, res) => {
  try {
    const { name, target_amount, current_amount, deadline }: CreateSavingsGoalRequest = req.body;

    if (!name || !target_amount || target_amount <= 0) {
      return res.status(400).json({ error: 'Name and positive target amount are required' });
    }

    const result = await dbRun(`
      INSERT INTO savings_goals (name, target_amount, current_amount, deadline)
      VALUES (?, ?, ?, ?)
    `, [name, target_amount, current_amount || 0, deadline || null]);

    const newGoal = await dbGet(`
      SELECT * FROM savings_goals WHERE id = ?
    `, [(result as any).lastID]) as any;

    const formattedGoal = {
      ...newGoal,
      progress_percentage: newGoal.target_amount > 0 
        ? Math.round((newGoal.current_amount / newGoal.target_amount) * 100)
        : 0
    };

    res.status(201).json(formattedGoal);
  } catch (error) {
    console.error('Error creating savings goal:', error);
    res.status(500).json({ error: 'Failed to create savings goal' });
  }
});

// PUT /api/savings-goals/:id - Update savings goal
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, target_amount, current_amount, deadline } = req.body;

    await dbRun(`
      UPDATE savings_goals 
      SET name = ?, target_amount = ?, current_amount = ?, deadline = ?
      WHERE id = ?
    `, [name, target_amount, current_amount, deadline, id]);

    const updatedGoal = await dbGet(`
      SELECT * FROM savings_goals WHERE id = ?
    `, [id]) as any;

    if (!updatedGoal) {
      return res.status(404).json({ error: 'Savings goal not found' });
    }

    const formattedGoal = {
      ...updatedGoal,
      progress_percentage: updatedGoal.target_amount > 0 
        ? Math.round((updatedGoal.current_amount / updatedGoal.target_amount) * 100)
        : 0
    };

    res.json(formattedGoal);
  } catch (error) {
    console.error('Error updating savings goal:', error);
    res.status(500).json({ error: 'Failed to update savings goal' });
  }
});

// DELETE /api/savings-goals/:id - Delete savings goal
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbRun('DELETE FROM savings_goals WHERE id = ?', [id]);
    res.json({ message: 'Savings goal deleted successfully' });
  } catch (error) {
    console.error('Error deleting savings goal:', error);
    res.status(500).json({ error: 'Failed to delete savings goal' });
  }
});

export default router;