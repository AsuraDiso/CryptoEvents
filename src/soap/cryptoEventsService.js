const soap = require('soap');
const fs = require('fs');
const path = require('path');
const CryptoCurrency = require('../models/CryptoCurrency');
const Event = require('../models/Event');
const EventCurrency = require('../models/EventCurrency');
const { 
  calculatePearsonCorrelation, 
  calculateMean, 
  filterByDateRange, 
  prepareCorrelationData, 
  getDateRange, 
  formatCorrelationResult 
} = require('../utils/correlation_utils');

// SOAP service implementation
const cryptoEventsService = {
  CryptoEventsService: {
    CryptoEventsPort: {
      
      // Существующий метод
      GetEventsByCurrencySymbol: async function(args) {
        try {
          const symbol = args.symbol;
          console.log('SOAP Request received for symbol:', symbol);
          
          if (!symbol) {
            throw new Error('Symbol parameter is required');
          }

          // Find all currencies with this symbol (all daily records)
          const currencies = await CryptoCurrency.findAll({
            where: { Symbol: symbol }
          });

          console.log('Currency records found:', currencies.length);

          if (!currencies || currencies.length === 0) {
            console.log('No currency found for symbol:', symbol);
            return {
              eventCurrencies: {
                eventCurrency: []
              }
            };
          }

          // Get all currency IDs for this symbol
          const currencyIds = currencies.map(c => c.id);
          console.log('Currency IDs:', currencyIds.slice(0, 5), '...'); // Show first 5

          // Find all event-currency associations for these currencies
          const eventCurrencies = await EventCurrency.findAll({
            where: { 
              currency_id: currencyIds 
            },
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
          console.error('SOAP Service Error:', error);
          throw new soap.SoapFault('Server Error', error.message);
        }
      },

      // Новый метод для корреляции daily_return
      GetDailyReturnCorrelation: async function(args) {
        try {
          const { symbol, startDate, endDate } = args;
          console.log('SOAP Correlation Request for daily_return:', { symbol, startDate, endDate });
          
          if (!symbol) {
            throw new Error('Symbol parameter is required');
          }

          // Получаем все данные для указанной монеты
          const currencies = await CryptoCurrency.findAll({
            where: { Symbol: symbol }
          });

          if (!currencies || currencies.length === 0) {
            throw new Error(`No currency found for symbol: ${symbol}`);
          }

          const currencyIds = currencies.map(c => c.id);

          // Получаем данные event_currencies
          let eventCurrencies = await EventCurrency.findAll({
            where: { 
              currency_id: currencyIds 
            },
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

          // Фильтруем по диапазону дат если указан
          if (startDate || endDate) {
            eventCurrencies = filterByDateRange(eventCurrencies, startDate, endDate);
          }

          if (eventCurrencies.length === 0) {
            throw new Error('No data found for the specified criteria');
          }

          // Подготавливаем данные для корреляции
          const correlationData = prepareCorrelationData(eventCurrencies, 'daily_return');
          
          if (correlationData.validDataCount === 0) {
            throw new Error('No valid data points found for correlation analysis');
          }

          // Вычисляем корреляцию
          const correlationCoefficient = calculatePearsonCorrelation(
            correlationData.impactScores,
            correlationData.metricValues
          );

          // Вычисляем дополнительную статистику
          const averageImpactScore = calculateMean(correlationData.impactScores);
          const averageMetricValue = calculateMean(correlationData.metricValues);
          
          // Получаем диапазон дат из реальных данных
          const dateRange = getDateRange(correlationData.rawData);

          // Форматируем результат
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

      // Новый метод для корреляции volatility
      GetVolatilityCorrelation: async function(args) {
        try {
          const { symbol, startDate, endDate } = args;
          console.log('SOAP Correlation Request for volatility:', { symbol, startDate, endDate });
          
          if (!symbol) {
            throw new Error('Symbol parameter is required');
          }

          // Получаем все данные для указанной монеты
          const currencies = await CryptoCurrency.findAll({
            where: { Symbol: symbol }
          });

          if (!currencies || currencies.length === 0) {
            throw new Error(`No currency found for symbol: ${symbol}`);
          }

          const currencyIds = currencies.map(c => c.id);

          // Получаем данные event_currencies
          let eventCurrencies = await EventCurrency.findAll({
            where: { 
              currency_id: currencyIds 
            },
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

          // Фильтруем по диапазону дат если указан
          if (startDate || endDate) {
            eventCurrencies = filterByDateRange(eventCurrencies, startDate, endDate);
          }

          if (eventCurrencies.length === 0) {
            throw new Error('No data found for the specified criteria');
          }

          // Подготавливаем данные для корреляции
          const correlationData = prepareCorrelationData(eventCurrencies, 'volatility');
          
          if (correlationData.validDataCount === 0) {
            throw new Error('No valid data points found for correlation analysis');
          }

          // Вычисляем корреляцию
          const correlationCoefficient = calculatePearsonCorrelation(
            correlationData.impactScores,
            correlationData.metricValues
          );

          // Вычисляем дополнительную статистику
          const averageImpactScore = calculateMean(correlationData.impactScores);
          const averageMetricValue = calculateMean(correlationData.metricValues);
          
          // Получаем диапазон дат из реальных данных
          const dateRange = getDateRange(correlationData.rawData);

          // Форматируем результат
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
    console.log('  - GetEventsByCurrencySymbol');
    console.log('  - GetDailyReturnCorrelation');
    console.log('  - GetVolatilityCorrelation');
  });

  return server;
}

module.exports = {
  cryptoEventsService,
  createSoapServer
};