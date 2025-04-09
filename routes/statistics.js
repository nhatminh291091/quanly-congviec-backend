const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheets/sheetsService');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get statistics (managers only)
router.get('/', async (req, res) => {
  try {
    const { user, access_token } = req.user;
    
    // Check if user is a manager
    if (user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can access statistics' });
    }
    
    // Get data from all sheets
    const managementData = await sheetsService.getManagementSheet(access_token);
    const reportsData = await sheetsService.getReportsSheet(access_token);
    const plansData = await sheetsService.getPlansSheet(access_token);
    const userData = await sheetsService.getDataSheet(access_token);
    
    // Skip headers
    const tasks = managementData.slice(1);
    const reports = reportsData.slice(1);
    const plans = plansData.slice(1);
    const users = userData.slice(1);
    
    // Calculate statistics by field
    const fieldStats = {};
    tasks.forEach(task => {
      const field = task[1]; // Lĩnh vực công tác
      const status = task[8]; // Đánh giá kết quả
      
      if (!fieldStats[field]) {
        fieldStats[field] = {
          total: 0,
          completed: 0,
          onTrack: 0,
          delayed: 0,
          failed: 0
        };
      }
      
      fieldStats[field].total++;
      
      if (status === 'Hoàn thành') {
        fieldStats[field].completed++;
      } else if (status === 'Theo tiến độ') {
        fieldStats[field].onTrack++;
      } else if (status === 'Chậm tiến độ') {
        fieldStats[field].delayed++;
      } else if (status === 'Không hoàn thành') {
        fieldStats[field].failed++;
      }
    });
    
    // Calculate statistics by assignee
    const assigneeStats = {};
    tasks.forEach(task => {
      const assignees = task[5].split(', '); // Người thực hiện
      const status = task[8]; // Đánh giá kết quả
      
      assignees.forEach(assignee => {
        if (!assigneeStats[assignee]) {
          assigneeStats[assignee] = {
            total: 0,
            completed: 0,
            onTrack: 0,
            delayed: 0,
            failed: 0
          };
        }
        
        assigneeStats[assignee].total++;
        
        if (status === 'Hoàn thành') {
          assigneeStats[assignee].completed++;
        } else if (status === 'Theo tiến độ') {
          assigneeStats[assignee].onTrack++;
        } else if (status === 'Chậm tiến độ') {
          assigneeStats[assignee].delayed++;
        } else if (status === 'Không hoàn thành') {
          assigneeStats[assignee].failed++;
        }
      });
    });
    
    // Calculate statistics by status
    const statusStats = {
      'Hoàn thành': 0,
      'Theo tiến độ': 0,
      'Chậm tiến độ': 0,
      'Không hoàn thành': 0
    };
    
    tasks.forEach(task => {
      const status = task[8]; // Đánh giá kết quả
      if (status && statusStats.hasOwnProperty(status)) {
        statusStats[status]++;
      }
    });
    
    // Format statistics for response
    const statistics = {
      byField: Object.entries(fieldStats).map(([field, stats]) => ({
        field,
        ...stats
      })),
      byAssignee: Object.entries(assigneeStats).map(([assignee, stats]) => ({
        assignee,
        ...stats
      })),
      byStatus: Object.entries(statusStats).map(([status, count]) => ({
        status,
        count
      }))
    };
    
    res.json({ statistics });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
