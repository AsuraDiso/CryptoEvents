const soap = require('soap');
const fs = require('fs');
const path = require('path');
const CryptoCurrency = require('../models/CryptoCurrency');
const Event = require('../models/Event');
const EventCurrency = require('../models/EventCurrency');

// Import utils
const { 
  calculatePearsonCorrelation, 
  calculateMean, 
  filterByDateRange, 
  prepareCorrelationData, 
  getDateRange, 
  formatCorrelationResult 
} = require('../utils/correlation_utils');

const {
  interpretCorrelation,
  determineStrongestCorrelation,
  rankEventsByImpact,
  prepareCorrelationSummaryData,
  formatTopEventsResponse,
  formatCorrelationSummaryResponse,
  validateDateRange,
  validateLimit
} = require('../utils/analysis_utils');

// SOAP service implementation
const cryptoEventsService = {
  CryptoEventsService: {
    CryptoEventsPort: {
      
      // Aded dates for filtering events by currency symbol
      GetEventsByCurrencySymbol: async function(args) {
        try {
          const { symbol, startDate, endDate } = args;
          console.log('SOAP Request GetEventsByCurrencySymbol:', { symbol, startDate, endDate });
          
          if (!symbol) {
            throw new Error('Symbol parameter is required');
          }

          // Validate date range
          const { validStartDate, validEndDate } = validateDateRange(startDate, endDate);

          // Find all currencies with this symbol
          const currencies = await CryptoCurrency.findAll({
            where: { Symbol: symbol }
          });

          if (!currencies || currencies.length === 0) {
            console.log('No currency found for symbol:', symbol);
            return {
              eventCurrencies: {
                eventCurrency: []
              }
            };
          }

          const currencyIds = currencies.map(c => c.id);

          // WHERE condition for date filtering
          let whereCondition = { currency_id: currencyIds };
          if (validStartDate || validEndDate) {
            whereCondition.date = {};
            if (validStartDate) {
              whereCondition.date[Symbol.for('gte')] = validStartDate;
            }
            if (validEndDate) {
              whereCondition.date[Symbol.for('lte')] = validEndDate;
            }
          }

          // Find all event-currency associations
          const eventCurrencies = await EventCurrency.findAll({
            where: whereCondition,
            include: [
              {
                model: Event,
                foreignKey: 'event_id',
                required: true
              },
              {
                model: CryptoCurrency,
                foreignKey: 'currency_id',
                required: true
              }
            ],
            order: [['date', 'DESC']]
          });

          console.log('Event-Currency associations found:', eventCurrencies.length);

          // Transform data for SOAP response
          const responseData = eventCurrencies.map(ec => ({
            id: ec.id,
            date: ec.date,
            eventImpactScore: ec.event_impact_score || null,
            dailyReturn: ec.daily_return || null,
            volatility: ec.volatility || null,
            eventName: ec.Event.name_of_incident,
            currencyName: ec.CryptoCurrency.Name,
            currencySymbol: ec.CryptoCurrency.Symbol
          }));

          return {
            eventCurrencies: {
              eventCurrency: responseData
            }
          };

        } catch (error) {
          console.error('SOAP GetEventsByCurrencySymbol Error:', error);
          throw new soap.SoapFault('Server Error', error.message);
        }
      },

      // Method to get top impact events
      GetTopImpactEvents: async function(args) {
        try {
          const { symbol, limit, startDate, endDate } = args;
          console.log('SOAP Request GetTopImpactEvents:', { symbol, limit, startDate, endDate });
          
          if (!symbol) {
            throw new Error('Symbol parameter is required');
          }

          // validate limit and date range
          const { validStartDate, validEndDate } = validateDateRange(startDate, endDate);
          const validLimit = validateLimit(limit, 10, 50);

          // Get all currencies for the given symbol
          const currencies = await CryptoCurrency.findAll({
            where: { Symbol: symbol }
          });

          if (!currencies || currencies.length === 0) {
            throw new Error(`No currency found for symbol: ${symbol}`);
          }

          const currencyIds = currencies.map(c => c.id);

          // WHERE condition for date filtering
          let whereCondition = { currency_id: currencyIds };
          if (validStartDate || validEndDate) {
            whereCondition.date = {};
            if (validStartDate) {
              whereCondition.date[Symbol.for('gte')] = validStartDate;
            }
            if (validEndDate) {
              whereCondition.date[Symbol.for('lte')] = validEndDate;
            }
          }

          // Get event currencies with impact scores
          const eventCurrencies = await EventCurrency.findAll({
            where: whereCondition,
            include: [
              {
                model: Event,
                foreignKey: 'event_id',
                required: true
              },
              {
                model: CryptoCurrency,
                foreignKey: 'currency_id',
                required: true
              }
            ]
          });

          if (eventCurrencies.length === 0) {
            return {
              topEvents: {
                topEvent: []
              }
            };
          }

          // Range by impact score
          const rankedEvents = rankEventsByImpact(eventCurrencies, validLimit);
          const formattedEvents = formatTopEventsResponse(rankedEvents);

          console.log(`Top ${rankedEvents.length} impact events found for ${symbol}`);

          return {
            topEvents: {
              topEvent: formattedEvents
            }
          };

        } catch (error) {
          console.error('SOAP GetTopImpactEvents Error:', error);
          throw new soap.SoapFault('Server Error', error.message);
        }
      },

      // Summary method for correlation analysis
      GetCorrelationSummary: async function(args) {
        try {
          const { symbol, startDate, endDate } = args;
          console.log('SOAP Request GetCorrelationSummary:', { symbol, startDate, endDate });
          
          if (!symbol) {
            throw new Error('Symbol parameter is required');
          }

          // Validate date range
          const { validStartDate, validEndDate } = validateDateRange(startDate, endDate);

          // Get all currencies for the given symbol
          const currencies = await CryptoCurrency.findAll({
            where: { Symbol: symbol }
          });

          if (!currencies || currencies.length === 0) {
            throw new Error(`No currency found for symbol: ${symbol}`);
          }

          const currencyIds = currencies.map(c => c.id);

          // WHERE condition for date filtering
          let whereCondition = { currency_id: currencyIds };
          if (validStartDate || validEndDate) {
            whereCondition.date = {};
            if (validStartDate) {
              whereCondition.date[Symbol.for('gte')] = validStartDate;
            }
            if (validEndDate) {
              whereCondition.date[Symbol.for('lte')] = validEndDate;
            }
          }

          // Get data event_currencies
          const eventCurrencies = await EventCurrency.findAll({
            where: whereCondition,
            include: [
              {
                model: Event,
                foreignKey: 'event_id',
                required: true
              },
              {
                model: CryptoCurrency,
                foreignKey: 'currency_id',
                required: true
              }
            ],
            order: [['date', 'ASC']]
          });

          if (eventCurrencies.length === 0) {
            throw new Error('No data found for the specified criteria');
          }

          // Prepare data for correlation summary
          const summaryData = prepareCorrelationSummaryData(eventCurrencies, symbol);
          
          if (!summaryData) {
            throw new Error('No valid data points found for correlation analysis');
          }

          // Calculate correlations
          const dailyReturnCorrelation = calculatePearsonCorrelation(
            summaryData.impactScores,
            summaryData.dailyReturns
          );

          const volatilityCorrelation = calculatePearsonCorrelation(
            summaryData.impactScores,
            summaryData.volatilities
          );

          // Format the result
          const result = formatCorrelationSummaryResponse(
            summaryData,
            dailyReturnCorrelation,
            volatilityCorrelation
          );

          console.log('Correlation Summary calculated:', {
            symbol: result.symbol,
            dataPoints: result.dataPoints,
            dailyReturnCorr: result.dailyReturnCorrelation.correlationCoefficient,
            volatilityCorr: result.volatilityCorrelation.correlationCoefficient
          });

          return {
            correlationSummary: result
          };

        } catch (error) {
          console.error('SOAP GetCorrelationSummary Error:', error);
          throw new soap.SoapFault('Server Error', error.message);
        }
      },

      // Correlation for daily_return
      GetDailyReturnCorrelation: async function(args) {
        try {
          const { symbol, startDate, endDate } = args;
          console.log('SOAP Request GetDailyReturnCorrelation:', { symbol, startDate, endDate });
          
          if (!symbol) {
            throw new Error('Symbol parameter is required');
          }

          // Validate date range
          const { validStartDate, validEndDate } = validateDateRange(startDate, endDate);

          // Get all currencies for the given symbol
          const currencies = await CryptoCurrency.findAll({
            where: { Symbol: symbol }
          });

          if (!currencies || currencies.length === 0) {
            throw new Error(`No currency found for symbol: ${symbol}`);
          }

          const currencyIds = currencies.map(c => c.id);

          // WHERE condition for date filtering
          let whereCondition = { currency_id: currencyIds };
          if (validStartDate || validEndDate) {
            whereCondition.date = {};
            if (validStartDate) {
              whereCondition.date[Symbol.for('gte')] = validStartDate;
            }
            if (validEndDate) {
              whereCondition.date[Symbol.for('lte')] = validEndDate;
            }
          }

          // Get data event_currencies
          const eventCurrencies = await EventCurrency.findAll({
            where: whereCondition,
            include: [
              {
                model: Event,
                foreignKey: 'event_id',
                required: true
              },
              {
                model: CryptoCurrency,
                foreignKey: 'currency_id',
                required: true
              }
            ],
            order: [['date', 'ASC']]
          });

          if (eventCurrencies.length === 0) {
            throw new Error('No data found for the specified criteria');
          }

          // Prepare data for correlation
          const correlationData = prepareCorrelationData(eventCurrencies, 'daily_return');
          
          if (correlationData.validDataCount === 0) {
            throw new Error('No valid data points found for correlation analysis');
          }

          // Calculate correlation
          const correlationCoefficient = calculatePearsonCorrelation(
            correlationData.impactScores,
            correlationData.metricValues
          );

          // Calculate additional statistics
          const averageImpactScore = calculateMean(correlationData.impactScores);
          const averageMetricValue = calculateMean(correlationData.metricValues);
          
          // Get date range from raw data
          const dateRange = getDateRange(correlationData.rawData);

          // Format the result
          const result = formatCorrelationResult({
            symbol,
            correlationCoefficient,
            dataPoints: correlationData.validDataCount,
            startDate: dateRange.minDate,
            endDate: dateRange.maxDate,
            averageImpactScore,
            averageMetricValue,
            metricType: 'daily_return'
          });

          console.log('Daily Return Correlation calculated:', result);

          return {
            correlationData: result
          };

        } catch (error) {
          console.error('SOAP Daily Return Correlation Error:', error);
          throw new soap.SoapFault('Server Error', error.message);
        }
      },

      // Correlation method for volatility
      GetVolatilityCorrelation: async function(args) {
        try {
          const { symbol, startDate, endDate } = args;
          console.log('SOAP Request GetVolatilityCorrelation:', { symbol, startDate, endDate });
          
          if (!symbol) {
            throw new Error('Symbol parameter is required');
          }

          // Validate date range
          const { validStartDate, validEndDate } = validateDateRange(startDate, endDate);

          // Get all currencies for the given symbol
          const currencies = await CryptoCurrency.findAll({
            where: { Symbol: symbol }
          });

          if (!currencies || currencies.length === 0) {
            throw new Error(`No currency found for symbol: ${symbol}`);
          }

          const currencyIds = currencies.map(c => c.id);

          // WHERE condition for date filtering
          let whereCondition = { currency_id: currencyIds };
          if (validStartDate || validEndDate) {
            whereCondition.date = {};
            if (validStartDate) {
              whereCondition.date[Symbol.for('gte')] = validStartDate;
            }
            if (validEndDate) {
              whereCondition.date[Symbol.for('lte')] = validEndDate;
            }
          }

          // Get data event_currencies
          const eventCurrencies = await EventCurrency.findAll({
            where: whereCondition,
            include: [
              {
                model: Event,
                foreignKey: 'event_id',
                required: true
              },
              {
                model: CryptoCurrency,
                foreignKey: 'currency_id',
                required: true
              }
            ],
            order: [['date', 'ASC']]
          });

          if (eventCurrencies.length === 0) {
            throw new Error('No data found for the specified criteria');
          }

          // Prepare data for correlation
          const correlationData = prepareCorrelationData(eventCurrencies, 'volatility');
          
          if (correlationData.validDataCount === 0) {
            throw new Error('No valid data points found for correlation analysis');
          }

          // Calculate correlation
          const correlationCoefficient = calculatePearsonCorrelation(
            correlationData.impactScores,
            correlationData.metricValues
          );

          // Calculate additional statistics
          const averageImpactScore = calculateMean(correlationData.impactScores);
          const averageMetricValue = calculateMean(correlationData.metricValues);
          
          // Get date range from raw data
          const dateRange = getDateRange(correlationData.rawData);

          // Format the result
          const result = formatCorrelationResult({
            symbol,
            correlationCoefficient,
            dataPoints: correlationData.validDataCount,
            startDate: dateRange.minDate,
            endDate: dateRange.maxDate,
            averageImpactScore,
            averageMetricValue,
            metricType: 'volatility'
          });

          console.log('Volatility Correlation calculated:', result);

          return {
            correlationData: result
          };

        } catch (error) {
          console.error('SOAP Volatility Correlation Error:', error);
          throw new soap.SoapFault('Server Error', error.message);
        }
      }
    }
  }
};

// Function to create and start SOAP server
function createSoapServer(app) {
  // Read WSDL file
  const wsdlPath = path.join(__dirname, 'crypto-events.wsdl');
  const wsdlXml = fs.readFileSync(wsdlPath, 'utf8');

  // Setup associations for Sequelize
  EventCurrency.belongsTo(Event, { foreignKey: 'event_id' });
  EventCurrency.belongsTo(CryptoCurrency, { foreignKey: 'currency_id' });
  Event.hasMany(EventCurrency, { foreignKey: 'event_id' });
  CryptoCurrency.hasMany(EventCurrency, { foreignKey: 'currency_id' });

  // Create SOAP server
  const server = soap.listen(app, '/crypto-events', cryptoEventsService, wsdlXml, function() {
    console.log('SOAP server initialized at /crypto-events');
    console.log('WSDL available at: http://localhost:3000/crypto-events?wsdl');
    console.log('Available methods:');
    console.log('  - GetEventsByCurrencySymbol (Now supports date filtering)');
    console.log('  - GetTopImpactEvents (new)');
    console.log('  - GetCorrelationSummary (new)');
    console.log('  - GetDailyReturnCorrelation (new)');
    console.log('  - GetVolatilityCorrelation (new)');
  });

  return server;
}

module.exports = {
  cryptoEventsService,
  createSoapServer
};