// 📁 utils/sheetReader.js
const { google } = require('googleapis');
const sheets = google.sheets('v4');

const SHEET_ID = '1V4vduiq2a2zL020mWmd1MSFoknfL2XLTSOdD0c2dPoI';
const DULIEU_RANGE = 'DULIEU!E2:E';

async function authorize() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return await auth.getClient();
}

async function getChuyenVienList() {
  const authClient = await authorize();
  const response = await sheets.spreadsheets.values.get({
    auth: authClient,
    spreadsheetId: SHEET_ID,
    range: DULIEU_RANGE,
  });

  const rows = response.data.values || [];
  const chuyenVien = [...new Set(rows.flat().filter(name => !!name && name.trim() !== ''))];
  return chuyenVien;
}

module.exports = {
  getChuyenVienList,
};
