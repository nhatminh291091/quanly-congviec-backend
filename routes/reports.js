const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheets/sheetsService');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all reports (filtered by user role)
router.get('/', async (req, res) => {
  try {
    const { user, access_token } = req.user;
    
    // Get reports from Reports sheet
    const reports = await sheetsService.getReportsSheet(access_token);
    
    // Convert sheet data to JSON
    const headers = reports[0];
    const reportsJson = reports.slice(1).map(row => {
      const report = {};
      headers.forEach((header, index) => {
        report[header.toLowerCase().replace(/ /g, '_')] = row[index] || '';
      });
      return report;
    });
    
    // Filter reports based on user role
    let filteredReports = reportsJson;
    if (user.role === 'specialist') {
      // Specialists only see reports assigned to them
      filteredReports = reportsJson.filter(report => 
        report.người_thực_hiện && report.người_thực_hiện.includes(user.name)
      );
    }
    
    res.json({ reports: filteredReports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Update report
router.put('/:id', async (req, res) => {
  try {
    const { user, access_token } = req.user;
    const { id } = req.params;
    const updates = req.body;
    
    // Get reports from Reports sheet
    const reports = await sheetsService.getReportsSheet(access_token);
    
    // Find the report
    let reportRow = -1;
    let reportData = null;
    for (let i = 1; i < reports.length; i++) {
      if (reports[i][0] == id) {
        reportRow = i;
        reportData = reports[i];
        break;
      }
    }
    
    if (reportRow === -1) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Check if user has permission to update
    const reportAssignees = reportData[5]; // Người thực hiện
    
    if (user.role !== 'manager' && !reportAssignees.includes(user.name)) {
      return res.status(403).json({ error: 'You do not have permission to update this report' });
    }
    
    // Update report in Reports sheet
    const result = await sheetsService.updateTaskInReports(access_token, id, updates);
    
    res.json({ 
      success: true, 
      message: 'Report updated successfully',
      result
    });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report' });
  }
});

module.exports = router;
