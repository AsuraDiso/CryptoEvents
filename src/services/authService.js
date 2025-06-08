const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const authService = {
  async createUser(username, password, role = 'user') {
    try {
      const user = new User({
        username,
        password,
        role
      });
      await user.save();
      return user;
    } catch (error) {
      throw new Error('Error creating user: ' + error.message);
    }
  },

  async login(username, password) {
    try {
      const user = await User.findOne({ username });
      if (!user) {
        throw new Error('User not found');
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        throw new Error('Invalid password');
      }

      const token = jwt.sign(
        { id: user._id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return {
        token,
        user: {
          id: user._id,
          username: user.username,
          role: user.role
        }
      };
    } catch (error) {
      throw new Error('Login failed: ' + error.message);
    }
  },

  async createAdminUser(username, password) {
    return this.createUser(username, password, 'admin');
  }
};

module.exports = authService; 