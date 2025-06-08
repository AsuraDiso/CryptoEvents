const express = require('express');
const router = express.Router();
const JSONExportController = require('../controllers/jsonExportController');
const exportController = new JSONExportController();

router.get('/', (req, res) => exportController.getExports(req, res));
router.post('/coin', (req, res) => exportController.exportCoinAnalysis(req, res));
router.get('/download/:filename', (req, res) => exportController.downloadJSON(req, res));

module.exports = router;