// ===================================================================
// Файл: services/geographyStatsService.js (ФИНАЛЬНАЯ ИСПРАВЛЕННАЯ ВЕРСИЯ)
// ===================================================================
const { knex } = require('../config/database');

exports.calculateGeographyStats = async (year, employeeId) => {
    const yearParam = [year];

    // --- 1. Запрос для получения 50 самых популярных городов ---
    let topCitiesQuery = knex('trips as t')
        .select('t.destination as city')
        .count('t.id as visits')
        .whereRaw("strftime('%Y', t.startDate) = ?", yearParam)
        .groupBy('t.destination')
        .orderBy('visits', 'desc')
        .limit(50);

    // --- 2. Запрос для получения общего количества поездок ---
    let totalTripsQuery = knex('trips as t')
        .whereRaw("strftime('%Y', t.startDate) = ?", yearParam)
        .count('t.id as totalTrips')
        .first();

    // --- ЕСЛИ ПЕРЕДАН ID СОТРУДНИКА, МОДИФИЦИРУЕМ ЗАПРОСЫ ---
    if (employeeId) {
        // Добавляем join с trip_participants для фильтрации по сотруднику
        topCitiesQuery = topCitiesQuery
            .join('trip_participants as tp', 't.id', 'tp.tripId')
            .where('tp.employeeId', employeeId);
        
        totalTripsQuery = totalTripsQuery
            .join('trip_participants as tp', 't.id', 'tp.tripId')
            .where('tp.employeeId', employeeId);
    }
    
    // Выполняем оба запроса параллельно
    const [topCities, totalTripsData] = await Promise.all([
        topCitiesQuery,
        totalTripsQuery
    ]);

    // Возвращаем структурированный объект
    return {
        year,
        topCities: topCities || [],
        totalTrips: totalTripsData ? totalTripsData.totalTrips : 0
    };
};