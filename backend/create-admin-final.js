// create-admin-final.js
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

console.log('🎯 Создание администратора НАТК...\n');

async function createAdmin() {
    const pool = new Pool({
        user: 'postgres',
        host: 'localhost',
        database: 'auth',
        password: 'postgres', 
        port: 5432,
    });

    try {
        console.log('1. Проверяем текущих пользователей...');
        const currentUsers = await pool.query('SELECT email, role, status FROM users');
        
        console.log(`   Найдено: ${currentUsers.rows.length} пользователей`);
        currentUsers.rows.forEach(user => {
            console.log(`   - ${user.email} (${user.role}, ${user.status})`);
        });

        console.log('\n2. Удаляем старого администратора...');
        await pool.query("DELETE FROM users WHERE email = 'admin@natk.ru'");
        console.log('   ✅ Удален');

        console.log('\n3. Создаем нового администратора...');
        const password = 'admin123';
        const passwordHash = await bcrypt.hash(password, 10);
        
        console.log(`   Пароль: ${password}`);
        console.log(`   Хеш (первые 30 символов): ${passwordHash.substring(0, 30)}...`);

        const result = await pool.query(
            `INSERT INTO users (email, password_hash, role, status) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id, email, role, status, created_at`,
            ['admin@natk.ru', passwordHash, 'admin', 'approved']
        );

        const newAdmin = result.rows[0];
        console.log('\n   ✅ Администратор создан!');
        console.log(`   ID: ${newAdmin.id}`);
        console.log(`   Email: ${newAdmin.email}`);
        console.log(`   Роль: ${newAdmin.role}`);
        console.log(`   Статус: ${newAdmin.status}`);
        console.log(`   Дата: ${newAdmin.created_at}`);

        // 4. Проверяем пароль
        console.log('\n4. Проверяем, что пароль работает...');
        const isMatch = await bcrypt.compare(password, passwordHash);
        console.log(`   Пароль "admin123" проверен: ${isMatch ? '✅ СОВПАДАЕТ' : '❌ НЕ СОВПАДАЕТ'}`);

        if (!isMatch) {
            throw new Error('Что-то не так с хешированием пароля!');
        }

        
        console.log('\n5. Финальная проверка всех пользователей...');
        const allUsers = await pool.query(
            'SELECT email, role, status FROM users ORDER BY created_at'
        );
        
        console.log(`\n   Всего пользователей в системе: ${allUsers.rows.length}`);
        allUsers.rows.forEach((user, index) => {
            const badge = user.role === 'admin' ? '👑' : user.role === 'teacher' ? '👨‍🏫' : '👨‍🎓';
            console.log(`   ${index + 1}. ${badge} ${user.email} - ${user.role} (${user.status})`);
        });

        console.log('\n🎉 ГОТОВО! Теперь вы можете войти:');
        console.log('   👉 Email: admin@natk.ru');
        console.log('   🔑 Пароль: admin123');
        console.log('   🌐 Страница: login.html');

    } catch (error) {
        console.error('\n❌ Ошибка:', error.message);
        console.log('\n📋 Возможные решения:');
        console.log('1. Убедитесь, что PostgreSQL запущен');
        console.log('2. Проверьте пароль в .env файле');
        console.log('3. Проверьте существование базы "auth"');
    } finally {
        await pool.end();
    }
}

createAdmin();