// ===================================================================
// Файл: routes/viewRoutes.js (ПОЛНАЯ ОКОНЧАТЕЛЬНАЯ ВЕРСИЯ)
// ===================================================================

const express = require('express');
const path = require('path');
const { isAuthenticated, isNotAuthenticated } = require('../middleware/authMiddleware');
const authController = require('../controllers/authController');
const router = express.Router();

// --- Публичные маршруты (доступны всем) ---

// Главная страница - страница входа в систему
router.get('/', isNotAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'index.html'));
});

// Страница сброса пароля
router.get('/reset-password', isNotAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'reset.html'));
});

// Маршрут для страницы прохождения теста
router.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'test.html'));
});

// Этот маршрут будет работать, если браузер запросит страницу напрямую с расширением.
router.get('/test.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'test.html'));
});

// Выход из системы (GET-запрос для ссылок в HTML)
router.get('/logout', authController.logout);
router.post('/logout', authController.logout);

// --- Защищенные маршруты (требуют аутентификации) ---

// Главный дашборд
router.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'dashboard.html'));
});

// Панель администратора
router.get('/admin', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'admin.html'));
});

// График командировок
router.get('/trips', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'trips.html'));
});

// Страница ТО
router.get('/maintenance', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'maintenance.html'));
});

// Страница ЭЦП
router.get('/eds', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'eds.html'));
});

// График Поверки
router.get('/verification', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'verification.html'));
});

// Middleware для проверки роли супер-администратора
const isSuperAdmin = async (req, res, next) => {
    try {
        const { knex } = require('../config/database');
        const user = await knex('users').where('id', req.session.user.id).first();
        
        if (!user || user.role !== 'superadmin') {
            return res.status(403).send('Доступ запрещен. Только супер-администраторы могут просматривать эту страницу.');
        }
        
        next();
    } catch (error) {
        console.error('Ошибка проверки прав доступа:', error);
        res.status(500).send('Ошибка сервера');
    }
};

// Админ-панель управления пользователями (только для суперадминов)
router.get('/admin-panel', isAuthenticated, isSuperAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'views', 'admin-panel.html'));
});

    // Справочная информация
    router.get('/help', isAuthenticated, (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'views', 'help.html'));
    });

    module.exports = router;