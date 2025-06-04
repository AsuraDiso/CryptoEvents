const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');
const { calculateEventImpactScore } = require('./impact_mapper');

async function demonstrateIsolationLevels(connection) {
  try {
    await connection.query('SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED');
    console.log('\nDemonstrating READ COMMITTED isolation level:');
    
    await connection.beginTransaction();
    
    const [initialData] = await connection.query('SELECT * FROM events LIMIT 1');
    console.log('Initial read:', initialData[0]);
    
    const concurrentConnection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'crypto_events'
    });
    
    await concurrentConnection.query('UPDATE events SET name_of_incident = "Updated Event" WHERE id = 1');
    
    const [updatedData] = await connection.query('SELECT * FROM events WHERE id = 1');
    console.log('Read after concurrent update:', updatedData[0]);
    
    await connection.commit();
    await concurrentConnection.end();
    
    console.log('\nDemonstrating SERIALIZABLE isolation level:');
    await connection.query('SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE');
    
    await connection.beginTransaction();
    
    await connection.query('SELECT * FROM events WHERE id IN (1, 2) FOR UPDATE');
    
    const concurrentConnection2 = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'crypto_events'
    });
    
    try {
      await concurrentConnection2.query('UPDATE events SET name_of_incident = "Blocked Update" WHERE id = 1');
      console.log('Concurrent update succeeded (should not happen in SERIALIZABLE)');
    } catch (error) {
      console.log('Concurrent update blocked (expected in SERIALIZABLE):', error.message);
    }
    
    await connection.commit();
    await concurrentConnection2.end();
    
    console.log('\nDemonstrating REPEATABLE READ isolation level:');
    await connection.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    
    await connection.beginTransaction();
    
    const [firstRead] = await connection.query('SELECT * FROM events WHERE id = 1');
    console.log('First read:', firstRead[0]);
    
    const concurrentConnection3 = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'crypto_events'
    });
    
    await concurrentConnection3.query('UPDATE events SET name_of_incident = "Changed in REPEATABLE READ" WHERE id = 1');
    
    const [secondRead] = await connection.query('SELECT * FROM events WHERE id = 1');
    console.log('Second read (should be same as first):', secondRead[0]);
    
    await connection.commit();
    await concurrentConnection3.end();
    
  } catch (error) {
    console.error('Error in isolation level demonstration:', error);
    await connection.rollback();
  }
}

async function importEvents() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'crypto_events'
    });

    // Создаем таблицу событий
    await connection.query(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name_of_incident VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        country VARCHAR(100),
        type_of_event VARCHAR(100),
        place_name VARCHAR(255),
        impact TEXT,
        affected_population VARCHAR(255),
        important_person_group VARCHAR(255),
        outcome VARCHAR(255)
      )
    `);

    console.log('Reading CSV file...');
    const results = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream('data/World Important Dates.csv')
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`Found ${results.length} records in CSV`);

    await connection.beginTransaction();

    try {
      let importedCount = 0;
      let skippedCount = 0;

      for (const row of results) {
        // Проверяем обязательные поля
        if (!row['Name of Incident'] || !row['Date'] || !row['Month'] || !row['Year']) {
          skippedCount++;
          continue;
        }

        let date;
        // Обрабатываем даты
        if (row['Date'] === 'Unknown' || row['Month'] === 'Unknown' || row['Year'] === 'Unknown') {
          if (row['Year'] !== 'Unknown') {
            date = new Date(row['Year']);
          } else {
            skippedCount++;
            continue;
          }
        } else {
          const dateStr = `${row['Year']}-${row['Month']}-${row['Date']}`;
          date = new Date(dateStr);
        }

        if (isNaN(date.getTime())) {
          skippedCount++;
          continue;
        }

        const values = [
          row['Name of Incident'],
          date,
          row['Country'] || null,
          row['Type of Event'] || null,
          row['Place Name'] || null,
          row['Impact'] || null,
          row['Affected Population'] || null,
          row['Important Person/Group Responsible'] || null,
          row['Outcome'] || null
        ];

        await connection.query(
          `INSERT INTO events (
            name_of_incident, date, country,
            type_of_event, place_name, impact, affected_population,
            important_person_group, outcome
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          values
        );
        importedCount++;
        
        // Показываем прогресс каждые 100 записей
        if (importedCount % 100 === 0) {
          console.log(`Imported ${importedCount} events...`);
        }
      }

      await connection.commit();
      console.log(`Events data imported successfully! Imported: ${importedCount}, Skipped: ${skippedCount}`);

      // Демонстрируем уровни изоляции после успешного импорта
      await demonstrateIsolationLevels(connection);

    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error importing events:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function importCurrencies() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'crypto_events'
    });

    // Создаем таблицу криптовалют
    await connection.query(`
      CREATE TABLE IF NOT EXISTS currencies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        Name VARCHAR(100),
        Symbol VARCHAR(20),
        Date DATETIME,
        Close DECIMAL(20,8),
        High DECIMAL(20,8),
        Low DECIMAL(20,8),
        Open DECIMAL(20,8),
        Volume DECIMAL(30,8),
        Marketcap DECIMAL(30,8)
      )
    `);

    const currencyDir = path.join(__dirname, 'data', 'currency');
    
    // Проверяем существование папки
    if (!fs.existsSync(currencyDir)) {
      console.log(`Currency directory ${currencyDir} does not exist. Creating it...`);
      fs.mkdirSync(currencyDir, { recursive: true });
      console.log('Please add your cryptocurrency CSV files to the data/currency/ directory');
      return;
    }

    const files = fs.readdirSync(currencyDir);
    const csvFiles = files.filter(file => file.endsWith('.csv'));

    if (csvFiles.length === 0) {
      console.log('No CSV files found in data/currency/ directory');
      return;
    }

    console.log(`Found ${csvFiles.length} cryptocurrency CSV files`);

    for (const file of csvFiles) {
      console.log(`Importing ${file}...`);

      await connection.beginTransaction();

      try {
        const results = [];
        await new Promise((resolve, reject) => {
          fs.createReadStream(path.join(currencyDir, file))
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', resolve)
            .on('error', reject);
        });

        let importedCount = 0;
        for (const row of results) {
          const values = [
            row.Name,
            row.Symbol,
            row.Date,
            row.Close,
            row.High,
            row.Low,
            row.Open,
            row.Volume,
            row.Marketcap
          ].map(val => val === undefined ? null : val);

          await connection.query(
            `INSERT INTO currencies (
              Name, Symbol, Date, Close, High, Low, Open, Volume, Marketcap
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            values
          );
          importedCount++;
        }

        await connection.commit();
        console.log(`${file} data imported successfully! (${importedCount} records)`);

      } catch (error) {
        await connection.rollback();
        console.error(`Error importing ${file}:`, error);
        throw error;
      }
    }
  } catch (error) {
    console.error('Error importing currencies:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function createEventCurrenciesTable() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'crypto_events'
    });

    // Создаем обновленную таблицу связей событий и валют
    await connection.query(`
      CREATE TABLE IF NOT EXISTS event_currencies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        currency_id INT NOT NULL,
        date DATE NOT NULL,
        event_impact_score DECIMAL(4,2) NOT NULL,
        daily_return DECIMAL(10,6) NOT NULL,
        volatility DECIMAL(10,6) NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY (currency_id) REFERENCES currencies(id) ON DELETE CASCADE,
        UNIQUE KEY unique_event_currency_date (event_id, currency_id, date)
      )
    `);

    console.log('Event currencies table created successfully!');
  } catch (error) {
    console.error('Error creating event_currencies table:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

/**
 * Рассчитывает daily return для криптовалюты
 * @param {number} close - Цена закрытия
 * @param {number} open - Цена открытия
 * @returns {number} Daily return в процентах
 */
function calculateDailyReturn(close, open) {
  if (!open || open === 0) return 0;
  return ((close - open) / open) * 100;
}

/**
 * Рассчитывает волатильность для криптовалюты
 * @param {number} high - Максимальная цена
 * @param {number} low - Минимальная цена
 * @param {number} open - Цена открытия
 * @returns {number} Волатильность в процентах
 */
function calculateVolatility(high, low, open) {
  if (!open || open === 0) return 0;
  return ((high - low) / open) * 100;
}

async function createEventCurrencyRelationships() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'crypto_events'
    });

    console.log('Starting to create event-currency relationships...');

    // Получаем все события с необходимыми данными для расчета impact score
    const [events] = await connection.query(`
      SELECT id, date, country, type_of_event, outcome 
      FROM events 
      WHERE country IS NOT NULL 
      AND type_of_event IS NOT NULL
    `);
    
    console.log(`Found ${events.length} events with complete data for impact scoring`);

    // Получаем все данные по криптовалютам
    const [currencies] = await connection.query(`
      SELECT id, Date, Close, High, Low, Open 
      FROM currencies 
      WHERE Close IS NOT NULL 
      AND High IS NOT NULL 
      AND Low IS NOT NULL 
      AND Open IS NOT NULL
      AND Open != 0
    `);
    
    console.log(`Found ${currencies.length} currency records with complete price data`);

    if (events.length === 0 || currencies.length === 0) {
      console.log('No data available for creating relationships');
      return;
    }

    let relationshipCount = 0;
    let processedEvents = 0;
    
    // Обрабатываем события батчами для лучшей производительности
    const batchSize = 50;
    
    for (let i = 0; i < events.length; i += batchSize) {
      const eventBatch = events.slice(i, i + batchSize);
      
      await connection.beginTransaction();
      
      try {
        for (const event of eventBatch) {
          const eventDate = new Date(event.date);
          const eventDateStr = eventDate.toISOString().split('T')[0];
          
          // Рассчитываем impact score для события
          const impactScore = calculateEventImpactScore(
            event.country,
            event.type_of_event,
            event.outcome
          );
          
          // Ищем подходящие записи криптовалют для той же даты
          const matchingCurrencies = currencies.filter(currency => {
            const currencyDate = new Date(currency.Date);
            const currencyDateStr = currencyDate.toISOString().split('T')[0];
            return eventDateStr === currencyDateStr;
          });
          
          // Создаем связи для каждой подходящей криптовалюты
          for (const currency of matchingCurrencies) {
            const dailyReturn = calculateDailyReturn(
              parseFloat(currency.Close),
              parseFloat(currency.Open)
            );
            
            const volatility = calculateVolatility(
              parseFloat(currency.High),
              parseFloat(currency.Low),
              parseFloat(currency.Open)
            );
            
            try {
              await connection.query(
                `INSERT INTO event_currencies 
                (event_id, currency_id, date, event_impact_score, daily_return, volatility) 
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                event_impact_score = VALUES(event_impact_score),
                daily_return = VALUES(daily_return),
                volatility = VALUES(volatility)`,
                [
                  event.id,
                  currency.id,
                  eventDate,
                  impactScore.toFixed(2),
                  dailyReturn.toFixed(6),
                  volatility.toFixed(6)
                ]
              );
              relationshipCount++;
            } catch (error) {
              if (error.code !== 'ER_DUP_ENTRY') {
                console.error('Error creating relationship:', error);
              }
            }
          }
          
          processedEvents++;
          
          // Выводим прогресс каждые 25 событий
          if (processedEvents % 25 === 0) {
            console.log(`Processed ${processedEvents}/${events.length} events, created ${relationshipCount} relationships`);
          }
        }
        
        await connection.commit();
        
      } catch (error) {
        await connection.rollback();
        console.error('Error in batch processing:', error);
        throw error;
      }
    }

    console.log(`\nCreated ${relationshipCount} event-currency relationships successfully!`);
    console.log(`Processed ${processedEvents} events total`);
    
    // Выводим статистику по созданным связям
    if (relationshipCount > 0) {
      const [stats] = await connection.query(`
        SELECT 
          COUNT(*) as total_relationships,
          COUNT(DISTINCT event_id) as unique_events,
          COUNT(DISTINCT currency_id) as unique_currencies,
          AVG(event_impact_score) as avg_impact_score,
          MIN(event_impact_score) as min_impact_score,
          MAX(event_impact_score) as max_impact_score,
          AVG(ABS(daily_return)) as avg_abs_daily_return,
          AVG(volatility) as avg_volatility
        FROM event_currencies
      `);
      
      console.log('\n=== STATISTICS ===');
      console.log('Total relationships:', stats[0].total_relationships);
      console.log('Unique events:', stats[0].unique_events);
      console.log('Unique currencies:', stats[0].unique_currencies);
      console.log('Average impact score:', parseFloat(stats[0].avg_impact_score).toFixed(2));
      console.log('Impact score range:', 
        `${parseFloat(stats[0].min_impact_score).toFixed(2)} - ${parseFloat(stats[0].max_impact_score).toFixed(2)}`);
      console.log('Average absolute daily return:', parseFloat(stats[0].avg_abs_daily_return).toFixed(4) + '%');
      console.log('Average volatility:', parseFloat(stats[0].avg_volatility).toFixed(4) + '%');
    }
    
  } catch (error) {
    console.error('Error creating event-currency relationships:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function analyzeImpactMapping() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'crypto_events'
    });

    console.log('\n=== IMPACT MAPPING ANALYSIS ===');
    
    // Анализ покрытия маппинга стран
    const [countryStats] = await connection.query(`
      SELECT 
        country,
        COUNT(*) as event_count
      FROM events 
      WHERE country IS NOT NULL 
      GROUP BY country 
      ORDER BY event_count DESC 
      LIMIT 15
    `);
    
    console.log('\nTop 15 countries by event count:');
    countryStats.forEach(stat => {
      console.log(`${stat.country}: ${stat.event_count} events`);
    });
    
    // Анализ типов событий
    const [eventTypeStats] = await connection.query(`
      SELECT 
        type_of_event,
        COUNT(*) as event_count
      FROM events 
      WHERE type_of_event IS NOT NULL 
      GROUP BY type_of_event 
      ORDER BY event_count DESC 
      LIMIT 15
    `);
    
    console.log('\nTop 15 event types by count:');
    eventTypeStats.forEach(stat => {
      console.log(`${stat.type_of_event}: ${stat.event_count} events`);
    });
    
    // Анализ исходов
    const [outcomeStats] = await connection.query(`
      SELECT 
        outcome,
        COUNT(*) as event_count
      FROM events 
      WHERE outcome IS NOT NULL 
      GROUP BY outcome 
      ORDER BY event_count DESC
    `);
    
    console.log('\nOutcome distribution:');
    outcomeStats.forEach(stat => {
      console.log(`${stat.outcome}: ${stat.event_count} events`);
    });
    
  } catch (error) {
    console.error('Error analyzing impact mapping:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function main() {
  try {
    console.log('=== Starting Enhanced Crypto Events Database Import ===');
    console.log('This script will:');
    console.log('1. Import historical events from CSV');
    console.log('2. Import cryptocurrency price data');
    console.log('3. Create relationships with impact scoring');
    console.log('4. Demonstrate transaction isolation levels');
    console.log('5. Analyze the imported data\n');
    
    // Проверяем наличие основного CSV файла
    if (!fs.existsSync('data/World Important Dates.csv')) {
      console.error('Error: data/World Important Dates.csv not found!');
      console.log('Please ensure the CSV file is in the data/ directory');
      process.exit(1);
    }
    
    await importEvents();
    await importCurrencies();
    await createEventCurrenciesTable();
    await createEventCurrencyRelationships();
    await analyzeImpactMapping();
    
    console.log('\n=== All data imported successfully with impact scoring! ===');
    console.log('You can now run the analysis queries from analysis_queries.sql');
    process.exit(0);
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  }
}

// Запускаем основную функцию
main();