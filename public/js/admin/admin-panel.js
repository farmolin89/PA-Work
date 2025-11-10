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
                status: 'active',
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
    
    // Проверяем, является ли текущий пользователь суперадмином
    const currentUserRole = window.currentUserRole || 'user';
    const deleteButton = currentUserRole === 'superadmin' 
        ? `<button class="action-btn delete-btn" onclick="deleteUser(this)" title="Удалить"><i class="fas fa-trash"></i></button>`
        : '';
    
    newRow.innerHTML = `
        <td>
            <div class="user">
                <div class="user-avatar-small">${initials}</div>
                <span>${user.name}</span>
            </div>
        </td>
        <td>${user.position || '-'}</td>
        <td>${user.date}</td>
        <td><span class="status status-success">Активен</span></td>
        <td><span class="role-badge ${roleClass}" data-role="${user.role}"><i class="fas ${roleIcon}"></i> ${roleText}</span></td>
        <td>${deleteButton}</td>
    `;
    
    // Добавляем обработчик клика для суперадминов
    if (currentUserRole === 'superadmin') {
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
function showRoleModal(row) {
    currentUserRow = row;
    const userId = parseInt(row.dataset.id);
    const userName = row.cells[0].querySelector('.user span').textContent;
    const currentRole = row.querySelector('.role-badge').dataset.role || 'user';
    
    document.getElementById('userName').value = userName;
    
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
    
    tableBody1.innerHTML = '';
    tableBody2.innerHTML = '';
    
    // Загружаем пользователей с сервера
    await loadUsersFromServer();
    
    usersData.users.forEach(user => {
        addUserToTable(user, tableBody1);
        addUserToTable(user, tableBody2);
    });
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
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
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
