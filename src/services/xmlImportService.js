const xml2js = require('xml2js');
const fs = require('fs').promises;
const path = require('path');
const { cryptoDb } = require('../config/database');
const CryptoCurrency = require('../models/CryptoCurrency');
const Event = require('../models/Event');
const EventCurrency = require('../models/EventCurrency');
const { calculateEventImpactScore } = require('../utils/impact_mapper');

class XMLImportService {
    constructor() {
        this.parser = new xml2js.Parser({
            explicitArray: false,
            mergeAttrs: true,
            trim: true,
            parseNumbers: true,
            parseBooleans: true
        });

        this.importDir = path.join(__dirname, '../../imports/xml_imports');
        this.ensureImportDirectory();
    }

    async ensureImportDirectory() {
        try {
            await fs.mkdir(this.importDir, { recursive: true });
            console.log('XML import directory ready');
        } catch (error) {
            console.error('Error creating XML import directory:', error);
        }
    }

    /**
     * Basic function of importing XML file
     */
    async importXMLFile(filePath, importType = 'auto') {
        try {
            console.log(`Starting XML import from: ${filePath}`);

            // Read and parse XML file
            const xmlContent = await fs.readFile(filePath, 'utf8');
            const xmlData = await this.parser.parseStringPromise(xmlContent);

            // Define import type
            const detectedType = importType === 'auto' ? this.detectXMLType(xmlData) : importType;

            let result;
            switch (detectedType) {
                case 'events':
                    result = await this.importEvents(xmlData);
                    break;
                case 'currencies':
                    result = await this.importCurrencies(xmlData);
                    break;
                case 'mixed':
                    result = await this.importMixedData(xmlData);
                    break;
                default:
                    throw new Error(`Unsupported XML format: ${detectedType}`);
            }

            // After successful import, update the EventCurrency links
            if (result.eventsImported > 0 || result.currenciesImported > 0) {
                console.log('Updating event-currency relationships...');
                const relationshipResult = await this.updateEventCurrencyRelationships();
                result.relationshipsCreated = relationshipResult.created;
                result.relationshipsUpdated = relationshipResult.updated;
            }

            console.log(`XML import completed: ${JSON.stringify(result)}`);
            return result;

        } catch (error) {
            console.error('XML import error:', error);
            throw new Error(`Failed to import XML file: ${error.message}`);
        }
    }

    /**
     * Defines the type of XML file
     */
    detectXMLType(xmlData) {
        const rootKeys = Object.keys(xmlData);
        const rootKey = rootKeys[0];
        const rootData = xmlData[rootKey];

        // Check for events
        if (rootKey === 'Events' || rootKey === 'EventsList' ||
            rootData.Event || rootData.event || rootData.events) {
            return 'events';
        }

        // Checking for cryptocurrencies
        if (rootKey === 'Currencies' || rootKey === 'CurrencyList' ||
            rootData.Currency || rootData.currency || rootData.currencies) {
            return 'currencies';
        }

        // Check for mixed data
        if ((rootData.Events || rootData.events) &&
            (rootData.Currencies || rootData.currencies)) {
            return 'mixed';
        }

        return 'unknown';
    }

    /**
     * Import events from XML
     */
    async importEvents(xmlData) {
        const transaction = await cryptoDb.transaction();

        try {
            const eventsData = this.extractEventsFromXML(xmlData);

            let importedCount = 0;
            let skippedCount = 0;
            let updatedCount = 0;

            for (const eventData of eventsData) {
                try {
                    const result = await this.processEventData(eventData, transaction);
                    if (result.action === 'created') {
                        importedCount++;
                    } else if (result.action === 'updated') {
                        updatedCount++;
                    } else {
                        skippedCount++;
                    }
                } catch (error) {
                    console.error('Error processing event:', error);
                    skippedCount++;
                }
            }

            await transaction.commit();

            return {
                type: 'events',
                eventsImported: importedCount,
                eventsUpdated: updatedCount,
                eventsSkipped: skippedCount,
                currenciesImported: 0,
                currenciesUpdated: 0,
                currenciesSkipped: 0
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Import cryptocurrencies from XML
     */
    async importCurrencies(xmlData) {
        const transaction = await cryptoDb.transaction();

        try {
            const currenciesData = this.extractCurrenciesFromXML(xmlData);

            let importedCount = 0;
            let skippedCount = 0;
            let updatedCount = 0;

            for (const currencyData of currenciesData) {
                try {
                    const result = await this.processCurrencyData(currencyData, transaction);
                    if (result.action === 'created') {
                        importedCount++;
                    } else if (result.action === 'updated') {
                        updatedCount++;
                    } else {
                        skippedCount++;
                    }
                } catch (error) {
                    console.error('Error processing currency:', error);
                    skippedCount++;
                }
            }

            await transaction.commit();

            return {
                type: 'currencies',
                eventsImported: 0,
                eventsUpdated: 0,
                eventsSkipped: 0,
                currenciesImported: importedCount,
                currenciesUpdated: updatedCount,
                currenciesSkipped: skippedCount
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Importing mixed data  WORKS BAD!!!!!!
     */
    async importMixedData(xmlData) {
        const transaction = await cryptoDb.transaction();

        try {
            const rootKey = Object.keys(xmlData)[0];
            const rootData = xmlData[rootKey];

            let eventsImported = 0, eventsUpdated = 0, eventsSkipped = 0;
            let currenciesImported = 0, currenciesUpdated = 0, currenciesSkipped = 0;

            // Import events
            if (rootData.Events || rootData.events) {
                const eventsSection = rootData.Events || rootData.events;
                const eventsData = this.extractEventsFromSection(eventsSection);

                for (const eventData of eventsData) {
                    try {
                        const result = await this.processEventData(eventData, transaction);
                        if (result.action === 'created') {
                            eventsImported++;
                        } else if (result.action === 'updated') {
                            eventsUpdated++;
                        } else {
                            eventsSkipped++;
                        }
                    } catch (error) {
                        console.error('Error processing event:', error);
                        eventsSkipped++;
                    }
                }
            }

            // Importing cryptocurrencies
            if (rootData.Currencies || rootData.currencies) {
                const currenciesSection = rootData.Currencies || rootData.currencies;
                const currenciesData = this.extractCurrenciesFromSection(currenciesSection);

                for (const currencyData of currenciesData) {
                    try {
                        const result = await this.processCurrencyData(currencyData, transaction);
                        if (result.action === 'created') {
                            currenciesImported++;
                        } else if (result.action === 'updated') {
                            currenciesUpdated++;
                        } else {
                            currenciesSkipped++;
                        }
                    } catch (error) {
                        console.error('Error processing currency:', error);
                        currenciesSkipped++;
                    }
                }
            }

            await transaction.commit();

            return {
                type: 'mixed',
                eventsImported,
                eventsUpdated,
                eventsSkipped,
                currenciesImported,
                currenciesUpdated,
                currenciesSkipped
            };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Extract events from XML structure
     */
    extractEventsFromXML(xmlData) {
        const rootKey = Object.keys(xmlData)[0];
        const rootData = xmlData[rootKey];

        if (rootData.Event) {
            return Array.isArray(rootData.Event) ? rootData.Event : [rootData.Event];
        } else if (rootData.event) {
            return Array.isArray(rootData.event) ? rootData.event : [rootData.event];
        } else if (rootData.events) {
            return this.extractEventsFromSection(rootData.events);
        }

        return [];
    }

    /**
     * Retrieving events from the section
     */
    extractEventsFromSection(eventsSection) {
        if (eventsSection.Event) {
            return Array.isArray(eventsSection.Event) ? eventsSection.Event : [eventsSection.Event];
        } else if (eventsSection.event) {
            return Array.isArray(eventsSection.event) ? eventsSection.event : [eventsSection.event];
        }
        return [];
    }

    /**
     * Extraction of cryptocurrencies from XML structure
     */
    extractCurrenciesFromXML(xmlData) {
        const rootKey = Object.keys(xmlData)[0];
        const rootData = xmlData[rootKey];

        if (rootData.Currency) {
            return Array.isArray(rootData.Currency) ? rootData.Currency : [rootData.Currency];
        } else if (rootData.currency) {
            return Array.isArray(rootData.currency) ? rootData.currency : [rootData.currency];
        } else if (rootData.currencies) {
            return this.extractCurrenciesFromSection(rootData.currencies);
        }

        return [];
    }

    /**
     * Extraction of cryptocurrencies from the section
     */
    extractCurrenciesFromSection(currenciesSection) {
        if (currenciesSection.Currency) {
            return Array.isArray(currenciesSection.Currency) ? currenciesSection.Currency : [currenciesSection.Currency];
        } else if (currenciesSection.currency) {
            return Array.isArray(currenciesSection.currency) ? currenciesSection.currency : [currenciesSection.currency];
        }
        return [];
    }

    /**
     * Event data processing
     */
    async processEventData(eventData, transaction) {
        try {
            // Check mandatory fields
            const eventName = eventData.name_of_incident || eventData.eventName || eventData.name;
            if (!eventName) {
                console.log('Skipping event: missing name');
                return { action: 'skipped', reason: 'missing name' };
            }

            // Process the date
            let eventDate;
            if (eventData.date) {
                eventDate = new Date(eventData.date);
                if (isNaN(eventDate.getTime())) {
                    eventDate = new Date();
                }
            } else {
                eventDate = new Date();
            }

            // Check if such an event already exists
            const existingEvent = await Event.findOne({
                where: {
                    name_of_incident: eventName,
                    date: eventDate
                },
                transaction
            });

            if (existingEvent) {
                // Update the existing event only if there is new data
                const updateData = {};
                if (eventData.country && eventData.country !== existingEvent.country) {
                    updateData.country = eventData.country;
                }
                if (eventData.type_of_event && eventData.type_of_event !== existingEvent.type_of_event) {
                    updateData.type_of_event = eventData.type_of_event;
                }
                if (eventData.outcome && eventData.outcome !== existingEvent.outcome) {
                    updateData.outcome = eventData.outcome;
                }

                if (Object.keys(updateData).length > 0) {
                    await existingEvent.update(updateData, { transaction });
                    console.log(`Updated event: ${eventName}`);
                    return { action: 'updated', event: existingEvent };
                } else {
                    return { action: 'skipped', reason: 'already exists' };
                }
            }

            // Create a new event
            const newEvent = await Event.create({
                name_of_incident: eventName,
                date: eventDate,
                country: eventData.country || null,
                type_of_event: eventData.type_of_event || eventData.eventType || null,
                place_name: eventData.place_name || eventData.placeName || null,
                impact: eventData.impact || null,
                affected_population: eventData.affected_population || eventData.affectedPopulation || null,
                important_person_group: eventData.important_person_group || eventData.importantPersonGroup || null,
                outcome: eventData.outcome || null
            }, { transaction });

            console.log(`Created new event: ${eventName}`);
            return { action: 'created', event: newEvent };

        } catch (error) {
            console.error('Error processing event data:', error);
            return { action: 'skipped', reason: error.message };
        }
    }

    /**
     * Cryptocurrency data processing
     */
    async processCurrencyData(currencyData, transaction) {
        try {
            // Check mandatory fields
            const currencyName = currencyData.Name || currencyData.name;
            const currencySymbol = currencyData.Symbol || currencyData.symbol;

            if (!currencyName || !currencySymbol) {
                console.log('Skipping currency: missing name or symbol');
                return { action: 'skipped', reason: 'missing name or symbol' };
            }

            // Process the date
            let currencyDate;
            if (currencyData.Date || currencyData.date) {
                currencyDate = new Date(currencyData.Date || currencyData.date);
                if (isNaN(currencyDate.getTime())) {
                    currencyDate = new Date();
                }
            } else {
                currencyDate = new Date();
            }

            // Check if such a record already exists
            const existingCurrency = await CryptoCurrency.findOne({
                where: {
                    Name: currencyName,
                    Symbol: currencySymbol,
                    Date: currencyDate
                },
                transaction
            });

            if (existingCurrency) {
                // Update existing record only if there is new data
                const updateData = {};

                const newClose = this.parseDecimal(currencyData.Close || currencyData.close);
                const newHigh = this.parseDecimal(currencyData.High || currencyData.high);
                const newLow = this.parseDecimal(currencyData.Low || currencyData.low);
                const newOpen = this.parseDecimal(currencyData.Open || currencyData.open);
                const newVolume = this.parseDecimal(currencyData.Volume || currencyData.volume);
                const newMarketcap = this.parseDecimal(currencyData.Marketcap || currencyData.marketcap);

                if (newClose !== null && newClose !== existingCurrency.Close) updateData.Close = newClose;
                if (newHigh !== null && newHigh !== existingCurrency.High) updateData.High = newHigh;
                if (newLow !== null && newLow !== existingCurrency.Low) updateData.Low = newLow;
                if (newOpen !== null && newOpen !== existingCurrency.Open) updateData.Open = newOpen;
                if (newVolume !== null && newVolume !== existingCurrency.Volume) updateData.Volume = newVolume;
                if (newMarketcap !== null && newMarketcap !== existingCurrency.Marketcap) updateData.Marketcap = newMarketcap;

                if (Object.keys(updateData).length > 0) {
                    await existingCurrency.update(updateData, { transaction });
                    console.log(`Updated currency: ${currencySymbol} on ${currencyDate.toISOString().split('T')[0]}`);
                    return { action: 'updated', currency: existingCurrency };
                } else {
                    return { action: 'skipped', reason: 'already exists' };
                }
            }

            // Create a new record
            const newCurrency = await CryptoCurrency.create({
                Name: currencyName,
                Symbol: currencySymbol,
                Date: currencyDate,
                Close: this.parseDecimal(currencyData.Close || currencyData.close),
                High: this.parseDecimal(currencyData.High || currencyData.high),
                Low: this.parseDecimal(currencyData.Low || currencyData.low),
                Open: this.parseDecimal(currencyData.Open || currencyData.open),
                Volume: this.parseDecimal(currencyData.Volume || currencyData.volume),
                Marketcap: this.parseDecimal(currencyData.Marketcap || currencyData.marketcap)
            }, { transaction });

            console.log(`Created new currency: ${currencySymbol} on ${currencyDate.toISOString().split('T')[0]}`);
            return { action: 'created', currency: newCurrency };

        } catch (error) {
            console.error('Error processing currency data:', error);
            return { action: 'skipped', reason: error.message };
        }
    }

    /**
     * Safe conversion to decimal
     */
    parseDecimal(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
    }

    /**
     * Update EventCurrency links after importing
     */
    async updateEventCurrencyRelationships() {
        try {
            console.log('Updating event-currency relationships...');

            // Get events with complete data for impact score calculation
            const events = await Event.findAll({
                where: {
                    country: { [cryptoDb.Sequelize.Op.ne]: null },
                    type_of_event: { [cryptoDb.Sequelize.Op.ne]: null }
                }
            });

            // Get cryptocurrencies with full price data
            const currencies = await CryptoCurrency.findAll({
                where: {
                    Close: { [cryptoDb.Sequelize.Op.ne]: null },
                    High: { [cryptoDb.Sequelize.Op.ne]: null },
                    Low: { [cryptoDb.Sequelize.Op.ne]: null },
                    Open: { [cryptoDb.Sequelize.Op.ne]: null, [cryptoDb.Sequelize.Op.ne]: 0 }
                }
            });

            let created = 0;
            let updated = 0;

            for (const event of events) {
                const eventDate = new Date(event.date);
                const eventDateStr = eventDate.toISOString().split('T')[0];

                // Calculate impact score
                const impactScore = calculateEventImpactScore(
                    event.country,
                    event.type_of_event,
                    event.outcome
                );

                // Find cryptocurrencies on the same date
                const matchingCurrencies = currencies.filter(currency => {
                    const currencyDate = new Date(currency.Date);
                    const currencyDateStr = currencyDate.toISOString().split('T')[0];
                    return eventDateStr === currencyDateStr;
                });

                for (const currency of matchingCurrencies) {
                    const dailyReturn = this.calculateDailyReturn(
                        parseFloat(currency.Close),
                        parseFloat(currency.Open)
                    );

                    const volatility = this.calculateVolatility(
                        parseFloat(currency.High),
                        parseFloat(currency.Low),
                        parseFloat(currency.Open)
                    );

                    // Check the existing connection
                    const [eventCurrency, isCreated] = await EventCurrency.findOrCreate({
                        where: {
                            event_id: event.id,
                            currency_id: currency.id,
                            date: eventDate
                        },
                        defaults: {
                            event_impact_score: parseFloat(impactScore.toFixed(2)),
                            daily_return: parseFloat(dailyReturn.toFixed(6)),
                            volatility: parseFloat(volatility.toFixed(6))
                        }
                    });

                    if (isCreated) {
                        created++;
                    } else {
                        // Update an existing link
                        await eventCurrency.update({
                            event_impact_score: parseFloat(impactScore.toFixed(2)),
                            daily_return: parseFloat(dailyReturn.toFixed(6)),
                            volatility: parseFloat(volatility.toFixed(6))
                        });
                        updated++;
                    }
                }
            }

            console.log(`Relationships updated: ${created} created, ${updated} updated`);
            return { created, updated };

        } catch (error) {
            console.error('Error updating relationships:', error);
            throw error;
        }
    }

    /**
     * Расчет дневной доходности
     */
    calculateDailyReturn(close, open) {
        if (!open || open === 0) return 0;
        return ((close - open) / open) * 100;
    }

    /**
     * Calculating volatility
     */
    calculateVolatility(high, low, open) {
        if (!open || open === 0) return 0;
        return ((high - low) / open) * 100;
    }

    /**
     * Validation of XML file
     */
    async validateXMLFile(filePath) {
        try {
            const xmlContent = await fs.readFile(filePath, 'utf8');
            const xmlData = await this.parser.parseStringPromise(xmlContent);

            const detectedType = this.detectXMLType(xmlData);

            return {
                valid: detectedType !== 'unknown',
                type: detectedType,
                structure: this.analyzeXMLStructure(xmlData)
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message,
                type: 'invalid'
            };
        }
    }

    /**
     * Analysis of XML structure
     */
    analyzeXMLStructure(xmlData) {
        const rootKeys = Object.keys(xmlData);
        const rootKey = rootKeys[0];
        const rootData = xmlData[rootKey];

        const structure = {
            rootElement: rootKey,
            hasEvents: false,
            hasCurrencies: false,
            eventsCount: 0,
            currenciesCount: 0
        };

        // Analyze events
        const eventsData = this.extractEventsFromXML(xmlData);
        if (eventsData.length > 0) {
            structure.hasEvents = true;
            structure.eventsCount = eventsData.length;
        }

        // Analyzing Cryptocurrencies
        const currenciesData = this.extractCurrenciesFromXML(xmlData);
        if (currenciesData.length > 0) {
            structure.hasCurrencies = true;
            structure.currenciesCount = currenciesData.length;
        }

        return structure;
    }

    /**
     * Getting the list of available XML files
     */
    async getAvailableXMLFiles() {
        try {
            const files = await fs.readdir(this.importDir);
            const xmlFiles = files.filter(file => file.endsWith('.xml'));

            const fileDetails = await Promise.all(
                xmlFiles.map(async (file) => {
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
            throw new Error(`Failed to get available XML files: ${error.message}`);
        }
    }
}

// Create a singleton
const xmlImportService = new XMLImportService();
module.exports = xmlImportService;