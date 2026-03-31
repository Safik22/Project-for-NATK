const { google } = require('googleapis');
const readline = require('readline');

// ВСТАВЬТЕ ТОЛЬКО ЧТО СОЗДАННЫЕ ДАННЫЕ!
const CLIENT_ID = '1018039944270-e7a5dbcq7ivqcica3eok3no241lkbflq.apps.googleusercontent.com';
const CLIENT_SECRET = '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';

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
);

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive'],
    prompt: 'consent'
});

console.log('\n🔗 ПЕРЕЙДИТЕ ПО ЭТОЙ ССЫЛКЕ:\n');
console.log(authUrl);
console.log('\n📝 РАЗРЕШИТЕ ДОСТУП');
console.log('📋 СКОПИРУЙТЕ КОД\n');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Введите код: ', async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('\n✅ УСПЕХ! ТОКЕНЫ ПОЛУЧЕНЫ\n');
        console.log('=== СКОПИРУЙТЕ ЭТО В .env ===\n');
        console.log(`GOOGLE_CLIENT_ID=${CLIENT_ID}`);
        console.log(`GOOGLE_CLIENT_SECRET=${CLIENT_SECRET}`);
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
        console.log('==============================\n');
    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
        console.log('\n🔧 Решение:');
        console.log('1. Client ID и Secret точно скопированы?');
        console.log('2. Вы вошли в тот же аккаунт, где создавали проект?');
        console.log('3. Попробуйте режим инкогнито заново');
    }
    rl.close();
});