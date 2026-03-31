// Менеджер для работы с Google Drive через backend
const API_URL = 'http://localhost:3000/api';

class DriveManager {
    constructor() {
        this.token = localStorage.getItem('natk_token');
        this.user = JSON.parse(localStorage.getItem('natk_user') || '{}');
    }

    // Проверка авторизации
    isAuthenticated() {
        return !!this.token;
    }

    // Проверка прав преподавателя
    isTeacher() {
        return this.user.role === 'teacher' || this.user.role === 'admin';
    }

    // Обновление токена
    updateToken() {
        this.token = localStorage.getItem('natk_token');
        this.user = JSON.parse(localStorage.getItem('natk_user') || '{}');
    }

    // Получить файлы компетенции
    async getFiles(competence) {
        try {
            if (!this.isAuthenticated()) {
                throw new Error('Требуется авторизация');
            }

            const response = await fetch(`${API_URL}/drive/files/${competence}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (data.success) {
                return data.files;
            } else {
                throw new Error(data.message || 'Ошибка получения файлов');
            }
        } catch (error) {
            console.error('Error getting files:', error);
            this.showNotification(`Ошибка: ${error.message}`, 'error');
            throw error;
        }
    }

    // Загрузить файл
    async uploadFile(competence, fileData) {
        try {
            if (!this.isAuthenticated() || !this.isTeacher()) {
                throw new Error('Требуются права преподавателя');
            }

            const formData = new FormData();
            formData.append('file', fileData.file);
            formData.append('fileName', fileData.fileName || fileData.file.name);
            
            if (fileData.category) {
                formData.append('category', fileData.category);
            }

            const response = await fetch(`${API_URL}/drive/upload/${competence}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Файл успешно загружен!', 'success');
                return data.file;
            } else {
                throw new Error(data.message || 'Ошибка загрузки файла');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            this.showNotification(`Ошибка: ${error.message}`, 'error');
            throw error;
        }
    }

    // Удалить файл
    async deleteFile(fileId) {
        try {
            if (!this.isAuthenticated() || !this.isTeacher()) {
                throw new Error('Требуются права преподавателя');
            }

            const response = await fetch(`${API_URL}/drive/files/${fileId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Файл успешно удален!', 'success');
                return true;
            } else {
                throw new Error(data.message || 'Ошибка удаления файла');
            }
        } catch (error) {
            console.error('Error deleting file:', error);
            this.showNotification(`Ошибка: ${error.message}`, 'error');
            throw error;
        }
    }

    // Получить информацию о файле
    async getFileInfo(fileId) {
        try {
            const response = await fetch(`${API_URL}/drive/files/info/${fileId}`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            if (data.success) {
                return data.file;
            } else {
                throw new Error(data.message || 'Ошибка получения информации');
            }
        } catch (error) {
            console.error('Error getting file info:', error);
            throw error;
        }
    }

    // Показать уведомление
    showNotification(message, type = 'info') {
        // Удаляем старое уведомление
        const oldNotification = document.querySelector('.drive-notification');
        if (oldNotification) {
            oldNotification.remove();
        }

        // Создаем новое уведомление
        const notification = document.createElement('div');
        notification.className = `drive-notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;

        // Стили
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

        // Добавляем анимацию
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

    // Показать модальное окно
    showModal(title, content, onClose = null) {
        // Удаляем старую модалку
        const oldModal = document.getElementById('drive-modal');
        if (oldModal) {
            oldModal.remove();
        }

        const modalHtml = `
            <div class="modal-overlay" id="drive-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Закрытие по кнопке
        const modal = document.getElementById('drive-modal');
        const closeBtn = modal.querySelector('.modal-close');
        
        closeBtn.onclick = () => {
            modal.remove();
            if (onClose) onClose();
        };

        // Закрытие по клику вне модалки
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                if (onClose) onClose();
            }
        };

        return modal;
    }

    // Закрыть модальное окно
    closeModal() {
        const modal = document.getElementById('drive-modal');
        if (modal) {
            modal.remove();
        }
    }
}

// Создаем глобальный экземпляр
window.DriveManager = new DriveManager();