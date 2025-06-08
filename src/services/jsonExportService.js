const fs = require('fs').promises;
const path = require('path');

class JSONExportService {
    constructor() {
        this.exportDir = path.join(__dirname, '../../exports/json_exports');
        this.ensureExportDirectory();
    }

    async ensureExportDirectory() {
        try {
            await fs.mkdir(this.exportDir, { recursive: true });
            console.log('✅ JSON export directory ready');
        } catch (error) {
            console.error('Error creating JSON export directory:', error);
        }
    }

    async exportCoinAnalysis(symbol, completeData, options = {}) {
        try {
            const reportData = {
                reportInfo: {
                    coinSymbol: symbol,
                    generatedAt: new Date().toISOString(),
                    reportType: 'Complete Coin Analysis',
                    ...options
                },
                ...completeData
            };

            const filename = `${symbol}_analysis_${this.getTimestamp()}.json`;
            const filePath = path.join(this.exportDir, filename);

            await fs.writeFile(filePath, JSON.stringify(reportData, null, 2), 'utf8');

            return {
                success: true,
                filename,
                filePath,
                size: JSON.stringify(reportData).length,
                downloadUrl: `/api/jsonExport/download/${filename}`,
                exportDate: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to export JSON file: ${error.message}`);
        }
    }

    async getExportedFiles() {
        try {
            const files = await fs.readdir(this.exportDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            const fileDetails = await Promise.all(
                jsonFiles.map(async (file) => {
                    const filePath = path.join(this.exportDir, file);
                    const stats = await fs.stat(filePath);
                    const coinSymbol = file.split('_')[0];

                    return {
                        filename: file,
                        coinSymbol,
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime,
                        downloadUrl: `/api/jsonExport/download/${file}`
                    };
                })
            );

            return fileDetails.sort((a, b) => b.modified - a.modified);
        } catch (error) {
            throw new Error(`Failed to get exported files: ${error.message}`);
        }
    }

    async deleteFile(filename) {
        try {
            const filePath = path.join(this.exportDir, filename);
            await fs.unlink(filePath);
            console.log(`File deleted: ${filename}`);
            return true;
        } catch (error) {
            console.error(`Error deleting file ${filename}:`, error);
            return false;
        }
    }

    getTimestamp() {
        const now = new Date();
        return now.toISOString().replace(/:/g, '-').replace(/\./g, '-').slice(0, 19);
    }
}

const jsonExportService = new JSONExportService();
module.exports = jsonExportService;