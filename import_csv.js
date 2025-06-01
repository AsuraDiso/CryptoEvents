const fs = require('fs');
const csv = require('csv-parser');
const pool = require('./db');

async function importCSV() {
  const results = [];
  fs.createReadStream('C:/Users/asura/Downloads/World Important Dates.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      const connection = await pool.getConnection();
      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS events (
            id INT AUTO_INCREMENT PRIMARY KEY,
            sl_no INT,
            name_of_incident VARCHAR(255),
            date VARCHAR(50),
            month VARCHAR(50),
            year VARCHAR(50),
            country VARCHAR(100),
            type_of_event VARCHAR(100),
            place_name VARCHAR(255),
            impact VARCHAR(255),
            affected_population VARCHAR(255),
            important_person_group VARCHAR(255),
            outcome VARCHAR(100)
          )
        `);

        for (const row of results) {
          await connection.query(
            `INSERT INTO events (
              sl_no, name_of_incident, date, month, year, country, type_of_event, place_name, impact, affected_population, important_person_group, outcome
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              row['Sl. No'],
              row['Name of Incident'],
              row['Date'],
              row['Month'],
              row['Year'],
              row['Country'],
              row['Type of Event'],
              row['Place Name'],
              row['Impact'],
              row['Affected Population'],
              row['Important Person/Group Responsible'],
              row['Outcome']
            ]
          );
        }
        console.log('CSV imported successfully!');
      } catch (error) {
        console.error('Error importing CSV:', error);
      } finally {
        connection.release();
      }
    });
}

importCSV(); 