const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const authMiddleware = require('../middleware/authMiddleware');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

router.use(authMiddleware.verifyToken);
router.use(authMiddleware.requireAdmin);

// Получить все группы
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT g.*, 
                    COUNT(DISTINCT ug.user_id) as user_count
             FROM groups g
             LEFT JOIN user_groups ug ON g.id = ug.group_id
             GROUP BY g.id
             ORDER BY g.name`
        );
        
        res.json({ success: true, groups: result.rows });
    } catch (error) {
        console.error('Error getting groups:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Создать группу
router.post('/', async (req, res) => {
    try {
        const { name, course, description } = req.body;
        
        const result = await pool.query(
            `INSERT INTO groups (name, course, description) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [name, course, description]
        );
        
        res.json({ success: true, group: result.rows[0] });
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Обновить группу
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, course, description } = req.body;
        
        const result = await pool.query(
            `UPDATE groups SET name = $1, course = $2, description = $3 
             WHERE id = $4 RETURNING *`,
            [name, course, description, id]
        );
        
        res.json({ success: true, group: result.rows[0] });
    } catch (error) {
        console.error('Error updating group:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Удалить группу
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await pool.query('DELETE FROM groups WHERE id = $1', [id]);
        
        res.json({ success: true, message: 'Группа удалена' });
    } catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Получить пользователей группы
router.get('/:id/users', async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            `SELECT u.id, u.email, u.role, u.status 
             FROM users u
             JOIN user_groups ug ON u.id = ug.user_id
             WHERE ug.group_id = $1
             ORDER BY u.role, u.email`,
            [id]
        );
        
        res.json({ success: true, users: result.rows });
    } catch (error) {
        console.error('Error getting group users:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Добавить пользователя в группу
router.post('/:groupId/users/:userId', async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        
        await pool.query(
            `INSERT INTO user_groups (user_id, group_id, assigned_by) 
             VALUES ($1, $2, $3) 
             ON CONFLICT (user_id, group_id) DO NOTHING`,
            [userId, groupId, req.user.id]
        );
        
        res.json({ success: true, message: 'Пользователь добавлен в группу' });
    } catch (error) {
        console.error('Error adding user to group:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Удалить пользователя из группы
router.delete('/:groupId/users/:userId', async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        
        await pool.query(
            'DELETE FROM user_groups WHERE user_id = $1 AND group_id = $2',
            [userId, groupId]
        );
        
        res.json({ success: true, message: 'Пользователь удален из группы' });
    } catch (error) {
        console.error('Error removing user from group:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;