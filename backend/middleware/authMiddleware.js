const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = {
    verifyToken: (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'Требуется авторизация' 
            });
        }
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Токен просрочен' 
                });
            }
            return res.status(403).json({ 
                success: false, 
                message: 'Неверный токен' 
            });
        }
    },

    requireAdmin: async (req, res, next) => {
        try {
            const user = await User.findById(req.user.id);
            
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Пользователь не найден' 
                });
            }
            
            if (user.role !== 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Требуются права администратора' 
                });
            }
            
            next();
        } catch (error) {
            console.error('Admin check error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Ошибка сервера' 
            });
        }
    },

    requireTeacher: async (req, res, next) => {
        try {
            const user = await User.findById(req.user.id);
            
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Пользователь не найден' 
                });
            }
            
            if (user.role !== 'teacher' && user.role !== 'admin') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Требуются права преподавателя' 
                });
            }
            
            next();
        } catch (error) {
            console.error('Teacher check error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Ошибка сервера' 
            });
        }
    },

    requireApproved: async (req, res, next) => {
        try {
            const user = await User.findById(req.user.id);
            
            if (!user) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Пользователь не найден' 
                });
            }
            
            if (user.status !== 'approved') {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Аккаунт не подтвержден' 
                });
            }
            
            next();
        } catch (error) {
            console.error('Approved check error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Ошибка сервера' 
            });
        }
    },

    // НОВАЯ ФУНКЦИЯ: Проверка доступа к компетенции
    // Добавьте этот метод в authMiddleware
requireCompetenceAccess: (competenceCodeParam = 'competenceCode') => {
    return async (req, res, next) => {
        try {
            const competenceCode = req.params[competenceCodeParam] || req.body.competenceCode;
            
            if (!competenceCode) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Не указана компетенция' 
                });
            }
            
            // Получаем ID компетенции по коду
            const { Pool } = require('pg');
            const pool = new Pool({
                user: process.env.DB_USER,
                host: process.env.DB_HOST,
                database: process.env.DB_NAME,
                password: process.env.DB_PASSWORD,
                port: process.env.DB_PORT,
            });
            
            const compResult = await pool.query(
                'SELECT id FROM competences WHERE code = $1',
                [competenceCode]
            );
            
            if (compResult.rows.length === 0) {
                return res.status(404).json({ 
                    success: false, 
                    message: 'Компетенция не найдена' 
                });
            }
            
            const competenceId = compResult.rows[0].id;
            const user = await User.findById(req.user.id);
            
            if (user.role === 'admin') {
                return next();
            }
            
            const hasAccess = await User.hasCompetenceAccess(req.user.id, competenceId, user.role);
            
            if (!hasAccess) {
                return res.status(403).json({ 
                    success: false, 
                    message: 'Доступ к этой компетенции запрещен' 
                });
            }
            
            next();
        } catch (error) {
            console.error('Competence access check error:', error);
            res.status(500).json({ 
                success: false, 
                message: 'Ошибка проверки доступа' 
            });
        }
    };
}
};

module.exports = authMiddleware;