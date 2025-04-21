require('dotenv').config();
const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const moment = require('moment');

// 🌐 Đảm bảo biến môi trường quan trọng
const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
const spreadsheetId = process.env.SPREADSHEET_ID;
if (!serviceEmail || !privateKeyRaw || !spreadsheetId) {
  console.error('Thiếu biến môi trường: GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY hoặc SPREADSHEET_ID');
  throw new Error('Thiếu cấu hình Google Sheets API.');
}

// Xử lý private key đúng định dạng (thay chuỗi "\\n" thành line break)
const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

// Khởi tạo Google Sheets client với Service Account
const auth = new google.auth.JWT(
  serviceEmail,
  null,
  privateKey,
  ['https://www.googleapis.com/auth/spreadsheets']
);
const sheets = google.sheets({ version: 'v4', auth });
const SHEET_RANGE = 'QUANLY!A:L'; // Điều chỉnh vùng dữ liệu

// GET: Lấy tất cả tasks
router.get('/', async (req, res) => {
  try {
    const { linhVuc, fromDate, toDate } = req.query;
    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range: SHEET_RANGE });
    const rows = resp.data.values || [];
    if (!rows.length) return res.json([]);

    const headers = rows.shift();
    let tasksJson = rows.map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i] || '');
      return obj;
    });

    // Filter
    if (linhVuc) tasksJson = tasksJson.filter(t => t['Các lĩnh vực công tác']?.includes(linhVuc));
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

    // Nếu có thoiGianHoanThanh thì kiểm tra định dạng
    if (thoiGianHoanThanh && !moment(thoiGianHoanThanh, ['DD/MM/YYYY', 'D/M/YYYY', 'YYYY-MM-DD'], true).isValid()) {
      return res.status(400).json({ error: 'Định dạng ngày không hợp lệ' });
    }

    const sheetResp = await sheets.spreadsheets.values.get({ spreadsheetId, range: SHEET_RANGE });
    const headers = sheetResp.data.values[0] || [];

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


// GET: Tasks sắp đến hạn
router.get('/upcoming', async (req, res) => {
  try {
    const sheetResp = await sheets.spreadsheets.values.get({ spreadsheetId, range: SHEET_RANGE });
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
router.post('/update-bao-cao', async (req, res) => {
  try {
    const { tenCongViec, moTa, tonTai, thoiGian, deXuat, danhGia } = req.body;
    if (!tenCongViec) {
      return res.status(400).json({ error: 'Thiếu tên công việc' });
    }

    const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range: SHEET_RANGE });
    const rows = resp.data.values || [];
    const headers = rows[0];
    const data = rows.slice(1);

    const idx = data.findIndex(r => r[headers.indexOf('Tên công việc')]?.trim() === tenCongViec.trim());
    if (idx === -1) return res.status(404).json({ error: 'Không tìm thấy công việc' });

    const rowNumber = idx + 2; // +1 vì header, +1 vì bắt đầu từ hàng 1

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
      const colLetter = String.fromCharCode(65 + colIndex); // A=65
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

module.exports = router;
