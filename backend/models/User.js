// backend/models/User.js
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
    // Найти пользователя по email
    async findByEmail(email) {
        try {
            const result = await pool.query(
                'SELECT * FROM users WHERE email = $1',
                [email]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error finding user by email:', error);
            throw error;
        }
    },

    // Найти пользователя по ID
    async findById(id) {
        try {
            const result = await pool.query(
                'SELECT id, email, role, status, created_at FROM users WHERE id = $1',
                [id]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('Error finding user by id:', error);
            throw error;
        }
    },

    // Создать нового пользователя
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

    // Проверить пароль
    async verifyPassword(user, password) {
        try {
            return await bcrypt.compare(password, user.password_hash);
        } catch (error) {
            console.error('Error verifying password:', error);
            throw error;
        }
    },

    // Получить всех пользователей
    async getAll() {
        try {
            const result = await pool.query(
                'SELECT id, email, role, status, created_at FROM users ORDER BY created_at DESC'
            );
            return result.rows;
        } catch (error) {
            console.error('Error getting all users:', error);
            throw error;
        }
    },

    // Обновить статус пользователя
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

    // Удалить пользователя
    async delete(id) {
        try {
            const result = await pool.query(
                'DELETE FROM users WHERE id = $1 RETURNING id',
                [id]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }
};

module.exports = User;