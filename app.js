const express = require('express');
const datesRouter = require('./src/routes/events');
const cryptoRouter = require('./src/routes/crypto');
const xmlExportRouter = require('./src/routes/xmlExport');  // New export router for XML exports
const cors = require('cors');
const bodyParser = require('body-parser');
const { createSoapServer } = require('./src/soap/cryptoEventsService');
const soapClientService = require('./src/services/soapClientService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text({ type: 'text/xml' }));

// Middleware to log requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Главная страница с информацией об API
app.get('/', (req, res) => {
  res.json({
    message: 'Crypto Events API Server with XML Export',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      soap: {
        service: '/crypto-events',
        wsdl: '/crypto-events?wsdl',
        description: 'SOAP service for crypto events analysis'
      },
      rest: {
        events: '/api/events',
        crypto: '/api/crypto',
        export: '/api/xmlExport'
      }
    },
    xmlExportAPI: {
      listExports: {
        method: 'GET',
        url: '/api/xmlExport',
        description: 'Get list of all exported XML files'
      },
      exportCoin: {
        method: 'POST',
        url: '/api/xmlExport/coin',
        description: 'Export complete coin analysis to XML',
        body: {
          symbol: 'string (required) - e.g. BTC, ETH',
          startDate: 'string (optional) - e.g. 2023-01-01',
          endDate: 'string (optional) - e.g. 2023-12-31',
          limit: 'number (optional) - default 10'
        }
      },
      downloadXML: {
        method: 'GET',
        url: '/api/xmlExport/download/:filename',
        description: 'Download XML file'
      },
      status: {
        method: 'GET',
        url: '/api/xmlExport/status',
        description: 'Check export system status'
      },
      cleanup: {
        method: 'DELETE',
        url: '/api/xmlExport/cleanup?days=30',
        description: 'Clean up old export files'
      }
    },
    examples: {
      exportBitcoin: {
        method: 'POST',
        url: '/api/xmlExport/coin',
        body: {
          symbol: 'BTC',
          startDate: '2023-01-01',
          endDate: '2023-12-31',
          limit: 15
        }
      }
    }
  });
});


// REST routes
app.use('/api/events', datesRouter);
app.use('/api/crypto', cryptoRouter);
app.use('/api/xmlExport', xmlExportRouter);  // New export router for XML exports

// Registration of SOAP service
try {
  createSoapServer(app);
  console.log('SOAP server configured successfully');
} catch (error) {
  console.error('Failed to configure SOAP server:', error);
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  
  // Отключаем SOAP клиент
  try {
    soapClientService.disconnect();
    console.log('✅ SOAP client disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting SOAP client:', error);
  }
  
  // Закрываем сервер
  server.close((err) => {
    if (err) {
      console.error('❌ Error during server shutdown:', err);
      process.exit(1);
    }
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const server = app.listen(PORT, async () => {
  console.log('🚀 Server starting...');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🌐 Base URL: http://localhost:${PORT}`);
  console.log(`🧼 SOAP Service: http://localhost:${PORT}/crypto-events`);
  console.log(`📄 WSDL: http://localhost:${PORT}/crypto-events?wsdl`);
  console.log(`📊 XML Export API: http://localhost:${PORT}/api/xmlExport`);
  console.log('');
  
  // Инициализация SOAP клиента при запуске
  try {
    console.log('🔌 Initializing SOAP client...');
    await soapClientService.initialize();
    console.log('✅ SOAP client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize SOAP client:', error);
    console.log('⚠️  SOAP client will be initialized on first request');
  }
  
  console.log('');
  console.log('📋 Available endpoints:');
  console.log('   GET  /                              - API documentation');
  console.log('   GET  /api/xmlExport                    - List XML exports');
  console.log('   POST /api/xmlExport/coin               - Export coin analysis');
  console.log('   GET  /api/xmlExport/download/:filename - Download XML file');
  console.log('   GET  /api/xmlExport/status             - Export system status');
  console.log('');
  console.log('✨ Server ready to accept connections');
});
