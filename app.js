const express = require('express');
const datesRouter = require('./src/routes/events');
const cryptoRouter = require('./src/routes/crypto');
const xmlExportRouter = require('./src/routes/xmlExport');  // New export router for XML exports
const xmlImportRouter = require('./src/routes/xmlImport');  // New import router for XML files
const soapRoutes = require('./src/routes/soapRoutes');  // New import router for XML files
const cors = require('cors');
const bodyParser = require('body-parser');
const { createSoapServer } = require('./src/soap/cryptoEventsService');
const soapClientService = require('./src/services/soapClientService');
const { authenticateJWT, requireAdmin } = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.text({ type: 'text/xml' }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Main page with API documentation
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
        export: '/api/xmlExport',
        import: '/api/xmlImport'
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
    xmlImportAPI: {
      listFiles: {
        method: 'GET',
        url: '/api/xmlImport',
        description: 'Get list of available XML files for import'
      },
      uploadAndImport: {
        method: 'POST',
        url: '/api/xmlImport/upload',
        description: 'Upload and import XML file',
        contentType: 'multipart/form-data',
        field: 'xmlFile',
        body: {
          importType: 'string (optional) - auto|events|currencies|mixed',
          deleteAfterImport: 'boolean (optional) - default true'
        }
      },
      importFromFile: {
        method: 'POST',
        url: '/api/xmlImport/import',
        description: 'Import from uploaded XML file',
        body: {
          filename: 'string (required) - XML file name',
          importType: 'string (optional) - auto|events|currencies|mixed',
          deleteAfterImport: 'boolean (optional) - default false'
        }
      },
      validateFile: {
        method: 'GET',
        url: '/api/xmlImport/validate/:filename',
        description: 'Validate XML file structure'
      },
      getStats: {
        method: 'GET',
        url: '/api/xmlImport/stats',
        description: 'Get database and import statistics'
      },
      updateRelationships: {
        method: 'POST',
        url: '/api/xmlImport/update-relationships',
        description: 'Force update event-currency relationships'
      },
      deleteFile: {
        method: 'DELETE',
        url: '/api/xmlImport/:filename',
        description: 'Delete XML file'
      },
      cleanup: {
        method: 'DELETE',
        url: '/api/xmlImport/cleanup?days=7',
        description: 'Clean up old import files'
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
    },
    importXMLFile: {  // Добавить этот пример
      method: 'POST',
      url: '/api/xmlImport/upload',
      description: 'Upload and import XML file with events or currencies',
      contentType: 'multipart/form-data',
      field: 'xmlFile',
      body: {
        importType: 'auto',
        deleteAfterImport: true
      }
    }
  });
});


// REST routes
app.use('/api/events', datesRouter);
app.use('/api/crypto', cryptoRouter);
app.use('/api/xmlExport', authenticateJWT, requireAdmin, xmlExportRouter);
app.use('/api/xmlImport', authenticateJWT, requireAdmin, xmlImportRouter);
app.use('/api/soap', soapRoutes);  // New import router for XML files

// function login(req, res) {
//   const user = { id: 1, username: 'example' }; // Replace with real user lookup
//   const token = jwt.sign(user, 'your_jwt_secret', { expiresIn: '1h' });
//   res.json({ token });
// }

try {
  createSoapServer(app);
  console.log('SOAP server configured successfully');
} catch (error) {
  console.error('Failed to configure SOAP server:', error);
}

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

  // Disconnect SOAP client
  try {
    soapClientService.disconnect();
    console.log('✅ SOAP client disconnected');
  } catch (error) {
    console.error('❌ Error disconnecting SOAP client:', error);
  }

  // Close server
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
    console.log(`📥 XML Import API: http://localhost:${PORT}/api/xmlImport`);
  console.log('');

  // Itialize SOAP client
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
  console.log('   POST /api/xmlImport/upload             - Upload and import XML');
  console.log('');
  console.log('✨ Server ready to accept connections');
});
