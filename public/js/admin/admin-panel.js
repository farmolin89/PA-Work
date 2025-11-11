// ===================================================================
// Файл: public/js/admin/admin-panel.js
// Описание: Логика админ-панели управления пользователями
// ===================================================================

let currentUserRow = null;
let selectedRole = 'user';
let usersData = {
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    securityEvents: 0,
    users: []
};

// Состояние сортировки для каждой таблицы и колонки
let sortState = {
    table1: {},  // Главная таблица
    table2: {}   // Таблица во вкладке "Пользователи"
};

/**
 * Сортировка данных
 * @param {string} tableId - ID таблицы
 * @param {number} columnIndex - Индекс колонки
 * @param {string} columnKey - Ключ данных (name, position, date, status, role)
 */
function sortTable(tableId, columnIndex, columnKey) {
    const currentState = sortState[tableId][columnKey] || 'none';
    let nextState;
    
    // Цикл: none -> asc -> desc -> none
    if (currentState === 'none') {
        nextState = 'asc';
    } else if (currentState === 'asc') {
        nextState = 'desc';
    } else {
        nextState = 'none';
    }
    
    // Обновляем состояние
    sortState[tableId][columnKey] = nextState;
    
    // Сортируем данные
    if (nextState === 'none') {
        // Возвращаем исходный порядок (по ID)
        usersData.users.sort((a, b) => b.id - a.id);
    } else {
        usersData.users.sort((a, b) => {
            let aVal = a[columnKey];
            let bVal = b[columnKey];
            
            // Для дат преобразуем в Date объекты
            if (columnKey === 'date') {
                const parseDate = (dateStr) => {
                    if (dateStr === '-') return new Date(0);
                    const parts = dateStr.split('.');
                    return new Date(parts[2], parts[1] - 1, parts[0]);
                };
                aVal = parseDate(aVal);
                bVal = parseDate(bVal);
            }
            
            // Сравнение
            if (aVal < bVal) return nextState === 'asc' ? -1 : 1;
            if (aVal > bVal) return nextState === 'asc' ? 1 : -1;
            return 0;
        });
    }
    
    // Обновляем иконки сортировки
    updateSortIcons(tableId, columnIndex, nextState);
    
    // Перерисовываем таблицу
    renderUsersTable();
}

/**
 * Обновление иконок сортировки
 */
function updateSortIcons(tableId, columnIndex, state) {
    const table = document.getElementById(tableId === 'table1' ? 'usersTableBody' : 'usersTableBody2').closest('table');
    const headers = table.querySelectorAll('th');
    const header = headers[columnIndex];
    
    if (!header) return;
    
    // Удаляем все иконки из других заголовков
    headers.forEach(h => {
        const icon = h.querySelector('.sort-icon');
        if (icon) icon.remove();
    });
    
    // Добавляем иконку к текущему заголовку
    let icon = header.querySelector('.sort-icon');
    if (!icon) {
        icon = document.createElement('i');
        icon.className = 'fas sort-icon';
        header.style.cursor = 'pointer';
        header.appendChild(icon);
    }
    
    // Устанавливаем класс иконки в зависимости от состояния
    if (state === 'asc') {
        icon.className = 'fas fa-sort-up sort-icon';
    } else if (state === 'desc') {
        icon.className = 'fas fa-sort-down sort-icon';
    } else {
        icon.remove();
    }
}

/**
 * Загрузка данных пользователей с сервера
 */
async function loadUsersFromServer() {
    try {
        const response = await fetch('/api/admin/users');
        if (!response.ok) throw new Error('Ошибка загрузки пользователей');
        
        const users = await response.json();
        usersData.users = users.map(user => {
            // Форматируем дату регистрации
            let formattedDate = '-';
            if (user.registrationDate) {
                const date = new Date(user.registrationDate);
                formattedDate = date.toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                });
            }
            
            return {
                id: user.id,
                name: user.name,
                position: user.position,
                email: '-', // Пока нет email в БД
                date: formattedDate,
                status: user.status || 'active',
                role: user.role || 'user'
            };
        });
        
        return usersData.users;
    } catch (error) {
        console.error('Ошибка при загрузке пользователей:', error);
        return [];
    }
}

/**
 * Загрузка статистики с сервера
 */
async function loadStatsFromServer() {
    try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) throw new Error('Ошибка загрузки статистики');
        
        const stats = await response.json();
        usersData.totalUsers = stats.totalUsers;
        usersData.activeUsers = stats.activeUsers;
        usersData.pendingUsers = stats.pendingUsers;
        usersData.securityEvents = stats.securityEvents;
        
        return stats;
    } catch (error) {
        console.error('Ошибка при загрузке статистики:', error);
        return usersData;
    }
}

/**
 * Загрузка данных текущего пользователя
 */
async function loadCurrentUser() {
    try {
        const response = await fetch('/api/current-user');
        if (!response.ok) throw new Error('Ошибка загрузки данных пользователя');
        const user = await response.json();
        
        // Сохраняем роль текущего пользователя глобально
        window.currentUserRole = user.role || 'user';
        
        // Обновляем аватар с инициалами
        const avatar = document.getElementById('userAvatar');
        if (avatar && user.name) {
            const initials = user.name.split(' ')
                .map(word => word[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
            avatar.textContent = initials;
        }
        
        // Обновляем имя
        const userName = document.getElementById('userName');
        if (userName) {
            userName.textContent = user.name || 'Пользователь';
        }
        
        // Обновляем должность
        const userRole = document.getElementById('userRole');
        if (userRole) {
            userRole.textContent = user.position || 'Должность не указана';
        }
    } catch (error) {
        console.error('Ошибка при загрузке данных пользователя:', error);
    }
}

/**
 * Обновление статистики на главной странице
 */
function updateStats() {
    document.getElementById('totalUsers').textContent = usersData.totalUsers.toLocaleString();
    document.getElementById('activeUsers').textContent = usersData.activeUsers.toLocaleString();
    document.getElementById('pendingUsers').textContent = usersData.pendingUsers.toLocaleString();
    document.getElementById('securityEvents').textContent = usersData.securityEvents.toLocaleString();
}

/**
 * Блокировка пользователя
 */
function blockUser(button) {
    const row = button.closest('tr');
    const userId = parseInt(row.dataset.id);
    
    const userIndex = usersData.users.findIndex(user => user.id === userId);
    if (userIndex !== -1) {
        usersData.users.splice(userIndex, 1);
        usersData.activeUsers--;
        usersData.securityEvents++;
        updateStats();
        row.remove();
        showNotification('Пользователь успешно заблокирован!');
    }
}

/**
 * Подтверждение регистрации пользователя
 */
function confirmRegistration(button) {
    const row = button.closest('tr');
    const userId = parseInt(row.dataset.id);
    const statusCell = row.cells[3];
    const roleCell = row.cells[4];
    const actionsCell = row.cells[5];
    
    const user = usersData.users.find(user => user.id === userId);
    if (user) {
        user.status = "active";
        usersData.pendingUsers--;
        usersData.activeUsers++;
        updateStats();
        
        statusCell.innerHTML = '<span class="status status-success">Активен</span>';
        roleCell.innerHTML = '<span class="role-badge" onclick="showRoleModal(this)"><i class="fas fa-user"></i> Пользователь</span>';
        actionsCell.innerHTML = '<button class="btn btn-danger btn-small" onclick="blockUser(this)"><i class="fas fa-user-slash"></i> Заблокировать</button>';
        
        showNotification('Регистрация подтверждена! Теперь можно назначить роль пользователю.');
    }
}

/**
 * Открытие модального окна добавления пользователя
 */
function openAddUserModal() {
    document.getElementById('addUserModal').style.display = 'flex';
}

/**
 * Закрытие модального окна добавления пользователя
 */
function closeAddUserModal() {
    document.getElementById('addUserModal').style.display = 'none';
    document.getElementById('newUserName').value = '';
    document.getElementById('newUserEmail').value = '';
    document.getElementById('newUserRole').value = 'user';
}

/**
 * Добавление нового пользователя
 */
function addNewUser() {
    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const role = document.getElementById('newUserRole').value;
    
    if (!name || !email) {
        showNotification('Заполните все обязательные поля!', 'error');
        return;
    }
    
    const newUserId = Math.max(...usersData.users.map(u => u.id)) + 1;
    const currentDate = new Date();
    const formattedDate = `${currentDate.getDate().toString().padStart(2, '0')}.${(currentDate.getMonth() + 1).toString().padStart(2, '0')}.${currentDate.getFullYear()}`;
    
    const newUser = {
        id: newUserId,
        name: name,
        email: email,
        date: formattedDate,
        status: "pending",
        role: null
    };
    
    usersData.users.push(newUser);
    usersData.totalUsers++;
    usersData.pendingUsers++;
    updateStats();
    
    addUserToTable(newUser, document.getElementById('usersTableBody'));
    addUserToTable(newUser, document.getElementById('usersTableBody2'));
    
    closeAddUserModal();
    showNotification('Пользователь успешно добавлен!');
}

/**
 * Добавление пользователя в таблицу
 */
function addUserToTable(user, tableBody) {
    const newRow = document.createElement('tr');
    newRow.dataset.id = user.id;
    
    const initials = user.name.split(' ').slice(0, 2).map(n => n[0]).join('');
    
    // Определяем иконку и текст роли
    let roleIcon = 'fa-user';
    let roleText = 'Пользователь';
    let roleClass = '';
    
    if (user.role === 'admin') {
        roleIcon = 'fa-user-shield';
        roleText = 'Администратор';
        roleClass = 'role-admin';
    } else if (user.role === 'superadmin') {
        roleIcon = 'fa-crown';
        roleText = 'Супер-администратор';
        roleClass = 'role-superadmin';
    }
    
    // Определяем статус пользователя
    let statusBadge = '<span class="status status-success">Активен</span>';
    let actionButtons = '';
    
    const currentUserRole = window.currentUserRole || 'user';
    
    if (user.status === 'pending') {
        statusBadge = '<span class="status status-pending">Ожидает подтверждения</span>';
        if (currentUserRole === 'superadmin') {
            actionButtons = `
                <button class="action-btn approve-btn" onclick="approveUser(this)" title="Подтвердить"><i class="fas fa-check"></i></button>
                <button class="action-btn reject-btn" onclick="rejectUser(this)" title="Отклонить"><i class="fas fa-times"></i></button>
            `;
        }
    } else if (user.status === 'active') {
        statusBadge = '<span class="status status-success">Активен</span>';
        if (currentUserRole === 'superadmin') {
            actionButtons = `<button class="action-btn delete-btn" onclick="deleteUser(this)" title="Удалить"><i class="fas fa-trash"></i></button>`;
        }
    } else if (user.status === 'rejected') {
        statusBadge = '<span class="status status-error">Отклонен</span>';
    }
    
    newRow.innerHTML = `
        <td>
            <div class="user">
                <div class="user-avatar-small">${initials}</div>
                <span>${user.name}</span>
            </div>
        </td>
        <td>${user.position || '-'}</td>
        <td>${user.date}</td>
        <td>${statusBadge}</td>
        <td><span class="role-badge ${roleClass}" data-role="${user.role}"><i class="fas ${roleIcon}"></i> ${roleText}</span></td>
        <td>${actionButtons}</td>
    `;
    
    // Добавляем обработчик клика для суперадминов только на активных пользователей
    if (currentUserRole === 'superadmin' && user.status === 'active') {
        newRow.style.cursor = 'pointer';
        newRow.addEventListener('click', function(e) {
            // Игнорируем клики на кнопки действий
            if (e.target.closest('.action-btn')) {
                return;
            }
            showRoleModal(this);
        });
    }
    
    tableBody.appendChild(newRow);
}

/**
 * Открытие модального окна назначения роли
 */
function showRoleModal(element) {
    // Получаем строку таблицы
    const row = element.closest('tr');
    
    if (!row) {
        console.error('Row not found!');
        return;
    }
    
    currentUserRow = row;
    const userId = parseInt(row.dataset.id);
    
    // Получаем имя пользователя из span внутри div.user
    const userSpan = row.cells[0]?.querySelector('.user span');
    const userName = userSpan?.textContent || row.cells[0]?.textContent.trim() || 'Имя не найдено';
    const currentRole = row.querySelector('.role-badge')?.dataset.role || 'user';
    
    // Используем уникальный ID для поля в модальном окне
    const userNameInput = document.getElementById('modalUserName');
    if (userNameInput) {
        userNameInput.value = userName;
    }
    
    // Выбираем текущую роль пользователя
    document.querySelectorAll('.role-option').forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.role === currentRole) {
            option.classList.add('selected');
        }
    });
    selectedRole = currentRole;
    
    document.getElementById('roleModal').style.display = 'flex';
}

/**
 * Закрытие модального окна назначения роли
 */
function closeRoleModal() {
    document.getElementById('roleModal').style.display = 'none';
}

/**
 * Выбор роли
 */
function selectRole(element) {
    document.querySelectorAll('.role-option').forEach(option => {
        option.classList.remove('selected');
    });
    element.classList.add('selected');
    selectedRole = element.getAttribute('data-role');
}

/**
 * Назначение роли пользователю
 */
async function assignRole() {
    if (!currentUserRow) return;
    
    const userId = parseInt(currentUserRow.dataset.id);
    const userName = currentUserRow.cells[0].querySelector('.user span').textContent;
    
    try {
        // Получаем CSRF токен
        let csrfToken = document.cookie.split('; ').find(row => row.startsWith('_csrf='))?.split('=')[1];
        if (!csrfToken) {
            const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
            if (csrfResponse.ok) {
                csrfToken = (await csrfResponse.json())?.csrfToken;
            }
        }
        
        // Отправляем запрос на сервер для изменения роли
        const response = await fetch(`/api/admin/users/${userId}/role`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken
            },
            body: JSON.stringify({ 
                role: selectedRole,
                _csrf: csrfToken
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка изменения роли');
        }
        
        // Обновляем роль в локальных данных
        const user = usersData.users.find(u => u.id === userId);
        if (user) {
            user.role = selectedRole;
        }
        
        // Обновляем отображение роли в строке
        const roleCell = currentUserRow.cells[4];
        let roleIcon = 'fa-user';
        let roleText = 'Пользователь';
        let roleClass = '';
        
        if (selectedRole === 'admin') {
            roleIcon = 'fa-user-shield';
            roleText = 'Администратор';
            roleClass = 'role-admin';
        } else if (selectedRole === 'superadmin') {
            roleIcon = 'fa-crown';
            roleText = 'Супер-администратор';
            roleClass = 'role-superadmin';
        }
        
        roleCell.innerHTML = `<span class="role-badge ${roleClass}" data-role="${selectedRole}"><i class="fas ${roleIcon}"></i> ${roleText}</span>`;
        
        closeRoleModal();
        showNotification(`Роль пользователя "${userName}" успешно изменена`);
        
    } catch (error) {
        console.error('Ошибка при изменении роли:', error);
        showNotification(error.message || 'Ошибка при изменении роли', 'error');
    }
}

/**
 * Показать уведомление
 */
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    document.getElementById('notificationText').textContent = message;
    
    if (type === 'error') {
        notification.style.background = 'var(--error-color)';
    } else {
        notification.style.background = 'var(--success-color)';
    }
    
    notification.style.display = 'flex';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

/**
 * Рендер таблицы пользователей
 */
async function renderUsersTable() {
    const tableBody1 = document.getElementById('usersTableBody');
    const tableBody2 = document.getElementById('usersTableBody2');
    
    // Загружаем пользователей с сервера ПЕРЕД очисткой таблицы
    await loadUsersFromServer();
    
    // Создаем временные фрагменты для минимизации перерисовки
    const fragment1 = document.createDocumentFragment();
    const fragment2 = document.createDocumentFragment();
    
    usersData.users.forEach(user => {
        addUserToTable(user, fragment1);
        addUserToTable(user, fragment2);
    });
    
    // Очищаем и заполняем таблицы одной операцией
    tableBody1.innerHTML = '';
    tableBody1.appendChild(fragment1);
    
    tableBody2.innerHTML = '';
    tableBody2.appendChild(fragment2);
}

/**
 * Инициализация при загрузке страницы
 */
document.addEventListener('DOMContentLoaded', async function() {
    // Загружаем данные текущего пользователя в шапку
    await loadCurrentUser();
    
    // Загружаем статистику и пользователей
    await loadStatsFromServer();
    await renderUsersTable();
    updateStats();
    
    // Автоматическое обновление данных каждые 5 секунд
    setInterval(async () => {
        await loadStatsFromServer();
        await renderUsersTable();
        updateStats();
    }, 5000);
    
    // Навигация по разделам
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', function(e) {
            const sectionId = this.getAttribute('data-section');
            if (!sectionId) return; // Пропускаем ссылки без data-section (например, "К порталу")
            
            e.preventDefault();
            
            document.querySelectorAll('.nav-links a').forEach(a => {
                a.classList.remove('active');
            });
            this.classList.add('active');
            
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            
            document.getElementById(sectionId).classList.add('active');
        });
    });
    
    // Закрытие модальных окон при клике вне их
    window.onclick = function(event) {
        const roleModal = document.getElementById('roleModal');
        
        if (event.target === roleModal) {
            closeRoleModal();
        }
    }
});

/**
 * Удаление пользователя (только для суперадминов)
 */
async function deleteUser(button) {
    const row = button.closest('tr');
    const userId = parseInt(row.dataset.id);
    const userName = row.querySelector('.user span').textContent;
    
    if (!confirm(`Вы уверены, что хотите удалить пользователя "${userName}"?`)) {
        return;
    }
    
    try {
        // Получаем CSRF токен
        let csrfToken = document.cookie.split('; ').find(row => row.startsWith('_csrf='))?.split('=')[1];
        if (!csrfToken) {
            const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
            if (csrfResponse.ok) {
                csrfToken = (await csrfResponse.json())?.csrfToken;
            }
        }
        
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка удаления пользователя');
        }
        
        // Удаляем из массива данных
        const userIndex = usersData.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            usersData.users.splice(userIndex, 1);
            usersData.totalUsers--;
        }
        
        // Обновляем статистику
        await loadStatsFromServer();
        updateStats();
        
        // Перерисовываем таблицы
        await renderUsersTable();
        
        showNotification('Пользователь успешно удален');
    } catch (error) {
        console.error('Ошибка при удалении пользователя:', error);
        showNotification(error.message || 'Ошибка при удалении пользователя', 'error');
    }
}

// --- ПОДТВЕРЖДЕНИЕ РЕГИСТРАЦИИ ---
async function approveUser(button) {
    const row = button.closest('tr');
    const userId = parseInt(row.dataset.id);
    const userName = row.querySelector('.user span').textContent;
    
    if (!confirm(`Подтвердить регистрацию пользователя "${userName}"?`)) {
        return;
    }
    
    try {
        // Получаем CSRF токен
        let csrfToken = document.cookie.split('; ').find(row => row.startsWith('_csrf='))?.split('=')[1];
        if (!csrfToken) {
            const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
            if (csrfResponse.ok) {
                csrfToken = (await csrfResponse.json())?.csrfToken;
            }
        }
        
        const response = await fetch(`/api/admin/users/${userId}/approve`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken
            },
            body: JSON.stringify({
                _csrf: csrfToken
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка подтверждения регистрации');
        }
        
        // Обновляем статус в массиве данных
        const user = usersData.users.find(u => u.id === userId);
        if (user) {
            user.status = 'active';
        }
        
        // Обновляем статистику
        await loadStatsFromServer();
        updateStats();
        
        // Перерисовываем таблицы
        await renderUsersTable();
        
        showNotification('Регистрация пользователя подтверждена');
    } catch (error) {
        console.error('Ошибка при подтверждении регистрации:', error);
        showNotification(error.message || 'Ошибка при подтверждении регистрации', 'error');
    }
}

// --- ОТКЛОНЕНИЕ РЕГИСТРАЦИИ ---
async function rejectUser(button) {
    const row = button.closest('tr');
    const userId = parseInt(row.dataset.id);
    const userName = row.querySelector('.user span').textContent;
    
    if (!confirm(`Отклонить регистрацию пользователя "${userName}"? Пользователь будет удален из системы.`)) {
        return;
    }
    
    try {
        // Получаем CSRF токен
        let csrfToken = document.cookie.split('; ').find(row => row.startsWith('_csrf='))?.split('=')[1];
        if (!csrfToken) {
            const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
            if (csrfResponse.ok) {
                csrfToken = (await csrfResponse.json())?.csrfToken;
            }
        }
        
        const response = await fetch(`/api/admin/users/${userId}/reject`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken
            },
            body: JSON.stringify({
                _csrf: csrfToken
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Ошибка отклонения регистрации');
        }
        
        // Удаляем из массива данных
        const userIndex = usersData.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            usersData.users.splice(userIndex, 1);
            usersData.totalUsers--;
        }
        
        // Обновляем статистику
        await loadStatsFromServer();
        updateStats();
        
        // Перерисовываем таблицы
        await renderUsersTable();
        
        showNotification('Регистрация пользователя отклонена');
    } catch (error) {
        console.error('Ошибка при отклонении регистрации:', error);
        showNotification(error.message || 'Ошибка при отклонении регистрации', 'error');
    }
}
