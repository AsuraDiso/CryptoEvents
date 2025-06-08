const express = require('express');
const router = express.Router();
const JSONImportController = require('../controllers/jsonImportController');
const importController = new JSONImportController();

router.get('/', (req, res) => importController.getAvailableFiles(req, res));
router.post('/import', (req, res) => importController.importFromFile(req, res));

module.exports = router;