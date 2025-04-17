require('dotenv').config();
const express = require('express');
const { google } = require('googleapis');
const router = express.Router();

// Service Account credentials (env vars)
const serviceEmail  = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;
const spreadsheetId  = process.env.SPREADSHEET_ID;
if (!serviceEmail || !privateKeyRaw || !spreadsheetId) {
  console.error('Missing Google Sheets API env vars');
  throw new Error('Google Sheets API configuration error');
}
// Convert \n literals to real newlines
const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

// Initialize JWT auth client
const auth = new google.auth.JWT(
  serviceEmail,
  null,
  privateKey,
  ['https://www.googleapis.com/auth/spreadsheets']
);
const sheets = google.sheets({ version: 'v4', auth });

// Generic read from sheet
async function getSheetValues(range) {
  const resp = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  return resp.data.values || [];
}

// Route: GET /dulieu -> read 'DULIEU' sheet
router.get('/dulieu', async (req, res) => {
  try {
    const values = await getSheetValues('DULIEU!A:F');
    if (!values.length) return res.json([]);
    const headers = values[0];
    const data = values.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i] || '');
      return obj;
    });
    res.json(data);
  } catch (err) {
    console.error('Error fetching DULIEU:', err);
    res.status(500).json({ error: 'Failed to fetch DULIEU' });
  }
});

// Route: GET /plans -> read 'KEHOACH' sheet (if needed)
router.get('/plans', async (req, res) => {
  try {
    const values = await getSheetValues('KEHOACH!A:L');
    if (!values.length) return res.json([]);
    const headers = values[0];
    const data = values.slice(1).map(row => {
      const obj = {};
      headers.forEach((h, i) => obj[h] = row[i] || '');
      return obj;
    });
    res.json(data);
  } catch (err) {
    console.error('Error fetching KEHOACH:', err);
    res.status(500).json({ error: 'Failed to fetch KEHOACH' });
  }
});

// Export the router to mount at /api/sheets
module.exports = router;
