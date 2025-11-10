// ===================================================================
// Файл: controllers/maintenanceController.js (ФИНАЛЬНАЯ ВЕРСИЯ ПОСЛЕ РЕФАКТОРИНГА)
// ===================================================================
// Контроллер переведен на стиль "фабрики функций".
// ===================================================================

const { sendEvent } = require('../event-emitter');

module.exports = (maintenanceService) => ({
    /**
     * Получает всё оборудование с их видами ТО.
     */
    getAllEquipment: async (req, res, next) => {
        try {
            const equipmentList = await maintenanceService.getAllEquipment();
            res.json(equipmentList);
        } catch (error) {
            console.error("Ошибка при получении оборудования:", error);
            next(error);
        }
    },

    /**
     * Создает новое оборудование.
     */
    createEquipment: async (req, res, next) => {
        try {
            // Фильтруем CSRF токен перед отправкой в БД
            const { _csrf, ...cleanData } = req.body;
            const equipmentData = cleanData;
            
            const newEquipment = await maintenanceService.createEquipment(equipmentData);
            console.log('[SSE] Отправляю событие maintenance-updated после создания оборудования');
            sendEvent({}, 'maintenance-updated');
            res.status(201).json(newEquipment);
        } catch (error) {
            console.error("Ошибка при создании оборудования:", error);
            if (error.message.includes('уже существует')) {
                return res.status(409).json({ errors: [{ message: error.message }] });
            }
            next(error);
        }
    },

    /**
     * Обновляет оборудование.
     */
    updateEquipment: async (req, res, next) => {
        try {
            const { id } = req.params;
            
            // Фильтруем CSRF токен перед отправкой в БД
            const { _csrf, ...cleanData } = req.body;
            const equipmentData = cleanData;
            
            const updatedEquipment = await maintenanceService.updateEquipment(id, equipmentData);
            
            if (!updatedEquipment) {
                return res.status(404).json({ errors: [{ message: 'Оборудование для обновления не найдено.' }] });
            }
            
            sendEvent({}, 'maintenance-updated');
            res.status(200).json(updatedEquipment);
        } catch (error) {
            console.error(`Ошибка при обновлении оборудования ID ${req.params.id}:`, error);
            if (error.message.includes('уже существует')) {
                return res.status(409).json({ errors: [{ message: error.message }] });
            }
            next(error);
        }
    },

    /**
     * Удаляет оборудование.
     */
    deleteEquipment: async (req, res, next) => {
        try {
            const { id } = req.params;
            const success = await maintenanceService.deleteEquipment(id);
            
            if (!success) {
                return res.status(404).json({ errors: [{ message: 'Оборудование для удаления не найдено.' }] });
            }
            
            sendEvent({}, 'maintenance-updated');
            res.status(200).json({ message: 'Оборудование и связанные ТО успешно удалены.' });
        } catch (error) {
            console.error(`Ошибка при удалении оборудования ID ${req.params.id}:`, error);
            next(error);
        }
    }
});