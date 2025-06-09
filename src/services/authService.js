const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ValidationError } = require('sequelize');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const authService = {
  async createUser(username, password, role = 'user') {
    try {
      const user = await User.create({
        username,
        password,
        role
      });
      return user;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new Error('Validation error: ' + error.message);
      }
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Error('Username already exists');
      }
      throw new Error('Error creating user: ' + error.message);
    }
  },

  async login(username, password) {
    try {
      const user = await User.findOne({ where: { username } });
      if (!user) {
        throw new Error('User not found');
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new Error('Invalid password');
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return {
        token,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      };
    } catch (error) {
      if (error.message === 'User not found' || error.message === 'Invalid password') {
        throw error;
      }
      throw new Error('Login failed: ' + error.message);
    }
  },

  async createAdminUser(username, password) {
    return this.createUser(username, password, 'admin');
  }
};

module.exports = authService; 