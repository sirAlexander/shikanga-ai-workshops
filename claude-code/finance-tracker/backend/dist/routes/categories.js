"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../models/database");
const router = (0, express_1.Router)();
// GET /api/categories - Get all categories
router.get('/', async (req, res) => {
    try {
        const categories = await (0, database_1.dbAll)(`
      SELECT * FROM categories
      ORDER BY type, name
    `);
        res.json(categories);
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
// POST /api/categories - Create new category
router.post('/', async (req, res) => {
    try {
        const { name, type, color, icon } = req.body;
        if (!name || !type) {
            return res.status(400).json({ error: 'Name and type are required' });
        }
        const result = await (0, database_1.dbRun)(`
      INSERT INTO categories (name, type, color, icon)
      VALUES (?, ?, ?, ?)
    `, [name, type, color || '#6B7280', icon || 'folder']);
        const newCategory = await (0, database_1.dbGet)(`
      SELECT * FROM categories WHERE id = ?
    `, [result.lastID]);
        res.status(201).json(newCategory);
    }
    catch (error) {
        console.error('Error creating category:', error);
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(400).json({ error: 'Category name already exists' });
        }
        else {
            res.status(500).json({ error: 'Failed to create category' });
        }
    }
});
// DELETE /api/categories/:id - Delete category
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Check if category is being used by any transactions
        const transactionCount = await (0, database_1.dbGet)(`
      SELECT COUNT(*) as count FROM transactions WHERE category_id = ?
    `, [id]);
        if (transactionCount.count > 0) {
            return res.status(400).json({
                error: 'Cannot delete category that is being used by transactions'
            });
        }
        await (0, database_1.dbRun)('DELETE FROM categories WHERE id = ?', [id]);
        res.json({ message: 'Category deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});
exports.default = router;
//# sourceMappingURL=categories.js.map