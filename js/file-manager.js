const API_BASE_URL = 'http://localhost:3000';

class FileManager {
    constructor() {
        this.competence = this.getCurrentCompetence();
        this.driveManager = window.DriveManager;
        this.files = [];
        this.competenceId = null;
        
        this.competenceMapping = {
            'additive': 1,
            'technology': 2,
            'information': 3,
            'optica': 4
        };
        
        this.categoryMapping = {
            'Описание компетенции': 'description',
            'Критерии-оценки': 'criteria',
            'Конкурсное задание': 'competition',
            'Задание': 'assignments',
            'МДК 02.01': 'mdk0201',
            'МДК 02.02': 'mdk0202',
            'МДК 02.03': 'mdk0203',
            'МДК 02.01 КТП': 'ctp_mdk0201',   
            'МДК 02.02 КТП': 'ctp_mdk0202',   
            'МДК 02.03 КТП': 'ctp_mdk0203' 
        };
        
        console.log(`✅ FileManager создан для компетенции: ${this.competence}`);
    }

    getCurrentCompetence() {
        const path = window.location.pathname;
        const page = path.split('/').pop();
        
        if (page.includes('additive.html')) return 'additive';
        if (page.includes('technology.html')) return 'technology';
        if (page.includes('information.html')) return 'information';
        if (page.includes('optica.html')) return 'optica';
        
        return 'additive';
    }

    async init() {
        console.log('🚀 FileManager инициализирован для:', this.competence);
        
        this.driveManager.updateToken();
        this.competenceId = this.competenceMapping[this.competence];
        
        if (this.driveManager.isAuthenticated()) {
            console.log('✅ Пользователь авторизован');
            this.setupCategoryClickHandlers();
            this.loadFilesForOpenCategories();
        }
    }

    setupCategoryClickHandlers() {
    const titles = document.querySelectorAll('.header__title');
    console.log('📋 Найдено заголовков:', titles.length);
    
    titles.forEach(title => {
        const categoryName = title.textContent.trim();
        const categoryCode = this.categoryMapping[categoryName];
        
        if (categoryCode && !title.hasAttribute('data-handler-set')) {
            title.setAttribute('data-handler-set', 'true');
            title.classList.add('category-title');
            
            title.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log(`🖱️ Клик по категории: ${categoryName}`);
                
                // Переключаем класс open
                title.classList.toggle('open');
                
                // Получаем следующий элемент (список файлов)
                let fileList = title.nextElementSibling;
                
                // Если нет контейнера - создаем
                if (!fileList || !fileList.classList.contains('file-list')) {
                    fileList = document.createElement('div');
                    fileList.className = 'file-list';
                    title.insertAdjacentElement('afterend', fileList);
                }
                
                // Если категория открывается - загружаем файлы
                if (title.classList.contains('open')) {
                    await this.loadFilesForCategory(categoryCode, categoryName);
                } else {
                    // Если закрывается - очищаем список И УДАЛЯЕМ КНОПКУ
                    fileList.innerHTML = '';
                    // Удаляем кнопку добавления, если она есть
                    const addBtn = fileList.parentNode?.querySelector('.add-file-btn');
                    if (addBtn) {
                        addBtn.remove();
                        console.log(`🗑️ Кнопка добавления удалена для: ${categoryName}`);
                    }
                }
            });
            
            console.log(`✅ Обработчик добавлен для: ${categoryName}`);
        }
    });
}

    async loadFilesForCategory(categoryCode, categoryName) {
    if (!this.driveManager.isAuthenticated()) return;
    
    try {
        let fullCategoryCode = categoryCode;
        
        // Находим родительское меню заголовка
        const titles = document.querySelectorAll('.header__title');
        let targetTitle = null;
        let parentMenu = null;
        
        for (const title of titles) {
            if (title.textContent.trim() === categoryName) {
                targetTitle = title;
                parentMenu = title.closest('[id^="file-menu"]');
                break;
            }
        }
        
        // Если заголовок находится в меню КТП - используем ctp_ префикс
        if (parentMenu && parentMenu.id === 'file-menu-ctp') {
            // Убираем существующий префикс ctp_ если он есть
            let baseCode = categoryCode;
            if (baseCode.startsWith('ctp_')) {
                baseCode = baseCode.substring(4);
            }
            fullCategoryCode = `ctp_${baseCode}`;
            console.log(`📂 КТП меню обнаружено, использую код: ${fullCategoryCode}`);
        }
        
        console.log(`📂 Загружаю файлы для: ${categoryName} (${fullCategoryCode})`);
        
        const response = await fetch(
            `${API_BASE_URL}/api/documents/competence/${this.competenceId}/category/${fullCategoryCode}`,
            {
                headers: {
                    'Authorization': `Bearer ${this.driveManager.token}`
                }
            }
        );

        const data = await response.json();
        console.log(`📦 Получено файлов: ${data.documents?.length || 0}`);
        
        if (data.success) {
            if (targetTitle) {
                let fileContainer = targetTitle.nextElementSibling;
                
                if (!fileContainer || !fileContainer.classList.contains('file-list')) {
                    fileContainer = document.createElement('div');
                    fileContainer.className = 'file-list';
                    targetTitle.insertAdjacentElement('afterend', fileContainer);
                }
                
                this.renderFileList(fileContainer, data.documents || [], fullCategoryCode, categoryName);
            }
        }
    } catch (error) {
        console.error(`❌ Ошибка загрузки:`, error);
    }
}
    renderFileList(container, documents, categoryCode, categoryName) {
    if (!container) return;
    
    console.log(`🎨 Рендерим ${documents.length} файлов для ${categoryName}`);
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    if (documents.length === 0) {
        container.innerHTML = '<div style="padding: 10px; color: #666;">📁 Нет файлов</div>';
    } else {
        documents.forEach(doc => {
            const fileDiv = document.createElement('div');
            fileDiv.className = 'file-item-wrapper';
            
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = doc.name;
            link.className = 'menu-link';
            link.onclick = (e) => {
                e.preventDefault();
                this.openFileInViewer(doc.id, doc.mime_type, doc.name);
            };
            
            fileDiv.appendChild(link);
            
            if (this.driveManager.isTeacher()) {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '🗑️';
                deleteBtn.style.cssText = `
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 16px;
                    padding: 0 8px;
                    color: #e74c3c;
                    transition: all 0.2s;
                `;
                deleteBtn.onclick = async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (confirm(`Удалить файл "${doc.name}"?`)) {
                        await this.deleteFile(doc.id, doc.name, fileDiv);
                    }
                };
                fileDiv.appendChild(deleteBtn);
            }
            
            container.appendChild(fileDiv);
        });
    }
    
    // Удаляем старую кнопку если есть
    const existingBtn = container.parentNode?.querySelector('.add-file-btn');
    if (existingBtn) existingBtn.remove();
    
    // Добавляем кнопку добавления для преподавателей
    if (this.driveManager.isTeacher()) {
        this.addAddButton(container, categoryName, categoryCode);
    }
}
    addAddButton(container, categoryName, finalCategoryCode) {
    // Проверяем, открыта ли категория
    const parentTitle = container.previousElementSibling;
    if (!parentTitle || !parentTitle.classList.contains('header__title') || !parentTitle.classList.contains('open')) {
        console.log(`⚠️ Категория "${categoryName}" закрыта, кнопка не добавляется`);
        return;
    }
    
    // Проверяем, нет ли уже кнопки
    const existingBtn = container.parentNode?.querySelector('.add-file-btn');
    if (existingBtn) return;
    
    const button = document.createElement('button');
    button.className = 'add-file-btn';
    button.textContent = '➕ Добавить файл';
    
    button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showAddFileModal(categoryName, finalCategoryCode);
    };
    
    if (container.parentNode) {
        container.parentNode.insertBefore(button, container.nextSibling);
    } else {
        container.after(button);
    }
    
    console.log(`➕ Кнопка добавления для "${categoryName}" создана (категория открыта)`);
}
    async loadFilesForOpenCategories() {
        const openMenus = document.querySelectorAll('[id^="file-menu"][style*="display: block"]');
        
        for (const menu of openMenus) {
            const titles = menu.querySelectorAll('.header__title');
            for (const title of titles) {
                const categoryName = title.textContent.trim();
                const categoryCode = this.categoryMapping[categoryName];
                if (categoryCode) {
                    await this.loadFilesForCategory(categoryCode, categoryName);
                }
            }
        }
    }

    showAddFileModal(categoryName, categoryCode) {
    console.log(`📝 Открытие модального окна для ${categoryName} с кодом ${categoryCode}`);
    
    const modalContent = `
        <form id="uploadForm" style="padding: 10px;">
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Название файла:</label>
                <input type="text" id="fileName" required style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Выберите файл:</label>
                <input type="file" id="fileInput" required style="width: 100%; padding: 8px;">
            </div>
            <div style="margin-bottom: 15px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Категория:</label>
                <input type="text" value="${categoryName}" readonly style="width: 100%; padding: 8px; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button type="button" id="cancelBtn" style="padding: 8px 20px; background: #95a5a6; color: white; border: none; border-radius: 4px; cursor: pointer;">Отмена</button>
                <button type="submit" style="padding: 8px 20px; background: #006ea6; color: white; border: none; border-radius: 4px; cursor: pointer;">📤 Загрузить</button>
            </div>
        </form>
    `;

    const modal = this.driveManager.showModal(`Добавить файл в "${categoryName}"`, modalContent);
    
    document.getElementById('cancelBtn').onclick = () => {
        this.driveManager.closeModal();
    };
    
    document.getElementById('uploadForm').onsubmit = async (e) => {
        e.preventDefault();
        await this.handleFileUpload(categoryCode, categoryName);
    };
}
    async handleFileUpload(categoryCode, categoryName) {
        const fileName = document.getElementById('fileName').value;
        const fileInput = document.getElementById('fileInput');
        
        if (!fileName || !fileInput.files.length) {
            this.driveManager.showNotification('Заполните все поля', 'error');
            return;
        }

        try {
            const file = fileInput.files[0];
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', fileName);
            formData.append('categoryCode', categoryCode);
            formData.append('competenceId', this.competenceId);

            console.log(`📤 Загрузка в ${categoryName}...`);

            const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
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
                await this.loadFilesForCategory(categoryCode, categoryName);
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('❌ Ошибка:', error);
            this.driveManager.showNotification(`Ошибка: ${error.message}`, 'error');
        }
    }

    async deleteFile(fileId, fileName, element) {
        if (!confirm(`Удалить файл "${fileName}"?`)) return;
        
        try {
            const token = localStorage.getItem('natk_token');
            const response = await fetch(`${API_BASE_URL}/api/documents/${fileId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                if (element) element.remove();
                this.driveManager.showNotification('✅ Файл удален', 'success');
            } else {
                throw new Error(data.message);
            }
        } catch (error) {
            console.error('Ошибка удаления:', error);
            this.driveManager.showNotification('Ошибка удаления', 'error');
        }
    }

    openFileInViewer(fileId, mimeType, fileName) {
        console.log('📄 Открываю файл:', fileName, 'Тип:', mimeType);
        
        const token = localStorage.getItem('natk_token');
        
        const viewUrl = `${API_BASE_URL}/api/documents/${fileId}/view?token=${encodeURIComponent(token)}`;
        const downloadUrl = `${API_BASE_URL}/api/documents/${fileId}/download?token=${encodeURIComponent(token)}`;
        
        this.openInIframe(viewUrl, downloadUrl, fileName);
    }

    openInIframe(viewUrl, downloadUrl, fileName) {
        let activeFrame = null;
        let activeViewer = null;
        
        const menuOp = document.getElementById('file-menu-op');
        const menu = document.getElementById('file-menu');
        const menuCtp = document.getElementById('file-menu-ctp');
        
        if (menuOp && menuOp.style.display === 'block') {
            activeViewer = document.getElementById('fileViewerOp');
            activeFrame = document.getElementById('fileFrameOp');
        } 
        else if (menu && menu.style.display === 'block') {
            activeViewer = document.getElementById('fileViewer');
            activeFrame = document.getElementById('fileFrame');
        } 
        else if (menuCtp && menuCtp.style.display === 'block') {
            activeViewer = document.getElementById('fileViewerCtp');
            activeFrame = document.getElementById('fileFrameCtp');
        }
        
        if (activeFrame) {
            activeFrame.src = viewUrl;
            if (activeViewer) {
                activeViewer.style.display = 'block';
            }
            
            setTimeout(() => {
                try {
                    if (activeFrame.contentDocument && activeFrame.contentDocument.body) {
                        const bodyText = activeFrame.contentDocument.body.innerText;
                        if (bodyText && (bodyText.includes('недоступен') || bodyText.includes('error') || bodyText.includes('скачать'))) {
                            this.showDownloadButton(downloadUrl, fileName);
                        }
                    }
                } catch(e) {
                    console.log('Не удалось проверить содержимое iframe');
                }
            }, 5000);
        } else {
            window.open(downloadUrl, '_blank');
        }
    }

    showDownloadButton(downloadUrl, fileName) {
        const oldPanel = document.querySelector('.download-panel');
        if (oldPanel) oldPanel.remove();
        
        const panel = document.createElement('div');
        panel.className = 'download-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10001;
            background: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            border-left: 4px solid #e74c3c;
            font-family: sans-serif;
            font-size: 14px;
        `;
        panel.innerHTML = `
            <p style="margin: 0 0 8px 0;"><strong>⚠️ Предварительный просмотр недоступен</strong></p>
            <p style="margin: 0 0 10px 0; font-size: 12px; color: #666;">${fileName}</p>
            <div style="display: flex; gap: 10px;">
                <a href="${downloadUrl}" target="_blank" style="padding: 6px 12px; background: #006ea6; color: white; text-decoration: none; border-radius: 4px;">
                    📥 Скачать файл
                </a>
                <button onclick="this.parentElement.parentElement.parentElement.remove()" style="padding: 6px 12px; background: #ccc; border: none; border-radius: 4px; cursor: pointer;">
                    Закрыть
                </button>
            </div>
        `;
        document.body.appendChild(panel);
        setTimeout(() => panel.remove(), 15000);
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname;
    if (currentPage.includes('additive.html') || 
        currentPage.includes('technology.html') || 
        currentPage.includes('information.html') || 
        currentPage.includes('optica.html')) {
        
        window.fileManager = new FileManager();
        window.fileManager.init();
    }
});