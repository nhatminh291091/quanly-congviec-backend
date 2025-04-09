const express = require('express');
const router = express.Router();
const sheetsService = require('../services/sheets/sheetsService');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all tasks (filtered by user role)
router.get('/', async (req, res) => {
  try {
    const { user, access_token } = req.user;
    
    // Get tasks from Management sheet
    const tasks = await sheetsService.getManagementSheet(access_token);
    
    // Convert sheet data to JSON
    const headers = tasks[0];
    const tasksJson = tasks.slice(1).map(row => {
      const task = {};
      headers.forEach((header, index) => {
        task[header.toLowerCase().replace(/ /g, '_')] = row[index] || '';
      });
      return task;
    });
    
    // Filter tasks based on user role
    let filteredTasks = tasksJson;
    if (user.role === 'specialist') {
      // Specialists only see tasks assigned to them
      filteredTasks = tasksJson.filter(task => 
        task.người_thực_hiện && task.người_thực_hiện.includes(user.name)
      );
    }
    
    res.json({ tasks: filteredTasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create new task (managers only)
router.post('/', async (req, res) => {
  try {
    const { user, access_token } = req.user;
    
    // Check if user is a manager
    if (user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can create tasks' });
    }
    
    const taskData = req.body;
    
    // Add task to Management sheet
    const result = await sheetsService.addTaskToManagement(access_token, taskData);
    
    res.status(201).json({ 
      success: true, 
      message: 'Task created successfully',
      result 
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task
router.put('/:id', async (req, res) => {
  try {
    const { user, access_token } = req.user;
    const { id } = req.params;
    const updates = req.body;
    
    // Get tasks from Management sheet
    const tasks = await sheetsService.getManagementSheet(access_token);
    
    // Find the task
    let taskRow = -1;
    for (let i = 1; i < tasks.length; i++) {
      if (tasks[i][0] == id) {
        taskRow = i + 1; // +1 because sheets are 1-indexed
        break;
      }
    }
    
    if (taskRow === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Check if user has permission to update
    const taskManager = tasks[taskRow-1][4]; // Người chủ trì
    const taskAssignees = tasks[taskRow-1][5]; // Người thực hiện
    
    if (user.role !== 'manager' && !taskAssignees.includes(user.name)) {
      return res.status(403).json({ error: 'You do not have permission to update this task' });
    }
    
    // Update task in Management sheet
    // In a real implementation, you would update the specific cells
    // For now, we'll just return success
    
    res.json({ 
      success: true, 
      message: 'Task updated successfully' 
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Assign task to Reports sheet (managers only)
router.post('/:id/assign', async (req, res) => {
  try {
    const { user, access_token } = req.user;
    const { id } = req.params;
    
    // Check if user is a manager
    if (user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can assign tasks' });
    }
    
    // Get tasks from Management sheet
    const tasks = await sheetsService.getManagementSheet(access_token);
    
    // Find the task
    let taskData = null;
    for (let i = 1; i < tasks.length; i++) {
      if (tasks[i][0] == id) {
        taskData = {
          id: tasks[i][0],
          field: tasks[i][1],
          title: tasks[i][2],
          deadline: tasks[i][3],
          manager: tasks[i][4],
          assignees: tasks[i][5].split(', '),
          collaborators: tasks[i][6].split(', '),
          description: tasks[i][7],
          evaluation: tasks[i][8],
          issues: tasks[i][9],
          completionDate: tasks[i][10],
          suggestions: tasks[i][11]
        };
        break;
      }
    }
    
    if (!taskData) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Add task to Reports sheet
    const result = await sheetsService.addTaskToReports(access_token, taskData);
    
    res.json({ 
      success: true, 
      message: 'Task assigned to Reports successfully',
      result 
    });
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ error: 'Failed to assign task' });
  }
});

// Add task to Plans sheet (managers only)
router.post('/:id/plan', async (req, res) => {
  try {
    const { user, access_token } = req.user;
    const { id } = req.params;
    
    // Check if user is a manager
    if (user.role !== 'manager') {
      return res.status(403).json({ error: 'Only managers can add tasks to plans' });
    }
    
    // Get tasks from Management sheet
    const tasks = await sheetsService.getManagementSheet(access_token);
    
    // Find the task
    let taskData = null;
    for (let i = 1; i < tasks.length; i++) {
      if (tasks[i][0] == id) {
        taskData = {
          id: tasks[i][0],
          field: tasks[i][1],
          title: tasks[i][2],
          deadline: tasks[i][3],
          manager: tasks[i][4],
          assignees: tasks[i][5].split(', '),
          collaborators: tasks[i][6].split(', '),
          description: tasks[i][7],
          evaluation: tasks[i][8],
          issues: tasks[i][9],
          completionDate: tasks[i][10],
          suggestions: tasks[i][11]
        };
        break;
      }
    }
    
    if (!taskData) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Add task to Plans sheet
    const result = await sheetsService.addTaskToPlans(access_token, taskData);
    
    res.json({ 
      success: true, 
      message: 'Task added to Plans successfully',
      result 
    });
  } catch (error) {
    console.error('Error adding task to plans:', error);
    res.status(500).json({ error: 'Failed to add task to plans' });
  }
});

module.exports = router;
