const express = require('express');
const router = express.Router();
const { XMLImportController: ImportController, upload } = require('../controllers/importController');

const xmlImportController = new ImportController();

/**
 * GET /api/xmlImport - Get a list of available XML files
 */
router.get('/', (req, res) => {
    return xmlImportController.getAvailableFiles(req, res);
});

/**
 * GET /api/xmlImport/stats - Get database statistics
 */
router.get('/stats', (req, res) => {
    return xmlImportController.getStats(req, res);
});

/**
 * POST /api/xmlImport/upload - Upload and import XML file
 * Multipart form with 'xmlFile' field
 * Body: { importType?: 'auto|events|currencies|mixed', deleteAfterImport?: boolean }
 */
router.post('/upload', upload.single('xmlFile'), (req, res) => {
    return xmlImportController.uploadAndImport(req, res);
});

/**
 * POST /api/xmlImport/import - Import from an already loaded file
 * Body: { filename: string, importType?: string, deleteAfterImport?: boolean }
 */
router.post('/import', (req, res) => {
    return xmlImportController.importFromFile(req, res);
});

/**
 * GET /api/xmlImport/validate/:filename - Validate XML file
 */
router.get('/validate/:filename', (req, res) => {
    return xmlImportController.validateFile(req, res);
});

/**
 * DELETE /api/xmlImport/:filename - Delete XML file
 */
router.delete('/:filename', (req, res) => {
    return xmlImportController.deleteFile(req, res);
});

/**
 * POST /api/xmlImport/update-relationships - Update EventCurrency relationships
 */
router.post('/update-relationships', (req, res) => {
    return xmlImportController.updateRelationships(req, res);
});

/**
 * DELETE /api/xmlImport/cleanup - Clear old files
 */
router.delete('/cleanup', (req, res) => {
    return xmlImportController.cleanupFiles(req, res);
});

// Error handling
router.use((error, req, res, next) => {
    console.error('[XML IMPORT ERROR]:', error);

    // Multer errors
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
            success: false,
            error: 'File too large. Maximum size is 10MB.'
        });
    }

    if (error.message === 'Only XML files are allowed') {
        return res.status(400).json({
            success: false,
            error: 'Only XML files are allowed'
        });
    }

    // Database errors
    if (error.name === 'SequelizeValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Database validation error',
            details: error.errors.map(e => e.message)
        });
    }

    // General errors
    res.status(500).json({
        success: false,
        error: 'Import operation failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
});

module.exports = router;