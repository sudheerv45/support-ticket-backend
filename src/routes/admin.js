const express = require('express');
const router = express.Router();
const { param, body } = require('express-validator');

const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');
const validateRequest = require('../middleware/requestValidator');

// All routes require admin role
router.use(authenticate, authorize('admin'));

// Dashboard
router.get('/dashboard', adminController.getDashboardStats);
router.get('/health', adminController.getSystemHealth);

// User management
router.get('/users', adminController.getAllUsers);
router.patch('/users/:userId/role', [
  param('userId').isMongoId(),
  body('role').isIn(['user', 'admin', 'agent']),
  validateRequest
], adminController.updateUserRole);
router.patch('/users/:userId/toggle', [
  param('userId').isMongoId(),
  validateRequest
], adminController.toggleUserStatus);

// Ticket management
router.get('/tickets', adminController.getAllTickets);

module.exports = router;
