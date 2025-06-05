const soap = require('soap');

class SoapClient {
    constructor(wsdlUrl) {
        if (!wsdlUrl) {
            throw new Error('WSDL URL is required');
        }
        this.wsdlUrl = wsdlUrl;
        this.client = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            if (!this.wsdlUrl) {
                throw new Error('WSDL URL is not set');
            }

            console.log(`Initializing SOAP client with WSDL: ${this.wsdlUrl}`);

            const options = {
                forceSoap12Headers: false,
                disableCache: true,
                returnFault: true,
                wsdl_headers: {},
                wsdl_options: {
                    timeout: 5000,
                    strictSSL: false,
                    rejectUnauthorized: false
                }
            };

            return new Promise((resolve, reject) => {
                soap.createClient(this.wsdlUrl, options, (err, client) => {
                    if (err) {
                        console.error('SOAP client creation error:', err);
                        reject(new Error(`SOAP client creation failed: ${err.message}`));
                        return;
                    }

                    if (!client) {
                        console.error('SOAP client is null after creation');
                        reject(new Error('Failed to create SOAP client - client is null'));
                        return;
                    }

                    console.log('SOAP client created successfully');
                    console.log('Available methods:', Object.keys(client.describe()));

                    this.client = client;
                    this.initialized = true;
                    resolve(client);
                });
            });
        } catch (error) {
            console.error('Error in initialize:', error);
            this.initialized = false;
            throw new Error(`SOAP client initialization failed: ${error.message}`);
        }
    }

    async callMethod(methodName, args) {
        try {
            if (!this.initialized || !this.client) {
                console.log('Client not initialized, initializing now...');
                await this.initialize();
            }

            if (!this.client[methodName]) {
                throw new Error(`Method ${methodName} not found in SOAP service`);
            }

            return new Promise((resolve, reject) => {
                this.client[methodName](args, (err, result) => {
                    if (err) {
                        console.error(`Error calling ${methodName}:`, err);
                        reject(new Error(`SOAP method call failed: ${err.message}`));
                    } else {
                        resolve(result);
                    }
                });
            });
        } catch (error) {
            console.error('Error in callMethod:', error);
            throw new Error(`SOAP call failed: ${error.message}`);
        }
    }

    isInitialized() {
        return this.initialized && !!this.client;
    }
}

module.exports = SoapClient; 