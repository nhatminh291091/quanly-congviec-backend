const { google } = require('googleapis');

// Đọc biến môi trường
const serviceEmail    = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKeyRaw   = process.env.GOOGLE_PRIVATE_KEY;
const spreadsheetId    = process.env.SPREADSHEET_ID;

if (!serviceEmail || !privateKeyRaw || !spreadsheetId) {
  console.error('Missing Google Sheets API env vars.');
  throw new Error('Missing configuration for Google Sheets API');
}

// Thay các chuỗi \\nconst privateKey = privateKeyRaw.replace(/\\n/g, '\n');

// Khởi tạo JWT auth client
const auth = new google.auth.JWT(
  serviceEmail,
  null,
  privateKey,
  ['https://www.googleapis.com/auth/spreadsheets']
);
const sheets = google.sheets({ version: 'v4', auth });

// Generic: đọc values từ range
async function getSheetValues(range) {
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  return resp.data.values || [];
}

// Generic: append values (values dạng Array<Array>)
async function appendSheetValues(range, values) {
  return sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  });
}

// Generic: update values (values dạng Array<Array>)
async function updateSheetValues(range, values) {
  return sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: { values },
  });
}

module.exports = {
  // Lấy dữ liệu các sheet
  getDataSheet:     () => getSheetValues('Dữ liệu!A:F'),
  getManagementSheet: () => getSheetValues('Quản lý!A:L'),
  getReportsSheet:    () => getSheetValues('Báo cáo!A:L'),
  getPlansSheet:      () => getSheetValues('Kế hoạch!A:L'),

  // Thêm dữ liệu vào các sheet
  addTaskToManagement: (rowArray) => appendSheetValues('Quản lý!A:L', [rowArray]),
  addTaskToReports:    (rowArray) => appendSheetValues('Báo cáo!A:L', [rowArray]),
  addTaskToPlans:      (rowArray) => appendSheetValues('Kế hoạch!A:L', [rowArray]),

  // Cập nhật báo cáo trong Reports sheet
  updateTaskInReports: async (taskId, updates) => {
    const data = await getSheetValues('Báo cáo!A:L');
    const headers = data[0] || [];
    // Tìm row index (1-based trong Sheets)
    let rowIdx = data.findIndex((r, i) => i > 0 && r[0] == taskId);
    if (rowIdx < 1) {
      throw new Error(`Task ${taskId} not found in Báo cáo sheet`);
    }
    const sheetRow = data[rowIdx];
    // Xác định vùng H:L của hàng đó
    const startRow = rowIdx + 1; // do data index bắt đầu 0
    const range = `Báo cáo!H${startRow}:L${startRow}`;
    const values = [[
      updates.description  ?? sheetRow[7] || '',
      updates.evaluation   ?? sheetRow[8] || '',
      updates.issues       ?? sheetRow[9] || '',
      updates.completionDate ?? sheetRow[10] || '',
      updates.suggestions  ?? sheetRow[11] || ''
    ]];
    return updateSheetValues(range, values);
  },

  // Xác định role user theo email
  getUserRole: async (email) => {
    const data = await getSheetValues('Dữ liệu!A:F');
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[3] === email) {
        return { role: 'manager', name: row[2] };
      }
      if (row[5] === email) {
        return { role: 'specialist', name: row[4] };
      }
    }
    return null;
  }
};
