let authButtons;
let notificationContainer;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {

  authButtons = document.getElementById('authButtons');
  notificationContainer = document.getElementById('notificationContainer');
  
  if (!authButtons) {
    console.error('Элемент authButtons не найден!');
    return;
  }
  
  // Инициализируем кнопки авторизации
  updateAuthButtons();
  

  window.addEventListener('storage', handleStorageChange);
});


function updateAuthButtons() {
  const userStr = localStorage.getItem('natk_user');
  const token = localStorage.getItem('natk_token');
  
  if (token && userStr) {

    const user = JSON.parse(userStr);
    renderLoggedInUser(user);
  } else {

    renderLoginButton();
  }
}

/**
 * Рендерит блок для авторизованного пользователя
 * @param {Object} user - Данные пользователя
 */
function renderLoggedInUser(user) {
  // Определяем роль для отображения
  const { roleText, roleClass } = getUserRoleInfo(user.role);
  
  authButtons.innerHTML = `
    <div class="user-info">
      <div>
        <div class="user-email">${escapeHtml(user.email)}</div>
        <div class="user-role">
          ${roleText}
          <span class="role-badge ${roleClass}">${user.role}</span>
        </div>
      </div>
      <button class="logout-btn" onclick="logout()">Выйти</button>
    </div>
  `;
}


function renderLoginButton() {
  authButtons.innerHTML = `
    <a href="login.html" class="login-btn">Вход в систему</a>
  `;
}

/**
 * Возвращает информацию о роли пользователя
 * @param {string} role - Роль пользователя
 * @returns {Object} Информация о роли
 */
function getUserRoleInfo(role) {
  switch(role) {
    case 'admin':
      return { roleText: 'Администратор', roleClass: 'role-admin' };
    case 'teacher':
      return { roleText: 'Преподаватель', roleClass: 'role-teacher' };
    case 'student':
      return { roleText: 'Студент', roleClass: 'role-student' };
    default:
      return { roleText: 'Пользователь', roleClass: '' };
  }
}


function logout() {
  if (!confirm('Вы уверены, что хотите выйти из системы?')) {
    return;
  }
  
  // Сохраняем email для сообщения
  const userStr = localStorage.getItem('natk_user');
  const userEmail = userStr ? JSON.parse(userStr).email : '';
  
  // Очищаем данные авторизации
  localStorage.removeItem('natk_token');
  localStorage.removeItem('natk_user');
  
  // Показываем сообщение об успешном выходе
  showMessage(`Вы вышли из системы (${userEmail})`, 'success');
  
  // Обновляем кнопки
  updateAuthButtons();
  
  // Через 1.5 секунды перенаправляем на страницу входа
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 1000);
}

/**
 * Показывает уведомление
 * @param {string} text - Текст сообщения
 * @param {string} type - Тип сообщения (success/error)
 */
function showMessage(text, type = 'success') {
  // Очищаем контейнер
  if (notificationContainer) {
    notificationContainer.innerHTML = '';
  }
  
  // Создаем элемент уведомления
  const message = document.createElement('div');
  message.className = `logout-message ${type}`;
  message.innerHTML = `
    <span>${type === 'success' ? '✅' : '⚠️'} ${escapeHtml(text)}</span>
    <button onclick="this.parentElement.remove()">×</button>
  `;
  
  // Добавляем в контейнер или body
  if (notificationContainer) {
    notificationContainer.appendChild(message);
  } else {
    document.body.appendChild(message);
  }
  
  // Автоудаление через 3 секунды
  setTimeout(() => {
    if (message.parentElement) {
      message.remove();
    }
  }, 2000);
}

/**
 * Обработчик изменения localStorage
 * @param {StorageEvent} event - Событие storage
 */
function handleStorageChange(event) {
  if (event.key === 'natk_token' || event.key === 'natk_user') {
    updateAuthButtons();
  }
}

/**
 * Экранирует HTML-символы для безопасности
 * @param {string} text - Текст для экранирования
 * @returns {string} Экранированный текст
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Экспортируем функции в глобальную область видимости
window.logout = logout;
window.updateAuthButtons = updateAuthButtons;
window.showMessage = showMessage;