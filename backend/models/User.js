const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const User = {
    async findByEmail(email) {
        try {
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
    },

    async addUserCompetences(userId, competenceIds) {
        try {
            console.log(`Добавление компетенций для пользователя ${userId}:`, competenceIds);
            for (const competenceId of competenceIds) {
                await pool.query(
                    `INSERT INTO user_competences (user_id, competence_id) 
                     VALUES ($1, $2) 
                     ON CONFLICT (user_id, competence_id) DO NOTHING`,
                    [userId, competenceId]
                );
            }
            console.log(`✅ Добавлено ${competenceIds.length} компетенций`);
            return true;
        } catch (error) {
            console.error('Error adding user competences:', error);
            throw error;
        }
    },

    // Получить компетенции пользователя (сначала из user_competences, потом из групп)
async getUserCompetences(userId, userRole) {
    try {
        console.log(`getUserCompetences для userId=${userId}, role=${userRole}`);
        
        if (userRole === 'admin') {
            const result = await pool.query('SELECT * FROM competences ORDER BY id');
            return result.rows;
        }
        
        // Сначала проверяем прямые привязки через user_competences (при регистрации)
        const directResult = await pool.query(
            `SELECT c.* FROM competences c
             JOIN user_competences uc ON c.id = uc.competence_id
             WHERE uc.user_id = $1
             ORDER BY c.id`,
            [userId]
        );
        
        console.log(`Прямые компетенции из user_competences: ${directResult.rows.length}`);
        
        if (directResult.rows.length > 0) {
            return directResult.rows;
        }
        
        // Если нет прямых привязок, берем через группы
        const groupResult = await pool.query(
            `SELECT DISTINCT c.* FROM competences c
             JOIN group_competences gc ON c.id = gc.competence_id
             JOIN user_groups ug ON gc.group_id = ug.group_id
             WHERE ug.user_id = $1
             ORDER BY c.id`,
            [userId]
        );
        
        console.log(`Компетенции из групп: ${groupResult.rows.length}`);
        return groupResult.rows;
    } catch (error) {
        console.error('Error getting user competences:', error);
        return [];
    }
},

    async getUserGroups(userId) {
        try {
            const result = await pool.query(
                `SELECT g.* FROM groups g
                 JOIN user_groups ug ON g.id = ug.group_id
                 WHERE ug.user_id = $1`,
                [userId]
            );
            return result.rows;
        } catch (error) {
            console.error('Error getting user groups:', error);
            throw error;
        }
    },

    async findById(id) {
        try {
            const result = await pool.query(
                `SELECT u.id, u.email, u.role, u.status, u.created_at,
                        COALESCE((SELECT json_agg(g.*) FROM user_groups ug JOIN groups g ON ug.group_id = g.id WHERE ug.user_id = u.id), '[]'::json) as groups
                 FROM users u WHERE u.id = $1`,
                [id]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error finding user by id:', error);
            throw error;
        }
    },

    async create(email, password, role = 'student') {
        try {
            const passwordHash = await bcrypt.hash(password, 10);
            const result = await pool.query(
                `INSERT INTO users (email, password_hash, role, status) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING id, email, role, status, created_at`,
                [email, passwordHash, role, 'pending']
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    },

    async verifyPassword(user, password) {
        try {
            return await bcrypt.compare(password, user.password_hash);
        } catch (error) {
            console.error('Error verifying password:', error);
            throw error;
        }
    },

    async getAll() {
        try {
            const result = await pool.query(
                `SELECT u.id, u.email, u.role, u.status, u.created_at,
                        COALESCE((SELECT json_agg(g.*) FROM user_groups ug JOIN groups g ON ug.group_id = g.id WHERE ug.user_id = u.id), '[]'::json) as groups
                 FROM users u ORDER BY u.created_at DESC`
            );
            return result.rows;
        } catch (error) {
            console.error('Error getting all users:', error);
            throw error;
        }
    },

    async updateStatus(id, status) {
        try {
            const result = await pool.query(
                'UPDATE users SET status = $1 WHERE id = $2 RETURNING id, email, role, status',
                [status, id]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error updating user status:', error);
            throw error;
        }
    },

    async delete(id) {
        try {
            const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
            return result.rows[0];
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }
};

module.exports = User;