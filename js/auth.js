const API_BASE_URL = 'http://localhost:3000';
const API_URL = `${API_BASE_URL}/api`;

// Проверка авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname;
    const isAuthPage = currentPage.includes('login.html') || currentPage.includes('register.html');
    
    if (isAuthPage) {
        checkAuthStatus();
    }
    
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    checkIfAlreadyLoggedIn();
});

async function checkAuthStatus() {
    const token = getToken();
    const user = getUser();
    
    if (token && user) {
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    showAlreadyLoggedInMessage(user);
                    return;
                }
            }
        } catch (error) {
            console.log('Токен невалиден');
        }
    }
}

function checkIfAlreadyLoggedIn() {
    const token = getToken();
    const user = getUser();
    const currentPage = window.location.pathname;
    
    if ((currentPage.includes('login.html') || currentPage.includes('register.html')) && token && user) {
        showAlreadyLoggedInMessage(user);
    }
}

function showAlreadyLoggedInMessage(user) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const messageDiv = document.getElementById('alreadyLoggedIn') || createAlreadyLoggedInDiv();
    
    if (loginForm) loginForm.style.display = 'none';
    if (registerForm) registerForm.style.display = 'none';
    
    messageDiv.innerHTML = `
        <div style="background: #f8f9fa; border: 2px solid #006ea6; border-radius: 10px; padding: 25px; text-align: center; margin: 20px 0;">
            <h3 style="color: #006ea6; margin-top: 0;">Вы уже авторизованы в системе</h3>
            <p>Вы вошли как: <strong>${user.email}</strong></p>
            <p>Роль: <strong>${getRoleName(user.role)}</strong></p>
            <p>Статус: <strong>${getStatusName(user.status)}</strong></p>
            ${user.groups ? `<p>Группы: <strong>${user.groups.map(g => g.name).join(', ')}</strong></p>` : ''}
            
            <div style="display: flex; gap: 15px; justify-content: center; margin-top: 25px; flex-wrap: wrap;">
                <button onclick="goToDashboard()" style="background: #006ea6; color: white; border: none; padding: 12px 25px; border-radius: 8px; cursor: pointer; font-size: 16px; min-width: 200px;">
                    📊 Перейти в панель управления
                </button>
                <button onclick="logoutAndStay()" style="background: #6c757d; color: white; border: none; padding: 12px 25px; border-radius: 8px; cursor: pointer; font-size: 16px; min-width: 200px;">
                    🔄 Выйти и войти снова
                </button>
                <button onclick="logout()" style="background: #e74c3c; color: white; border: none; padding: 12px 25px; border-radius: 8px; cursor: pointer; font-size: 16px; min-width: 200px;">
                    🚪 Выйти из системы
                </button>
            </div>
        </div>
    `;
    messageDiv.style.display = 'block';
}

function createAlreadyLoggedInDiv() {
    const div = document.createElement('div');
    div.id = 'alreadyLoggedIn';
    const container = document.querySelector('.auth-form-container') || document.querySelector('.admin-container') || document.body;
    container.insertBefore(div, container.firstChild);
    return div;
}

// ========== ГЛАВНАЯ ФУНКЦИЯ РЕГИСТРАЦИИ (с компетенциями) ==========
async function handleRegister(e) {
    e.preventDefault();
    
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role = document.getElementById('role').value;
    const messageDiv = document.getElementById('registerMessage') || document.getElementById('errorMessage');
    
    // Получаем выбранные компетенции
    let competenceIds = [];
    
    if (role === 'student') {
        const selectedRadio = document.querySelector('input[name="competence"]:checked');
        if (selectedRadio) {
            competenceIds = [parseInt(selectedRadio.value)];
        }
    } else if (role === 'teacher') {
        const checkboxes = document.querySelectorAll('input[name="competence"]:checked');
        competenceIds = Array.from(checkboxes).map(cb => parseInt(cb.value));
    }
    
    console.log('Выбранные компетенции:', competenceIds); // Для отладки
    
    if (!email || !password || !confirmPassword || !role) {
        showMessage('Заполните все поля', 'error', messageDiv);
        return;
    }
    
    if (password !== confirmPassword) {
        showMessage('Пароли не совпадают', 'error', messageDiv);
        return;
    }
    
    if (password.length < 8) {
        showMessage('Пароль должен быть не менее 8 символов', 'error', messageDiv);
        return;
    }
    
    // Проверки для компетенций
    if (role === 'student' && competenceIds.length !== 1) {
        showMessage('Студент должен выбрать одну компетенцию', 'error', messageDiv);
        return;
    }
    
    if (role === 'teacher' && competenceIds.length === 0) {
        showMessage('Преподаватель должен выбрать хотя бы одну компетенцию', 'error', messageDiv);
        return;
    }
    
    try {
        showMessage('Регистрация...', 'info', messageDiv);
        
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email, 
                password, 
                role,
                competenceIds 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('✅ ' + data.message + '<br>Через 3 секунды вы будете перенаправлены на страницу входа.', 'success', messageDiv);
            document.getElementById('registerForm').reset();
            setTimeout(() => { window.location.href = 'login.html'; }, 3000);
        } else {
            showMessage('❌ ' + data.message, 'error', messageDiv);
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        showMessage('❌ Ошибка соединения с сервером', 'error', messageDiv);
    }
}

// ========== ФУНКЦИЯ ВХОДА ==========
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    
    if (!email || !password) {
        showMessage('Заполните все поля', 'error', errorMessage);
        return;
    }
    
    try {
        showMessage('Авторизация...', 'info', errorMessage);
        
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage('✅ Авторизация успешна!', 'success', errorMessage);
            saveToken(data.token);
            saveUser(data.user);
            setTimeout(() => { redirectByRole(data.user.role); }, 1000);
        } else {
            showMessage('❌ ' + data.message, 'error', errorMessage);
        }
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        showMessage('❌ Сервер недоступен', 'error', errorMessage);
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function showMessage(message, type, element) {
    if (!element) return;
    element.innerHTML = message;
    element.style.display = 'block';
    element.className = `message ${type}`;
}

function saveToken(token) {
    localStorage.setItem('natk_token', token);
}

function getToken() {
    return localStorage.getItem('natk_token');
}

function saveUser(user) {
    localStorage.setItem('natk_user', JSON.stringify(user));
}

function getUser() {
    const userStr = localStorage.getItem('natk_user');
    return userStr ? JSON.parse(userStr) : null;
}

function getRoleName(role) {
    switch(role) {
        case 'admin': return 'Администратор';
        case 'teacher': return 'Преподаватель';
        case 'student': return 'Студент';
        default: return role;
    }
}

function getStatusName(status) {
    switch(status) {
        case 'pending': return 'Ожидает подтверждения';
        case 'approved': return 'Подтвержден';
        case 'rejected': return 'Отклонен';
        default: return status;
    }
}

function redirectByRole(role) {
    switch(role) {
        case 'admin':
            window.location.href = 'admin-panel.html';
            break;
        case 'teacher':
        case 'student':
        default:
            window.location.href = 'startpage.html';
    }
}

function goToDashboard() {
    const user = getUser();
    if (user) redirectByRole(user.role);
}

function logoutAndStay() {
    localStorage.removeItem('natk_token');
    localStorage.removeItem('natk_user');
    window.location.reload();
}

function logout() {
    if (confirm('Вы уверены, что хотите выйти из системы?')) {
        localStorage.removeItem('natk_token');
        localStorage.removeItem('natk_user');
        window.location.href = 'login.html';
    }
}

window.auth = {
    logout,
    getToken,
    getUser,
    saveToken,
    saveUser,
    redirectByRole,
    goToDashboard,
    logoutAndStay,
    API_URL
};