const jsonImportService = require('../services/jsonImportService');

class JSONImportController {
    async getAvailableFiles(req, res) {
        try {
            const files = await jsonImportService.getAvailableJSONFiles();
            res.json({ success: true, files, total: files.length });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async importFromFile(req, res) {
        try {
            const { filename } = req.body;
            if (!filename) {
                return res.status(400).json({ success: false, error: 'Filename is required' });
            }
            const path = require('path');
            const filePath = path.join(jsonImportService.importDir, filename);
            const result = await jsonImportService.importJSONFile(filePath);
            res.json({ success: true, result });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = JSONImportController;