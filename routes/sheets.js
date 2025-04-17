const express = require('express');
const { google } = require('googleapis');
const { expressjwt: jwt } = require('express-jwt');
const router = express.Router();

// JWT Middleware
const auth = jwt({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256'],
});

// Google Sheets API setup
const authGoogle = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth: authGoogle });
const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID;
const RANGE = 'QUANLY!B:H';

// POST endpoint to add task
router.post('/add-task', auth, async (req, res) => {
  try {
    const { task, assignedDate, dueDate, assignee, priority, status, note } = req.body;

    if (!task || !assignedDate || !dueDate || !assignee || !priority || !status) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const formatDate = (dateStr) => {
      const date = new Date(dateStr);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    };

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[task, formatDate(assignedDate), formatDate(dueDate), assignee, priority, status, note || '']],
      },
    });

    res.status(200).json({ success: true, message: 'Task added successfully' });
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).json({ success: false, error: 'Failed to add task' });
  }
});

// GET endpoint to read tasks
router.get('/tasks', auth, async (req, res) => {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'QUANLY!A:H',
    });

    const rows = response.data.values || [];
    const tasks = rows.slice(1).map((row, index) => ({
      stt: row[0] || (index + 1),
      task: row[1] || '',
      assignedDate: row[2] || '',
      dueDate: row[3] || '',
      assignee: row[4] || '',
      priority: row[5] || '',
      status: row[6] || '',
      note: row[7] || '',
    }));

    res.status(200).json({ success: true, tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
});

module.exports = router;