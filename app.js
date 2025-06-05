const express = require('express');
const datesRouter = require('./src/routes/events');
const cryptoRouter = require('./src/routes/crypto');
const soapRouter = require('./src/routes/soapRoutes');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createSoapServer } = require('./src/soap/cryptoEventsService');

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

app.get('/', (req, res) => {
  res.json({
    message: 'Crypto Events API Server',
    timestamp: new Date().toISOString(),
    endpoints: {
      soap: {
        service: '/crypto-events',
        wsdl: '/crypto-events?wsdl'
      },
      rest: {
        events: '/api/events',
        crypto: '/api/crypto',
        soapBridge: '/api/soap'
      }
    }
  });
});

// REST routes
app.use('/api/events', datesRouter);
app.use('/api/crypto', cryptoRouter);
app.use('/api/soap', soapRouter);

// Registration of SOAP service
try {
  createSoapServer(app);
  console.log('✅ SOAP server configured successfully');
} catch (error) {
  console.error('❌ Failed to configure SOAP server:', error);
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('❌ Server Error:', error);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

const server = app.listen(PORT, () => {
  console.log('Server starting...');
  console.log(`Server running on port ${PORT}`);
  console.log(`Base URL: http://localhost:${PORT}`);
  console.log(`SOAP Service: http://localhost:${PORT}/crypto-events`);
  console.log(`WSDL: http://localhost:${PORT}/crypto-events?wsdl`);
  console.log(`Server ready to accept connections`);
});
