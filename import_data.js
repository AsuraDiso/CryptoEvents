const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');

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

    const results = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream('data/World Important Dates.csv')
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    await connection.beginTransaction();

    try {
      let importedCount = 0;
      let skippedCount = 0;

      for (const row of results) {
        if (!row['Name of Incident'] || !row['Date'] || !row['Month'] || !row['Year']) {
          skippedCount++;
          continue;
        }

        let date;
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
      }

      await connection.commit();
      console.log(`Events data imported successfully! Imported: ${importedCount}, Skipped: ${skippedCount}`);

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
    const files = fs.readdirSync(currencyDir);

    for (const file of files) {
      if (file.endsWith('.csv')) {
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
          }

          await connection.commit();
          console.log(`${file} data imported successfully!`);

        } catch (error) {
          await connection.rollback();
          throw error;
        }
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

    await connection.query(`
      CREATE TABLE IF NOT EXISTS event_currencies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT NOT NULL,
        currency_id INT NOT NULL,
        date DATE NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id),
        FOREIGN KEY (currency_id) REFERENCES currencies(id)
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

async function createEventCurrencyRelationships() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'crypto_events'
    });

    const [events] = await connection.query('SELECT id, date FROM events');
    
    const [currencies] = await connection.query('SELECT id, Date FROM currencies');
    
    let relationshipCount = 0;
    
    for (const event of events) {
      const eventDate = new Date(event.date);
      const eventDateStr = eventDate.toISOString().split('T')[0];
      
      for (const currency of currencies) {
        const currencyDate = new Date(currency.Date);
        const currencyDateStr = currencyDate.toISOString().split('T')[0];
        
        if (eventDateStr === currencyDateStr) {
          try {
            await connection.query(
              'INSERT INTO event_currencies (event_id, currency_id, date) VALUES (?, ?, ?)',
              [event.id, currency.id, eventDate]
            );
            relationshipCount++;
          } catch (error) {
            if (error.code !== 'ER_DUP_ENTRY') {
              console.error('Error creating relationship:', error);
            }
          }
        }
      }
    }

    console.log(`Created ${relationshipCount} event-currency relationships successfully!`);
  } catch (error) {
    console.error('Error creating event-currency relationships:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

async function main() {
  try {
    console.log('Starting data import...');
    await importEvents();
    await importCurrencies();
    await createEventCurrenciesTable();
    await createEventCurrencyRelationships();
    console.log('All data imported successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  }
}

main();
