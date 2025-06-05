/**
 * Interprets the correlation coefficient in simple language
 * @param {number} correlation - Correlation coefficient
 * @returns {string} Correlation Interpretation
 */
function interpretCorrelation(correlation) {
  const absCorr = Math.abs(correlation);
  let strength = '';
  let direction = correlation >= 0 ? 'positive' : 'negative';
  
  if (absCorr >= 0.7) {
    strength = 'strong';
  } else if (absCorr >= 0.5) {
    strength = 'moderate';
  } else if (absCorr >= 0.3) {
    strength = 'weak';
  } else {
    strength = 'very weak';
  }
  
  return `${strength} ${direction} correlation (${correlation.toFixed(3)})`;
}

/**
 * Determines which correlation is stronger
 * @param {number} dailyReturnCorr - Correlation daily return
 * @param {number} volatilityCorr - Correlation volatility
 * @returns {string} Description of the strongest correlation
 */
function determineStrongestCorrelation(dailyReturnCorr, volatilityCorr) {
  const absDR = Math.abs(dailyReturnCorr);
  const absVol = Math.abs(volatilityCorr);
  
  if (absDR > absVol) {
    return `Daily Return has a stronger correlation (${dailyReturnCorr.toFixed(3)} vs ${volatilityCorr.toFixed(3)})`;
  } else if (absVol > absDR) {
    return `Volatility has a stronger correlation (${volatilityCorr.toFixed(3)} vs ${dailyReturnCorr.toFixed(3)})`;
  } else {
    return `The correlations are roughly equal (${dailyReturnCorr.toFixed(3)} ≈ ${volatilityCorr.toFixed(3)})`;
  }
}

/**
 * Sorts events by impact score in descending order
 * @param {Array} events - Array of events
 * @param {number} limit - Limit number of events
 * @returns {Array} Sorted events with ranks
 */
function rankEventsByImpact(events, limit = 10) {
  // Filter events with valid impact scores
  const validEvents = events.filter(event => 
    event.event_impact_score !== null && 
    event.event_impact_score !== undefined &&
    !isNaN(parseFloat(event.event_impact_score))
  );

  // Sort by impact score in descending order
  const sortedEvents = validEvents.sort((a, b) => 
    parseFloat(b.event_impact_score) - parseFloat(a.event_impact_score)
  );

  // Apply the limit and add ranks
  return sortedEvents.slice(0, limit).map((event, index) => ({
    rank: index + 1,
    eventName: event.Event ? event.Event.name_of_incident : event.eventName || 'Unknown Event',
    date: event.date,
    eventImpactScore: parseFloat(event.event_impact_score),
    dailyReturn: event.daily_return ? parseFloat(event.daily_return) : null,
    volatility: event.volatility ? parseFloat(event.volatility) : null,
    eventType: event.Event ? event.Event.type_of_event : event.eventType || null,
    country: event.Event ? event.Event.country : event.country || null,
    currencySymbol: event.CryptoCurrency ? event.CryptoCurrency.Symbol : event.currencySymbol || null
  }));
}

/**
 * Calculates summary statistics for correlation summary
 * @param {Array} eventCurrencyData - Data from event_currencies
 * @param {string} symbol - Cryptocurrency symbol
 * @returns {Object} Prepared data for correlation summary
 */
function prepareCorrelationSummaryData(eventCurrencyData, symbol) {
  if (!eventCurrencyData || eventCurrencyData.length === 0) {
    return null;
  }

  // Filter valid data
  const validData = eventCurrencyData.filter(item => 
    item.event_impact_score !== null && 
    item.event_impact_score !== undefined &&
    item.daily_return !== null && 
    item.daily_return !== undefined &&
    item.volatility !== null && 
    item.volatility !== undefined &&
    !isNaN(parseFloat(item.event_impact_score)) &&
    !isNaN(parseFloat(item.daily_return)) &&
    !isNaN(parseFloat(item.volatility))
  );

  if (validData.length === 0) {
    return null;
  }

  // Retrieve values
  const impactScores = validData.map(item => parseFloat(item.event_impact_score));
  const dailyReturns = validData.map(item => parseFloat(item.daily_return));
  const volatilities = validData.map(item => parseFloat(item.volatility));

  // Get date range
  const dates = validData.map(item => new Date(item.date));
  const startDate = new Date(Math.min(...dates));
  const endDate = new Date(Math.max(...dates));

  // Calculate average values
  const averageImpactScore = impactScores.reduce((sum, val) => sum + val, 0) / impactScores.length;
  const averageDailyReturn = dailyReturns.reduce((sum, val) => sum + val, 0) / dailyReturns.length;
  const averageVolatility = volatilities.reduce((sum, val) => sum + val, 0) / volatilities.length;

  return {
    symbol,
    validData,
    dataPoints: validData.length,
    startDate,
    endDate,
    averageImpactScore,
    averageDailyReturn,
    averageVolatility,
    impactScores,
    dailyReturns,
    volatilities
  };
}

/**
 * Formats data for TopEvent response
 * @param {Array} rankedEvents - Ranked Events
 * @returns {Array} Formatted data for SOAP response
 */
function formatTopEventsResponse(rankedEvents) {
  return rankedEvents.map(event => ({
    rank: event.rank,
    eventName: event.eventName,
    date: event.date,
    eventImpactScore: parseFloat(event.eventImpactScore.toFixed(4)),
    dailyReturn: event.dailyReturn ? parseFloat(event.dailyReturn.toFixed(6)) : null,
    volatility: event.volatility ? parseFloat(event.volatility.toFixed(6)) : null,
    eventType: event.eventType,
    country: event.country,
    currencySymbol: event.currencySymbol
  }));
}

/**
 * Formats the data for the CorrelationSummary response
 * @param {Object} summaryData - Prepared summary data
 * @param {number} dailyReturnCorr - Correlation daily return
 * @param {number} volatilityCorr - Correlation volatility
 * @returns {Object} Formatted data for SOAP response
 */
function formatCorrelationSummaryResponse(summaryData, dailyReturnCorr, volatilityCorr) {
  const strongestCorrelation = determineStrongestCorrelation(dailyReturnCorr, volatilityCorr);
  
  return {
    symbol: summaryData.symbol,
    dataPoints: summaryData.dataPoints,
    startDate: summaryData.startDate.toISOString().split('T')[0],
    endDate: summaryData.endDate.toISOString().split('T')[0],
    averageImpactScore: parseFloat(summaryData.averageImpactScore.toFixed(4)),
    dailyReturnCorrelation: {
      correlationCoefficient: parseFloat(dailyReturnCorr.toFixed(6)),
      averageMetricValue: parseFloat(summaryData.averageDailyReturn.toFixed(6)),
      interpretation: interpretCorrelation(dailyReturnCorr)
    },
    volatilityCorrelation: {
      correlationCoefficient: parseFloat(volatilityCorr.toFixed(6)),
      averageMetricValue: parseFloat(summaryData.averageVolatility.toFixed(6)),
      interpretation: interpretCorrelation(volatilityCorr)
    },
    strongestCorrelation
  };
}

/**
 * Validates date parameters
 * @param {string} startDate - StartDate
 * @param {string} endDate - EndDate
 * @returns {Object} Object with validated dates or error
 */
function validateDateRange(startDate, endDate) {
  let validStartDate = null;
  let validEndDate = null;
  
  if (startDate) {
    validStartDate = new Date(startDate);
    if (isNaN(validStartDate.getTime())) {
      throw new Error(`Invalid start date format: ${startDate}`);
    }
  }
  
  if (endDate) {
    validEndDate = new Date(endDate);
    if (isNaN(validEndDate.getTime())) {
      throw new Error(`Invalid end date format: ${endDate}`);
    }
  }
  
  if (validStartDate && validEndDate && validStartDate > validEndDate) {
    throw new Error('Start date cannot be later than end date');
  }
  
  return { validStartDate, validEndDate };
}

/**
 * Applies default limit if not specified
 * @param {number} limit - Specified limit
 * @param {number} defaultLimit - Default limit
 * @param {number} maxLimit - Maximum Limit
 * @returns {number} Validated Limit
 */
function validateLimit(limit, defaultLimit = 10, maxLimit = 100) {
  if (!limit || limit <= 0) {
    return defaultLimit;
  }
  
  return Math.min(limit, maxLimit);
}

module.exports = {
  interpretCorrelation,
  determineStrongestCorrelation,
  rankEventsByImpact,
  prepareCorrelationSummaryData,
  formatTopEventsResponse,
  formatCorrelationSummaryResponse,
  validateDateRange,
  validateLimit
};