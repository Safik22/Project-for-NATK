const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Pool } = require('pg');
const authMiddleware = require('../middleware/authMiddleware');
const libre = require('libreoffice-convert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});

// Получить файлы по компетенции и категории
router.get('/competence/:competenceId/category/:categoryCode', authMiddleware.verifyToken, async (req, res) => {
    try {
        const { competenceId, categoryCode } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        
        const categoryResult = await pool.query(
            `SELECT id FROM categories WHERE code = $1 AND competence_id = $2`,
            [categoryCode, competenceId]
        );
        
        if (categoryResult.rows.length === 0) {
            return res.json({ success: true, documents: [] });
        }
        
        const categoryId = categoryResult.rows[0].id;
        
        let query = `
            SELECT d.id, d.name, d.file_name, d.mime_type, d.file_size, 
                   d.created_at, d.uploaded_by, u.email as uploaded_by_email
            FROM documents d
            LEFT JOIN users u ON d.uploaded_by = u.id
            WHERE d.competence_id = $1 AND d.category_id = $2
        `;
        const params = [competenceId, categoryId];
        
        if (userRole === 'student') {
            query += ` AND (d.group_id IN (SELECT group_id FROM user_groups WHERE user_id = $3) OR d.is_public = true)`;
            params.push(userId);
        }
        
        query += ` ORDER BY d.created_at DESC`;
        
        const result = await pool.query(query, params);
        
        res.json({ success: true, documents: result.rows });
    } catch (error) {
        console.error('Error getting documents:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Загрузить файл
router.post('/upload', 
    authMiddleware.verifyToken,
    authMiddleware.requireTeacher,
    upload.single('file'),
    async (req, res) => {
        try {
            const { name, categoryCode, competenceId } = req.body;
            const file = req.file;
            const userId = req.user.id;
            
            if (!file) {
                return res.status(400).json({ success: false, message: 'Файл не загружен' });
            }
            
            const categoryResult = await pool.query(
                `SELECT id FROM categories WHERE code = $1 AND competence_id = $2`,
                [categoryCode, competenceId]
            );
            
            if (categoryResult.rows.length === 0) {
                return res.status(400).json({ success: false, message: 'Категория не найдена' });
            }
            
            const categoryId = categoryResult.rows[0].id;
            
            const groupResult = await pool.query(
                `SELECT group_id FROM user_groups WHERE user_id = $1 LIMIT 1`,
                [userId]
            );
            const groupId = groupResult.rows[0]?.group_id || null;
            
            const result = await pool.query(
                `INSERT INTO documents (
                    name, file_name, file_data, mime_type, file_size, 
                    competence_id, category_id, uploaded_by, group_id, is_public
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id, name, file_name, mime_type`,
                [name, file.originalname, file.buffer, file.mimetype, file.size, 
                 competenceId, categoryId, userId, groupId, true]
            );
            
            res.json({ success: true, message: 'Файл загружен', document: result.rows[0] });
        } catch (error) {
            console.error('Error uploading:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

// Просмотр файла с конвертацией Office в PDF
router.get('/:id/view', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Проверяем токен в заголовке или в URL
        let token = req.headers['authorization'];
        if (!token && req.query.token) {
            token = `Bearer ${req.query.token}`;
        }
        
        if (!token) {
            return res.status(401).send('Требуется авторизация');
        }
        
        // Проверяем токен
        const jwt = require('jsonwebtoken');
        let userId;
        try {
            const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
            userId = decoded.id;
        } catch (error) {
            return res.status(403).send('Неверный токен');
        }
        
        // Получаем файл
        const result = await pool.query(
            'SELECT file_data, mime_type, file_name FROM documents WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).send('Файл не найден');
        }
        
        const file = result.rows[0];
        
        // Проверяем доступ
        const docResult = await pool.query(
            `SELECT group_id, is_public FROM documents WHERE id = $1`,
            [id]
        );
        const doc = docResult.rows[0];
        const userResult = await pool.query(
            `SELECT role FROM users WHERE id = $1`,
            [userId]
        );
        const userRole = userResult.rows[0]?.role;
        
        if (userRole !== 'admin' && !doc.is_public) {
            const groupAccess = await pool.query(
                `SELECT 1 FROM user_groups WHERE user_id = $1 AND group_id = $2`,
                [userId, doc.group_id]
            );
            if (groupAccess.rows.length === 0 && doc.group_id) {
                return res.status(403).send('Доступ запрещен');
            }
        }
        
        // Если это PDF - отдаем напрямую
        if (file.mime_type === 'application/pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.file_name)}"`);
            res.send(file.file_data);
            return;
        }
        
        // Если это Office файл - конвертируем в PDF
        const officeTypes = [
            'application/msword',           // .doc
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
            'application/vnd.ms-powerpoint', // .ppt
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
            'application/vnd.ms-excel',     // .xls
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // .xlsx
        ];
        
        if (officeTypes.includes(file.mime_type)) {
            console.log(`🔄 Конвертируем ${file.file_name} в PDF...`);
            
            // Конвертируем в PDF
            libre.convert(file.file_data, '.pdf', undefined, (err, pdfBuffer) => {
                if (err) {
                    console.error('Conversion error:', err);
                    // Если конвертация не удалась, предлагаем скачать
                    res.setHeader('Content-Type', 'text/html');
                    res.send(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <meta charset="UTF-8">
                            <style>
                                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                                .container { max-width: 500px; margin: 0 auto; }
                                .error { color: #e74c3c; font-size: 48px; margin-bottom: 20px; }
                                .btn { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #006ea6; color: white; text-decoration: none; border-radius: 5px; }
                                .btn:hover { background: #005a8c; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="error">⚠️</div>
                                <h2>Предварительный просмотр недоступен</h2>
                                <p>Файл "${file.file_name}" не может быть отображен в браузере.</p>
                                <a href="/api/documents/${id}/download?token=${encodeURIComponent(token.split(' ')[1])}" class="btn">
                                    📥 Скачать файл
                                </a>
                            </div>
                        </body>
                        </html>
                    `);
                    return;
                }
                
                console.log(`✅ Конвертация завершена, размер PDF: ${pdfBuffer.length} байт`);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.file_name.replace(/\.(docx?|pptx?|xlsx?)$/i, '.pdf'))}"`);
                res.send(pdfBuffer);
            });
            return;
        }
        
        // Для остальных типов - скачивание
        res.setHeader('Content-Type', file.mime_type);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.file_name)}"`);
        res.send(file.file_data);
        
    } catch (error) {
        console.error('Error viewing file:', error);
        res.status(500).send('Ошибка просмотра файла');
    }
});

// Скачать файл
router.get('/:id/download', async (req, res) => {
    try {
        const { id } = req.params;
        
        let token = req.headers['authorization'];
        if (!token && req.query.token) {
            token = `Bearer ${req.query.token}`;
        }
        
        if (!token) {
            return res.status(401).json({ success: false, message: 'Требуется авторизация' });
        }
        
        const jwt = require('jsonwebtoken');
        try {
            jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
        } catch (error) {
            return res.status(403).json({ success: false, message: 'Неверный токен' });
        }
        
        const result = await pool.query(
            'SELECT file_data, file_name, mime_type FROM documents WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Файл не найден' });
        }
        
        const file = result.rows[0];
        
        res.setHeader('Content-Type', file.mime_type);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.file_name)}"`);
        res.send(file.file_data);
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// Удалить файл
router.delete('/:id', 
    authMiddleware.verifyToken,
    authMiddleware.requireTeacher,
    async (req, res) => {
        try {
            const { id } = req.params;
            
            const result = await pool.query(
                'DELETE FROM documents WHERE id = $1 RETURNING id',
                [id]
            );
            
            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Файл не найден' });
            }
            
            res.json({ success: true, message: 'Файл удален' });
        } catch (error) {
            console.error('Error deleting document:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }
);

module.exports = router;