const soapClientService = require('../services/soapClientService');
const JSONExportService = require('../services/jsonExportService');

class JSONExportController {
    async getExports(req, res) {
        try {
            const files = await JSONExportService.getExportedFiles();
            res.json({ success: true, exports: files, total: files.length });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async exportCoinAnalysis(req, res) {
        try {
            const { symbol, startDate, endDate, limit = 10 } = req.body;
            if (!symbol) {
                return res.status(400).json({ success: false, error: 'Symbol parameter is required' });
            }
            const completeData = await soapClientService.getCompleteAnalysis(symbol, startDate, endDate, limit);
            const exportResult = await JSONExportService.exportCoinAnalysis(symbol, completeData, { startDate, endDate, limit });
            res.json({ success: true, export: exportResult });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    async downloadJSON(req, res) {
        try {
            const { filename } = req.params;
            if (!filename || !filename.endsWith('.json')) {
                return res.status(400).json({ success: false, error: 'Invalid filename. Only JSON files are allowed.' });
            }
            const path = require('path');
            const fs = require('fs').promises;
            const filePath = path.join(JSONExportService.exportDir, filename);
            try {
                await fs.access(filePath);
            } catch (error) {
                return res.status(404).json({ success: false, error: 'JSON file not found' });
            }
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.sendFile(filePath);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

module.exports = JSONExportController;