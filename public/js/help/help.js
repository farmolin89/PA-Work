// =================================================================== 
// File: help.js
// Description: Скрипт для страницы справочной информации
// =================================================================== 

document.addEventListener('DOMContentLoaded', () => {
    // Инициализация профиля пользователя
    initializeUserProfile();
    
    // Обработчик переключения вкладок
    const tabs = document.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Удаляем активный класс у всех вкладок
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Добавляем активный класс выбранной вкладке
            tab.classList.add('active');
            const contentId = tab.dataset.tab;
            document.getElementById(contentId).classList.add('active');
        });
    });

    // Обработчики загрузки документов
    const downloadButtons = document.querySelectorAll('.doc-download');
    downloadButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            // Здесь будет логика загрузки документа
            showToast('Загрузка документа начата...', 'info');
        });
    });

    // Вложенные под-вкладки: обработчики для каждой вкладки
    const subTabContainers = document.querySelectorAll('.tab-content');
    subTabContainers.forEach(container => {
        const subTabs = container.querySelectorAll('.sub-tab-btn');
        const subContents = container.querySelectorAll('.sub-tab-content');
        subTabs.forEach(st => {
            st.addEventListener('click', () => {
                subTabs.forEach(s => s.classList.remove('active'));
                subContents.forEach(sc => sc.classList.remove('active'));
                st.classList.add('active');
                const subId = st.dataset.sub;
                const el = container.querySelector(`#${subId}`);
                if (el) el.classList.add('active');
            });
        });
    });
});

function initializeUserProfile() {
    // Получаем данные пользователя с сервера
    fetch('/api/user')
        .then(response => response.json())
        .then(user => {
            // authController.getCurrentUser возвращает объект сессии { id, name, position }
            if (user && user.name) {
                const nameInitials = getInitials(user.name);
                const avatarEl = document.querySelector('.user-avatar');
                const nameEl = document.querySelector('.user-name');
                const roleEl = document.querySelector('.user-role');
                if (avatarEl) avatarEl.textContent = nameInitials;
                if (nameEl) nameEl.textContent = user.name;
                if (roleEl) roleEl.textContent = user.position || '';
            }
        })
        .catch(error => {
            console.error('Ошибка при загрузке профиля:', error);
            showToast('Ошибка при загрузке профиля', 'error');
        });
}

function getInitials(name) {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

function showToast(message, type = 'info') {
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: type === 'error' ? "#ef4444" : "#3b82f6",
    }).showToast();
}

/* ========== Калькуляторы температуры ========== */

// Функция для переключения между калькуляторами
function showCalculator(type) {
    // Скрыть все калькуляторы
    document.querySelectorAll('.calc-container').forEach(el => {
        el.classList.remove('active');
    });
    
    // Убрать активный класс у всех кнопок
    document.querySelectorAll('.selector-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показать выбранный
    document.getElementById('calc-' + type).classList.add('active');
    
    // Активировать кнопку
    event.target.closest('.selector-btn').classList.add('active');
}

// Автоматический пересчёт температур (Кельвин ↔ Цельсий)
function autoConvertTemperature(sourceType) {
    const kelvinInput = document.getElementById('kelvin-input');
    const celsiusInput = document.getElementById('celsius-input');
    
    if (sourceType === 'kelvin') {
        const kelvin = parseFloat(kelvinInput.value);
        if (!isNaN(kelvin)) {
            const celsius = (kelvin - 273.15).toFixed(2);
            celsiusInput.value = celsius;
        } else {
            celsiusInput.value = '';
        }
    } else if (sourceType === 'celsius') {
        const celsius = parseFloat(celsiusInput.value);
        if (!isNaN(celsius)) {
            const kelvin = (celsius + 273.15).toFixed(2);
            kelvinInput.value = kelvin;
        } else {
            kelvinInput.value = '';
        }
    }
}

// Автоматический пересчёт Pt100 (Сопротивление ↔ Температура)
function autoConvertPt100(sourceType) {
    const resistanceInput = document.getElementById('pt100-resistance');
    const tempInput = document.getElementById('pt100-temp');
    
    const R0 = 100;
    const A = 3.9083e-3;
    const B = -5.775e-7;
    const C = -4.183e-12;
    
    if (sourceType === 'resistance') {
        const resistance = parseFloat(resistanceInput.value);
        if (!isNaN(resistance)) {
            // R → T (упрощённая формула)
            const temp = (resistance - R0) / (A * R0);
            tempInput.value = temp.toFixed(2);
        } else {
            tempInput.value = '';
        }
    } else if (sourceType === 'temp') {
        const temp = parseFloat(tempInput.value);
        if (!isNaN(temp)) {
            // T → R (уравнение Калленда-Ван Дюзена)
            let resistance;
            if (temp >= 0) {
                resistance = R0 * (1 + A * temp + B * temp * temp);
            } else {
                resistance = R0 * (1 + A * temp + B * temp * temp + C * (temp - 100) * temp * temp * temp);
            }
            resistanceInput.value = resistance.toFixed(2);
        } else {
            resistanceInput.value = '';
        }
    }
}

/* ========== Калькулятор НСХ (ГОСТ 6651-2009) ========== */

// Параметры всех типов НСХ
const NSX_TYPES = {
    // Платиновые международные (IEC 60751)
    pt100: { 
        name: 'Pt100 (ПТ100)', 
        R0: 100, 
        material: 'platinum',
        standard: 'iec',
        range: '-200...+850°C',
        A: 3.9083e-3, 
        B: -5.775e-7, 
        C: -4.183e-12 
    },
    pt500: { 
        name: 'Pt500 (ПТ500)', 
        R0: 500, 
        material: 'platinum',
        standard: 'iec',
        range: '-200...+850°C',
        A: 3.9083e-3, 
        B: -5.775e-7, 
        C: -4.183e-12 
    },
    pt1000: { 
        name: 'Pt1000 (ПТ1000)', 
        R0: 1000, 
        material: 'platinum',
        standard: 'iec',
        range: '-200...+850°C',
        A: 3.9083e-3, 
        B: -5.775e-7, 
        C: -4.183e-12 
    },
    // Платиновые российские (ГОСТ 6651-2009)
    '100p': { 
        name: '100П (платина ГОСТ)', 
        R0: 100, 
        material: 'platinum',
        standard: 'gost',
        range: '-200...+650°C',
        A: 3.9692e-3,  // Коэффициент A для ГОСТ
        B: -5.8495e-7, // Коэффициент B для ГOST
        C: -4.2735e-12 // Коэффициент C для ГОСТ
    },
    '500p': { 
        name: '500П (платина ГОСТ)', 
        R0: 500, 
        material: 'platinum',
        standard: 'gost',
        range: '-200...+650°C',
        A: 3.9692e-3,
        B: -5.8495e-7,
        C: -4.2735e-12
    },
    // Медные
    '50m': { 
        name: '50М (медь)', 
        R0: 50, 
        material: 'copper',
        range: '-50...+180°C',
        alpha: 4.28e-3 
    },
    '100m': { 
        name: '100М (медь)', 
        R0: 100, 
        material: 'copper',
        range: '-50...+180°C',
        alpha: 4.28e-3 
    },
    // Никелевые
    '50n': { 
        name: '50Н (никель)', 
        R0: 50, 
        material: 'nickel',
        range: '-60...+180°C',
        alpha: 6.17e-3 
    },
    '100n': { 
        name: '100Н (никель)', 
        R0: 100, 
        material: 'nickel',
        range: '-60...+180°C',
        alpha: 6.17e-3 
    }
};

// Автоматический пересчёт НСХ (Сопротивление ↔ Температура)
function autoConvertNSX(sourceType) {
    const resistanceInput = document.getElementById('nsx-resistance');
    const tempInput = document.getElementById('nsx-temp');
    const typeSelect = document.getElementById('nsx-type');
    const classSelect = document.getElementById('nsx-class');
    
    const type = NSX_TYPES[typeSelect.value];
    if (!type) return;
    
    let currentTemp = null;
    let currentResistance = null;
    
    if (sourceType === 'resistance') {
        const resistance = parseFloat(resistanceInput.value);
        if (!isNaN(resistance)) {
            const temp = resistanceToTemp(resistance, type);
            tempInput.value = temp.toFixed(2);
            currentTemp = temp;
            currentResistance = resistance;
        } else {
            tempInput.value = '';
        }
    } else if (sourceType === 'temp') {
        const temp = parseFloat(tempInput.value);
        if (!isNaN(temp)) {
            const resistance = tempToResistance(temp, type);
            resistanceInput.value = resistance.toFixed(2);
            currentTemp = temp;
            currentResistance = resistance;
        } else {
            resistanceInput.value = '';
        }
    }
    
    // Проверка диапазона и обновление погрешности
    if (currentTemp !== null) {
        checkNSXRange(currentTemp, type);
        updateNSXError(currentTemp, currentResistance, type, classSelect.value);
    } else {
        clearNSXError();
    }
}

// Преобразование сопротивления в температуру
function resistanceToTemp(R, type) {
    if (type.material === 'platinum') {
        // Уравнение Калленда-Ван Дюзена (платина)
        const A = type.A;
        const B = type.B;
        const C = type.C;
        const R0 = type.R0;
        
        // Для положительных температур: R = R₀(1 + At + Bt²)
        // Решаем квадратное уравнение: Bt² + At + (1 - R/R₀) = 0
        const ratio = R / R0;
        
        if (ratio >= 1) {
            // Положительная температура - используем квадратное уравнение
            const a = B;
            const b = A;
            const c = 1 - ratio;
            
            const discriminant = b * b - 4 * a * c;
            const t = (-b + Math.sqrt(discriminant)) / (2 * a);
            return t;
        } else {
            // Отрицательная температура - используем упрощённую формулу
            // (для точности нужно решать уравнение 4-й степени, но это сложно)
            const t = (R - R0) / (A * R0);
            return t;
        }
    } else if (type.material === 'copper' || type.material === 'nickel') {
        // Линейная формула для меди и никеля
        const t = (R - type.R0) / (type.alpha * type.R0);
        return t;
    }
}

// Преобразование температуры в сопротивление
function tempToResistance(t, type) {
    if (type.material === 'platinum') {
        // Уравнение Калленда-Ван Дюзена для платины
        const A = type.A;
        const B = type.B;
        const C = type.C;
        const R0 = type.R0;
        
        if (t >= 0) {
            // Для положительных температур
            return R0 * (1 + A * t + B * t * t);
        } else {
            // Для отрицательных температур
            return R0 * (1 + A * t + B * t * t + C * (t - 100) * t * t * t);
        }
    } else if (type.material === 'copper' || type.material === 'nickel') {
        // Линейная формула для меди и никеля
        return type.R0 * (1 + type.alpha * t);
    }
}

// Обновление информации о выбранном типе НСХ
function updateNSXInfo() {
    const typeSelect = document.getElementById('nsx-type');
    const type = NSX_TYPES[typeSelect.value];
    
    if (!type) return;
    
    const infoEl = document.getElementById('nsx-info');
    
    infoEl.textContent = `${type.name}: Номинальное сопротивление R₀ = ${type.R0} Ω при 0°C`;
    
    // Обновляем диапазон и коэффициент
    updateNSXTypeInfo(type);
    
    // Сброс полей при смене типа
    document.getElementById('nsx-resistance').value = '';
    document.getElementById('nsx-temp').value = '';
    clearNSXError();
}

// Расчёт погрешности по классу точности (ГОСТ 6651-2009)
function calculateNSXTolerance(temp, accuracyClass) {
    const t = Math.abs(temp);
    
    switch(accuracyClass) {
        case 'a':
            // Класс A: Δt = ±(0.15 + 0.002|t|)
            return 0.15 + 0.002 * t;
        case 'b':
            // Класс B: Δt = ±(0.30 + 0.005|t|)
            return 0.30 + 0.005 * t;
        case 'c':
            // Класс C: Δt = ±(0.60 + 0.010|t|)
            return 0.60 + 0.010 * t;
        default:
            return 0;
    }
}

// Обновление отображения погрешности
function updateNSXError(temp, resistance, type, accuracyClass) {
    const errorTempEl = document.getElementById('nsx-error-temp');
    const errorResistanceEl = document.getElementById('nsx-error-resistance');
    
    // Погрешность в °C
    const errorTemp = calculateNSXTolerance(temp, accuracyClass);
    
    // Погрешность в Ω (рассчитываем через производную dR/dT)
    let errorResistance;
    if (type.material === 'platinum') {
        // dR/dT = R₀(A + 2Bt) для положительных температур
        const dRdT = type.R0 * (type.A + 2 * type.B * temp);
        errorResistance = Math.abs(dRdT * errorTemp);
    } else {
        // dR/dT = R₀ × α для линейных
        const dRdT = type.R0 * type.alpha;
        errorResistance = Math.abs(dRdT * errorTemp);
    }
    
    errorTempEl.textContent = `±${errorTemp.toFixed(3)} °C`;
    errorResistanceEl.textContent = `±${errorResistance.toFixed(3)} Ω`;
}

// Очистка отображения погрешности (не трогаем диапазон и коэффициент!)
function clearNSXError() {
    document.getElementById('nsx-error-temp').textContent = '—';
    document.getElementById('nsx-error-resistance').textContent = '—';
    // Диапазон и коэффициент НЕ очищаем - они зависят только от типа НСХ
}

// Пересчёт при изменении класса точности
function recalculateNSXOnClassChange() {
    const tempInput = document.getElementById('nsx-temp');
    const resistanceInput = document.getElementById('nsx-resistance');
    const typeSelect = document.getElementById('nsx-type');
    const classSelect = document.getElementById('nsx-class');
    
    const type = NSX_TYPES[typeSelect.value];
    if (!type) return;
    
    // Сохраняем информацию о типе НСХ (диапазон и коэффициент)
    updateNSXTypeInfo(type);
    
    // Проверяем, есть ли значение в любом из полей
    const tempValue = parseFloat(tempInput.value);
    const resistanceValue = parseFloat(resistanceInput.value);
    
    if (!isNaN(tempValue)) {
        // Если есть температура, пересчитываем погрешность
        updateNSXError(tempValue, resistanceValue, type, classSelect.value);
    } else if (!isNaN(resistanceValue)) {
        // Если есть только сопротивление, вычисляем температуру и пересчитываем
        const temp = resistanceToTemp(resistanceValue, type);
        updateNSXError(temp, resistanceValue, type, classSelect.value);
    }
}

// Обновление информации о типе НСХ (диапазон и коэффициент)
function updateNSXTypeInfo(type) {
    const rangeEl = document.getElementById('nsx-range');
    const coeffEl = document.getElementById('nsx-coefficient');
    
    rangeEl.textContent = type.range;
    
    if (type.material === 'platinum') {
        coeffEl.textContent = `α = ${(type.A * 1000).toFixed(4)} × 10⁻³ °C⁻¹`;
    } else {
        coeffEl.textContent = `α = ${(type.alpha * 1000).toFixed(2)} × 10⁻³ °C⁻¹`;
    }
}

// Проверка диапазона измерений
let lastRangeWarning = null; // Отслеживаем последнее предупреждение

function checkNSXRange(temp, type) {
    // Парсим диапазон (например, "-200...+850°C")
    const rangeMatch = type.range.match(/([-+]?\d+)\.\.\.([-+]?\d+)/);
    if (!rangeMatch) {
        lastRangeWarning = null;
        return;
    }
    
    const minTemp = parseFloat(rangeMatch[1]);
    const maxTemp = parseFloat(rangeMatch[2]);
    
    const isOutOfRange = temp < minTemp || temp > maxTemp;
    const warningKey = `${type.name}-${isOutOfRange}`;
    
    // Показываем toast только если состояние изменилось
    if (isOutOfRange && lastRangeWarning !== warningKey) {
        showToast(`⚠️ Выход за границы диапазона! Допустимый диапазон: ${type.range}`, 'error');
        lastRangeWarning = warningKey;
    } else if (!isOutOfRange) {
        lastRangeWarning = null;
    }
}

function convertKelvinToCelsius() {
    const kelvinInput = document.querySelector('.kelvin-input');
    const result = document.querySelector('.kelvin-result');
    const kelvin = parseFloat(kelvinInput.value);
    
    if (isNaN(kelvin)) {
        result.value = '';
        showToast('Введите корректное значение', 'error');
        return;
    }
    
    const celsius = (kelvin - 273.15).toFixed(2);
    result.value = celsius + ' °C';
}

// Калькулятор 1: Цельсий → Кельвин
function convertCelsiusToKelvin() {
    const celsiusInput = document.querySelector('.celsius-input');
    const result = document.querySelector('.celsius-result');
    const celsius = parseFloat(celsiusInput.value);
    
    if (isNaN(celsius)) {
        result.value = '';
        showToast('Введите корректное значение', 'error');
        return;
    }
    
    const kelvin = (celsius + 273.15).toFixed(2);
    result.value = kelvin + ' K';
}

// Калькулятор 2: НСХ по ГОСТ 6651-2009
function calculateNSX() {
    const nominal = parseFloat(document.querySelector('.nsx-nominal').value);
    const correction = parseFloat(document.querySelector('.nsx-correction').value);
    const error = parseFloat(document.querySelector('.nsx-error').value);
    
    if (isNaN(nominal) || isNaN(correction) || isNaN(error)) {
        showToast('Заполните все поля', 'error');
        return;
    }
    
    // Скорректированное значение
    const corrected = nominal + correction;
    
    // Доверительный интервал (для класса точности)
    const interval = ((corrected * error) / 100).toFixed(3);
    
    document.querySelector('.nsx-corrected').textContent = corrected.toFixed(2) + ' °C';
    document.querySelector('.nsx-interval').textContent = '±' + interval + ' °C';
    
    showToast('Расчёт выполнен', 'info');
}

/* ========== Калькулятор Термопар (ГОСТ 8.585-2001) ========== */

// Параметры всех типов термопар
const TC_TYPES = {
    // Платинородиевые (благородные металлы)
    s: {
        name: 'S (ТПП)',
        description: 'PtRh10-Pt',
        range: '0...+1768°C',
        seebeck: '~10 мкВ/°C',
        // Полиномиальные коэффициенты для T→E (упрощённые)
        coeffs: { a0: 0, a1: 5.40e-3, a2: 1.25e-5, a3: -2.32e-8 },
        minTemp: 0,
        maxTemp: 1768
    },
    r: {
        name: 'R (ТПР)',
        description: 'PtRh13-Pt',
        range: '0...+1768°C',
        seebeck: '~11 мкВ/°C',
        coeffs: { a0: 0, a1: 5.28e-3, a2: 1.57e-5, a3: -2.48e-8 },
        minTemp: 0,
        maxTemp: 1768
    },
    b: {
        name: 'B (ТПР)',
        description: 'PtRh30-PtRh6',
        range: '+300...+1820°C',
        seebeck: '~8 мкВ/°C',
        coeffs: { a0: 0, a1: -2.46e-4, a2: 5.90e-6, a3: 1.32e-8 },
        minTemp: 300,
        maxTemp: 1820
    },
    // Неблагородные металлы
    k: {
        name: 'K (ТХА)',
        description: 'Хромель-Алюмель',
        range: '-200...+1300°C',
        seebeck: '~41 мкВ/°C',
        coeffs: { a0: 0, a1: 3.95e-2, a2: 2.39e-5, a3: -3.28e-9 },
        minTemp: -200,
        maxTemp: 1300
    },
    n: {
        name: 'N (ТХН)',
        description: 'Хромель-Нихросил',
        range: '-200...+1300°C',
        seebeck: '~39 мкВ/°C',
        coeffs: { a0: 0, a1: 3.86e-2, a2: 1.10e-5, a3: 2.06e-8 },
        minTemp: -200,
        maxTemp: 1300
    },
    j: {
        name: 'J (ТЖК)',
        description: 'Железо-Константан',
        range: '-40...+750°C',
        seebeck: '~52 мкВ/°C',
        coeffs: { a0: 0, a1: 5.04e-2, a2: 3.05e-5, a3: -8.56e-8 },
        minTemp: -40,
        maxTemp: 750
    },
    t: {
        name: 'T (ТМК)',
        description: 'Медь-Константан',
        range: '-200...+350°C',
        seebeck: '~43 мкВ/°C',
        coeffs: { a0: 0, a1: 3.87e-2, a2: 3.32e-5, a3: 2.07e-7 },
        minTemp: -200,
        maxTemp: 350
    },
    e: {
        name: 'E (ТХК)',
        description: 'Хромель-Копель',
        range: '-200...+900°C',
        seebeck: '~61 мкВ/°C',
        coeffs: { a0: 0, a1: 5.87e-2, a2: 4.54e-5, a3: 2.89e-8 },
        minTemp: -200,
        maxTemp: 900
    },
    l: {
        name: 'L (ТХК)',
        description: 'Хромель-Копель',
        range: '-200...+800°C',
        seebeck: '~58 мкВ/°C',
        coeffs: { a0: 0, a1: 5.70e-2, a2: 4.35e-5, a3: 2.65e-8 },
        minTemp: -200,
        maxTemp: 800
    },
    m: {
        name: 'M (ТМК)',
        description: 'Никель-Нихросил',
        range: '0...+1300°C',
        seebeck: '~42 мкВ/°C',
        coeffs: { a0: 0, a1: 4.10e-2, a2: 1.85e-5, a3: -1.20e-8 },
        minTemp: 0,
        maxTemp: 1300
    },
    // Вольфрам-рениевые (тугоплавкие)
    a1: {
        name: 'A-1 (ТВР)',
        description: 'W-Re5/W-Re20',
        range: '0...+2500°C',
        seebeck: '~12 мкВ/°C',
        coeffs: { a0: 0, a1: 1.19e-2, a2: 2.08e-6, a3: -7.35e-10 },
        minTemp: 0,
        maxTemp: 2500
    },
    a2: {
        name: 'A-2 (ТВР)',
        description: 'W-Re3/W-Re25',
        range: '0...+2500°C',
        seebeck: '~14 мкВ/°C',
        coeffs: { a0: 0, a1: 1.35e-2, a2: 2.42e-6, a3: -8.61e-10 },
        minTemp: 0,
        maxTemp: 2500
    },
    a3: {
        name: 'A-3 (ТВР)',
        description: 'W-Re5/W-Re5',
        range: '0...+2200°C',
        seebeck: '~8 мкВ/°C',
        coeffs: { a0: 0, a1: 7.80e-3, a2: 1.45e-6, a3: -5.20e-10 },
        minTemp: 0,
        maxTemp: 2200
    }
};

// Автоматический пересчёт Термопары (ЭДС ↔ Температура)
function autoConvertTC(sourceType) {
    const emfInput = document.getElementById('tc-emf');
    const tempInput = document.getElementById('tc-temp');
    const typeSelect = document.getElementById('tc-type');
    const classSelect = document.getElementById('tc-class');
    
    const type = TC_TYPES[typeSelect.value];
    if (!type) return;
    
    let currentTemp = null;
    let currentEmf = null;
    
    if (sourceType === 'emf') {
        const emf = parseFloat(emfInput.value);
        if (!isNaN(emf)) {
            const temp = emfToTemp(emf, type);
            tempInput.value = temp.toFixed(2);
            currentTemp = temp;
            currentEmf = emf;
        } else {
            tempInput.value = '';
        }
    } else if (sourceType === 'temp') {
        const temp = parseFloat(tempInput.value);
        if (!isNaN(temp)) {
            const emf = tempToEmf(temp, type);
            emfInput.value = emf.toFixed(3);
            currentTemp = temp;
            currentEmf = emf;
        } else {
            emfInput.value = '';
        }
    }
    
    // Проверка диапазона и обновление погрешности
    if (currentTemp !== null) {
        checkTCRange(currentTemp, type);
        updateTCError(currentTemp, currentEmf, type, classSelect.value);
    } else {
        clearTCError();
    }
}

// Преобразование ЭДС в температуру (полиномиальное приближение)
function emfToTemp(emf, type) {
    // Используем обратный полином (упрощённая итерация Ньютона)
    const coeffs = type.coeffs;
    let t = emf / coeffs.a1; // Начальное приближение
    
    // Итерация Ньютона для уточнения
    for (let i = 0; i < 5; i++) {
        const e_calc = tempToEmf(t, type);
        const de_dt = coeffs.a1 + 2 * coeffs.a2 * t + 3 * coeffs.a3 * t * t;
        t = t - (e_calc - emf) / de_dt;
    }
    
    return t;
}

// Преобразование температуры в ЭДС (прямой полином)
function tempToEmf(t, type) {
    const c = type.coeffs;
    // E(T) = a0 + a1*T + a2*T² + a3*T³
    return c.a0 + c.a1 * t + c.a2 * t * t + c.a3 * t * t * t;
}

// Обновление информации о выбранной термопаре
function updateTCInfo() {
    const typeSelect = document.getElementById('tc-type');
    const emfInput = document.getElementById('tc-emf');
    const tempInput = document.getElementById('tc-temp');
    const classSelect = document.getElementById('tc-class');
    
    const type = TC_TYPES[typeSelect.value];
    if (!type) return;
    
    const infoEl = document.getElementById('tc-info');
    infoEl.textContent = `${type.name}: ${type.description}`;
    
    // Обновляем диапазон и коэффициент Зеебека
    updateTCTypeInfo(type);
    
    // Пересчитываем значения при смене типа (если есть данные)
    const emfValue = parseFloat(emfInput.value);
    const tempValue = parseFloat(tempInput.value);
    
    if (!isNaN(emfValue)) {
        // Если есть ЭДС, пересчитываем температуру для нового типа
        const temp = emfToTemp(emfValue, type);
        tempInput.value = temp.toFixed(2);
        checkTCRange(temp, type);
        updateTCError(temp, emfValue, type, classSelect.value);
    } else if (!isNaN(tempValue)) {
        // Если есть температура, пересчитываем ЭДС для нового типа
        const emf = tempToEmf(tempValue, type);
        emfInput.value = emf.toFixed(3);
        checkTCRange(tempValue, type);
        updateTCError(tempValue, emf, type, classSelect.value);
    } else {
        // Если нет данных, очищаем погрешности
        clearTCError();
    }
}

// Обновление информации о типе термопары (диапазон и коэффициент Зеебека)
function updateTCTypeInfo(type) {
    const rangeEl = document.getElementById('tc-range');
    const seebeckEl = document.getElementById('tc-seebeck');
    
    rangeEl.textContent = type.range;
    seebeckEl.textContent = type.seebeck;
}

// Расчёт погрешности по классу допуска (ГОСТ 8.585-2001)
function calculateTCTolerance(temp, type, accuracyClass) {
    const t = temp; // Используем фактическую температуру (не модуль)
    const tClass = parseInt(accuracyClass);
    
    // Формулы допусков по ГОСТ 8.585-2001
    // K и N
    if (type.name.startsWith('K') || type.name.startsWith('N')) {
        if (tClass === 1) {
            // Класс 1: ±1.5°C или ±0.004·|t|
            return Math.max(1.5, 0.004 * Math.abs(t));
        } else if (tClass === 2) {
            // Класс 2: ±2.5°C или ±0.0075·|t|
            return Math.max(2.5, 0.0075 * Math.abs(t));
        } else {
            // Класс 3: ±5.0°C или ±0.015·|t|
            return Math.max(5.0, 0.015 * Math.abs(t));
        }
    }
    // J
    else if (type.name.startsWith('J')) {
        if (tClass === 1) {
            return Math.max(1.5, 0.004 * Math.abs(t));
        } else if (tClass === 2) {
            return Math.max(2.5, 0.0075 * Math.abs(t));
        } else {
            return Math.max(5.0, 0.015 * Math.abs(t));
        }
    }
    // T
    else if (type.name.startsWith('T')) {
        if (tClass === 1) {
            return Math.max(0.5, 0.004 * Math.abs(t));
        } else if (tClass === 2) {
            return Math.max(1.0, 0.0075 * Math.abs(t));
        } else {
            return Math.max(2.0, 0.015 * Math.abs(t));
        }
    }
    // E и L
    else if (type.name.startsWith('E') || type.name.startsWith('L')) {
        if (tClass === 1) {
            return Math.max(1.5, 0.004 * Math.abs(t));
        } else if (tClass === 2) {
            return Math.max(2.5, 0.0075 * Math.abs(t));
        } else {
            return Math.max(5.0, 0.015 * Math.abs(t));
        }
    }
    // M
    else if (type.name.startsWith('M')) {
        if (tClass === 1) {
            return Math.max(2.0, 0.005 * Math.abs(t));
        } else if (tClass === 2) {
            return Math.max(4.0, 0.01 * Math.abs(t));
        } else {
            return Math.max(8.0, 0.02 * Math.abs(t));
        }
    }
    // S, R (платинородиевые)
    else if (type.name.startsWith('S') || type.name.startsWith('R')) {
        if (tClass === 1) {
            return Math.max(1.0, 0.003 * t); // Для благородных t всегда >0
        } else if (tClass === 2) {
            return Math.max(1.5, 0.0025 * t);
        } else {
            return Math.max(3.0, 0.005 * t);
        }
    }
    // B
    else if (type.name.startsWith('B')) {
        if (tClass === 1) {
            return Math.max(2.0, 0.0025 * t);
        } else if (tClass === 2) {
            return Math.max(4.0, 0.005 * t);
        } else {
            return Math.max(8.0, 0.01 * t);
        }
    }
    // A-1, A-2, A-3 (Вольфрам-рениевые)
    else if (type.name.startsWith('A-')) {
        if (tClass === 1) {
            return Math.max(4.0, 0.005 * t);
        } else if (tClass === 2) {
            return Math.max(8.0, 0.01 * t);
        } else {
            return Math.max(15.0, 0.02 * t);
        }
    }
    
    return 0;
}

// Обновление отображения погрешности
function updateTCError(temp, emf, type, accuracyClass) {
    const errorTempEl = document.getElementById('tc-error-temp');
    const errorEmfEl = document.getElementById('tc-error-emf');
    
    // Погрешность в °C
    const errorTemp = calculateTCTolerance(temp, type, accuracyClass);
    
    // Погрешность в мВ (через коэффициент Зеебека dE/dT)
    const coeffs = type.coeffs;
    const dEdT = coeffs.a1 + 2 * coeffs.a2 * temp + 3 * coeffs.a3 * temp * temp;
    const errorEmf = Math.abs(dEdT * errorTemp);
    
    errorTempEl.textContent = `±${errorTemp.toFixed(2)} °C`;
    errorEmfEl.textContent = `±${errorEmf.toFixed(3)} мВ`;
}

// Очистка отображения погрешности
function clearTCError() {
    document.getElementById('tc-error-temp').textContent = '—';
    document.getElementById('tc-error-emf').textContent = '—';
}

// Пересчёт при изменении класса допуска
function recalculateTCOnClassChange() {
    const tempInput = document.getElementById('tc-temp');
    const emfInput = document.getElementById('tc-emf');
    const typeSelect = document.getElementById('tc-type');
    const classSelect = document.getElementById('tc-class');
    
    const type = TC_TYPES[typeSelect.value];
    if (!type) return;
    
    // Сохраняем информацию о типе термопары
    updateTCTypeInfo(type);
    
    // Проверяем, есть ли значение в любом из полей
    const tempValue = parseFloat(tempInput.value);
    const emfValue = parseFloat(emfInput.value);
    
    if (!isNaN(tempValue)) {
        const emf = tempToEmf(tempValue, type);
        updateTCError(tempValue, emf, type, classSelect.value);
    } else if (!isNaN(emfValue)) {
        const temp = emfToTemp(emfValue, type);
        updateTCError(temp, emfValue, type, classSelect.value);
    }
}

// Проверка диапазона измерений
let lastTCRangeWarning = null;

function checkTCRange(temp, type) {
    const minTemp = type.minTemp;
    const maxTemp = type.maxTemp;
    
    const isOutOfRange = temp < minTemp || temp > maxTemp;
    const warningKey = `${type.name}-${isOutOfRange}`;
    
    if (isOutOfRange && lastTCRangeWarning !== warningKey) {
        showToast(`⚠️ Выход за границы диапазона! Допустимый диапазон: ${type.range}`, 'error');
        lastTCRangeWarning = warningKey;
    } else if (!isOutOfRange) {
        lastTCRangeWarning = null;
    }
}

/* ========== Устаревшие функции термопары (для совместимости) ========== */

// Калькулятор 3: Термопара по ГОСТ 8.585-2001 (старая версия)
function calculateThermocoupleTemp() {
    // Перенаправляем на новую функцию
    autoConvertTC('emf');
}

// Функция для обновления информации о выбранной термопаре (старая версия)
function updateThermocoupleInfo() {
    // Перенаправляем на новую функцию
    updateTCInfo();
}

/* ========== Калькулятор Pt100 ========== */

// Уравнение Калленда-Ван Дюзена для Pt100
// R(t) = R₀[1 + At + Bt² + C(t-100)t³], где A, B, C — коэффициенты
// Упрощённое уравнение для практического использования:
// R(t) = R₀(1 + αt + βt²) для t > 0
// R(t) = R₀(1 + αt + γ(t-100)t³) для t < 0

function convertPt100ToTemp() {
    const resistance = parseFloat(document.querySelector('.pt100-resistance').value);
    const resultInput = document.querySelector('.pt100-result-temp');
    
    if (isNaN(resistance)) {
        resultInput.value = '';
        showToast('Введите корректное значение сопротивления', 'error');
        return;
    }
    
    // Коэффициенты Pt100 (ПТ100)
    const R0 = 100;      // Сопротивление при 0°C
    const A = 3.9083e-3;  // Коэффициент температурного сопротивления
    const B = -5.775e-7;  // Коэффициент квадратичной поправки
    
    // Используем упрощённую формулу для обратного преобразования
    // t ≈ (R - R₀) / (A × R₀) для быстрого расчёта
    const temp = (resistance - R0) / (A * R0);
    
    if (temp < -50 || temp > 200) {
        showToast('Температура вне нормального диапазона Pt100', 'error');
        return;
    }
    
    resultInput.value = temp.toFixed(2) + ' °C';
    showToast('Расчёт выполнен', 'info');
}

function convertTempToPt100() {
    const temp = parseFloat(document.querySelector('.pt100-temp').value);
    const resultInput = document.querySelector('.pt100-result-resistance');
    
    if (isNaN(temp)) {
        resultInput.value = '';
        showToast('Введите корректное значение температуры', 'error');
        return;
    }
    
    // Коэффициенты Pt100
    const R0 = 100;      // Сопротивление при 0°C
    const A = 3.9083e-3;  // Коэффициент
    const B = -5.775e-7;  // Коэффициент
    
    // Уравнение Калленда-Ван Дюзена (упрощённая форма для положительных температур)
    let resistance;
    if (temp >= 0) {
        resistance = R0 * (1 + A * temp + B * temp * temp);
    } else {
        // Для отрицательных температур
        const C = -4.183e-12;
        resistance = R0 * (1 + A * temp + B * temp * temp + C * (temp - 100) * temp * temp * temp);
    }
    
    if (resistance < 0) {
        showToast('Ошибка расчёта сопротивления', 'error');
        return;
    }
    
    resultInput.value = resistance.toFixed(2) + ' Ω';
    showToast('Расчёт выполнен', 'info');
}

function updatePt100Info() {
    const classOption = document.querySelector('.pt100-class').value;
    const info = document.getElementById('pt100-info');
    
    const classInfo = {
        a: 'Pt100 класс A: Δt = ±(0.15 + 0.002|t|) — для высокоточных измерений',
        b: 'Pt100 класс B: Δt = ±(0.30 + 0.005|t|) — для большинства применений',
        c: 'Pt100 класс C: Δt = ±(0.90 + 0.010|t|) — для менее критичных применений'
    };
    
    info.textContent = classInfo[classOption];
}

/* ========== Калькуляторы расхода ========== */

// Переключение между калькуляторами расхода
function showFlowCalculator(calcType) {
    // Убираем активный класс со всех кнопок и калькуляторов
    document.querySelectorAll('#flow .selector-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#flow .calc-container').forEach(calc => calc.classList.remove('active'));
    
    // Активируем выбранную кнопку
    event.target.closest('.selector-btn').classList.add('active');
    
    // Показываем соответствующий калькулятор
    const calcMap = {
        'converter': 'calc-flow-converter',
        'flow-to-velocity': 'calc-flow-to-velocity',
        'pipe-flow': 'calc-pipe-flow'
    };
    
    const calcElement = document.getElementById(calcMap[calcType]);
    if (calcElement) {
        calcElement.classList.add('active');
    }
}

// Автоматический пересчёт расхода и скорости потока
function autoConvertFlowVelocity(source) {
    const diameterMm = parseFloat(document.getElementById('pipe-diameter').value);
    
    // Всегда обновляем площадь сечения, если есть диаметр
    if (diameterMm && diameterMm > 0) {
        const diameterM = diameterMm / 1000;
        const area = Math.PI * Math.pow(diameterM / 2, 2);
        document.getElementById('pipe-area').textContent = `${(area * 1e6).toFixed(2)} мм² (${area.toFixed(6)} м²)`;
    } else {
        document.getElementById('pipe-area').textContent = '—';
    }

    // Если нет диаметра, очищаем результаты
    if (!diameterMm || diameterMm <= 0) {
        if (source === 'diameter') {
            document.getElementById('volumetric-flow').value = '';
            document.getElementById('flow-velocity').value = '';
        }
        return;
    }

    const diameterM = diameterMm / 1000;
    const area = Math.PI * Math.pow(diameterM / 2, 2);

    // Пересчёт в зависимости от того, какое поле изменено
    if (source === 'flow' || source === 'diameter') {
        // Пересчитываем расход → скорость
        const flowM3h = parseFloat(document.getElementById('volumetric-flow').value);
        if (flowM3h >= 0) {
            const flowM3s = flowM3h / 3600;
            const velocity = flowM3s / area;
            document.getElementById('flow-velocity').value = velocity.toFixed(3);
        } else {
            document.getElementById('flow-velocity').value = '';
        }
    } else if (source === 'velocity') {
        // Пересчитываем скорость → расход
        const velocity = parseFloat(document.getElementById('flow-velocity').value);
        if (velocity >= 0) {
            const flowM3s = velocity * area;
            const flowM3h = flowM3s * 3600;
            document.getElementById('volumetric-flow').value = flowM3h.toFixed(3);
        } else {
            document.getElementById('volumetric-flow').value = '';
        }
    }
}

// Функция расчёта энтальпии воды согласно ГОСТ Р ЕН 1434-5-2011
function calculateEnthalpy() {
    const temp = parseFloat(document.getElementById('enthalpy-temp').value);
    const pressure = parseFloat(document.getElementById('enthalpy-pressure').value);

    // Проверка входных данных
    if (!temp || temp < 0.01 || temp > 180 || !pressure || pressure < 0 || pressure > 2.5) {
        document.getElementById('enthalpy-value').textContent = '—';
        document.getElementById('density-value').textContent = '—';
        
        if (temp && (temp < 0.01 || temp > 180)) {
            showToast('Температура должна быть в диапазоне 0.01...180 °C', 'warning');
        }
        if (pressure && (pressure < 0 || pressure > 2.5)) {
            showToast('Давление должно быть в диапазоне 0...2.5 МПа', 'warning');
        }
        return;
    }

    // Расчёт энтальпии воды по ГОСТ Р ЕН 1434-5-2011
    // Формула основана на полиномиальной аппроксимации для жидкой воды
    // h (кДж/кг) = f(T, P)
    
    // Энтальпия при атмосферном давлении (базовая формула)
    // h₀(T) = a₀ + a₁·T + a₂·T² + a₃·T³ + a₄·T⁴
    const a0 = 0.0;
    const a1 = 4.2174356;
    const a2 = -0.0056181625;
    const a3 = 0.00012992528;
    const a4 = -1.1535353e-6;
    
    const h0 = a0 + a1 * temp + a2 * Math.pow(temp, 2) + 
               a3 * Math.pow(temp, 3) + a4 * Math.pow(temp, 4);
    
    // Поправка на давление (упрощённая формула для жидкой фазы)
    // Δh(P) ≈ v·ΔP, где v - удельный объём воды (≈ 1/ρ)
    // Для жидкой воды влияние давления мало при P < 2.5 МПа
    const pressureCorrection = 0.001 * pressure * (1 - 0.0002 * temp); // кДж/кг
    
    const enthalpy = h0 + pressureCorrection;
    
    // Расчёт плотности воды (кг/м³)
    // ρ(T) = ρ₀ / (1 + β·(T - T₀))
    // где ρ₀ = 999.97 кг/м³ при T₀ = 4°C, β - коэффициент объёмного расширения
    const rho0 = 999.972;
    const T0 = 4.0;
    
    // Полиномиальная формула для плотности воды (более точная)
    const b0 = 999.83952;
    const b1 = 16.945176;
    const b2 = -7.9870401e-3;
    const b3 = -46.170461e-6;
    const b4 = 105.56302e-9;
    const b5 = -280.54253e-12;
    
    const T_celsius = temp;
    const density = b0 + b1 * T_celsius + b2 * Math.pow(T_celsius, 2) + 
                    b3 * Math.pow(T_celsius, 3) + b4 * Math.pow(T_celsius, 4) + 
                    b5 * Math.pow(T_celsius, 5);
    
    // Поправка плотности на давление (сжимаемость воды)
    const compressibility = 4.6e-10; // 1/Па при 20°C
    const densityWithPressure = density * (1 + compressibility * pressure * 1e6);
    
    // Вывод результатов
    document.getElementById('enthalpy-value').textContent = `${enthalpy.toFixed(2)} кДж/кг`;
    document.getElementById('density-value').textContent = `${densityWithPressure.toFixed(2)} кг/м³`;
}

/* ========== Конвертер единиц измерения ========== */

// Коэффициенты конвертации (все относительно базовой единицы)
const CONVERSION_UNITS = {
    volume: {
        name: 'Объём',
        base: 'm3',
        units: {
            'm3': { name: 'м³ (куб. метр)', factor: 1 },
            'l': { name: 'л (литр)', factor: 1000 },
            'ml': { name: 'мл (миллилитр)', factor: 1000000 },
            'cm3': { name: 'см³ (куб. см)', factor: 1000000 },
            'dm3': { name: 'дм³ (куб. дм)', factor: 1000 },
            'gal': { name: 'галлон (США)', factor: 264.172 },
            'ft3': { name: 'фут³ (куб. фут)', factor: 35.3147 },
            'in3': { name: 'дюйм³ (куб. дюйм)', factor: 61023.7 },
            'bbl': { name: 'баррель (нефтяной)', factor: 6.28981 }
        }
    },
    'volumetric-flow': {
        name: 'Объёмный расход',
        base: 'm3h',
        units: {
            'm3h': { name: 'м³/ч', factor: 1 },
            'm3s': { name: 'м³/с', factor: 1/3600 },
            'm3min': { name: 'м³/мин', factor: 1/60 },
            'lh': { name: 'л/ч', factor: 1000 },
            'ls': { name: 'л/с', factor: 1000/3600 },
            'lmin': { name: 'л/мин', factor: 1000/60 },
            'galh': { name: 'галлон/ч', factor: 264.172 },
            'galmin': { name: 'галлон/мин', factor: 264.172/60 },
            'ft3h': { name: 'фут³/ч', factor: 35.3147 },
            'ft3min': { name: 'фут³/мин', factor: 35.3147/60 }
        }
    },
    'mass-flow': {
        name: 'Массовый расход',
        base: 'kgh',
        units: {
            'kgh': { name: 'кг/ч', factor: 1 },
            'kgs': { name: 'кг/с', factor: 1/3600 },
            'kgmin': { name: 'кг/мин', factor: 1/60 },
            'th': { name: 'т/ч', factor: 0.001 },
            'ts': { name: 'т/с', factor: 0.001/3600 },
            'gh': { name: 'г/ч', factor: 1000 },
            'gs': { name: 'г/с', factor: 1000/3600 },
            'lbh': { name: 'фунт/ч', factor: 2.20462 },
            'lbs': { name: 'фунт/с', factor: 2.20462/3600 }
        }
    },
    density: {
        name: 'Плотность',
        base: 'kgm3',
        units: {
            'kgm3': { name: 'кг/м³', factor: 1 },
            'gl': { name: 'г/л', factor: 1 },
            'gcm3': { name: 'г/см³', factor: 0.001 },
            'kgl': { name: 'кг/л', factor: 0.001 },
            'tm3': { name: 'т/м³', factor: 0.001 },
            'lbft3': { name: 'фунт/фут³', factor: 0.062428 },
            'lbgal': { name: 'фунт/галлон', factor: 0.00834 }
        }
    },
    'thermal-energy': {
        name: 'Теплоэнергия',
        base: 'kwh',
        units: {
            'kwh': { name: 'кВт·ч', factor: 1 },
            'mwh': { name: 'МВт·ч', factor: 0.001 },
            'gwh': { name: 'ГВт·ч', factor: 0.000001 },
            'j': { name: 'Дж (джоуль)', factor: 3600000 },
            'kj': { name: 'кДж (килоджоуль)', factor: 3600 },
            'mj': { name: 'МДж (мегаджоуль)', factor: 3.6 },
            'gj': { name: 'ГДж (гигаджоуль)', factor: 0.0036 },
            'cal': { name: 'кал (калория)', factor: 860420.65 },
            'kcal': { name: 'ккал (килокалория)', factor: 860.42065 },
            'gcal': { name: 'Гкал (гигакалория)', factor: 0.00086042065 },
            'btu': { name: 'BTU', factor: 3412.14 }
        }
    },
    velocity: {
        name: 'Скорость потока',
        base: 'ms',
        units: {
            'ms': { name: 'м/с', factor: 1 },
            'kmh': { name: 'км/ч', factor: 3.6 },
            'mmin': { name: 'м/мин', factor: 60 },
            'cmh': { name: 'см/ч', factor: 360000 },
            'fts': { name: 'фут/с', factor: 3.28084 },
            'ftmin': { name: 'фут/мин', factor: 196.85 },
            'mph': { name: 'миля/ч', factor: 2.23694 },
            'knot': { name: 'узел', factor: 1.94384 }
        }
    }
};

// Обновление списка единиц при смене типа величины
function updateConverterUnits() {
    const typeSelect = document.getElementById('converter-type');
    const fromUnitSelect = document.getElementById('converter-from-unit');
    const toUnitSelect = document.getElementById('converter-to-unit');
    const infoEl = document.getElementById('converter-info');
    
    const selectedType = typeSelect.value;
    const unitData = CONVERSION_UNITS[selectedType];
    
    if (!unitData) return;
    
    // Обновляем информацию
    infoEl.textContent = `Конвертер: ${unitData.name}`;
    
    // Очищаем и заполняем списки единиц
    fromUnitSelect.innerHTML = '';
    toUnitSelect.innerHTML = '';
    
    let firstUnit = null;
    let secondUnit = null;
    let index = 0;
    
    for (const [key, unit] of Object.entries(unitData.units)) {
        const optionFrom = new Option(unit.name, key);
        const optionTo = new Option(unit.name, key);
        
        fromUnitSelect.add(optionFrom);
        toUnitSelect.add(optionTo);
        
        if (index === 0) firstUnit = key;
        if (index === 1) secondUnit = key;
        index++;
    }
    
    // Устанавливаем разные единицы по умолчанию
    fromUnitSelect.value = firstUnit;
    toUnitSelect.value = secondUnit || firstUnit;
    
    // Очищаем значения
    document.getElementById('converter-from-value').value = '';
    document.getElementById('converter-to-value').value = '';
}

// Автоматическая конвертация единиц
function autoConvertUnits(sourceType) {
    const typeSelect = document.getElementById('converter-type');
    const fromUnitSelect = document.getElementById('converter-from-unit');
    const toUnitSelect = document.getElementById('converter-to-unit');
    const fromValueInput = document.getElementById('converter-from-value');
    const toValueInput = document.getElementById('converter-to-value');
    
    const selectedType = typeSelect.value;
    const unitData = CONVERSION_UNITS[selectedType];
    
    if (!unitData) return;
    
    if (sourceType === 'from') {
        const value = parseFloat(fromValueInput.value);
        if (!isNaN(value)) {
            const fromUnit = unitData.units[fromUnitSelect.value];
            const toUnit = unitData.units[toUnitSelect.value];
            
            // Конвертация: значение → базовая единица → целевая единица
            const baseValue = value / fromUnit.factor;
            const convertedValue = baseValue * toUnit.factor;
            
            toValueInput.value = convertedValue.toFixed(6);
        } else {
            toValueInput.value = '';
        }
    } else if (sourceType === 'to') {
        const value = parseFloat(toValueInput.value);
        if (!isNaN(value)) {
            const fromUnit = unitData.units[fromUnitSelect.value];
            const toUnit = unitData.units[toUnitSelect.value];
            
            // Обратная конвертация
            const baseValue = value / toUnit.factor;
            const convertedValue = baseValue * fromUnit.factor;
            
            fromValueInput.value = convertedValue.toFixed(6);
        } else {
            fromValueInput.value = '';
        }
    }
}

/* ========== Калибровка СИ ========== */

// Хранилище СИ (в реальном приложении это будет база данных)
let siList = [];

// Инструкции по калибровке для разных типов СИ
const CALIBRATION_INSTRUCTIONS = {
    flow: {
        title: 'Калибровка расходомера',
        steps: [
            {
                title: 'Подготовка к калибровке',
                content: 'Убедитесь, что расходомер чист и находится в рабочем состоянии. Проверьте отсутствие механических повреждений.'
            },
            {
                title: 'Подключение к эталонной установке',
                content: 'Подключите расходомер к эталонной расходомерной установке. Убедитесь в герметичности соединений.'
            },
            {
                title: 'Проверка нулевой точки',
                content: 'При нулевом расходе показания прибора должны быть близки к нулю. Зафиксируйте показания.'
            },
            {
                title: 'Калибровка в контрольных точках',
                content: 'Проведите измерения в контрольных точках диапазона: 20%, 50%, 80%, 100% от максимального расхода. Для каждой точки:<br>- Установите расход на эталонной установке<br>- Дождитесь стабилизации показаний<br>- Запишите показания эталона и поверяемого прибора<br>- Рассчитайте погрешность'
            },
            {
                title: 'Анализ результатов',
                content: 'Рассчитайте относительную погрешность для каждой точки:<br>δ = ((Q_изм - Q_эт) / Q_эт) × 100%<br>Убедитесь, что погрешность не превышает допустимых значений.'
            },
            {
                title: 'Оформление результатов',
                content: 'Заполните протокол калибровки с указанием:<br>- Даты и условий калибровки<br>- Использованного эталона<br>- Результатов измерений<br>- Выводов о пригодности СИ'
            }
        ]
    },
    temperature: {
        title: 'Калибровка термометра',
        steps: [
            {
                title: 'Подготовка термостата',
                content: 'Подготовьте термостат с жидкостью соответствующего диапазона. Для 0-100°C используйте воду, для высоких температур - масло.'
            },
            {
                title: 'Установка датчиков',
                content: 'Установите эталонный термометр и поверяемый датчик в термостат на одинаковой глубине. Расстояние между датчиками 20-30 мм.'
            },
            {
                title: 'Калибровка в контрольных точках',
                content: 'Проведите измерения в 5-7 точках диапазона. Для каждой точки:<br>- Установите температуру на термостате<br>- Дождитесь стабилизации (не менее 15 мин)<br>- Запишите показания эталона и поверяемого прибора'
            },
            {
                title: 'Расчет погрешности',
                content: 'Рассчитайте абсолютную погрешность:<br>Δt = t_изм - t_эт<br>Сравните с допустимой погрешностью класса точности.'
            },
            {
                title: 'Оформление протокола',
                content: 'Составьте протокол калибровки согласно ГОСТ 8.558-2009 или МИ 1451-86.'
            }
        ]
    },
    pressure: {
        title: 'Калибровка манометра',
        steps: [
            {
                title: 'Подготовка грузопоршневого манометра',
                content: 'Подготовьте эталонный грузопоршневой манометр соответствующего класса точности.'
            },
            {
                title: 'Подключение',
                content: 'Подключите поверяемый манометр и эталон к источнику давления. Проверьте герметичность.'
            },
            {
                title: 'Проверка нулевой точки',
                content: 'При атмосферном давлении стрелка должна указывать на ноль. Зафиксируйте показания.'
            },
            {
                title: 'Калибровка при повышении давления',
                content: 'Проведите измерения в точках: 0, 25%, 50%, 75%, 100% диапазона. Записывайте показания обоих приборов.'
            },
            {
                title: 'Калибровка при понижении давления',
                content: 'Повторите измерения при понижении давления для определения гистерезиса.'
            },
            {
                title: 'Расчет вариации',
                content: 'Вариация показаний = |P_возр - P_пониж|<br>Не должна превышать допустимого значения.'
            }
        ]
    },
    ph: {
        title: 'Калибровка pH-метра',
        steps: [
            {
                title: 'Подготовка буферных растворов',
                content: 'Приготовьте стандартные буферные растворы с pH 4.01, 7.00, 10.01 (при 25°C).'
            },
            {
                title: 'Промывка электрода',
                content: 'Тщательно промойте электрод дистиллированной водой и просушите фильтровальной бумагой.'
            },
            {
                title: 'Калибровка по двум точкам',
                content: 'Погрузите электрод в буфер pH 7.00, дождитесь стабилизации. Откалибруйте прибор.<br>Затем повторите с буфером pH 4.01 или 10.01 (в зависимости от диапазона измерений).'
            },
            {
                title: 'Проверка наклона характеристики',
                content: 'Проверьте наклон характеристики электрода. Должен быть 54-60 мВ/pH при 25°C.'
            },
            {
                title: 'Контроль третьей точки',
                content: 'Проверьте показания в третьем буферном растворе. Отклонение не более ±0.05 pH.'
            }
        ]
    },
    other: {
        title: 'Общая процедура калибровки',
        steps: [
            {
                title: 'Изучение документации',
                content: 'Изучите паспорт и методику поверки/калибровки для данного типа СИ.'
            },
            {
                title: 'Подготовка эталонов',
                content: 'Выберите эталонные СИ с погрешностью в 3-5 раз меньше поверяемого.'
            },
            {
                title: 'Внешний осмотр',
                content: 'Проведите внешний осмотр СИ, проверьте комплектность и отсутствие повреждений.'
            },
            {
                title: 'Опробование',
                content: 'Включите СИ, проверьте работоспособность всех функций.'
            },
            {
                title: 'Определение метрологических характеристик',
                content: 'Проведите измерения в контрольных точках диапазона. Рассчитайте погрешности.'
            },
            {
                title: 'Оформление результатов',
                content: 'Заполните протокол калибровки с указанием всех результатов и выводов.'
            }
        ]
    }
};

// Открыть модальное окно добавления СИ
function openAddSIModal() {
    const modal = document.getElementById('add-si-modal');
    modal.classList.add('active');
    document.getElementById('add-si-form').reset();
}

// Закрыть модальное окно добавления СИ
function closeAddSIModal() {
    const modal = document.getElementById('add-si-modal');
    modal.classList.remove('active');
}

// Добавить СИ в список
function addSI() {
    const type = document.getElementById('si-type').value;
    const name = document.getElementById('si-name').value;
    const serial = document.getElementById('si-serial').value;
    const range = document.getElementById('si-range').value;
    const accuracy = document.getElementById('si-accuracy').value;
    const lastCalibration = document.getElementById('si-last-calibration').value;
    const interval = document.getElementById('si-interval').value || 12;

    if (!type || !name || !serial || !range || !accuracy) {
        alert('Пожалуйста, заполните все обязательные поля');
        return;
    }

    const si = {
        id: Date.now(),
        type,
        name,
        serial,
        range,
        accuracy,
        lastCalibration,
        interval: parseInt(interval),
        addedDate: new Date().toISOString()
    };

    siList.push(si);
    renderSIList();
    closeAddSIModal();
    
    // Открыть инструкцию сразу после добавления
    openCalibrationInstruction(si.id);
}

// Отобразить список СИ
function renderSIList() {
    const container = document.getElementById('si-list');
    
    if (siList.length === 0) {
        container.innerHTML = `
            <div class="si-empty-state">
                <i class="fas fa-inbox"></i>
                <p>Перечень СИ пуст. Добавьте первое средство измерения.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = siList.map(si => {
        const status = getCalibrationStatus(si);
        return `
            <div class="si-card">
                <div class="si-card-header">
                    <div class="si-card-title">
                        <h4>
                            <span class="si-type-badge">${getTypeLabel(si.type)}</span>
                            ${si.name}
                        </h4>
                        <p>Заводской №: ${si.serial}</p>
                    </div>
                    <div class="si-card-actions">
                        <button class="btn-icon" onclick="openCalibrationInstruction(${si.id})" title="Инструкция по калибровке">
                            <i class="fas fa-book"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteSI(${si.id})" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="si-card-body">
                    <div class="si-info-item">
                        <span class="si-info-label">Диапазон измерений</span>
                        <span class="si-info-value">${si.range}</span>
                    </div>
                    <div class="si-info-item">
                        <span class="si-info-label">Точность</span>
                        <span class="si-info-value">${si.accuracy}</span>
                    </div>
                    <div class="si-info-item">
                        <span class="si-info-label">Последняя калибровка</span>
                        <span class="si-info-value">${si.lastCalibration ? formatDate(si.lastCalibration) : 'Не указана'}</span>
                    </div>
                    <div class="si-info-item">
                        <span class="si-info-label">Интервал калибровки</span>
                        <span class="si-info-value">${si.interval} мес.</span>
                    </div>
                </div>
                <div class="si-status ${status.class}">
                    ${status.message}
                </div>
            </div>
        `;
    }).join('');
}

// Получить статус калибровки
function getCalibrationStatus(si) {
    if (!si.lastCalibration) {
        return {
            class: 'status-warning',
            message: '⚠️ Калибровка не проводилась'
        };
    }

    const lastDate = new Date(si.lastCalibration);
    const nextDate = new Date(lastDate);
    nextDate.setMonth(nextDate.getMonth() + si.interval);
    
    const today = new Date();
    const daysUntilNext = Math.floor((nextDate - today) / (1000 * 60 * 60 * 24));

    if (daysUntilNext < 0) {
        return {
            class: 'status-expired',
            message: `❌ Срок калибровки истёк ${Math.abs(daysUntilNext)} дн. назад`
        };
    } else if (daysUntilNext <= 30) {
        return {
            class: 'status-warning',
            message: `⚠️ Калибровка требуется через ${daysUntilNext} дн. (до ${formatDate(nextDate)})`
        };
    } else {
        return {
            class: 'status-ok',
            message: `✓ Действительна до ${formatDate(nextDate)} (${daysUntilNext} дн.)`
        };
    }
}

// Получить название типа СИ
function getTypeLabel(type) {
    const labels = {
        flow: 'Расходомер',
        temperature: 'Термометр',
        pressure: 'Манометр',
        ph: 'pH-метр',
        other: 'Другое'
    };
    return labels[type] || type;
}

// Форматировать дату
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

// Удалить СИ
function deleteSI(id) {
    if (confirm('Вы уверены, что хотите удалить это средство измерения?')) {
        siList = siList.filter(si => si.id !== id);
        renderSIList();
    }
}

// Открыть инструкцию по калибровке
function openCalibrationInstruction(id) {
    const si = siList.find(item => item.id === id);
    if (!si) return;

    const instruction = CALIBRATION_INSTRUCTIONS[si.type] || CALIBRATION_INSTRUCTIONS.other;
    const modal = document.getElementById('calibration-instruction-modal');
    const content = document.getElementById('calibration-instruction-content');

    content.innerHTML = `
        <div class="instruction-header">
            <h4>${instruction.title}</h4>
            <p><strong>СИ:</strong> ${si.name} (${si.serial})</p>
            <p><strong>Диапазон:</strong> ${si.range}</p>
            <p><strong>Класс точности:</strong> ${si.accuracy}</p>
        </div>
        <div class="instruction-steps">
            ${instruction.steps.map((step, index) => `
                <div class="instruction-step">
                    <div class="step-number">${index + 1}</div>
                    <div class="step-content">
                        <h5>${step.title}</h5>
                        <p>${step.content}</p>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="instruction-footer">
            <p><strong>Важно:</strong> После завершения калибровки не забудьте оформить протокол и обновить дату последней калибровки в карточке СИ.</p>
        </div>
    `;

    modal.classList.add('active');
}

// Закрыть модальное окно инструкции
function closeCalibrationModal() {
    const modal = document.getElementById('calibration-instruction-modal');
    modal.classList.remove('active');
}

// Закрытие модальных окон по клику вне контента
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});
