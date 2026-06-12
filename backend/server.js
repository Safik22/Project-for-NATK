const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const groupsRoutes = require('./routes/groups');
const competencesRoutes = require('./routes/competences');
const documentsRoutes = require('./routes/documents'); // НОВЫЙ МАРШРУТ

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

app.use(express.json());

app.use(express.static(path.join(__dirname, '..')));

console.log('📁 Статические файлы из:', path.join(__dirname, '..'));

// Маршруты
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/competences', competencesRoutes);
app.use('/api/documents', documentsRoutes); // НОВЫЙ МАРШРУТ

app.get('/', (req, res) => {
    res.json({ 
        message: '🚀 API НАТК работает!',
        version: '2.0.0',
        endpoints: {
            auth: { register: 'POST /api/auth/register', login: 'POST /api/auth/login', me: 'GET /api/auth/me' },
            admin: { users: 'GET /api/admin/users' },
            groups: { list: 'GET /api/groups' },
            competences: { list: 'GET /api/competences' },
            documents: { list: 'GET /api/documents/competence/:id', upload: 'POST /api/documents/upload', delete: 'DELETE /api/documents/:id' }
        }
    });
});

app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Маршрут не найден' });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ success: false, message: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`🚀 Сервер НАТК запущен!`);
    console.log(`📍 Порт: ${PORT}`);
    console.log(`🌐 API: http://localhost:${PORT}`);
    console.log(`=================================`);
});