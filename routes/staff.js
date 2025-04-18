// 📁 File: routes/staff.js (bạn tạo mới file này trong backend)
const express = require('express');
const { google } = require('googleapis');
const auth = require('../config/auth'); // Đường dẫn nối với Google Sheets API auth

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SHEET_ID;
    const range = 'DULIEU!E2:E'; // Đọc cột E bắt đầu từ dòng 2

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    const result = rows.map(row => ({ 'Tên chuyên viên': row[0] })).filter(r => r['Tên chuyên viên']);

    res.json(result);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách chuyên viên:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
