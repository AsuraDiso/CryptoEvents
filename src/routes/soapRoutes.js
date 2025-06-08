const express = require('express');
const router = express.Router();
const SoapClient = require('../services/soapClientService');
const { validateDateRange } = require('../utils/analysis_utils');

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

async function checkSoapClient(req, res, next) {
    try {
        await initializeSoapClient();
        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'SOAP client initialization failed'
        });
    }
}

function validateAndFormatDates(startDate, endDate) {
    try {
        const { validStartDate, validEndDate } = validateDateRange(startDate, endDate);
        return {
            startDate: validStartDate ? validStartDate.toISOString().split('T')[0] : null,
            endDate: validEndDate ? validEndDate.toISOString().split('T')[0] : null
        };
    } catch (error) {
        throw new Error(`Invalid date format: ${error.message}`);
    }
}

router.get('/events/:symbol', checkSoapClient, async (req, res) => {
    try {
        const { symbol } = req.params;
        const { startDate, endDate } = req.query;
        
        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: 'Currency symbol is required'
            });
        }

        const dates = validateAndFormatDates(startDate, endDate);

        const soapArgs = {
            symbol: symbol.toUpperCase(),
            ...dates
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

router.get('/top-impact/:symbol', checkSoapClient, async (req, res) => {
    try {
        const { symbol } = req.params;
        const { limit, startDate, endDate } = req.query;
        
        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: 'Currency symbol is required'
            });
        }

        const dates = validateAndFormatDates(startDate, endDate);

        const soapArgs = {
            symbol: symbol.toUpperCase(),
            limit: limit ? parseInt(limit) : undefined,
            ...dates
        };

        const result = await soapClient.callMethod('GetTopImpactEvents', soapArgs);

        const topEvents = result?.topEvents?.topEvent ?? [];

        res.json({
            success: true,
            data: topEvents
        });
    } catch (error) {
        console.error('Error getting top impact events:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get top impact events'
        });
    }
});

router.get('/correlation-summary/:symbol', checkSoapClient, async (req, res) => {
    try {
        const { symbol } = req.params;
        const { startDate, endDate } = req.query;
        
        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: 'Currency symbol is required'
            });
        }

        const dates = validateAndFormatDates(startDate, endDate);

        const soapArgs = {
            symbol: symbol.toUpperCase(),
            ...dates
        };

        const result = await soapClient.callMethod('GetCorrelationSummary', soapArgs);

        res.json({
            success: true,
            data: result?.correlationSummary
        });
    } catch (error) {
        console.error('Error getting correlation summary:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get correlation summary'
        });
    }
});

router.get('/daily-return-correlation/:symbol', checkSoapClient, async (req, res) => {
    try {
        const { symbol } = req.params;
        const { startDate, endDate } = req.query;
        
        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: 'Currency symbol is required'
            });
        }

        const dates = validateAndFormatDates(startDate, endDate);

        const soapArgs = {
            symbol: symbol.toUpperCase(),
            ...dates
        };

        const result = await soapClient.callMethod('GetDailyReturnCorrelation', soapArgs);

        res.json({
            success: true,
            data: result?.correlationData
        });
    } catch (error) {
        console.error('Error getting daily return correlation:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get daily return correlation'
        });
    }
});

router.get('/volatility-correlation/:symbol', checkSoapClient, async (req, res) => {
    try {
        const { symbol } = req.params;
        const { startDate, endDate } = req.query;
        
        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: 'Currency symbol is required'
            });
        }

        const dates = validateAndFormatDates(startDate, endDate);

        const soapArgs = {
            symbol: symbol.toUpperCase(),
            ...dates
        };

        const result = await soapClient.callMethod('GetVolatilityCorrelation', soapArgs);

        res.json({
            success: true,
            data: result?.correlationData
        });
    } catch (error) {
        console.error('Error getting volatility correlation:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get volatility correlation'
        });
    }
});

module.exports = router; 