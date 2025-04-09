const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheets/sheetsService');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Sync data from Google Sheets
router.get('/sync', async (req, res) => {
  try {
    const { access_token } = req.user;
    
    // Get data from all sheets
    const dataSheet = await sheetsService.getDataSheet(access_token);
    const managementSheet = await sheetsService.getManagementSheet(access_token);
    const reportsSheet = await sheetsService.getReportsSheet(access_token);
    const plansSheet = await sheetsService.getPlansSheet(access_token);
    
    res.json({
      success: true,
      message: 'Data synchronized successfully',
      data: {
        dataSheet: dataSheet.length,
        managementSheet: managementSheet.length,
        reportsSheet: reportsSheet.length,
        plansSheet: plansSheet.length
      }
    });
  } catch (error) {
    console.error('Error syncing data:', error);
    res.status(500).json({ error: 'Failed to sync data from Google Sheets' });
  }
});

// Sync data to Google Sheets
router.post('/sync', async (req, res) => {
  try {
    const { user, access_token } = req.user;
    
    // Check if user is a manager
    if (user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can sync data to Google Sheets' });
    }
    
    // In a real implementation, this would push local changes to Google Sheets
    // For now, just return success
    
    res.json({
      success: true,
      message: 'Data synchronized to Google Sheets successfully'
    });
  } catch (error) {
    console.error('Error syncing data to Google Sheets:', error);
    res.status(500).json({ error: 'Failed to sync data to Google Sheets' });
  }
});

module.exports = router;
