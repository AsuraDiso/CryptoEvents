const express = require('express');
const router = express.Router();
const CryptoCurrency = require('../models/CryptoCurrency');

router.get('/', async (req, res) => {
  try {
    const data = await CryptoCurrency.findAll();
    res.json(data);
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:symbol', async (req, res) => {
  try {
    const data = await CryptoCurrency.findAll({
      where: {
        Symbol: req.params.symbol.toUpperCase()
      }
    });
    res.json(data);
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = await CryptoCurrency.create(req.body);
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = await CryptoCurrency.findByPk(req.params.id);
    if (!data) {
      return res.status(404).json({ message: 'Data not found' });
    }
    await data.update(req.body);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const data = await CryptoCurrency.findByPk(req.params.id);
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