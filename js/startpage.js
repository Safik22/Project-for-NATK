// js/startpage.js
const API_BASE_URL = 'http://localhost:3000';
const API_URL = `${API_BASE_URL}/api`;

let authButtons;
let notificationContainer;

document.addEventListener('DOMContentLoaded', function() {
    authButtons = document.getElementById('authButtons');
    notificationContainer = document.getElementById('notificationContainer');
    
    if (!authButtons) {
        console.error('Элемент authButtons не найден!');
        return;
    }
    
    updateAuthButtons();
    
    // ========== ДОБАВИТЬ ЭТОТ ВЫЗОВ ==========
    // Фильтруем компетенции сразу после загрузки страницы
    filterCompetencesFromUser();
    // ========================================
    
    window.addEventListener('storage', handleStorageChange);
});

function updateAuthButtons() {
    const userStr = localStorage.getItem('natk_user');
    const token = localStorage.getItem('natk_token');
    
    if (token && userStr) {
        const user = JSON.parse(userStr);
        renderLoggedInUser(user);
        // Также фильтруем при обновлении кнопок
        filterCompetencesFromUser();
    } else {
        renderLoginButton();
    }
}

// ========== НОВАЯ ФУНКЦИЯ ==========
function filterCompetencesFromUser() {
    const userStr = localStorage.getItem('natk_user');
    if (!userStr) return;
    
    const user = JSON.parse(userStr);
    
    // Админ видит все компетенции
    if (user.role === 'admin') {
        showAllCompetences();
        return;
    }
    
    // Если есть компетенции - фильтруем
    if (user.competences && user.competences.length > 0) {
        filterCompetences(user.competences);
    } else {
        // Если нет компетенций - скрываем все
        hideAllCompetences();
    }
}

function filterCompetences(availableCompetences) {
    const availableCodes = availableCompetences.map(c => c.code);
    console.log('Доступные коды:', availableCodes);
    
    const items = document.querySelectorAll('.button__list li');
    let visibleCount = 0;
    
    items.forEach(item => {
        const link = item.querySelector('a');
        if (!link) return;
        
        let competenceCode = null;
        if (link.getAttribute('href') === 'additive.html') competenceCode = 'additive';
        else if (link.getAttribute('href') === 'technology.html') competenceCode = 'technology';
        else if (link.getAttribute('href') === 'information.html') competenceCode = 'information';
        else if (link.getAttribute('href') === 'optica.html') competenceCode = 'optica';
        
        if (competenceCode && availableCodes.includes(competenceCode)) {
            item.style.display = '';
            visibleCount++;
        } else if (competenceCode) {
            item.style.display = 'none';
        }
    });
    
    // Если нет доступных компетенций
    if (visibleCount === 0 && !document.querySelector('.no-competences')) {
        const container = document.querySelector('.button__list');
        const msg = document.createElement('div');
        msg.className = 'no-competences';
        msg.style.cssText = 'text-align: center; padding: 50px; color: #666;';
        msg.innerHTML = '<p>📚 У вас нет доступа к компетенциям</p><p>Обратитесь к администратору</p>';
        container.appendChild(msg);
    }
}

function showAllCompetences() {
    const items = document.querySelectorAll('.button__list li');
    items.forEach(item => item.style.display = '');
    const msg = document.querySelector('.no-competences');
    if (msg) msg.remove();
}

function hideAllCompetences() {
    const items = document.querySelectorAll('.button__list li');
    items.forEach(item => item.style.display = 'none');
}

function renderLoggedInUser(user) {
    const roleText = user.role === 'admin' ? 'Администратор' : 
                     user.role === 'teacher' ? 'Преподаватель' : 'Студент';
    
    authButtons.innerHTML = `
        <div class="user-info">
            <div class="user-details">
                <div class="user-email">${escapeHtml(user.email)}</div>
                <div class="user-role">${roleText}</div>
            </div>
            <button class="logout-btn" onclick="logout()">Выйти</button>
        </div>
    `;
}

function renderLoginButton() {
    authButtons.innerHTML = `<a href="login.html" class="login-btn">Вход в систему</a>`;
}
function logout() {
    if (!confirm('Вы уверены, что хотите выйти?')) return;
    
    localStorage.removeItem('natk_token');
    localStorage.removeItem('natk_user');
    window.location.href = 'login.html';
}

function handleStorageChange(event) {
    if (event.key === 'natk_token' || event.key === 'natk_user') {
        updateAuthButtons();
        filterCompetencesFromUser();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.logout = logout;