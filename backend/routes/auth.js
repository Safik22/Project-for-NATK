const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Регистрация
router.post('/register', async (req, res) => {
    try {
        const { email, password, role, competenceIds } = req.body;

        console.log('=== РЕГИСТРАЦИЯ ===');
        console.log('Email:', email);
        console.log('Role:', role);
        console.log('competenceIds:', competenceIds); 
        
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
        
        // Для студента проверяем, что выбрана ровно одна компетенция
        if (role === 'student' && (!competenceIds || competenceIds.length !== 1)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Студент должен выбрать одну компетенцию' 
            });
        }
        
        // Для преподавателя проверяем, что выбрана хотя бы одна компетенция
        if (role === 'teacher' && (!competenceIds || competenceIds.length === 0)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Преподаватель должен выбрать хотя бы одну компетенцию' 
            });
        }
        
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'Пользователь с такой почтой уже существует' 
            });
        }
        
        // Создаем пользователя
        const user = await User.create(email, password, role);
        
        // Добавляем компетенции пользователю
        if (competenceIds && competenceIds.length > 0) {
            await User.addUserCompetences(user.id, competenceIds);
        }
        
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
        
        const user = await User.findByEmail(email);
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Неверный email или пароль' 
            });
        }
        
        if (user.status !== 'approved') {
            return res.status(403).json({ 
                success: false, 
                message: 'Аккаунт ожидает подтверждения администратора' 
            });
        }
        
        const isValidPassword = await User.verifyPassword(user, password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                message: 'Неверный email или пароль' 
            });
        }
        
        // Получаем группы пользователя и доступные компетенции
        const groups = await User.getUserGroups(user.id);
        const competences = await User.getUserCompetences(user.id, user.role);
        
        const token = jwt.sign(
            { 
                id: user.id, 
                email: user.email, 
                role: user.role,
                groups: groups.map(g => g.id),
                competences: competences.map(c => c.id)
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        const { password_hash, ...userWithoutPassword } = user;
        
        res.json({ 
            success: true, 
            message: 'Авторизация успешна',
            token: token,
            user: {
                ...userWithoutPassword,
                groups: groups,
                competences: competences
            }
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
        
        const groups = await User.getUserGroups(req.user.id);
        const competences = await User.getUserCompetences(req.user.id, user.role);
        
        res.json({ 
            success: true, 
            user: {
                ...user,
                groups: groups,
                competences: competences
            }
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

// Получить доступные компетенции для текущего пользователя
router.get('/my-competences', authMiddleware.verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const competences = await User.getUserCompetences(req.user.id, user.role);
        
        res.json({ 
            success: true, 
            competences: competences
        });
    } catch (error) {
        console.error('Get competences error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Ошибка сервера' 
        });
    }
});

router.post('/logout', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Выход выполнен' 
    });
});

module.exports = router;