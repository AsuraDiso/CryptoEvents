const { cryptoDb } = require('./database');
const User = require('../models/User');

const initDatabase = async () => {
  try {
    // Sync all models with the database
    await cryptoDb.sync({ alter: true });
    console.log('Database synchronized successfully');

    // Check if admin user exists
    const adminExists = await User.findOne({
      where: { username: 'admin' }
    });

    if (!adminExists) {
      try {
        // Create default admin user
        await User.create({
          username: 'admin',
          password: 'admin123', // This will be hashed by the model hook
          role: 'admin'
        });
        console.log('Default admin user created');
      } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          console.log('Admin user already exists');
        } else {
          throw error;
        }
      }
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    // Don't exit the process, just log the error
    console.log('Continuing with application startup...');
  }
};

module.exports = initDatabase; 