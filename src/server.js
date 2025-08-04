const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { logger } = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
require('dotenv').config();

// Debug environment variables
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  MONGODB_URI: process.env.MONGODB_URI,
  PORT: process.env.PORT
});

// Import routes
const authRoutes = require('./routes/auth.routes');
const roomRoutes = require('./routes/room.routes');
const bookingRoutes = require('./routes/booking.routes');
const eventRoutes = require('./routes/event.routes');
const userRoutes = require('./routes/user.routes');
const banquetRoutes = require('./routes/banquet.routes');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
if (process.env.NODE_ENV !== 'test') {
  // Log the MongoDB URI to verify it's loaded correctly
  logger.info(`Attempting to connect to MongoDB at: ${process.env.MONGODB_URI}`);
  
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => logger.info('Connected to MongoDB'))
    .catch((err) => {
      logger.error('MongoDB connection error:', err);
      process.exit(1); // Exit if cannot connect to database
    });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/banquets', banquetRoutes);

// Error handling
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
}

module.exports = app; 