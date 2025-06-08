const fs = require('fs').promises;
const path = require('path');
const { cryptoDb } = require('../config/database');
const CryptoCurrency = require('../models/CryptoCurrency');
const Event = require('../models/Event');
const EventCurrency = require('../models/EventCurrency');

class JSONImportService {
    constructor() {
        this.importDir = path.join(__dirname, '../../imports/json_imports');
        this.ensureImportDirectory();
    }

    async ensureImportDirectory() {
        try {
            await fs.mkdir(this.importDir, { recursive: true });
            console.log('✅ JSON import directory ready');
        } catch (error) {
            console.error('Error creating JSON import directory:', error);
        }
    }

    async importJSONFile(filePath) {
        try {
            const jsonContent = await fs.readFile(filePath, 'utf8');
            const jsonData = JSON.parse(jsonContent);

            // Example: import events and currencies if present
            let eventsImported = 0, currenciesImported = 0;

            if (jsonData.events && Array.isArray(jsonData.events)) {
                for (const event of jsonData.events) {
                    await Event.create(event);
                    eventsImported++;
                }
            }
            if (jsonData.currencies && Array.isArray(jsonData.currencies)) {
                for (const currency of jsonData.currencies) {
                    await CryptoCurrency.create(currency);
                    currenciesImported++;
                }
            }

            return { eventsImported, currenciesImported };
        } catch (error) {
            throw new Error(`Failed to import JSON file: ${error.message}`);
        }
    }

    async getAvailableJSONFiles() {
        try {
            const files = await fs.readdir(this.importDir);
            const jsonFiles = files.filter(file => file.endsWith('.json'));

            const fileDetails = await Promise.all(
                jsonFiles.map(async (file) => {
                    const filePath = path.join(this.importDir, file);
                    const stats = await fs.stat(filePath);

                    return {
                        filename: file,
                        size: stats.size,
                        created: stats.birthtime,
                        modified: stats.mtime,
                        fullPath: filePath
                    };
                })
            );

            return fileDetails.sort((a, b) => b.modified - a.modified);
        } catch (error) {
            throw new Error(`Failed to get available JSON files: ${error.message}`);
        }
    }
}

const jsonImportService = new JSONImportService();
module.exports = jsonImportService;