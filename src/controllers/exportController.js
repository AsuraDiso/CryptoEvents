// src/controllers/exportController.js
const soapClientService = require('../services/soapClientService');
const XMLExportService = require('../services/xmlExportService');

class ExportController {
    /**
     * Получить список всех экспортированных файлов
     */
    async getExports(req, res) {
        try {
            const files = await XMLExportService.getExportedFiles();
            res.json({
                success: true,
                exports: files,
                total: files.length
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Экспорт полной статистики по монете
     */
    async exportCoinAnalysis(req, res) {
        try {
            const { symbol, startDate, endDate, limit = 10 } = req.body;

            if (!symbol) {
                return res.status(400).json({
                    success: false,
                    error: 'Symbol parameter is required'
                });
            }

            console.log(`🚀 Starting complete analysis export for ${symbol}...`);

            // Получаем все данные через SOAP клиент
            const completeData = await soapClientService.getCompleteAnalysis(
                symbol,
                startDate,
                endDate,
                limit
            );

            // Экспортируем в XML
            const exportResult = await XMLExportService.exportCoinAnalysis(
                symbol,
                completeData,
                { startDate, endDate, limit }
            );

            console.log(`✅ Complete analysis exported for ${symbol}: ${exportResult.filename}`);

            res.json({
                success: true,
                message: `Complete analysis exported for ${symbol}`,
                export: exportResult,
                summary: {
                    coinSymbol: symbol,
                    totalEvents: completeData.events.eventCurrencies.eventCurrency.length,
                    topEventsCount: completeData.topImpactEvents.topEvents.topEvent.length,
                    dataPoints: completeData.correlationSummary.correlationSummary.dataPoints,
                    analysisDate: {
                        from: startDate || 'earliest',
                        to: endDate || 'latest'
                    }
                }
            });
        } catch (error) {
            console.error(`❌ Export failed for ${req.body.symbol}:`, error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Скачивание XML файла
     */
    async downloadXML(req, res) {
        try {
            const { filename } = req.params;

            // Проверка безопасности
            if (!filename || !filename.endsWith('.xml')) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid filename. Only XML files are allowed.'
                });
            }

            const path = require('path');
            const fs = require('fs').promises;
            const filePath = path.join(XMLExportService.exportDir, filename);

            // Проверяем существование файла
            try {
                await fs.access(filePath);
            } catch (error) {
                return res.status(404).json({
                    success: false,
                    error: 'XML file not found'
                });
            }

            // Устанавливаем заголовки для скачивания
            res.setHeader('Content-Type', 'application/xml');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

            // Отправляем файл
            //   res.sendFile(filePath);
            res.sendFile(filePath, async (err) => {
                if (err) {
                    console.error(`❌ Error sending file ${filename}:`, err);
                    // Файл не отправился, не удаляем
                    return;
                }

                try {
                    // Файл успешно отправлен, удаляем его
                    await fs.unlink(filePath);
                    console.log(`🗑️ File automatically deleted after download: ${filename}`);
                } catch (deleteError) {
                    console.error(`❌ Error deleting file ${filename}:`, deleteError);
                    // Не критично, файл все равно отправлен
                }
            });

        } catch (error) {
            console.error('Download XML error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Проверка статуса системы экспорта
     */
    async getStatus(req, res) {
        try {
            const soapStatus = soapClientService.getConnectionStatus();
            const files = await XMLExportService.getExportedFiles();

            res.json({
                success: true,
                status: {
                    soapClient: soapStatus,
                    xmlExportService: {
                        exportDirectory: XMLExportService.exportDir,
                        totalExports: files.length,
                        isReady: true
                    },
                    lastExports: files.slice(0, 5) // Последние 5 экспортов
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Очистка старых файлов
     */
    async cleanup(req, res) {
        try {
            const { days = 30 } = req.query;
            const result = await XMLExportService.cleanupOldFiles(parseInt(days));

            res.json({
                success: true,
                cleanup: result,
                message: `Cleanup completed. Deleted ${result.deleted} files older than ${days} days.`
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = ExportController;