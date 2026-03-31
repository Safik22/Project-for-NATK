const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const multer = require('multer');
const authMiddleware = require('../middleware/authMiddleware');
const { Readable } = require('stream');

// Настройка multer для загрузки файлов
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    }
});

// OAuth 2.0 клиент
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
);

// Устанавливаем refresh token
if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });
}

const drive = google.drive({ 
    version: 'v3', 
    auth: oauth2Client 
});

// ID ваших папок
const DRIVE_FOLDERS = {
    'additive': '1WJMF3TKXcLTHYrfyrl8PDmYpR-f63Fys',
    'technology': '18_tZMWWj19tWcJ8RK38JW4MX9h1rjijr',
    'information': '1mDpv59jVBdhdhAdfoCI33KXkL1s_zfxA',
    'optica': '1fOgO4s09FM1BkoaED0NrhbIojeGrPH6s'
};




router.get('/test', async (req, res) => {
    try {
        const hasToken = !!process.env.GOOGLE_REFRESH_TOKEN;
        res.json({
            success: true,
            message: 'Drive API работает',
            hasRefreshToken: hasToken,
            folders: DRIVE_FOLDERS,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.use(authMiddleware.verifyToken); 
router.use(authMiddleware.requireApproved); 


router.get('/files/:competence', async (req, res) => {
    try {
        const { competence } = req.params;
        const folderId = DRIVE_FOLDERS[competence];
        
        if (!folderId) {
            return res.status(404).json({ success: false, message: 'Папка не найдена' });
        }

        console.log(`📂 Запрос файлов для ${competence} от пользователя ${req.user.email} (${req.user.role})`);

        const response = await drive.files.list({
            pageSize: 100,
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType, webViewLink, size)',
            orderBy: 'name'
        });

        const files = response.data.files || [];
        
        res.json({
            success: true,
            files: files.map(file => ({
                id: file.id,
                name: file.name,
                url: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
                previewUrl: `https://drive.google.com/file/d/${file.id}/preview`,
                mimeType: file.mimeType
            }))
        });
    } catch (error) {
        console.error('❌ Ошибка получения файлов:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});


router.use(authMiddleware.requireTeacher); 


router.post('/upload/:competence', upload.single('file'), async (req, res) => {
    try {
        const { competence } = req.params;
        const { fileName } = req.body;
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({ success: false, message: 'Файл не выбран' });
        }

        const folderId = DRIVE_FOLDERS[competence];
        if (!folderId) {
            return res.status(404).json({ success: false, message: 'Папка не найдена' });
        }

        console.log(`📤 Преподаватель ${req.user.email} загружает файл: ${fileName || file.originalname} в ${competence}`);

        // Конвертируем Buffer в Stream
        const bufferStream = new Readable();
        bufferStream.push(file.buffer);
        bufferStream.push(null);

        const response = await drive.files.create({
            requestBody: {
                name: fileName || file.originalname,
                parents: [folderId]
            },
            media: {
                mimeType: file.mimetype,
                body: bufferStream
            },
            fields: 'id, name, webViewLink'
        });

        // Делаем файл публичным
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone'
            }
        });

        console.log(`✅ Файл загружен: ${response.data.id}`);

        res.json({
            success: true,
            message: 'Файл загружен',
            file: {
                id: response.data.id,
                name: response.data.name,
                url: response.data.webViewLink,
                previewUrl: `https://drive.google.com/file/d/${response.data.id}/preview`
            }
        });
    } catch (error) {
        console.error('❌ Ошибка загрузки:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Ошибка загрузки файла'
        });
    }
});


router.delete('/files/:fileId', async (req, res) => {
    try {
        const { fileId } = req.params;
        
        console.log(`🗑️ Преподаватель ${req.user.email} удаляет файл: ${fileId}`);
        
        await drive.files.delete({ fileId });
        
        res.json({ success: true, message: 'Файл удален' });
    } catch (error) {
        console.error('❌ Ошибка удаления:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;