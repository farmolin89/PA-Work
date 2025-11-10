// ===================================================================
// File: controllers/verificationController.js (Полная итоговая версия)
// Description: Обрабатывает HTTP-запросы для модуля "График поверки".
//              Включает логику для обработки загруженных файлов.
// ===================================================================

const verificationService = require('../services/verificationService');
const { sendEvent } = require('../event-emitter');

const getAllEquipment = async (req, res, next) => {
    try {
        const equipment = await verificationService.getAll();
        res.status(200).json(equipment);
    } catch (error) {
        next(error);
    }
};

const createEquipment = async (req, res, next) => {
    try {
        console.log('[Verification] Получены данные для создания:', JSON.stringify(req.body, null, 2));
        console.log('[Verification] Получены файлы:', req.files);
        
        // Фильтруем CSRF токен перед отправкой в БД
        const { _csrf, ...cleanData } = req.body;
        
        // Так как мы используем multipart/form-data, текстовые поля приходят в req.body.
        // Мы ожидаем, что клиент отправит все данные формы в виде JSON-строки в поле 'data'.
        const data = cleanData;

        // req.files создается middleware'ом multer. Он содержит информацию о загруженных файлах.
        // Проверяем, был ли загружен файл свидетельства.
        if (req.files && req.files.certificateFile) {
            // Сохраняем публичный путь к файлу в объект данных.
            data.certificatePath = '/uploads/' + req.files.certificateFile[0].filename;
        }

        // Проверяем, был ли загружен файл счета-фактуры.
        if (req.files && req.files.invoiceFile) {
            // Сохраняем публичный путь к файлу в объект данных.
            data.invoicePath = '/uploads/' + req.files.invoiceFile[0].filename;
        }

        console.log('[Verification] Данные перед созданием в БД:', JSON.stringify(data, null, 2));
        const newEquipment = await verificationService.create(data);
        sendEvent({}, 'verification-updated');
        res.status(201).json(newEquipment);
    } catch (error) {
        console.error('[Verification] Ошибка при создании оборудования:', error);
        next(error);
    }
};

const updateEquipment = async (req, res, next) => {
    try {
        const { id } = req.params;
        console.log('[Verification] Получены данные для обновления:', JSON.stringify(req.body, null, 2));
        console.log('[Verification] Получены файлы:', req.files);
        
        // Фильтруем CSRF токен перед отправкой в БД
        const { _csrf, ...cleanData } = req.body;
        const data = cleanData;

        // Аналогично функции create, проверяем наличие новых файлов при обновлении.
        if (req.files && req.files.certificateFile) {
            data.certificatePath = '/uploads/' + req.files.certificateFile[0].filename;
        }

        if (req.files && req.files.invoiceFile) {
            data.invoicePath = '/uploads/' + req.files.invoiceFile[0].filename;
        }
        
        console.log('[Verification] Данные перед обновлением в БД:', JSON.stringify(data, null, 2));
        const updatedEquipment = await verificationService.update(id, data);
        sendEvent({}, 'verification-updated');
        res.status(200).json(updatedEquipment);
    } catch (error) {
        console.error('[Verification] Ошибка при обновлении оборудования:', error);
        if (error.message.includes('not found')) {
            return res.status(404).json({ errors: [{ message: 'Оборудование не найдено' }] });
        }
        next(error);
    }
};

const deleteEquipment = async (req, res, next) => {
    try {
        const { id } = req.params;
        await verificationService.remove(id);
        sendEvent({}, 'verification-updated');
        res.status(204).send();
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({ errors: [{ message: 'Оборудование не найдено' }] });
        }
        next(error);
    }
};

/**
 * Обработчик для получения статистики для дашборда.
 */
const getStats = async (req, res, next) => {
    try {
        const stats = await verificationService.getDashboardStats();
        res.status(200).json(stats);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllEquipment,
    createEquipment,
    updateEquipment,
    deleteEquipment,
    getStats,
};