// ===================================================================
// Файл: services/tripService.js (СТАРАЯ СХЕМА: employeeId + groupId)
// ===================================================================
const { knex } = require('../config/database');

/**
 * Генерирует UUID v4.
 * @returns {string} - UUID строка.
 */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Проверяет, занят ли кто-либо из указанных сотрудников в заданный период времени.
 * @param {number[]} participants - Массив ID сотрудников.
 * @param {string} startDate - Дата начала.
 * @param {string} endDate - Дата окончания.
 * @param {object} options - Опции для исключения записей.
 * @returns {Promise<object|null>} - Объект с данными сотрудника в случае конфликта, иначе null.
 */
const findConflictingEmployee = async (participants, startDate, endDate, options = {}) => {
    const { excludeTripId = null, excludeVacationId = null, db = knex } = options;

    // Старая схема: employeeId в таблице trips
    const tripQuery = db('trips as t')
        .join('employees as e', 't.employeeId', 'e.id')
        .whereIn('t.employeeId', participants)
        .where(function() {
            this.where('t.startDate', '<=', endDate)
                .andWhere('t.endDate', '>=', startDate);
        })
        .select('e.lastName', 'e.firstName')
        .first();

    if (excludeTripId) {
        tripQuery.whereNot('t.id', excludeTripId);
    }
    
    const conflictingTripEmployee = await tripQuery;
    if (conflictingTripEmployee) {
        return conflictingTripEmployee;
    }

    const vacationQuery = db('vacations as v')
        .join('employees as e', 'v.employeeId', 'e.id')
        .whereIn('v.employeeId', participants)
        .where(function() {
            this.where('v.startDate', '<=', endDate)
                .andWhere('v.endDate', '>=', startDate);
        })
        .select('e.lastName', 'e.firstName')
        .first();
    
    if (excludeVacationId) {
        vacationQuery.whereNot('v.id', excludeVacationId);
    }
        
    const conflictingVacationEmployee = await vacationQuery;
    if (conflictingVacationEmployee) {
        return conflictingVacationEmployee;
    }

    return null;
};

/**
 * Получает все командировки с агрегацией участников.
 * @param {object} filters - Объект с фильтрами, например { year }.
 * @returns {Promise<Array<object>>}
 */
const getAll = async (filters = {}) => {
    const { year } = filters;
    
    // Старая схема: получаем все командировки с employeeId и groupId
    const query = knex('trips as t')
        .select('t.*')
        .orderBy('t.startDate', 'desc');

    if (year && /^\d{4}$/.test(year)) {
        query.whereRaw("strftime('%Y', t.startDate) = ?", [year]);
    }

    const tripsRaw = await query;
    
    // Группируем по groupId и создаем массив participants
    const tripsByGroup = {};
    const singleTrips = [];
    
    tripsRaw.forEach(trip => {
        if (trip.groupId) {
            if (!tripsByGroup[trip.groupId]) {
                tripsByGroup[trip.groupId] = {
                    ...trip,
                    participants: []
                };
            }
            if (trip.employeeId) {
                tripsByGroup[trip.groupId].participants.push(trip.employeeId);
            }
        } else {
            singleTrips.push({
                ...trip,
                participants: trip.employeeId ? [trip.employeeId] : []
            });
        }
    });
    
    const groupedTrips = Object.values(tripsByGroup);
    return [...groupedTrips, ...singleTrips];
};

/**
 * Создает новую командировку и связывает с ней участников.
 * @param {object} tripData - Данные о командировке.
 * @returns {Promise<object>} - Созданный объект командировки.
 */
const create = async (tripData) => {
    const { participants, ...tripDetails } = tripData;

    if (!participants || participants.length === 0) {
        // Нет участников - создаем одну запись без employeeId
        const [trip] = await knex('trips').insert({ ...tripDetails, employeeId: null, groupId: null }).returning('*');
        return { ...trip, participants: [] };
    }

    if (participants.length === 1) {
        // Один участник - создаем одну запись с employeeId
        const [trip] = await knex('trips').insert({ ...tripDetails, employeeId: participants[0], groupId: null }).returning('*');
        return { ...trip, participants: [participants[0]] };
    }

    // Несколько участников - создаем запись для каждого с общим groupId
    const groupId = generateUUID();
    const tripsToInsert = participants.map(employeeId => ({
        ...tripDetails,
        employeeId,
        groupId
    }));

    await knex('trips').insert(tripsToInsert);
    
    // Возвращаем первую запись группы с массивом участников
    const firstTrip = await knex('trips').where({ groupId }).first();
    return { ...firstTrip, participants };
};

/**
 * Обновляет командировку и ее участников.
 * @param {number} tripId - ID командировки.
 * @param {object} tripData - Данные для обновления.
 * @returns {Promise<object|null>} - Обновленный объект командировки.
 */
const update = async (tripId, tripData) => {
    const { participants, ...tripDetails } = tripData;

    // Проверяем существование командировки
    const existingTrip = await knex('trips').where({ id: tripId }).first();
    if (!existingTrip) return null;

    // Если у командировки был groupId, удаляем все записи группы
    if (existingTrip.groupId) {
        await knex('trips').where({ groupId: existingTrip.groupId }).del();
    } else {
        await knex('trips').where({ id: tripId }).del();
    }

    // Создаем заново с новыми участниками
    if (!participants || participants.length === 0) {
        const [trip] = await knex('trips').insert({ ...tripDetails, employeeId: null, groupId: null }).returning('*');
        return { ...trip, participants: [] };
    }

    if (participants.length === 1) {
        const [trip] = await knex('trips').insert({ ...tripDetails, employeeId: participants[0], groupId: null }).returning('*');
        return { ...trip, participants: [participants[0]] };
    }

    // Несколько участников
    const groupId = generateUUID();
    const tripsToInsert = participants.map(employeeId => ({
        ...tripDetails,
        employeeId,
        groupId
    }));

    await knex('trips').insert(tripsToInsert);
    const firstTrip = await knex('trips').where({ groupId }).first();
    return { ...firstTrip, participants };
};

/**
 * Удаляет командировку по ID.
 * @param {number} id - ID командировки.
 * @returns {Promise<number>} - Количество удаленных строк.
 */
const deleteById = async (id) => {
    // Проверяем, есть ли groupId у командировки
    const trip = await knex('trips').where({ id }).first();
    if (!trip) return 0;

    if (trip.groupId) {
        // Удаляем все записи с таким же groupId (групповая командировка)
        return knex('trips').where({ groupId: trip.groupId }).del();
    } else {
        // Удаляем только эту запись (одиночная командировка)
        return knex('trips').where({ id }).del();
    }
};

module.exports = {
    findConflictingEmployee,
    getAll,
    create,
    update,
    deleteById,
};