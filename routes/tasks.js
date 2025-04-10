const express = require('express');
const axios = require('axios');
require('dotenv').config();

const router = express.Router();

router.get('/all', async (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const sheetName = 'QUANLY';

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}?key=${apiKey}`;
    const response = await axios.get(url);
    const rows = response.data.values;

    if (!rows || rows.length < 2) {
      return res.json([]);
    }

    const headers = rows[0];
    const data = rows.slice(1).map((row, index) => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] || '';
      });
      obj.STT = index + 1;
      return obj;
    });

    res.json(data);
  } catch (error) {
    console.error('Lỗi khi truy cập Google Sheets:', error.message);
    res.status(500).json({ message: 'Lỗi khi truy cập dữ liệu từ Google Sheets' });
  }
});

module.exports = router;
