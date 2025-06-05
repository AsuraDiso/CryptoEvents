// src/routes/export.js
const express = require('express');
const router = express.Router();
const ExportController = require('../controllers/exportController');

// Создаем экземпляр контроллера
const exportController = new ExportController();

// Middleware для логирования экспорт запросов
// router.use((req, res, next) => {
//   console.log(`[XML-EXPORT] ${new Date().toISOString()} - ${req.method} ${req.path}`);
//   if (req.body && Object.keys(req.body).length > 0) {
//     console.log('[REQUEST BODY]:', req.body);
//   }
//   next();
// });

/**
 * GET /api/export - Получить список всех экспортированных файлов
 */
router.get('/', (req, res) => {
  return exportController.getExports(req, res);
});

/**
 * GET /api/export/status - Проверка статуса системы экспорта
 */
router.get('/status', (req, res) => {
  return exportController.getStatus(req, res);
});

/**
 * POST /api/export/coin - Экспорт полной статистики по монете
 * Body: { symbol: "BTC", startDate?: "2023-01-01", endDate?: "2023-12-31", limit?: 15 }
 */
router.post('/coin', (req, res) => {
  return exportController.exportCoinAnalysis(req, res);
});

/**
 * GET /api/export/download/:filename - Скачивание XML файла
 * Params: filename (например: BTC_analysis_2024-01-15T10-30-45.xml)
 */
router.get('/download/:filename', (req, res) => {
  return exportController.downloadXML(req, res);
});

/**
 * POST /api/export/reconnect - Переподключение к SOAP сервису
 */
router.post('/reconnect', (req, res) => {
  return exportController.reconnectSoap(req, res);
});

/**
 * DELETE /api/export/cleanup - Очистка старых экспортных файлов
 * Query: ?days=30 (количество дней)
 */
router.delete('/cleanup', (req, res) => {
  return exportController.cleanup(req, res);
});

// Middleware для обработки ошибок специфичных для экспорта
router.use((error, req, res, next) => {
  console.error('[EXPORT ERROR]:', error);
  
  // Специфичные ошибки SOAP
  if (error.message && error.message.includes('SOAP')) {
    return res.status(503).json({
      success: false,
      error: 'SOAP service temporarily unavailable',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Service unavailable'
    });
  }
  
  // Ошибки файловой системы
  if (error.code === 'ENOENT') {
    return res.status(404).json({
      success: false,
      error: 'Export file not found'
    });
  }
  
  // Ошибки доступа к файлам
  if (error.code === 'EACCES') {
    return res.status(403).json({
      success: false,
      error: 'Access denied to export file'
    });
  }
  
  // Общая обработка ошибок
  res.status(500).json({
    success: false,
    error: 'Export operation failed',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
  });
});

module.exports = router;