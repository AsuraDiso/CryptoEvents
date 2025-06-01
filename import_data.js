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
    
    await concurrentConnection.query('UPDATE events SET name_of_incident = "Updated Event" WHERE sl_no = 1');
    
    const [updatedData] = await connection.query('SELECT * FROM events WHERE sl_no = 1');
    console.log('Read after concurrent update:', updatedData[0]);
    
    await connection.commit();
    await concurrentConnection.end();
    
    console.log('\nDemonstrating SERIALIZABLE isolation level:');
    await connection.query('SET SESSION TRANSACTION ISOLATION LEVEL SERIALIZABLE');
    
    await connection.beginTransaction();
    
    await connection.query('SELECT * FROM events WHERE sl_no IN (1, 2) FOR UPDATE');
    
    const concurrentConnection2 = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'crypto_events'
    });
    
    try {
      await concurrentConnection2.query('UPDATE events SET name_of_incident = "Blocked Update" WHERE sl_no = 1');
      console.log('Concurrent update succeeded (should not happen in SERIALIZABLE)');
    } catch (error) {
      console.log('Concurrent update blocked (expected in SERIALIZABLE):', error.message);
    }
    
    await connection.commit();
    await concurrentConnection2.end();
    
    console.log('\nDemonstrating REPEATABLE READ isolation level:');
    await connection.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    
    await connection.beginTransaction();
    
    const [firstRead] = await connection.query('SELECT * FROM events WHERE sl_no = 1');
    console.log('First read:', firstRead[0]);
    
    const concurrentConnection3 = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'crypto_events'
    });
    
    await concurrentConnection3.query('UPDATE events SET name_of_incident = "Changed in REPEATABLE READ" WHERE sl_no = 1');
    
    const [secondRead] = await connection.query('SELECT * FROM events WHERE sl_no = 1');
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
        sl_no INT PRIMARY KEY,
        name_of_incident VARCHAR(255) NOT NULL,
        date VARCHAR(50),
        month VARCHAR(50),
        year VARCHAR(50),
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
      for (const row of results) {
        const values = [
          row.sl_no,
          row.name_of_incident,
          row.date,
          row.month,
          row.year,
          row.country,
          row.type_of_event,
          row.place_name,
          row.impact,
          row.affected_population,
          row.important_person_group,
          row.outcome
        ].map(val => val === undefined ? null : val);

        await connection.query(
          `INSERT INTO events (
            sl_no, name_of_incident, date, month, year, country,
            type_of_event, place_name, impact, affected_population,
            important_person_group, outcome
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            name_of_incident=VALUES(name_of_incident),
            date=VALUES(date),
            month=VALUES(month),
            year=VALUES(year),
            country=VALUES(country),
            type_of_event=VALUES(type_of_event),
            place_name=VALUES(place_name),
            impact=VALUES(impact),
            affected_population=VALUES(affected_population),
            important_person_group=VALUES(important_person_group),
            outcome=VALUES(outcome)`,
          values
        );
      }

      await connection.commit();
      console.log('Events data imported successfully!');

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
      database: 'crypto_coins'
    });

    const currencyDir = path.join(__dirname, 'data', 'currency');
    const files = fs.readdirSync(currencyDir);

    for (const file of files) {
      if (file.endsWith('.csv')) {
        const currencyName = path.basename(file, '.csv');
        console.log(`Importing ${currencyName}...`);

        await connection.beginTransaction();

        try {
          await connection.query(`
            CREATE TABLE IF NOT EXISTS ${currencyName} (
              SNo INT PRIMARY KEY,
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
              row.SNo,
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
              `INSERT INTO ${currencyName} (
                SNo, Name, Symbol, Date, Close, High, Low, Open, Volume, Marketcap
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE
                Name=VALUES(Name),
                Symbol=VALUES(Symbol),
                Date=VALUES(Date),
                Close=VALUES(Close),
                High=VALUES(High),
                Low=VALUES(Low),
                Open=VALUES(Open),
                Volume=VALUES(Volume),
                Marketcap=VALUES(Marketcap)`,
              values
            );
          }

          await connection.commit();
          console.log(`${currencyName} data imported successfully!`);

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

async function main() {
  try {
    console.log('Starting data import...');
    await importEvents();
    await importCurrencies();
    console.log('All data imported successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  }
}

main();
