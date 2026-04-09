const express = require('express');
const cors = require('cors');
const path = require('path');

// Ensure db directory exists
const fs = require('fs');
const dbDir = path.join(__dirname, 'db');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const slotsRouter = require('./routes/slots');
const bookingsRouter = require('./routes/bookings');

app.use('/api/slots', slotsRouter);
app.use('/api/bookings', bookingsRouter);

/**
 * @api {get} / API Health Check
 * @apiName HealthCheck
 * @apiGroup General
 * @apiVersion 1.0.0
 *
 * @apiSuccess {String} message Welcome message
 * @apiSuccess {String} status API status
 * @apiSuccess {String} version API version
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to SmartPark API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      slots: '/api/slots',
      bookings: '/api/bookings'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server (only if not in test mode)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚗 SmartPark API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
