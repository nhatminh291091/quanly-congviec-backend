const { google } = require('googleapis');

// Đọc biến môi trường
const serviceEmail  = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
const spreadsheetId = process.env.SPREADSHEET_ID;

if (!serviceEmail || !privateKeyRaw || !spreadsheetId) {
  console.error('Missing Google Sheets API env vars.');
  throw new Error('Missing configuration for Google Sheets API');
}

// Xử lý private key (thay '\\n' thành xuống dòng)
const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

// Khởi tạo JWT client
const auth = new google.auth.JWT(
  serviceEmail,
  null,
  privateKey,
  ['https://www.googleapis.com/auth/spreadsheets']
);
const sheets = google.sheets({ version: 'v4', auth });

// Hàm generic đọc giá trị từ sheet
async function getSheetValues(range) {
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return resp.data.values || [];
}

// Hàm generic append giá trị
async function appendSheetValues(range, values) {
  return sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  });
}

// Hàm generic update giá trị
async function updateSheetValues(range, values) {
  return sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  });
}

module.exports = {
  // Các hàm lấy dữ liệu
  getDataSheet:       () => getSheetValues('Dữ liệu!A:F'),
  getManagementSheet: () => getSheetValues('Quản lý!A:L'),
  getReportsSheet:    () => getSheetValues('Báo cáo!A:L'),
  getPlansSheet:      () => getSheetValues('Kế hoạch!A:L'),

  // Các hàm thêm dòng
  addTaskToManagement: (rowArray) => appendSheetValues('Quản lý!A:L', [rowArray]),
  addTaskToReports:    (rowArray) => appendSheetValues('Báo cáo!A:L', [rowArray]),
  addTaskToPlans:      (rowArray) => appendSheetValues('Kế hoạch!A:L', [rowArray]),

  // Cập nhật thông tin báo cáo
  updateTaskInReports: async (taskId, updates) => {
    const data = await getSheetValues('Báo cáo!A:L');
    const headers = data[0] || [];
    // Tìm hàng có ID tương ứng
    const rowIdx = data.findIndex((r, i) => i > 0 && r[0] == taskId);
    if (rowIdx < 1) {
      throw new Error(`Task ${taskId} not found in Báo cáo sheet`);
    }
    const sheetRow = data[rowIdx];
    const startRow = rowIdx + 1; // 1-based
    const range = `Báo cáo!H${startRow}:L${startRow}`;

    // Sử dụng || thay vì ?? để tránh SyntaxError
    const values = [[
      updates.description   || sheetRow[7]  || '',
      updates.evaluation    || sheetRow[8]  || '',
      updates.issues        || sheetRow[9]  || '',
      updates.completionDate|| sheetRow[10] || '',
      updates.suggestions   || sheetRow[11] || ''
    ]];

    return updateSheetValues(range, values);
  },

  // Lấy role user
  getUserRole: async (email) => {
    const data = await getSheetValues('Dữ liệu!A:F');
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[3] === email) return { role: 'manager', name: row[2] };
      if (row[5] === email) return { role: 'specialist', name: row[4] };
    }
    return null;
  }
};
