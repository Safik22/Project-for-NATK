const { google } = require('googleapis');
const readline = require('readline');

const CLIENT_ID = '187147043099-9hetvjdsj81d2270v64iriqk7gaes617.apps.googleusercontent.com';
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

console.log('🔗 Перейдите по ссылке:\n', authUrl);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('\n📋 Введите код: ', async (code) => {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✅ Сохраните в .env:');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    rl.close();
});