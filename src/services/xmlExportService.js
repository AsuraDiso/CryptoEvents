// src/services/xmlExportService.js
const xml2js = require('xml2js');
const fs = require('fs').promises;
const path = require('path');

class XMLExportService {
    constructor() {
        this.builder = new xml2js.Builder({
            rootName: 'CoinAnalysisReport',
            xmldec: { version: '1.0', encoding: 'UTF-8' },
            renderOpts: { pretty: true, indent: '  ' }
        });

        this.exportDir = path.join(__dirname, '../../exports/xml_exports');
        this.ensureExportDirectory();

        // Запускаем периодическую очистку старых файлов
        this.startPeriodicCleanup();
    }

    async ensureExportDirectory() {
        try {
            await fs.mkdir(this.exportDir, { recursive: true });
            console.log('✅ XML export directory ready');
        } catch (error) {
            console.error('Error creating XML export directory:', error);
        }
    }

    /**
     * Запуск периодической очистки файлов
     */
    startPeriodicCleanup() {
        // Очистка каждые 30 минут
        setInterval(async () => {
            try {
                console.log('🧹 Running periodic cleanup...');
                const result = await this.cleanupOldFiles(0.02); // Файлы старше 30 минут (0.02 дня)
                if (result.deleted > 0) {
                    console.log(`🗑️ Periodic cleanup: deleted ${result.deleted} old files`);
                }
            } catch (error) {
                console.error('❌ Periodic cleanup error:', error);
            }
        }, 30 * 60 * 1000); // 30 минут
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
                eventsData: {
                    totalEvents: completeData.events?.eventCurrencies?.eventCurrency?.length || 0,
                    events: completeData.events?.eventCurrencies || { eventCurrency: [] }
                },
                topImpactEvents: {
                    count: completeData.topImpactEvents?.topEvents?.topEvent?.length || 0,
                    events: completeData.topImpactEvents?.topEvents || { topEvent: [] }
                },
                correlationAnalysis: {
                    summary: completeData.correlationSummary?.correlationSummary || {},
                    dailyReturnCorrelation: completeData.dailyReturnCorrelation?.correlationData || {},
                    volatilityCorrelation: completeData.volatilityCorrelation?.correlationData || {}
                }
            };

            const filename = `${symbol}_analysis_${this.getTimestamp()}.xml`;
            const result = await this.saveXMLFile(reportData, filename);

            console.log(`✅ Coin analysis exported: ${filename}`);
            return result;

        } catch (error) {
            console.error('Export coin analysis error:', error);
            throw new Error(`Failed to export coin analysis: ${error.message}`);
        }
    }

    async saveXMLFile(data, filename) {
        try {
            const xmlContent = this.builder.buildObject(data);
            const filePath = path.join(this.exportDir, filename);

            await fs.writeFile(filePath, xmlContent, 'utf8');

            return {
                success: true,
                filename: filename,
                filePath: filePath,
                size: xmlContent.length,
                downloadUrl: `/api/export/download/${filename}`,
                exportDate: new Date().toISOString()
            };
        } catch (error) {
            throw new Error(`Failed to save XML file: ${error.message}`);
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

    async getExportedFiles() {
        try {
            const files = await fs.readdir(this.exportDir);
            const xmlFiles = files.filter(file => file.endsWith('.xml'));

            const fileDetails = await Promise.all(
                xmlFiles.map(async (file) => {
                    const filePath = path.join(this.exportDir, file);
                    const stats = await fs.stat(filePath);
                    const coinSymbol = file.split('_')[0];

                    return {
                        filename: file,
                        coinSymbol: coinSymbol,
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime,
                        downloadUrl: `/api/xmlExport/download/${file}`
                    };
                })
            );

            return fileDetails.sort((a, b) => b.modified - a.modified);
        } catch (error) {
            throw new Error(`Failed to get exported files: ${error.message}`);
        }
    }

    async cleanupOldFiles(daysOld = 0.02) { // По умолчанию 30 минут
        try {
            const files = await this.getExportedFiles();
            const cutoffDate = new Date();
            cutoffDate.setTime(cutoffDate.getTime() - (daysOld * 24 * 60 * 60 * 1000));

            const filesToDelete = files.filter(file => file.modified < cutoffDate);

            for (const file of filesToDelete) {
                const filePath = path.join(this.exportDir, file.filename);
                await fs.unlink(filePath);
            }

            return {
                deleted: filesToDelete.length,
                remaining: files.length - filesToDelete.length
            };
        } catch (error) {
            throw new Error(`Failed to cleanup old files: ${error.message}`);
        }
    }

    getTimestamp() {
        const now = new Date();
        return now.toISOString()
            .replace(/:/g, '-')
            .replace(/\./g, '-')
            .slice(0, 19);
    }
}

// Создаем singleton экземпляр
const xmlExportService = new XMLExportService();
module.exports = xmlExportService;