const { google } = require('googleapis');

async function grantAccessToFolders() {
    const auth = new google.auth.GoogleAuth({
        keyFile: 'google-credentials.json',
        scopes: ['https://www.googleapis.com/auth/drive']
    });

    const drive = google.drive({ version: 'v3', auth });

    // ID ваших папок
    const folders = [
        { id: '1WJMF3TKXcLTHYrfyrl8PDmYpR-f63Fys', name: 'Аддитивное производство' },
        { id: '18_tZMWWj19tWcJ8RK38JW4MX9h1rjijr', name: 'Технология машиностроения' },
        { id: '1mDpv59jVBdhdhAdfoCI33KXkL1s_zfxA', name: 'Производство авиационной техники' },
        { id: '1fOgO4s09FM1BkoaED0NrhbIojeGrPH6s', name: 'Медицинская оптика' }
    ];

    const serviceAccountEmail = 'teacher@natk-files.iam.gserviceaccount.com';

    console.log('🔧 Даю доступ Service Account к папкам...\n');

    for (const folder of folders) {
        try {
            await drive.permissions.create({
                fileId: folder.id,
                requestBody: {
                    role: 'writer', // Редактор
                    type: 'user',
                    emailAddress: serviceAccountEmail
                },
                sendNotificationEmail: false
            });

            console.log(`✅ Доступ к "${folder.name}" предоставлен`);
        } catch (error) {
            console.log(`❌ Ошибка с "${folder.name}":`, error.message);
        }
    }

    console.log('\n🎉 Готово! Проверьте доступ в Google Drive.');
}

grantAccessToFolders();