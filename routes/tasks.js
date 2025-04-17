require('dotenv').config();
const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const moment = require('moment');

// Khởi tạo Google Sheets client với Service Account
const auth = new google.auth.JWT(
  process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  null,
  process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets']
);
const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_RANGE = 'QUANLY!A:L'; // Điều chỉnh theo sheet của bạn

// GET: Lấy tất cả tasks (không cần xác thực)
router.get('/', async (req, res) => {
  try {
    const { linhVuc, fromDate, toDate } = req.query;

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGE,
    });
    const rows = resp.data.values || [];
    if (!rows.length) return res.json([]);

    const headers = rows.shift();
    let tasksJson = rows.map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i] || '');
      return obj;
    });

    // Filter theo lĩnh vực
    if (linhVuc) {
      tasksJson = tasksJson.filter(t => t['Các lĩnh vực công tác']?.includes(linhVuc));
    }
    // Filter theo khoảng ngày hoàn thành
    if (fromDate && toDate) {
      const start = moment(fromDate, 'YYYY-MM-DD');
      const end = moment(toDate, 'YYYY-MM-DD');
      tasksJson = tasksJson.filter(t => {
        const d = moment(t['Thời gian hoàn thành'], ['DD/MM/YYYY','D/M/YYYY','YYYY-MM-DD']);
        return d.isValid() && d.isBetween(start, end, 'day', '[]');
      });
    }

    res.json(tasksJson);
  } catch (err) {
    console.error('Lỗi lấy dữ liệu tasks:', err);
    res.status(500).json({ error: 'Không thể lấy dữ liệu', details: err.message });
  }
});

// POST: Thêm mới task
router.post('/add', async (req, res) => {
  try {
    const { tenCongViec, linhVuc, thoiGianHoanThanh } = req.body;
    // Validate
    if (!tenCongViec || !linhVuc || !thoiGianHoanThanh) {
      return res.status(400).json({
        error: 'Thiếu thông tin bắt buộc',
        requiredFields: ['tenCongViec', 'linhVuc', 'thoiGianHoanThanh']
      });
    }
    if (!moment(thoiGianHoanThanh, ['DD/MM/YYYY','D/M/YYYY','YYYY-MM-DD'], true).isValid()) {
      return res.status(400).json({ error: 'Định dạng ngày không hợp lệ' });
    }

    // Fetch headers để xác định vị trí cột
    const sheetResp = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: SHEET_RANGE });
    const headers = sheetResp.data.values[0] || [];
    // Xây row mới dựa theo headers
    const newRow = headers.map(h => {
      if (h === 'Tên công việc') return tenCongViec;
      if (h === 'Các lĩnh vực công tác') return linhVuc;
      if (h === 'Thời gian hoàn thành') return thoiGianHoanThanh;
      return '';
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: SHEET_RANGE,
      valueInputOption: 'RAW',
      resource: { values: [newRow] }
    });
    res.status(201).json({ success: true, message: 'Đã thêm task' });
  } catch (err) {
    console.error('Lỗi thêm task:', err);
    res.status(500).json({ error: 'Không thể thêm task', details: err.message });
  }
});

// GET: Tasks sắp đến hạn
router.get('/upcoming', async (req, res) => {
  try {
    const sheetResp = await sheets.spreadsheets.values.get({ spreadsheetId: SPREADSHEET_ID, range: SHEET_RANGE });
    const rows = sheetResp.data.values || [];
    if (rows.length < 2) return res.json([]);

    const headers = rows[0];
    const dataRows = rows.slice(1);
    const idxName = headers.indexOf('Tên công việc');
    const idxLinhVuc = headers.indexOf('Các lĩnh vực công tác');
    const idxTime = headers.indexOf('Thời gian hoàn thành');

    if (idxName < 0 || idxLinhVuc < 0 || idxTime < 0) {
      return res.status(400).json({ error: 'Thiếu cột bắt buộc trong sheet' });
    }

    const upcoming = dataRows.filter(r => {
      const deadline = moment(r[idxTime], ['DD/MM/YYYY','D/M/YYYY','YYYY-MM-DD'], true);
      return deadline.isValid() && deadline.diff(moment(), 'days') >= 0 && deadline.diff(moment(), 'days') <= 7;
    }).map(r => ({
      tenCongViec: r[idxName] || '',
      linhVuc: r[idxLinhVuc] || '',
      thoiGianHoanThanh: r[idxTime] || ''
    }));

    res.json(upcoming);
  } catch (err) {
    console.error('Lỗi lấy upcoming:', err);
    res.status(500).json({ error: 'Không thể lấy dữ liệu upcoming', details: err.message });
  }
});

module.exports = router;
