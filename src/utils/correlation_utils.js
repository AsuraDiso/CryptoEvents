/**
 * Вычисляет коэффициент корреляции Пирсона между двумя массивами
 * @param {number[]} x - Первый массив данных (например, event_impact_score)
 * @param {number[]} y - Второй массив данных (например, daily_return или volatility)
 * @returns {number} Коэффициент корреляции от -1 до 1
 */
function calculatePearsonCorrelation(x, y) {
  if (x.length !== y.length || x.length === 0) {
    return 0;
  }

  const n = x.length;
  
  // Вычисляем средние значения
  const meanX = x.reduce((sum, val) => sum + val, 0) / n;
  const meanY = y.reduce((sum, val) => sum + val, 0) / n;
  
  // Вычисляем числитель и знаменатель формулы корреляции Пирсона
  let numerator = 0;
  let sumXSquared = 0;
  let sumYSquared = 0;
  
  for (let i = 0; i < n; i++) {
    const deltaX = x[i] - meanX;
    const deltaY = y[i] - meanY;
    
    numerator += deltaX * deltaY;
    sumXSquared += deltaX * deltaX;
    sumYSquared += deltaY * deltaY;
  }
  
  const denominator = Math.sqrt(sumXSquared * sumYSquared);
  
  // Избегаем деления на ноль
  if (denominator === 0) {
    return 0;
  }
  
  return numerator / denominator;
}

/**
 * Вычисляет среднее значение массива
 * @param {number[]} array - Массив чисел
 * @returns {number} Среднее значение
 */
function calculateMean(array) {
  if (array.length === 0) return 0;
  return array.reduce((sum, val) => sum + val, 0) / array.length;
}

/**
 * Фильтрует данные по диапазону дат
 * @param {Array} data - Массив данных с полем date
 * @param {Date|string} startDate - Начальная дата (необязательно)
 * @param {Date|string} endDate - Конечная дата (необязательно)
 * @returns {Array} Отфильтрованные данные
 */
function filterByDateRange(data, startDate, endDate) {
  return data.filter(item => {
    const itemDate = new Date(item.date);
    
    if (startDate) {
      const start = new Date(startDate);
      if (itemDate < start) return false;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      if (itemDate > end) return false;
    }
    
    return true;
  });
}

/**
 * Подготавливает данные для расчета корреляции
 * @param {Array} eventCurrencyData - Данные из таблицы event_currencies
 * @param {string} metricField - Поле для анализа ('daily_return' или 'volatility')
 * @returns {Object} Подготовленные данные для корреляции
 */
function prepareCorrelationData(eventCurrencyData, metricField) {
  // Фильтруем записи с валидными данными
  const validData = eventCurrencyData.filter(item => 
    item.event_impact_score !== null && 
    item.event_impact_score !== undefined &&
    item[metricField] !== null && 
    item[metricField] !== undefined &&
    !isNaN(parseFloat(item.event_impact_score)) &&
    !isNaN(parseFloat(item[metricField]))
  );

  if (validData.length === 0) {
    return {
      impactScores: [],
      metricValues: [],
      validDataCount: 0
    };
  }

  // Извлекаем значения в отдельные массивы
  const impactScores = validData.map(item => parseFloat(item.event_impact_score));
  const metricValues = validData.map(item => parseFloat(item[metricField]));

  return {
    impactScores,
    metricValues,
    validDataCount: validData.length,
    rawData: validData
  };
}

/**
 * Получает минимальную и максимальную даты из массива данных
 * @param {Array} data - Массив данных с полем date
 * @returns {Object} Объект с minDate и maxDate
 */
function getDateRange(data) {
  if (data.length === 0) {
    return { minDate: null, maxDate: null };
  }

  const dates = data.map(item => new Date(item.date));
  const minDate = new Date(Math.min(...dates));
  const maxDate = new Date(Math.max(...dates));

  return { minDate, maxDate };
}

/**
 * Форматирует результат корреляционного анализа
 * @param {Object} params - Параметры анализа
 * @returns {Object} Форматированный результат
 */
function formatCorrelationResult(params) {
  const {
    symbol,
    correlationCoefficient,
    dataPoints,
    startDate,
    endDate,
    averageImpactScore,
    averageMetricValue,
    metricType
  } = params;

  return {
    symbol,
    correlationCoefficient: parseFloat(correlationCoefficient.toFixed(6)),
    dataPoints,
    startDate: startDate ? startDate.toISOString().split('T')[0] : null,
    endDate: endDate ? endDate.toISOString().split('T')[0] : null,
    averageImpactScore: parseFloat(averageImpactScore.toFixed(4)),
    averageMetricValue: parseFloat(averageMetricValue.toFixed(6)),
    metricType
  };
}

module.exports = {
  calculatePearsonCorrelation,
  calculateMean,
  filterByDateRange,
  prepareCorrelationData,
  getDateRange,
  formatCorrelationResult
};