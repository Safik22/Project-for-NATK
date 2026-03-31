class FileManager {
    constructor() {
        this.competence = this.getCurrentCompetence();
        this.driveManager = window.DriveManager;
        this.files = [];
        
        this.folderIds = {
            'additive': '1WJMF3TKXcLTHYrfyrl8PDmYpR-f63Fys',
            'technology': '18_tZMWWj19tWcJ8RK38JW4MX9h1rjijr',
            'information': '1mDpv59jVBdhdhAdfoCI33KXkL1s_zfxA',
            'optica': '1fOgO4s09FM1BkoaED0NrhbIojeGrPH6s'
        };
        
        this.categoryMapping = {
            'Описание компетенции': 'description',
            'Критерии-оценки': 'criteria',
            'Конкурсное задание': 'competition',
            'Задание': 'assignments',
            'МДК 02.01': 'mdk0201',
            'МДК 02.02': 'mdk0202',
            'МДК 02.03': 'mdk0203'
        };
        
        console.log(`✅ FileManager создан для компетенции: ${this.competence}`);
        console.log(`📁 ID папки: ${this.folderIds[this.competence]}`);
    }

    getCurrentCompetence() {
        const path = window.location.pathname;
        const page = path.split('/').pop(); // получаем имя файла
        
        if (page.includes('additive.html')) return 'additive';
        if (page.includes('technology.html')) return 'technology';
        if (page.includes('information.html')) return 'information';
        if (page.includes('optica.html')) return 'optica';
        
        // Проверяем также по заголовку страницы
        const title = document.title.toLowerCase();
        if (title.includes('технология')) return 'technology';
        if (title.includes('авиацион')) return 'information';
        if (title.includes('оптика')) return 'optica';
        if (title.includes('аддитив')) return 'additive';
        
        return 'additive';
    }

    // Инициализация
    async init() {
        console.log('🚀 FileManager инициализирован для:', this.competence);
        console.log('📁 Папка Google Drive:', this.folderIds[this.competence]);
        
        this.driveManager.updateToken();
        
        // Загружаем файлы если пользователь авторизован
        if (this.driveManager.isAuthenticated()) {
            await this.loadFiles();
        }
        
        // Настраиваем слушатели для меню
        this.setupMenuListeners();
        
        // Принудительно обновляем все открытые меню
        setTimeout(() => {
            this.addButtonsToOpenMenus();
        }, 500);
    }

    // Настройка слушателей для меню
    setupMenuListeners() {
        const menuButtons = document.querySelectorAll('.header__nav-link, #nav-rp, #menu-button, #menu__op-button, #menu__ctp-button');
        
        menuButtons.forEach(button => {
            if (button) {
                button.addEventListener('click', () => {
                    setTimeout(async () => {
                        if (this.driveManager.isAuthenticated()) {
                            await this.loadFiles();
                        }
                        this.addButtonsToOpenMenus();
                    }, 200);
                });
            }
        });

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const element = mutation.target;
                    if (element.style.display === 'block') {
                        setTimeout(async () => {
                            if (this.driveManager.isAuthenticated()) {
                                await this.loadFiles();
                            }
                            this.addButtonsToOpenMenus();
                        }, 150);
                    }
                }
            });
        });

        ['file-menu-op', 'file-menu', 'file-menu-ctp'].forEach(menuId => {
            const menu = document.getElementById(menuId);
            if (menu) {
                observer.observe(menu, { attributes: true });
            }
        });
    }

    // Добавление кнопок в открытые меню
    addButtonsToOpenMenus() {
        const openMenus = document.querySelectorAll('[id^="file-menu"][style*="display: block"]');
        
        openMenus.forEach(menu => {
            const titles = menu.querySelectorAll('.header__title');
            
            titles.forEach(title => {
                const categoryName = title.textContent.trim();
                const fileList = title.nextElementSibling;
                
                if (fileList && fileList.classList.contains('file-list')) {
                    // Добавляем кнопки удаления ко всем файлам (для преподавателей)
                    if (this.driveManager.isTeacher()) {
                        this.addDeleteButtonsToAllFiles(fileList);
                    }
                    
                    // Добавляем кнопку добавления (только для преподавателей)
                    if (this.driveManager.isTeacher()) {
                        this.addAddButton(fileList, categoryName);
                    }
                }
            });
        });
    }

    // Добавление крестика к КАЖДОМУ файлу
    addDeleteButtonsToAllFiles(container) {
        if (!this.driveManager.isTeacher()) {
            return;
        }

        const fileLinks = container.querySelectorAll('.menu-link');
        
        fileLinks.forEach(link => {
            // Проверяем, не обернут ли уже файл
            if (link.parentElement?.classList.contains('file-item-wrapper')) {
                const wrapper = link.parentElement;
                if (!wrapper.querySelector('.delete-file-btn')) {
                    const fileUrl = link.getAttribute('data-url');
                    const fileId = this.extractFileId(fileUrl);
                    const fileName = link.textContent.trim();
                    
                    const deleteBtn = this.createDeleteButton(fileId, fileName, wrapper);
                    wrapper.appendChild(deleteBtn);
                }
                return;
            }

            // Создаем обертку для файла
            const wrapper = document.createElement('div');
            wrapper.className = 'file-item-wrapper';
            wrapper.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: space-between;
                width: 100%;
                margin: 4px 0;
                padding: 4px 8px;
                border-radius: 4px;
                transition: background 0.2s;
            `;
            
            wrapper.addEventListener('mouseenter', () => {
                wrapper.style.backgroundColor = '#f5f5f5';
            });
            wrapper.addEventListener('mouseleave', () => {
                wrapper.style.backgroundColor = 'transparent';
            });
            
            link.parentNode.insertBefore(wrapper, link);
            wrapper.appendChild(link);
            
            // Добавляем крестик для удаления
            const fileUrl = link.getAttribute('data-url');
            const fileId = this.extractFileId(fileUrl);
            const fileName = link.textContent.trim();
            
            const deleteBtn = this.createDeleteButton(fileId, fileName, wrapper);
            wrapper.appendChild(deleteBtn);
        });
    }

    // Создание кнопки удаления (крестик)
    createDeleteButton(fileId, fileName, wrapper) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-file-btn';
        deleteBtn.innerHTML = '✕';
        deleteBtn.title = 'Удалить файл';
        deleteBtn.style.cssText = `
            margin-left: 8px;
            padding: 0;
            width: 24px;
            height: 24px;
            background: none;
            color: #e74c3c;
            border: 1px solid #e74c3c;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            flex-shrink: 0;
            opacity: 0.7;
        `;
        
        deleteBtn.onmouseenter = () => {
            deleteBtn.style.background = '#e74c3c';
            deleteBtn.style.color = 'white';
            deleteBtn.style.opacity = '1';
            deleteBtn.style.transform = 'scale(1.1)';
        };
        
        deleteBtn.onmouseleave = () => {
            deleteBtn.style.background = 'none';
            deleteBtn.style.color = '#e74c3c';
            deleteBtn.style.opacity = '0.7';
            deleteBtn.style.transform = 'scale(1)';
        };
        
        deleteBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (fileId) {
                this.deleteFile(fileId, fileName, wrapper);
            } else {
                this.deleteStaticLink(wrapper, fileName);
            }
        };
        
        return deleteBtn;
    }

    // Удаление статической ссылки
    deleteStaticLink(wrapper, fileName) {
        if (!confirm(`Вы уверены, что хотите удалить файл "${fileName}"?`)) {
            return;
        }
        
        if (wrapper && wrapper.parentNode) {
            wrapper.remove();
            this.driveManager.showNotification('✅ Ссылка удалена', 'success');
        }
    }

    // Добавление кнопки "Добавить файл"
    addAddButton(container, categoryName) {
        const oldButton = container.parentNode.querySelector('.add-file-btn');
        if (oldButton) {
            oldButton.remove();
        }

        const button = document.createElement('button');
        button.className = 'add-file-btn';
        button.innerHTML = '➕ Добавить файл';
        button.style.cssText = `
            display: block;
            margin: 15px auto;
            padding: 8px 25px;
            background: #2ecc71;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            transition: all 0.3s;
        `;
        
        button.onmouseenter = () => {
            button.style.background = '#27ae60';
            button.style.transform = 'translateY(-2px)';
        };
        
        button.onmouseleave = () => {
            button.style.background = '#2ecc71';
            button.style.transform = 'translateY(0)';
        };
        
        button.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.showAddFileModal(categoryName);
        };
        
        container.parentNode.insertBefore(button, container.nextSibling);
    }

    // Загрузка файлов
    async loadFiles() {
        if (!this.driveManager.isAuthenticated()) {
            return;
        }

        try {
            console.log(`📂 Загружаю файлы для компетенции: ${this.competence}`);
            console.log(`🔗 URL: http://localhost:3000/api/drive/files/${this.competence}`);
            
            const response = await fetch(`http://localhost:3000/api/drive/files/${this.competence}`, {
                headers: {
                    'Authorization': `Bearer ${this.driveManager.token}`
                }
            });

            const data = await response.json();
            
            if (data.success) {
                this.files = data.files || [];
                console.log(`✅ Загружено ${this.files.length} файлов для ${this.competence}`);
            }
        } catch (error) {
            console.error(`❌ Ошибка загрузки файлов для ${this.competence}:`, error);
        }
    }

    // Показать модальное окно добавления файла
    showAddFileModal(categoryName) {
        const categoryKey = this.categoryMapping[categoryName] || 'other';
        
        const modalContent = `
            <form id="drive-upload-form" class="drive-upload-form">
                <div class="form-group">
                    <label for="drive-file-name">Название файла:</label>
                    <input type="text" id="drive-file-name" required 
                           placeholder="Например: Практическое задание 1">
                </div>
                
                <div class="form-group">
                    <label for="drive-file-input">Выберите файл:</label>
                    <input type="file" id="drive-file-input" required>
                    <small>Максимальный размер: 50MB</small>
                </div>
                
                <div class="form-group">
                    <label>Категория:</label>
                    <input type="text" value="${categoryName}" readonly 
                           style="background: #f5f5f5; padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
                </div>
                
                <div class="form-actions">
                    <button type="button" class="drive-btn drive-btn-cancel" onclick="window.DriveManager.closeModal()">
                        Отмена
                    </button>
                    <button type="submit" class="drive-btn drive-btn-submit">
                        📤 Загрузить файл
                    </button>
                </div>
            </form>
        `;

        const modal = this.driveManager.showModal(`Добавить файл в "${categoryName}"`, modalContent);
        modal.style.zIndex = '2000';
        
        const form = modal.querySelector('#drive-upload-form');
        form.onsubmit = async (e) => {
            e.preventDefault();
            await this.handleFileUpload(categoryKey, categoryName);
        };
    }

    // ✅ Обработка загрузки файла (С ФИКСИРОВАННОЙ КОМПЕТЕНЦИЕЙ)
    async handleFileUpload(categoryKey, categoryName) {
        const fileName = document.getElementById('drive-file-name').value;
        const fileInput = document.getElementById('drive-file-input');
        
        if (!fileName || !fileInput.files.length) {
            this.driveManager.showNotification('Заполните все поля', 'error');
            return;
        }

        try {
            const file = fileInput.files[0];
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('fileName', fileName);
            formData.append('category', categoryKey);

            console.log(`📤 Загрузка файла в компетенцию: ${this.competence}`);
            console.log(`📁 Папка назначения: ${this.folderIds[this.competence]}`);

            const response = await fetch(`http://localhost:3000/api/drive/upload/${this.competence}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.driveManager.token}`
                },
                body: formData
            });

            const data = await response.json();
            
            if (data.success) {
                this.driveManager.showNotification('✅ Файл загружен!', 'success');
                this.driveManager.closeModal();
                
                // Добавляем новый файл в список
                if (data.file) {
                    this.files.push({
                        id: data.file.id,
                        name: data.file.name,
                        url: data.file.url,
                        previewUrl: data.file.previewUrl
                    });
                    
                    console.log(`✅ Файл сохранен в папке ${this.competence}:`, data.file.id);
                }
                
                // Обновляем отображение
                setTimeout(() => {
                    this.addButtonsToOpenMenus();
                }, 300);
                
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки:', error);
            this.driveManager.showNotification(`Ошибка: ${error.message}`, 'error');
        }
    }

    // Извлечение ID файла из URL
    extractFileId(url) {
        if (!url) return null;
        
        let match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) return match[1];
        
        match = url.match(/id=([a-zA-Z0-9_-]+)/);
        if (match) return match[1];
        
        match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) return match[1];
        
        return null;
    }

    // Открытие файла в просмотрщике
    openFileInViewer(fileUrl) {
        console.log('Открываю файл:', fileUrl);
        
        const fileId = this.extractFileId(fileUrl);
        const embedUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : fileUrl;
        
        let activeViewer = null;
        let activeFrame = null;
        
        if (document.getElementById('file-menu-op')?.style.display === 'block') {
            activeViewer = document.getElementById('fileViewerOp');
            activeFrame = document.getElementById('fileFrameOp');
        } else if (document.getElementById('file-menu')?.style.display === 'block') {
            activeViewer = document.getElementById('fileViewer');
            activeFrame = document.getElementById('fileFrame');
        } else if (document.getElementById('file-menu-ctp')?.style.display === 'block') {
            activeViewer = document.getElementById('fileViewerCtp');
            activeFrame = document.getElementById('fileFrameCtp');
        }
        
        if (activeFrame) {
            activeFrame.src = embedUrl;
            if (activeViewer) {
                activeViewer.style.display = 'block';
            }
        } else {
            window.open(embedUrl, '_blank');
        }
    }

    // Удаление файла из Google Drive
    async deleteFile(fileId, fileName, wrapperElement) {
        if (!confirm(`Вы уверены, что хотите удалить файл "${fileName}"?`)) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/drive/files/${fileId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.driveManager.token}`
                }
            });

            const data = await response.json();
            
            if (data.success) {
                this.driveManager.showNotification('✅ Файл удален!', 'success');
                
                if (wrapperElement && wrapperElement.parentNode) {
                    wrapperElement.remove();
                }
                
                this.files = this.files.filter(f => f.id !== fileId);
                
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('❌ Ошибка удаления:', error);
            this.driveManager.showNotification('Ошибка удаления файла', 'error');
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, что мы на странице компетенции
    const currentPage = window.location.pathname;
    if (currentPage.includes('additive.html') || 
        currentPage.includes('technology.html') || 
        currentPage.includes('information.html') || 
        currentPage.includes('optica.html')) {
        
        window.fileManager = new FileManager();
        window.fileManager.init();
    }
});