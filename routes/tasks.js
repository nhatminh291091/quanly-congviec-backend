require('dotenv').config();
const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const moment = require('moment');

const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
const spreadsheetId = process.env.SPREADSHEET_ID;
if (!serviceEmail || !privateKeyRaw || !spreadsheetId) {
  console.error('Thiếu biến môi trường: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY hoặc SPREADSHEET_ID');
  throw new Error('Thiếu cấu hình Google Sheets API.');
}

const privateKey = privateKeyRaw.replace(/\n/g, '\n');
const auth = new google.auth.JWT(serviceEmail, null, privateKey, ['https://www.googleapis.com/auth/spreadsheets']);
const sheets = google.sheets({ version: 'v4', auth });
const SHEET_RANGE = 'QUANLY!A:L';

// GET: Lấy tất cả công việc
router.get('/', async (req, res) => {
  try {
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range: SHEET_RANGE });
    const rows = resp.data.values || [];
    if (!rows.length) return res.json([]);

    const headers = rows[0];
    const data = rows.slice(1);
    const tasksJson = data.map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i] || '');
      return obj;
    });

    res.json(tasksJson);
  } catch (err) {
    console.error('Lỗi lấy tasks:', err);
    res.status(500).json({ error: 'Không thể lấy tasks', details: err.message });
  }
});

// POST: Thêm công việc mới
router.post('/add', async (req, res) => {
  try {
    const {
      tenCongViec,
      linhVuc,
      tienDo,
      chuTri,
      thoiGianHoanThanh,
      nguoiThucHien
    } = req.body;

    if (!tenCongViec || !linhVuc || !tienDo || !chuTri || !nguoiThucHien || !nguoiThucHien.length) {
      return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
    }

    if (thoiGianHoanThanh && !moment(thoiGianHoanThanh, ['DD/MM/YYYY', 'D/M/YYYY', 'YYYY-MM-DD'], true).isValid()) {
      return res.status(400).json({ error: 'Định dạng ngày không hợp lệ' });
    }

    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range: SHEET_RANGE });
    const headers = resp.data.values[0];

    const newRow = headers.map(h => {
      if (h === 'Tên công việc') return tenCongViec;
      if (h === 'Các lĩnh vực công tác') return linhVuc;
      if (h === 'Tiến độ') return tienDo;
      if (h === 'Người chủ trì') return chuTri;
      if (h === 'Người thực hiện') return nguoiThucHien.join('; ');
      if (h === 'Thời gian hoàn thành') return thoiGianHoanThanh || '';
      return '';
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
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

// POST: Cập nhật báo cáo
router.post('/update-bao-cao', async (req, res) => {
  try {
    const { tenCongViec, tienDo, moTa, tonTai, thoiGian, deXuat, danhGia } = req.body;
    if (!tenCongViec || !tienDo) {
      return res.status(400).json({ error: 'Thiếu tên công việc hoặc tiến độ' });
    }

    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range: SHEET_RANGE });
    const rows = resp.data.values || [];
    const headers = rows[0];
    const data = rows.slice(1);

    const idx = data.findIndex(r =>
      r[headers.indexOf('Tên công việc')]?.trim() === tenCongViec.trim() &&
      r[headers.indexOf('Tiến độ')]?.trim() === tienDo.trim()
    );

    if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy công việc phù hợp' });
    const rowNumber = idx + 2;

    const updates = {
      'Mô tả kết quả thực hiện': moTa,
      'Tồn tại, nguyên nhân': tonTai,
      'Thời gian hoàn thành': thoiGian,
      'Đề xuất, kiến nghị': deXuat,
      'Đánh giá kết quả': danhGia
    };

    const requests = Object.entries(updates).map(([field, value]) => {
      const colIndex = headers.indexOf(field);
      if (colIndex === -1) return null;
      const colLetter = String.fromCharCode(65 + colIndex);
      return {
        range: `${SHEET_RANGE.split('!')[0]}!${colLetter}${rowNumber}`,
        values: [[value || '']]
      };
    }).filter(r => r !== null);

    for (const r of requests) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: r.range,
        valueInputOption: 'RAW',
        resource: { values: r.values }
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Lỗi cập nhật báo cáo:', err);
    res.status(500).json({ error: 'Lỗi khi cập nhật báo cáo', details: err.message });
  }
});

// GET: Tasks sắp đến hạn
router.get('/upcoming', async (req, res) => {
  try {
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range: SHEET_RANGE });
    const rows = resp.data.values || [];
    if (rows.length < 2) return res.json([]);

    const headers = rows[0];
    const data = rows.slice(1);
    const idxTime = headers.indexOf('Thời gian hoàn thành');
    const idxName = headers.indexOf('Tên công việc');
    const idxLinhVuc = headers.indexOf('Các lĩnh vực công tác');

    const result = data.filter(r => {
      const d = moment(r[idxTime], ['DD/MM/YYYY', 'D/M/YYYY', 'YYYY-MM-DD'], true);
      return d.isValid() && d.diff(moment(), 'days') >= 0 && d.diff(moment(), 'days') <= 7;
    }).map(r => ({
      tenCongViec: r[idxName] || '',
      linhVuc: r[idxLinhVuc] || '',
      thoiGianHoanThanh: r[idxTime] || ''
    }));

    res.json(result);
  } catch (err) {
    console.error('Lỗi lấy upcoming:', err);
    res.status(500).json({ error: 'Không thể lấy dữ liệu upcoming', details: err.message });
  }
});

module.exports = router;
