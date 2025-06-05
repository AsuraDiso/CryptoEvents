const express = require('express');
const router = express.Router();
const SoapClient = require('../soap/client');

const WSDL_URL = process.env.SOAP_WSDL_URL || `http://localhost:3000/crypto-events?wsdl`;

let soapClient;
let initializationPromise;

async function initializeSoapClient() {
    if (!soapClient) {
        console.log('Creating new SOAP client...');
        soapClient = new SoapClient(WSDL_URL);
    }
    
    if (!initializationPromise) {
        console.log('Starting SOAP client initialization...');
        initializationPromise = soapClient.initialize()
            .then(() => {
                console.log('SOAP client initialized successfully');
                return soapClient;
            })
            .catch(error => {
                console.error('SOAP client initialization failed:', error);
                initializationPromise = null;
                throw error;
            });
    }
    
    return initializationPromise;
}

initializeSoapClient().catch(error => {
    console.error('Initial SOAP client initialization failed:', error);
});

const checkSoapClient = async (req, res, next) => {
    try {
        if (!soapClient || !soapClient.isInitialized()) {
            console.log('SOAP client not initialized, attempting to initialize...');
            await initializeSoapClient();
        }
        next();
    } catch (error) {
        console.error('SOAP client check failed:', error);
        res.status(500).json({
            success: false,
            error: 'SOAP client is not initialized. Please check the WSDL URL configuration.',
            details: error.message
        });
    }
};

router.get('/events/:symbol', checkSoapClient, async (req, res) => {
    try {
        const { symbol } = req.params;
        
        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: 'Currency symbol is required'
            });
        }

        const soapArgs = {
            symbol: symbol.toUpperCase()
        };

        const result = await soapClient.callMethod('GetEventsByCurrencySymbol', soapArgs);

        const eventCurrencies = result?.eventCurrencies?.eventCurrency ?? [];

        res.json({
            success: true,
            data: eventCurrencies
        });
    } catch (error) {
        console.error('Error getting events:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get events'
        });
    }
});

module.exports = router; 