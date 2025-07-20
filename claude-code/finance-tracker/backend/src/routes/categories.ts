import { Router } from 'express';
import { dbRun, dbGet, dbAll } from '../models/database';
import { Category, CreateCategoryRequest } from '../types';

const router = Router();

// GET /api/categories - Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await dbAll(`
      SELECT * FROM categories
      ORDER BY type, name
    `) as Category[];

    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /api/categories - Create new category
router.post('/', async (req, res) => {
  try {
    const { name, type, color, icon }: CreateCategoryRequest = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    const result = await dbRun(`
      INSERT INTO categories (name, type, color, icon)
      VALUES (?, ?, ?, ?)
    `, [name, type, color || '#6B7280', icon || 'folder']);

    const newCategory = await dbGet(`
      SELECT * FROM categories WHERE id = ?
    `, [(result as any).lastID]);

    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error creating category:', error);
    if ((error as any).code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Category name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create category' });
    }
  }
});

// DELETE /api/categories/:id - Delete category
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if category is being used by any transactions
    const transactionCount = await dbGet(`
      SELECT COUNT(*) as count FROM transactions WHERE category_id = ?
    `, [id]) as any;

    if (transactionCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category that is being used by transactions' 
      });
    }

    await dbRun('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

export default router;