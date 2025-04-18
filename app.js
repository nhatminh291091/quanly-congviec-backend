const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const reportRoutes = require('./routes/reports');
const sheetRoutes = require('./routes/sheets');
const statisticRoutes = require('./routes/statistics');
const staffRoutes = require('./routes/staff');
const app = express();

// Middleware
app.use(cors({ 
origin: 'https://quanly-congviec-frontend.vercel.app',
methods: ['GET','POST','PUT','DELETE','OPTIONS'],
allowedHeaders:['Content-Type','Authorization']
}));
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/sheets', sheetRoutes);
app.use('/api/statistics', statisticRoutes);
app.use('/api/staff', staffRoutes);
// Serve static files in production
// if (process.env.NODE_ENV === 'production') {
//   app.use(express.static(path.join(__dirname, '../client/build')));
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
//   });
// }

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
