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

// ... các route khác giữ nguyên

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

module.exports = router;
