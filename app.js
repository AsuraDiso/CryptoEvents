const express = require('express');

const datesRouter = require('./routes/events');
const cryptoRouter = require('./routes/crypto');

const soap = require('soap');
const fs = require('fs');
const path = require('path');
const { helloService } = require('./soap/helloService');

const app = express();
app.use(express.json());

app.use('/api/events', datesRouter);
app.use('/api/crypto', cryptoRouter);


// ====================================
// CONFIG SOAP SERVER
// ====================================
// 1. Path to WSDL file
const wsdlPath = path.join(__dirname, 'soap', 'hello.wsdl');
console.log('Searching for WSDL file:', wsdlPath);

// 2. Check if WSDL file exists
if (!fs.existsSync(wsdlPath)) {
  console.error('WSDL file is not found:', wsdlPath);
  process.exit(1);
}

// 3. Read WSDL file
let wsdlXml;
try {
  wsdlXml = fs.readFileSync(wsdlPath, 'utf8');
  console.log('WSDL read successfully:', wsdlPath);
} catch (error) {
  console.error('error while readings WSDL:', error.message);
  process.exit(1);
}

// 4. Soap config
const soapConfig = {
  endpoint: '/hello',
  service: helloService,
  wsdl: wsdlXml,
  // Optionf for soap.listen()
  options: {
    enableLogging: true,

    // Config XML parser
    xml2jsOptions: {
      ignoreAttrs: false,
      explicitArray: false
    }
  }
};

// 5. Create SOAP server
let soapServer;
try {
  // soap.listen(app, url, service, wsdl, callback, options)
  soapServer = soap.listen(
    app,                    // Express app
    soapConfig.endpoint,    // URL endpoint (/hello)
    soapConfig.service,     // Object with methods (helloService)
    soapConfig.wsdl,        // WSDL as string
    function() {            // Callback for success
      console.log('SOAP is running!');
      console.log(`WSDL: http://localhost:5000${soapConfig.endpoint}?wsdl`);
      console.log(`Endpoint: http://localhost:5000${soapConfig.endpoint}`);
    }
    // soapConfig.options   // Extended options (optional)
  );
  
} catch (error) {
  console.error('Error while creating SOAP server:', error.message);
  process.exit(1);
}

// 6. Handling SOAP server events
if (soapServer) {
  // Logging SOAP requests
  soapServer.on('request', function(request, methodName) {
    console.log(`SOAP request: ${methodName}`);
    console.log('Headers:', request.headers);
  });

  // Logging SOAP responses
  soapServer.on('response', function(response, methodName) {
    console.log(`SOAP response for: ${methodName}`);
  });

  // Error handling (logging)
  soapServer.on('error', function(error) {
    console.error('SOAP server error:', error.message);
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('=================================');
  console.log(`Server running on ${PORT}`);
  console.log(`REST API: http://localhost:${PORT}/api/`);
  console.log(`SOAP WSDL: http://localhost:${PORT}${soapConfig.endpoint}?wsdl`);
  console.log('=================================');
});
