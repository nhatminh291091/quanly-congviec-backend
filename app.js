const express = require('express');
const cors = require('cors');
const helmet = required('helmet');

const app = express();

const allowedOrigins = ['https://quanly-congviec-frontend.vercel.app'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));


// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS
app.use(morgan('dev')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/statistics', statisticsRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
//  app.use(express.static(path.join(__dirname, '../client/build')));
  
//  app.get('*', (req, res) => {
//    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
//  });
}

// Error handling middleware
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

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


module.exports = app;
