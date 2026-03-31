// backend/routes/admin.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Все маршруты требуют админских прав
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.requireAdmin);

// Получить всех пользователей
router.get('/users', async (req, res) => {
    try {
        const users = await User.getAll();
        res.json({ 
            success: true, 
            users: users 
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

// Подтвердить пользователя
router.post('/users/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.updateStatus(id, 'approved');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Пользователь не найден' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Пользователь подтвержден',
            user: user
        });
    } catch (error) {
        console.error('Approve user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

// Отклонить пользователя
router.post('/users/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.updateStatus(id, 'rejected');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Пользователь не найден' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Пользователь отклонен',
            user: user
        });
    } catch (error) {
        console.error('Reject user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

// Удалить пользователя
router.delete('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.delete(id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Пользователь не найден' 
            });
        }
        
        res.json({ 
            success: true, 
            message: 'Пользователь удален'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

module.exports = router;