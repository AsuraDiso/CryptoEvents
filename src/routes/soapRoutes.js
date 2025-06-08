const express = require('express');
const router = express.Router();
const SoapClient = require('../services/soapClientService');
const { validateDateRange } = require('../utils/analysis_utils');

router.get('/events/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { startDate, endDate } = req.query;
        
        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: 'Currency symbol is required'
            });
        }

        const result = await SoapClient.getEventsByCurrencySymbol(symbol, startDate, endDate);

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

router.get('/top-impact/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { limit, startDate, endDate } = req.query;
        
        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: 'Currency symbol is required'
            });
        }

        const result = await SoapClient.getTopImpactEvents(symbol, startDate, endDate);

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

router.get('/correlation-summary/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { startDate, endDate } = req.query;
        
        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: 'Currency symbol is required'
            });
        }

        const result = await SoapClient.getCorrelationSummary(symbol, startDate, endDate);

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

router.get('/daily-return-correlation/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { startDate, endDate } = req.query;
        
        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: 'Currency symbol is required'
            });
        }

        const result = await SoapClient.getDailyReturnCorrelation(symbol, startDate, endDate);

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

router.get('/volatility-correlation/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { startDate, endDate } = req.query;
        
        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: 'Currency symbol is required'
            });
        }

        const result = await SoapClient.getVolatilityCorrelation(symbol, startDate, endDate);

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