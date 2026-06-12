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

// Получить компетенции для текущего пользователя
router.get('/', authMiddleware.verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        
        let competences;
        
        if (userRole === 'admin') {
            const result = await pool.query('SELECT * FROM competences ORDER BY id');
            competences = result.rows;
        } else {
            // Получаем компетенции через группы пользователя
            const result = await pool.query(
                `SELECT DISTINCT c.* FROM competences c
                 JOIN group_competences gc ON c.id = gc.competence_id
                 JOIN user_groups ug ON gc.group_id = ug.group_id
                 WHERE ug.user_id = $1
                 ORDER BY c.id`,
                [userId]
            );
            competences = result.rows;
        }
        
        res.json({ success: true, competences });
    } catch (error) {
        console.error('Error getting competences:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;