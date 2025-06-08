const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateJWT, requireAdmin } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes (admin only)
router.post('/admin', authenticateJWT, requireAdmin, authController.createAdmin);

module.exports = router; 