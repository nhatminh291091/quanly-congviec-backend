const express = require('express');
const router = express.Router();
const authService = require('../services/authService');

// Get Google auth URL
router.get('/google', (req, res) => {
  try {
    const url = authService.getGoogleAuthUrl();
    res.json({ url });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authentication URL' });
  }
});

// Handle Google callback
router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const result = await authService.handleGoogleCallback(code);
    
    // In a real implementation, you might redirect to frontend with token
    res.json(result);
  } catch (error) {
    console.error('Error in Google callback:', error);
    res.status(401).json({ error: error.message || 'Authentication failed' });
  }
});

// Get current user info
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = authService.verifyToken(token);
    res.json({ user: decoded.user });
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  // In a real implementation, you might invalidate the token
  // For now, just return success (client will remove token)
  res.json({ success: true, message: 'Logged out successfully' });
});

// Nhận googleToken từ frontend và trả về { user, token }
router.post('/auth/google', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token từ Google không được cung cấp.' });
  }

  try {
    const result = await authService.handleGoogleCallback(token); // xử lý Google token
    res.json(result); // result = { user, token }
  } catch (error) {
    console.error('Lỗi xác thực Google:', error.message);
    res.status(401).json({ error: 'Xác thực Google thất bại' });
  }
});

module.exports = router;
