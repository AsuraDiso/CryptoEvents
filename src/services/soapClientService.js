const soap = require('soap');
const url = 'http://localhost:3000/crypto-events?wsdl';

class SoapClientService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Инициализация SOAP клиента
   */
  async initialize() {
    try {
      if (!this.client) {
        console.log('Connecting to SOAP service...');
        this.client = await soap.createClientAsync(url);
        this.isConnected = true;
        console.log('✅ SOAP client connected successfully');
        
        // Логируем доступные методы
        console.log('Available SOAP methods:', Object.keys(this.client));
      }
      return this.client;
    } catch (error) {
      this.isConnected = false;
      console.error('❌ Failed to connect to SOAP service:', error);
      throw new Error(`SOAP client initialization failed: ${error.message}`);
    }
  }

  /**
   * Проверка подключения и переподключение при необходимости
   */
  async ensureConnection() {
    if (!this.isConnected || !this.client) {
      await this.initialize();
    }
    return this.client;
  }

  /**
   * Получение событий по символу валюты
   */
  async getEventsByCurrencySymbol(symbol, startDate = null, endDate = null) {
    try {
      const client = await this.ensureConnection();
      
      const args = {
        symbol: symbol,
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      };

      console.log('SOAP Request GetEventsByCurrencySymbol:', args);
      
      const [result] = await client.GetEventsByCurrencySymbolAsync(args);
      
      console.log('SOAP Response received:', {
        recordCount: result.eventCurrencies?.eventCurrency?.length || 0
      });
      
      return result;
    } catch (error) {
      console.error('SOAP GetEventsByCurrencySymbol Error:', error);
      throw new Error(`Failed to get events by currency symbol: ${error.message}`);
    }
  }

  /**
   * Получение топ событий с наибольшим влиянием
   */
  async getTopImpactEvents(symbol, limit = 10, startDate = null, endDate = null) {
    try {
      const client = await this.ensureConnection();
      
      const args = {
        symbol: symbol,
        limit: limit,
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      };

      console.log('SOAP Request GetTopImpactEvents:', args);
      
      const [result] = await client.GetTopImpactEventsAsync(args);
      
      console.log('SOAP Response received:', {
        recordCount: result.topEvents?.topEvent?.length || 0
      });
      
      return result;
    } catch (error) {
      console.error('SOAP GetTopImpactEvents Error:', error);
      throw new Error(`Failed to get top impact events: ${error.message}`);
    }
  }

  /**
   * Получение сводки корреляции
   */
  async getCorrelationSummary(symbol, startDate = null, endDate = null) {
    try {
      const client = await this.ensureConnection();
      
      const args = {
        symbol: symbol,
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      };

      console.log('SOAP Request GetCorrelationSummary:', args);
      
      const [result] = await client.GetCorrelationSummaryAsync(args);
      
      console.log('SOAP Response received:', {
        dataPoints: result.correlationSummary?.dataPoints || 0
      });
      
      return result;
    } catch (error) {
      console.error('SOAP GetCorrelationSummary Error:', error);
      throw new Error(`Failed to get correlation summary: ${error.message}`);
    }
  }

  /**
   * Получение корреляции дневной доходности
   */
  async getDailyReturnCorrelation(symbol, startDate = null, endDate = null) {
    try {
      const client = await this.ensureConnection();
      
      const args = {
        symbol: symbol,
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      };

      console.log('SOAP Request GetDailyReturnCorrelation:', args);
      
      const [result] = await client.GetDailyReturnCorrelationAsync(args);
      
      console.log('SOAP Response received:', {
        correlationCoefficient: result.correlationData?.correlationCoefficient || 0
      });
      
      return result;
    } catch (error) {
      console.error('SOAP GetDailyReturnCorrelation Error:', error);
      throw new Error(`Failed to get daily return correlation: ${error.message}`);
    }
  }

  /**
   * Получение корреляции волатильности
   */
  async getVolatilityCorrelation(symbol, startDate = null, endDate = null) {
    try {
      const client = await this.ensureConnection();
      
      const args = {
        symbol: symbol,
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      };

      console.log('SOAP Request GetVolatilityCorrelation:', args);
      
      const [result] = await client.GetVolatilityCorrelationAsync(args);
      
      console.log('SOAP Response received:', {
        correlationCoefficient: result.correlationData?.correlationCoefficient || 0
      });
      
      return result;
    } catch (error) {
      console.error('SOAP GetVolatilityCorrelation Error:', error);
      throw new Error(`Failed to get volatility correlation: ${error.message}`);
    }
  }

  /**
   * Получение всех данных для комплексного анализа
   */
  async getCompleteAnalysis(symbol, startDate = null, endDate = null, limit = 10) {
    try {
      console.log('Starting complete analysis via SOAP client...');
      
      // Параллельные запросы ко всем SOAP методам
      const [
        eventsData,
        topImpactData,
        correlationSummaryData,
        dailyReturnData,
        volatilityData
      ] = await Promise.all([
        this.getEventsByCurrencySymbol(symbol, startDate, endDate),
        this.getTopImpactEvents(symbol, limit, startDate, endDate),
        this.getCorrelationSummary(symbol, startDate, endDate),
        this.getDailyReturnCorrelation(symbol, startDate, endDate),
        this.getVolatilityCorrelation(symbol, startDate, endDate)
      ]);

      console.log('Complete analysis data retrieved successfully');

      return {
        events: eventsData,
        topImpactEvents: topImpactData,
        correlationSummary: correlationSummaryData,
        dailyReturnCorrelation: dailyReturnData,
        volatilityCorrelation: volatilityData
      };
    } catch (error) {
      console.error('Complete analysis error:', error);
      throw new Error(`Failed to get complete analysis: ${error.message}`);
    }
  }

  /**
   * Закрытие соединения (для graceful shutdown)
   */
  disconnect() {
    if (this.client) {
      this.client = null;
      this.isConnected = false;
      console.log('SOAP client disconnected');
    }
  }

  /**
   * Проверка состояния подключения
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      hasClient: !!this.client,
      serviceUrl: url
    };
  }
}

// Создаем singleton instance
const soapClientService = new SoapClientService();

module.exports = soapClientService;