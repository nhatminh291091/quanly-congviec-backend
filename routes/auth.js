const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Fake user database (replace with real database)
const users = [
  { username: 'admin', password: 'password' },
];

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  }

  const token = jwt.sign({ username }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  });

  res.json({ success: true, token });
});

module.exports = router;