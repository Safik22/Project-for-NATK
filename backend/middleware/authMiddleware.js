// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = {
    // Проверка токена
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

    // Проверка роли администратора
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

    // Проверка роли преподавателя
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

    // Проверка подтвержденного статуса
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
    }
};

module.exports = authMiddleware;