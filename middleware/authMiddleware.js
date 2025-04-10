const jwt = require('jsonwebtoken');
const authService = require('../services/authService');

// Authentication middleware (tùy chọn token)
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Nếu không có token thì bỏ qua xác thực và tiếp tục
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('⚠️ Không có token, tiếp tục không xác thực');
      return next(); // ← Cho phép tiếp tục không cần token
    }

    const token = authHeader.split(' ')[1];
    const decoded = authService.verifyToken(token);

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
