const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');

// Create OAuth2 client
const createOAuth2Client = () => {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
};

// Get Google Sheets API client
const getSheetsClient = async (accessToken) => {
  const oauth2Client = createOAuth2Client();
  
  // Set credentials
  oauth2Client.setCredentials({
    access_token: accessToken
  });
  
  // Create sheets API client
  return google.sheets({ version: 'v4', auth: oauth2Client });
};

// Get data from Google Sheet
const getSheetData = async (accessToken, range) => {
  try {
    const sheets = await getSheetsClient(accessToken);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: range
    });
    
    return response.data.values;
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
};

// Update data in Google Sheet
const updateSheetData = async (accessToken, range, values) => {
  try {
    const sheets = await getSheetsClient(accessToken);
    
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: values
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error updating sheet data:', error);
    throw error;
  }
};

// Append data to Google Sheet
const appendSheetData = async (accessToken, range, values) => {
  try {
    const sheets = await getSheetsClient(accessToken);
    
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: values
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error appending sheet data:', error);
    throw error;
  }
};

// Get data from Data sheet
const getDataSheet = async (accessToken) => {
  return getSheetData(accessToken, 'Dữ liệu!A:F');
};

// Get data from Management sheet
const getManagementSheet = async (accessToken) => {
  return getSheetData(accessToken, 'Quản lý!A:L');
};

// Get data from Reports sheet
const getReportsSheet = async (accessToken) => {
  return getSheetData(accessToken, 'Báo cáo!A:L');
};

// Get data from Plans sheet
const getPlansSheet = async (accessToken) => {
  return getSheetData(accessToken, 'Kế hoạch!A:L');
};

// Add task to Management sheet
const addTaskToManagement = async (accessToken, task) => {
  // Get current tasks to determine next row number
  const currentTasks = await getManagementSheet(accessToken);
  const nextRow = currentTasks.length + 1;
  
  // Format task data for sheet
  const taskData = [
    [
      nextRow - 1, // TT (index)
      task.field, // Lĩnh vực công tác
      task.title, // Tên công việc
      task.deadline, // Tiến độ
      task.manager, // Người chủ trì
      task.assignees.join(', '), // Người thực hiện
      task.collaborators.join(', '), // Đơn vị phối hợp
      task.description || '', // Mô tả kết quả thực hiện
      task.evaluation || '', // Đánh giá kết quả
      task.issues || '', // Tồn tại, nguyên nhân
      task.completionDate || '', // Thời gian hoàn thành
      task.suggestions || '' // Đề xuất, kiến nghị
    ]
  ];
  
  // Append to sheet
  return appendSheetData(accessToken, 'Quản lý!A:L', taskData);
};

// Add task to Reports sheet
const addTaskToReports = async (accessToken, task) => {
  // Format task data for sheet
  const taskData = [
    [
      task.id, // TT (index)
      task.field, // Lĩnh vực công tác
      task.title, // Tên công việc
      task.deadline, // Tiến độ
      task.manager, // Người chủ trì
      task.assignees.join(', '), // Người thực hiện
      task.collaborators.join(', '), // Đơn vị phối hợp
      task.description || '', // Mô tả kết quả thực hiện
      task.evaluation || '', // Đánh giá kết quả
      task.issues || '', // Tồn tại, nguyên nhân
      task.completionDate || '', // Thời gian hoàn thành
      task.suggestions || '' // Đề xuất, kiến nghị
    ]
  ];
  
  // Append to sheet
  return appendSheetData(accessToken, 'Báo cáo!A:L', taskData);
};

// Add task to Plans sheet
const addTaskToPlans = async (accessToken, task) => {
  // Format task data for sheet
  const taskData = [
    [
      task.id, // TT (index)
      task.field, // Lĩnh vực công tác
      task.title, // Tên công việc
      task.deadline, // Tiến độ
      task.manager, // Người chủ trì
      task.assignees.join(', '), // Người thực hiện
      task.collaborators.join(', '), // Đơn vị phối hợp
      task.description || '', // Mô tả kết quả thực hiện
      task.evaluation || '', // Đánh giá kết quả
      task.issues || '', // Tồn tại, nguyên nhân
      task.completionDate || '', // Thời gian hoàn thành
      task.suggestions || '' // Đề xuất, kiến nghị
    ]
  ];
  
  // Append to sheet
  return appendSheetData(accessToken, 'Kế hoạch!A:L', taskData);
};

// Update task in Reports sheet
const updateTaskInReports = async (accessToken, taskId, updates) => {
  // Get current reports to find the row
  const reports = await getReportsSheet(accessToken);
  
  // Find the row index for the task
  let rowIndex = -1;
  for (let i = 1; i < reports.length; i++) {
    if (reports[i][0] == taskId) {
      rowIndex = i + 1; // +1 because sheets are 1-indexed
      break;
    }
  }
  
  if (rowIndex === -1) {
    throw new Error(`Task with ID ${taskId} not found in Reports sheet`);
  }
  
  // Create update data
  const updateData = [
    [
      updates.description || reports[rowIndex-1][7] || '',
      updates.evaluation || reports[rowIndex-1][8] || '',
      updates.issues || reports[rowIndex-1][9] || '',
      updates.completionDate || reports[rowIndex-1][10] || '',
      updates.suggestions || reports[rowIndex-1][11] || ''
    ]
  ];
  
  // Update specific cells
  return updateSheetData(
    accessToken, 
    `Báo cáo!H${rowIndex}:L${rowIndex}`, 
    updateData
  );
};

// Get user role from Data sheet
const getUserRole = async (accessToken, email) => {
  const data = await getDataSheet(accessToken);
  
  // Check if user is a manager
  for (let i = 1; i < data.length; i++) {
    if (data[i][3] === email) {
      return {
        role: 'manager',
        name: data[i][2]
      };
    }
  }
  
  // Check if user is a specialist
  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === email) {
      return {
        role: 'specialist',
        name: data[i][4]
      };
    }
  }
  
  // User not found
  return null;
};

module.exports = {
  getDataSheet,
  getManagementSheet,
  getReportsSheet,
  getPlansSheet,
  addTaskToManagement,
  addTaskToReports,
  addTaskToPlans,
  updateTaskInReports,
  getUserRole
};
