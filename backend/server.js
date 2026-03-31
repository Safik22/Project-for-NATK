// backend/server.js
const driveRoutes = require('./routes/drive');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors({
    origin: '*', 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));;
app.use(express.json());


app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/drive', driveRoutes);

// Тестовые маршруты
app.get('/', (req, res) => {
    res.json({ 
        message: '🚀 API НАТК работает!',
        version: '1.0.0',
        endpoints: {
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                me: 'GET /api/auth/me'
            },
            admin: {
                users: 'GET /api/admin/users',
                approve: 'POST /api/admin/users/:id/approve'
            }
        }
    });
});

app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API тест пройден',
        timestamp: new Date().toISOString()
    });
});

// Обработка 404
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: 'Маршрут не найден' 
    });
});

// Обработка ошибок
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        success: false, 
        message: 'Внутренняя ошибка сервера' 
    });
});

app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 Сервер НАТК запущен!`);
    console.log(`📍 Порт: ${PORT}`);
    console.log(`🌐 API: http://localhost:${PORT}`);
    console.log(`🔧 Режим: ${process.env.NODE_ENV || 'development'}`);
    console.log(`=================================`);
});