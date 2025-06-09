const authService = require('../services/authService');

const authController = {
  async register(req, res) {
    try {
      const { username, password } = req.body;
      const user = await authService.createUser(username, password);
      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user._id,
          username: user.username,
          role: user.role
        }
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },

  async login(req, res) {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);
      res.json(result);
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  },

  async createAdmin(req, res) {
    try {
      const { username, password } = req.body;
      const admin = await authService.createAdminUser(username, password);
      res.status(201).json({
        message: 'Admin user created successfully',
        user: {
          id: admin._id,
          username: admin.username,
          role: admin.role
        }
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

module.exports = authController; 