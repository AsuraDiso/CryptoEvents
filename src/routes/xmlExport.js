const express = require('express');
const router = express.Router();
const ExportController = require('../controllers/exportController');

// Create an instance of the controller
const exportController = new ExportController();

/**
 * GET /api/export - Get a list of all exported files
 */
router.get('/', (req, res) => {
    return exportController.getExports(req, res);
});

/**
 * GET /api/export/status - Check the status of the export system
 */
router.get('/status', (req, res) => {
    return exportController.getStatus(req, res);
});

/**
 * POST /api/export/coin - Export full coin statistics
 * Body: { symbol: “BTC”, startDate?: “2017-01-01”, endDate?: “2020-12-31”, limit?: 15 }
 */
router.post('/coin', (req, res) => {
    return exportController.exportCoinAnalysis(req, res);
});

/**
 * GET /api/export/download/:filename - Download XML file
 * Params: filename (for example: BTC_analysis_2024-01-15T10-30-45.xml)
 */
router.get('/download/:filename', (req, res) => {
    return exportController.downloadXML(req, res);
});

/**
 * POST /api/export/reconnect - Reconnect to SOAP service
 */
router.post('/reconnect', (req, res) => {
    return exportController.reconnectSoap(req, res);
});

/**
 * DELETE /api/export/cleanup - Cleans up old export files
 * Query: ?days=30 (number of days)
 */
router.delete('/cleanup', (req, res) => {
    return exportController.cleanup(req, res);    // I DIDN'T TEST THIS METHOD A LOT
});

// Middleware for handling export-specific errors
router.use((error, req, res, next) => {
    console.error('[EXPORT ERROR]:', error);

    // SOAP specific errors
    if (error.message && error.message.includes('SOAP')) {
        return res.status(503).json({
            success: false,
            error: 'SOAP service temporarily unavailable',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Service unavailable'
        });
    }

    // File system errors
    if (error.code === 'ENOENT') {
        return res.status(404).json({
            success: false,
            error: 'Export file not found'
        });
    }

    // File access errors
    if (error.code === 'EACCES') {
        return res.status(403).json({
            success: false,
            error: 'Access denied to export file'
        });
    }

    // General error handling
    res.status(500).json({
        success: false,
        error: 'Export operation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
});

module.exports = router;