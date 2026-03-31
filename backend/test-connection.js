const { google } = require('googleapis');

async function testConnection() {
    console.log('🔍 Тестирую подключение к Google Drive...\n');

    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: 'google-credentials.json',
            scopes: ['https://www.googleapis.com/auth/drive']
        });

        const client = await auth.getClient();
        console.log('✅ Service Account подключен:', client.email);

        const drive = google.drive({ version: 'v3', auth });

        // Тестируем первую папку
        const testFolderId = '1WJMF3TKXcLTHYrfyrl8PDmYpR-f63Fys';
        
        const folder = await drive.files.get({
            fileId: testFolderId,
            fields: 'id, name'
        });

        console.log('✅ Папка найдена:', folder.data.name);

        // Проверяем доступ
        const files = await drive.files.list({
            pageSize: 5,
            q: `'${testFolderId}' in parents`,
            fields: 'files(id, name)'
        });

        console.log('✅ Доступ к файлам есть');
        console.log('📁 Файлов в папке:', files.data.files.length);

        console.log('\n🎉 ВСЁ РАБОТАЕТ! Можно запускать сервер.');

    } catch (error) {
        console.error('❌ Ошибка:', error.message);
        console.log('\n⚠️  Проверьте:');
        console.log('1. Файл google-credentials.json в папке backend');
        console.log('2. Service Account добавлен в папки Google Drive как редактор');
        console.log('3. Google Drive API включен в Google Cloud Console');
    }
}

testConnection();