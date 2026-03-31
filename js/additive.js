import { 
    gapiLoaded, 
    gisLoaded, 
    listFiles, 
    uploadFile, 
    deleteFile, 
    DRIVE_FOLDERS 
} from './drive-manager.js';

// Категории файлов
const FILE_CATEGORIES = {
    'description': 'Описание компетенции',
    'criteria': 'Критерии-оценки',
    'competition': 'Конкурсное задание',
    'assignments': 'Задание',
    'mdk0201': 'МДК 02.01',
    'mdk0202': 'МДК 02.02',
    'mdk0203': 'МДК 02.03'
};

// Текущая компетенция (определяется из URL или страницы)
let currentCompetence = 'additive';

// Проверка роли преподавателя
function isTeacher() {
    const userStr = localStorage.getItem('natk_user');
    if (!userStr) return false;
    
    const user = JSON.parse(userStr);
    return user.role === 'teacher' || user.role === 'admin';
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    // Загружаем Google API
    await loadGoogleAPI();
    
    // Инициализируем текущую компетенцию
    initCurrentCompetence();
    
    // Загружаем файлы
    await loadFiles();
    
    // Добавляем кнопки для преподавателей
    addTeacherControls();
});

// Загрузка Google API
async function loadGoogleAPI() {
    return new Promise((resolve) => {
        // Добавляем скрипты Google API
        const gapiScript = document.createElement('script');
        gapiScript.src = 'https://apis.google.com/js/api.js';
        gapiScript.onload = gapiLoaded;
        
        const gisScript = document.createElement('script');
        gisScript.src = 'https://accounts.google.com/gsi/client';
        gisScript.onload = gisLoaded;
        
        document.head.appendChild(gapiScript);
        document.head.appendChild(gisScript);
        
        // Даем время на загрузку
        setTimeout(resolve, 2000);
    });
}

// Определение текущей компетенции
function initCurrentCompetence() {
    const path = window.location.pathname;
    if (path.includes('additive.html')) {
        currentCompetence = 'additive';
    } else if (path.includes('technology.html')) {
        currentCompetence = 'technology';
    } else if (path.includes('information.html')) {
        currentCompetence = 'information';
    } else if (path.includes('optica.html')) {
        currentCompetence = 'optica';
    }
}

// Загрузка файлов
async function loadFiles() {
    try {
        const folderId = DRIVE_FOLDERS[currentCompetence];
        if (!folderId) {
            console.error('Папка не найдена для компетенции:', currentCompetence);
            return;
        }
        
        const files = await listFiles(folderId);
        displayFiles(files);
    } catch (error) {
        console.error('Ошибка загрузки файлов:', error);
        showNotification('Ошибка загрузки файлов. Проверьте авторизацию.', 'error');
    }
}

// Отображение файлов по категориям
function displayFiles(files) {
    // Группируем файлы по категориям (по имени или метаданным)
    const categorizedFiles = categorizeFiles(files);
    
    // Обновляем каждую секцию
    Object.keys(categorizedFiles).forEach(category => {
        const container = document.querySelector(`[data-category="${category}"]`);
        if (container) {
            updateFileList(container, categorizedFiles[category]);
        }
    });
}

// Категоризация файлов
function categorizeFiles(files) {
    const categories = {};
    
    files.forEach(file => {
        let category = 'other';
        
        // Определяем категорию по имени файла или другим признакам
        if (file.name.includes('Описание') || file.name.includes('описание')) {
            category = 'description';
        } else if (file.name.includes('Критерии') || file.name.includes('оценки')) {
            category = 'criteria';
        } else if (file.name.includes('Конкурсное') || file.name.includes('конкурсное')) {
            category = 'competition';
        } else if (file.name.includes('Задание') || file.name.includes('задание')) {
            category = 'assignments';
        } else if (file.name.includes('МДК 02.01') || file.name.includes('МДК.02.01')) {
            category = 'mdk0201';
        } else if (file.name.includes('МДК 02.02') || file.name.includes('МДК.02.02')) {
            category = 'mdk0202';
        } else if (file.name.includes('МДК 02.03') || file.name.includes('МДК.02.03')) {
            category = 'mdk0203';
        }
        
        if (!categories[category]) {
            categories[category] = [];
        }
        categories[category].push(file);
    });
    
    return categories;
}

// Обновление списка файлов в контейнере
function updateFileList(container, files) {
    const fileList = container.querySelector('.file-list') || createFileListElement();
    
    let html = '';
    files.forEach(file => {
        const previewLink = `https://drive.google.com/file/d/${file.id}/preview`;
        
        html += `
            <div class="file-item" data-file-id="${file.id}">
                <a href="${previewLink}" target="_blank" class="menu-link">
                    ${file.name}
                </a>
                ${isTeacher() ? `
                <div class="file-actions">
                    <button class="delete-file-btn" onclick="deleteFileHandler('${file.id}', '${file.name}')">
                        🗑️ Удалить
                    </button>
                </div>
                ` : ''}
            </div>
        `;
    });
    
    fileList.innerHTML = html;
    
    if (!container.querySelector('.file-list')) {
        container.appendChild(fileList);
    }
}

// Создание элемента списка файлов
function createFileListElement() {
    const div = document.createElement('div');
    div.className = 'file-list';
    return div;
}

// Добавление контролов для преподавателей
function addTeacherControls() {
    if (!isTeacher()) return;
    
    // Добавляем кнопку добавления файла к каждой категории
    Object.keys(FILE_CATEGORIES).forEach(category => {
        const container = document.querySelector(`[data-category="${category}"]`);
        if (container) {
            const addButton = createAddFileButton(category);
            container.appendChild(addButton);
        }
    });
}

// Создание кнопки добавления файла
function createAddFileButton(category) {
    const button = document.createElement('button');
    button.className = 'add-file-btn';
    button.innerHTML = '➕ Добавить файл';
    button.onclick = () => showAddFileModal(category);
    
    return button;
}

// Модальное окно добавления файла
function showAddFileModal(category) {
    const modalHtml = `
        <div class="modal-overlay" id="addFileModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Добавить файл в "${FILE_CATEGORIES[category]}"</h3>
                    <button class="close-modal" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="uploadForm">
                        <div class="form-group">
                            <label for="fileName">Название файла:</label>
                            <input type="text" id="fileName" required 
                                   placeholder="Например: Практическое задание 1.docx">
                        </div>
                        <div class="form-group">
                            <label for="fileInput">Выберите файл:</label>
                            <input type="file" id="fileInput" required>
                        </div>
                        <div class="form-group">
                            <label for="fileCategory">Категория:</label>
                            <input type="text" id="fileCategory" value="${FILE_CATEGORIES[category]}" readonly>
                        </div>
                        <div class="modal-actions">
                            <button type="button" class="btn-cancel" onclick="closeModal()">Отмена</button>
                            <button type="submit" class="btn-submit">Загрузить</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Обработка формы
    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleFileUpload(category);
    });
}

// Обработка загрузки файла
async function handleFileUpload(category) {
    const fileName = document.getElementById('fileName').value;
    const fileInput = document.getElementById('fileInput');
    
    if (!fileName || !fileInput.files.length) {
        showNotification('Заполните все поля', 'error');
        return;
    }
    
    try {
        showNotification('Загрузка файла...', 'info');
        
        const file = fileInput.files[0];
        const folderId = DRIVE_FOLDERS[currentCompetence];
        
        // Загружаем файл на Google Drive
        const uploadedFile = await uploadFile(folderId, fileName, file);
        
        // Делаем файл публичным
        await makeFilePublic(uploadedFile.id);
        
        showNotification('Файл успешно загружен!', 'success');
        closeModal();
        
        // Перезагружаем список файлов
        await loadFiles();
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showNotification('Ошибка загрузки файла', 'error');
    }
}

// Обработчик удаления файла
async function deleteFileHandler(fileId, fileName) {
    if (!confirm(`Вы уверены, что хотите удалить файл "${fileName}"?`)) {
        return;
    }
    
    try {
        showNotification('Удаление файла...', 'info');
        
        await deleteFile(fileId);
        
        showNotification('Файл успешно удален!', 'success');
        
        // Удаляем элемент из DOM
        const fileElement = document.querySelector(`[data-file-id="${fileId}"]`);
        if (fileElement) {
            fileElement.remove();
        }
        
        // Перезагружаем список файлов
        await loadFiles();
        
    } catch (error) {
        console.error('Ошибка удаления:', error);
        showNotification('Ошибка удаления файла', 'error');
    }
}

// Закрытие модального окна
function closeModal() {
    const modal = document.getElementById('addFileModal');
    if (modal) {
        modal.remove();
    }
}

// Показать уведомление
function showNotification(message, type) {
    // Удаляем старое уведомление
    const oldNotification = document.querySelector('.notification');
    if (oldNotification) {
        oldNotification.remove();
    }
    
    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Добавляем стили
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        z-index: 10000;
        display: flex;
        justify-content: space-between;
        align-items: center;
        min-width: 300px;
        max-width: 500px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
    `;
    
    if (type === 'success') {
        notification.style.background = '#2ecc71';
        notification.style.borderLeft = '5px solid #27ae60';
    } else if (type === 'error') {
        notification.style.background = '#e74c3c';
        notification.style.borderLeft = '5px solid #c0392b';
    } else if (type === 'info') {
        notification.style.background = '#3498db';
        notification.style.borderLeft = '5px solid #2980b9';
    }
    
    // Анимация
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Автоматическое скрытие
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Экспорт функций для глобального использования
window.deleteFileHandler = deleteFileHandler;
window.closeModal = closeModal;
window.showNotification = showNotification;