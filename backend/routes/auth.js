// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Регистрация
router.post('/register', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        
        // Валидация
        if (!email || !password || !role) {
            return res.status(400).json({ 
                success: false, 
                message: 'Все поля обязательны' 
            });
        }
        
        if (!['student', 'teacher', 'admin'].includes(role)) {
    return res.status(400).json({ 
        success: false, 
        message: 'Недопустимая роль' 
            });
}
        
        // Проверка существующего пользователя
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Пользователь с такой почтой уже существует' 
            });
        }
        
        // Создание пользователя
        const user = await User.create(email, password, role);
        
        res.json({ 
            success: true, 
            message: 'Регистрация успешна. Ожидайте подтверждения администратора.',
            user: user
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

// Авторизация
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Email и пароль обязательны' 
            });
        }
        
        // Поиск пользователя
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Неверный email или пароль' 
            });
        }
        
        // Проверка статуса
        if (user.status !== 'approved') {
            return res.status(403).json({ 
                success: false, 
                message: 'Аккаунт ожидает подтверждения администратора' 
            });
        }
        
        // Проверка пароля
        const isValidPassword = await User.verifyPassword(user, password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Неверный email или пароль' 
            });
        }
        
        // Создание токена
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: user.role 
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Удаляем пароль из ответа
        const { password_hash, ...userWithoutPassword } = user;
        
        res.json({ 
            success: true, 
            message: 'Авторизация успешна',
            token: token,
            user: userWithoutPassword
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

// Получение текущего пользователя
router.get('/me', authMiddleware.verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'Пользователь не найден' 
            });
        }
        
        res.json({ 
            success: true, 
            user: user
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

// Выход (на фронтенде просто удаляем токен)
router.post('/logout', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Выход выполнен' 
    });
});

module.exports = router;