const express = require('express');
const { google } = require('googleapis');

const router = express.Router();

const SHEET_ID = '1tWe-mgOrE8aKHXzbh6verCvosERwf1XvFwBdP5pxaTU';
const SHEET_NAME = 'TONGHOP';

// Lấy dữ liệu từ Google Sheet
router.get('/', async (req, res) => {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1:Z`, // giới hạn cho đủ cột
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) return res.json([]);

    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const entry = {};
      headers.forEach((header, i) => {
        entry[header.trim().toLowerCase()] = row[i]?.trim();
      });
      return entry;
    });

    // Chuẩn hoá cột cần thiết
    const mapped = data.map(item => ({
      cap: item['cấp văn bản'] || '',
      ten: item['tên văn bản'] || '',
      mota: item['mô tả'] || '',
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Lỗi khi truy cập sheet TONGHOP:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
