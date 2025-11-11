// ===================================================================
// Файл: controllers/authController.js (ФИНАЛЬНАЯ ВЕРСИЯ С ИСПРАВЛЕНИЕМ СЕССИИ)
// ===================================================================
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { knex } = require('../config/database');

const saltRounds = 10;
const port = process.env.PORT || 3000;

// --- РЕГИСТРАЦИЯ ---
exports.register = async (req, res, next) => {
    const { name, position, password } = req.body;
    try {
        const user = await knex('users').whereRaw('lower(name) = lower(?)', [name]).first();
        if (user) {
            return res.status(409).json({ errors: [{ message: 'Пользователь с таким ФИО уже существует.' }] });
        }
        
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        await knex('users').insert({ 
            name, 
            position, 
            password: hashedPassword,
            registrationDate: new Date().toISOString(),
            role: 'user'
        });
        
        res.status(201).json({ message: 'Регистрация прошла успешно!' });
    } catch (error) {
        console.error("Ошибка при регистрации:", error);
        next(error);
    }
};

// --- ВХОД В СИСТЕМУ ---
exports.login = async (req, res, next) => {
    const { name, password } = req.body;
    try {
        const user = await knex('users').whereRaw('lower(name) = lower(?)', [name]).first();
        if (!user) {
            return res.status(401).json({ errors: [{ message: 'Неверное ФИО или пароль.' }] });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ errors: [{ message: 'Неверное ФИО или пароль.' }] });
        }
        
        req.session.user = { id: user.id, name: user.name, position: user.position };

        // ========================================================
        // +++ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ +++
        // Мы принудительно сохраняем сессию и отправляем ответ
        // только ПОСЛЕ того, как она гарантированно сохранится.
        // ========================================================
        req.session.save((err) => {
            if (err) {
                // Если произошла ошибка при сохранении сессии, передаем ее дальше
                console.error("Ошибка при сохранении сессии:", err);
                return next(err);
            }
            // Теперь сессия сохранена, и мы можем безопасно отправить ответ
            res.status(200).json({ message: `Добро пожаловать, ${user.name}!` });
        });

    } catch (error) {
        console.error("Ошибка при входе в систему:", error);
        next(error);
    }
};

// --- ЗАПРОС НА СБРОС ПАРОЛЯ ---
exports.forgotPassword = async (req, res, next) => {
    const { name } = req.body;
    try {
        const now = Date.now();
        await knex('users')
            .where('resetTokenExpiry', '<', now)
            .update({
                resetToken: null,
                resetTokenExpiry: null
            });

        const user = await knex('users').whereRaw('lower(name) = lower(?)', [name]).first();
        if (!user) {
            return res.status(404).json({ errors: [{ message: 'Пользователь с таким ФИО не найден.' }] });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = now + 3600000; // 1 час

        await knex('users').where({ id: user.id }).update({ resetToken, resetTokenExpiry });
        
        const baseUrl = process.env.APP_BASE_URL || `http://localhost:${port}`;
        const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;
        
        res.status(200).json({ message: 'Ссылка для сброса пароля сгенерирована.', link: resetLink });
    } catch (error) {
        console.error("Ошибка при запросе сброса пароля:", error);
        next(error);
    }
};

// --- СБРОС ПАРОЛЯ ---
exports.resetPassword = async (req, res, next) => {
    const { token, password } = req.body;
    try {
        const user = await knex('users').where({ resetToken: token }).andWhere('resetTokenExpiry', '>', Date.now()).first();
        if (!user) {
            return res.status(400).json({ errors: [{ message: 'Токен недействителен или срок его действия истек.' }] });
        }
        
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        await knex('users').where({ id: user.id }).update({
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null
        });

        res.status(200).json({ message: 'Пароль успешно обновлен!' });
    } catch (error) {
        console.error("Ошибка при сбросе пароля:", error);
        next(error);
    }
};

// --- ПОЛУЧЕНИЕ ДАННЫХ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ ---
exports.getCurrentUser = async (req, res) => {
    try {
        if (req.session.user) {
            // Получаем актуальные данные пользователя из БД, включая роль
            const user = await knex('users')
                .where('id', req.session.user.id)
                .select('id', 'name', 'position', 'role')
                .first();
            
            if (user) {
                // Обновляем данные в сессии
                req.session.user = user;
                res.json(user);
            } else {
                res.status(401).json({ errors: [{ message: 'Пользователь не найден' }] });
            }
        } else {
            res.status(401).json({ errors: [{ message: 'Пользователь не авторизован' }] });
        }
    } catch (error) {
        console.error("Ошибка при получении данных пользователя:", error);
        res.status(500).json({ errors: [{ message: 'Ошибка сервера' }] });
    }
};

// --- ВЫХОД ИЗ СИСТЕМЫ ---
exports.logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Ошибка при выходе из системы:", err);
            // Даже если есть ошибка, пытаемся перенаправить
            return res.redirect('/dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/');
    });
};

// --- ПОЛУЧЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ (ДЛЯ АДМИН-ПАНЕЛИ) ---
exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await knex('users')
            .select('id', 'name', 'position', 'role', 'registrationDate')
            .orderBy('id', 'desc');
        
        res.json(users);
    } catch (error) {
        console.error("Ошибка при получении списка пользователей:", error);
        next(error);
    }
};

// --- ПОЛУЧЕНИЕ СТАТИСТИКИ (ДЛЯ АДМИН-ПАНЕЛИ) ---
exports.getAdminStats = async (req, res, next) => {
    try {
        // Общее количество пользователей
        const totalUsersResult = await knex('users').count('* as count').first();
        const totalUsers = totalUsersResult.count || 0;
        
        // Активные пользователи (которые хотя бы раз входили в систему)
        // Можно улучшить, добавив таблицу sessions или поле last_login
        const activeUsers = totalUsers; // Пока считаем всех пользователей активными
        
        // Ожидающие подтверждения (если будет функционал регистрации с подтверждением)
        const pendingUsers = 0;
        
        // События безопасности (можно подсчитать из логов или специальной таблицы)
        // Например: неудачные попытки входа, сброс паролей и т.д.
        const securityEventsResult = await knex('users')
            .whereNotNull('resetToken')
            .count('* as count')
            .first();
        const securityEvents = securityEventsResult.count || 0;
        
        const stats = {
            totalUsers,
            activeUsers,
            pendingUsers,
            securityEvents
        };
        
        res.json(stats);
    } catch (error) {
        console.error("Ошибка при получении статистики:", error);
        next(error);
    }
};

// --- УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ (ТОЛЬКО ДЛЯ СУПЕРАДМИНОВ) ---
exports.deleteUser = async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        const currentUser = req.session.user;
        
        // Проверяем, что пользователь является суперадмином
        const user = await knex('users').where('id', currentUser.id).first();
        if (!user || user.role !== 'superadmin') {
            return res.status(403).json({ 
                message: 'Доступ запрещен. Только супер-администраторы могут удалять пользователей.' 
            });
        }
        
        // Проверяем, что пользователь не пытается удалить сам себя
        if (userId === currentUser.id) {
            return res.status(400).json({ 
                message: 'Вы не можете удалить свою учетную запись.' 
            });
        }
        
        // Удаляем пользователя
        const deleted = await knex('users').where('id', userId).del();
        
        if (deleted === 0) {
            return res.status(404).json({ 
                message: 'Пользователь не найден.' 
            });
        }
        
        res.json({ message: 'Пользователь успешно удален' });
    } catch (error) {
        console.error("Ошибка при удалении пользователя:", error);
        next(error);
    }
};

// --- ИЗМЕНЕНИЕ РОЛИ ПОЛЬЗОВАТЕЛЯ (ТОЛЬКО ДЛЯ СУПЕРАДМИНОВ) ---
exports.updateUserRole = async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id);
        const { role } = req.body;
        const currentUser = req.session.user;
        
        // Проверяем, что пользователь является суперадмином
        const user = await knex('users').where('id', currentUser.id).first();
        if (!user || user.role !== 'superadmin') {
            return res.status(403).json({ 
                message: 'Доступ запрещен. Только супер-администраторы могут изменять роли.' 
            });
        }
        
        // Валидация роли
        const validRoles = ['user', 'admin', 'superadmin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ 
                message: 'Недопустимое значение роли.' 
            });
        }
        
        // Обновляем роль
        const updated = await knex('users')
            .where('id', userId)
            .update({ role });
        
        if (updated === 0) {
            return res.status(404).json({ 
                message: 'Пользователь не найден.' 
            });
        }
        
        res.json({ message: 'Роль пользователя успешно обновлена', role });
    } catch (error) {
        console.error("Ошибка при обновлении роли:", error);
        next(error);
    }
};