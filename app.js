const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');

// 👉 Import routes
const authRoutes = require('./routes/auth');
const tasksRoutes = require('./routes/tasks');
const reportsRoutes = require('./routes/reports');
const sheetsRoutes = require('./routes/sheets');
const statisticsRoutes = require('./routes/statistics');

const app = express();

// 👉 CORS cấu hình theo Vercel frontend
const cors = require('cors');

app.use(cors({
  origin: ['https://quanly-congviec-frontend.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));


// 👉 Middleware chung
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 👉 API routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/statistics', statisticsRoutes);

// 👉 Error handler (giữ nguyên để log khi gặp lỗi)
app.use((err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});

// 👉 Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

module.exports = app;
