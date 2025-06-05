const XMLImportService = require('../services/xmlImportService');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Configure multer to load XML files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../imports/xml_imports');
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-').slice(0, 19);
        const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}_${originalName}`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'text/xml' || file.mimetype === 'application/xml' || 
        path.extname(file.originalname).toLowerCase() === '.xml') {
        cb(null, true);
    } else {
        cb(new Error('Only XML files are allowed'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB maximum file size
    }
});

class ImportController {
    /**
     * Get a list of available XML files
     */
    async getAvailableFiles(req, res) {
        try {
            const files = await XMLImportService.getAvailableXMLFiles();
            res.json({
                success: true,
                files: files,
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
     * Upload and import XML file
     */
    async uploadAndImport(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'No XML file provided'
                });
            }

            const filePath = req.file.path;
            const { importType = 'auto', deleteAfterImport = true } = req.body;

            console.log(`Starting XML import from: ${req.file.filename}`);

            // Validate XML file
            const validation = await XMLImportService.validateXMLFile(filePath);
            
            if (!validation.valid) {
                await fs.unlink(filePath);
                return res.status(400).json({
                    success: false,
                    error: `Invalid XML file: ${validation.error || 'Unknown format'}`,
                    validation: validation
                });
            }

            // Perform import
            const importResult = await XMLImportService.importXMLFile(filePath, importType);

            // Delete the file after import
            if (deleteAfterImport) {
                try {
                    await fs.unlink(filePath);
                    console.log(`File deleted after import: ${req.file.filename}`);
                } catch (deleteError) {
                    console.error(`Error deleting file: ${deleteError}`);
                }
            }

            res.json({
                success: true,
                message: 'XML file imported successfully',
                file: {
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    size: req.file.size
                },
                validation: validation,
                result: importResult,
                fileDeleted: deleteAfterImport
            });

        } catch (error) {
            console.error('Import error:', error);
            
            // Clear the file in case of an error
            if (req.file && req.file.path) {
                try {
                    await fs.unlink(req.file.path);
                } catch (unlinkError) {
                    console.error('Error deleting file after error:', unlinkError);
                }
            }

            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Import from an already loaded file
     */
    async importFromFile(req, res) {
        try {
            const { filename, importType = 'auto', deleteAfterImport = false } = req.body;
            
            if (!filename) {
                return res.status(400).json({
                    success: false,
                    error: 'Filename is required'
                });
            }

            const filePath = path.join(XMLImportService.importDir, filename);
            
            // Check if the file exists
            try {
                await fs.access(filePath);
            } catch (error) {
                return res.status(404).json({
                    success: false,
                    error: 'XML file not found'
                });
            }

            console.log(`Importing from file: ${filename}`);

            // Perform import
            const importResult = await XMLImportService.importXMLFile(filePath, importType);

            // Delete file after import if requested
            if (deleteAfterImport) {
                try {
                    await fs.unlink(filePath);
                    console.log(`File deleted after import: ${filename}`);
                } catch (deleteError) {
                    console.error(`Error deleting file: ${deleteError}`);
                }
            }

            res.json({
                success: true,
                message: 'Data imported successfully',
                filename: filename,
                result: importResult,
                fileDeleted: deleteAfterImport
            });

        } catch (error) {
            console.error('Import error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Validate XML file
     */
    async validateFile(req, res) {
        try {
            const { filename } = req.params;
            
            if (!filename) {
                return res.status(400).json({
                    success: false,
                    error: 'Filename is required'
                });
            }

            const filePath = path.join(XMLImportService.importDir, filename);
            
            try {
                await fs.access(filePath);
            } catch (error) {
                return res.status(404).json({
                    success: false,
                    error: 'XML file not found'
                });
            }

            const validation = await XMLImportService.validateXMLFile(filePath);

            res.json({
                success: true,
                filename: filename,
                validation: validation
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Delete XML file
     */
    async deleteFile(req, res) {
        try {
            const { filename } = req.params;
            
            if (!filename || !filename.endsWith('.xml')) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid filename'
                });
            }

            const filePath = path.join(XMLImportService.importDir, filename);
            
            try {
                await fs.access(filePath);
            } catch (error) {
                return res.status(404).json({
                    success: false,
                    error: 'XML file not found'
                });
            }

            await fs.unlink(filePath);

            res.json({
                success: true,
                message: `File ${filename} deleted successfully`
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Get database statistics
     */
    async getStats(req, res) {
        try {
            const Event = require('../models/Event');
            const CryptoCurrency = require('../models/CryptoCurrency');
            const EventCurrency = require('../models/EventCurrency');

            const [eventsCount, currenciesCount, relationshipsCount] = await Promise.all([
                Event.count(),
                CryptoCurrency.count(),
                EventCurrency.count()
            ]);

            const availableFiles = await XMLImportService.getAvailableXMLFiles();

            res.json({
                success: true,
                stats: {
                    database: {
                        totalEvents: eventsCount,
                        totalCurrencyRecords: currenciesCount,
                        totalRelationships: relationshipsCount
                    },
                    xmlFiles: {
                        availableFiles: availableFiles.length,
                        files: availableFiles.slice(0, 5) // Показываем последние 5 файлов
                    }
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
     * Forced to update EventCurrency links
     */
    async updateRelationships(req, res) {
        try {
            console.log('Starting relationship update...');
            
            const result = await XMLImportService.updateEventCurrencyRelationships();
            
            res.json({
                success: true,
                message: 'Event-currency relationships updated successfully',
                result: result
            });

        } catch (error) {
            console.error('Update relationships error:', error);
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    /**
     * Clearing out old files
     */
    async cleanupFiles(req, res) {
        try {
            const { days = 7 } = req.query;
            const cutoffDate = new Date();
            cutoffDate.setTime(cutoffDate.getTime() - (parseInt(days) * 24 * 60 * 60 * 1000));

            const files = await XMLImportService.getAvailableXMLFiles();
            const filesToDelete = files.filter(file => file.modified < cutoffDate);

            for (const file of filesToDelete) {
                await fs.unlink(file.fullPath);
            }

            res.json({
                success: true,
                cleanup: {
                    deleted: filesToDelete.length,
                    remaining: files.length - filesToDelete.length,
                    cutoffDate: cutoffDate.toISOString()
                },
                message: `Deleted ${filesToDelete.length} files older than ${days} days`
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

module.exports = { XMLImportController: ImportController, upload };