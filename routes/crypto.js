const express = require('express');
const router = express.Router();
const { cryptoDb } = require('../config/database');
const CryptoCurrency = require('../models/CryptoCurrency');

// GET all currencies and their data
router.get('/', async (req, res) => {
  try {
    // Get list of all tables (currencies)
    const [tables] = await cryptoDb.query('SHOW TABLES');
    
    // Fetch data from each currency table
    const currenciesData = {};
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      const CryptoModel = CryptoCurrency.init(tableName);
      const data = await CryptoModel.findAll();
      currenciesData[tableName] = data;
    }
    
    res.json(currenciesData);
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET specific currency data
router.get('/:currency', async (req, res) => {
  try {
    const currency = req.params.currency.toLowerCase();
    const CryptoModel = CryptoCurrency.init(currency);
    const data = await CryptoModel.findAll();
    if (data.length === 0) {
      return res.status(404).json({ message: 'Currency not found' });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST new data for a specific currency
router.post('/:currency', async (req, res) => {
  const currency = req.params.currency.toLowerCase();
  try {
    const CryptoModel = CryptoCurrency.init(currency);
    const data = await CryptoModel.create(req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update data for a specific currency
router.put('/:currency/:id', async (req, res) => {
  const currency = req.params.currency.toLowerCase();
  try {
    const CryptoModel = CryptoCurrency.init(currency);
    const data = await CryptoModel.findByPk(req.params.id);
    if (!data) {
      return res.status(404).json({ message: 'Data not found' });
    }
    await data.update(req.body);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE data for a specific currency
router.delete('/:currency/:id', async (req, res) => {
  const currency = req.params.currency.toLowerCase();
  try {
    const CryptoModel = CryptoCurrency.init(currency);
    const data = await CryptoModel.findByPk(req.params.id);
    if (!data) {
      return res.status(404).json({ message: 'Data not found' });
    }
    await data.destroy();
    res.json({ message: 'Data deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 