const soap = require('soap');
const fs = require('fs');
const path = require('path');
const CryptoCurrency = require('../models/CryptoCurrency');
const Event = require('../models/Event');
const EventCurrency = require('../models/EventCurrency');

// SOAP service implementation
const cryptoEventsService = {
  CryptoEventsService: {
    CryptoEventsPort: {
      GetEventsByCurrencySymbol: async function(args) {
        try {
          const symbol = args.symbol;
          console.log('🔍 SOAP Request received for symbol:', symbol);
          
          if (!symbol) {
            throw new Error('Symbol parameter is required');
          }

          // Find all currencies with this symbol (all daily records)
          const currencies = await CryptoCurrency.findAll({
            where: { Symbol: symbol }
          });

          console.log('💰 Currency records found:', currencies.length);

          if (!currencies || currencies.length === 0) {
            console.log('❌ No currency found for symbol:', symbol);
            return {
              eventCurrencies: {
                eventCurrency: []
              }
            };
          }

          // Get all currency IDs for this symbol
          const currencyIds = currencies.map(c => c.id);
          console.log('🔢 Currency IDs:', currencyIds.slice(0, 5), '...'); // Show first 5

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

          console.log('🔗 Event-Currency associations found:', eventCurrencies.length);
          console.log('📊 Sample data:', eventCurrencies.length > 0 ? eventCurrencies[0].toJSON() : 'No data');

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
  });

  return server;
}

module.exports = {
  cryptoEventsService,
  createSoapServer
};