const express = require('express');
const router = express.Router();
const SheetReader = require('../utils/sheetReader');

router.get('/', async (req, res) => {
  try {
    const reader = new SheetReader(process.env.SHEET_ID, 'DULIEU'); // tên sheet phải đúng chính tả
    const data = await reader.read();
    res.json(data);
  } catch (err) {
    console.error("❌ Lỗi staff:", err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
module.exports = router;
