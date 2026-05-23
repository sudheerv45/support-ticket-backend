const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');

const ticketController = require('../controllers/ticketController');
const { authenticate, authorize } = require('../middleware/auth');
const validateRequest = require('../middleware/requestValidator');
const { cache } = require('../middleware/cache');

// Validation rules
const createTicketValidation = [
  body('title').trim().isLength({ min: 5, max: 200 }).withMessage('Title 5-200 chars'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description min 10 chars'),
  body('category').optional().isIn(['technical', 'billing', 'general', 'feature-request', 'bug-report']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  validateRequest
];

const updateTicketValidation = [
  param('id').isMongoId().withMessage('Invalid ticket ID'),
  body('title').optional().trim().isLength({ min: 5, max: 200 }),
  body('description').optional().trim().isLength({ min: 10 }),
  body('status').optional().isIn(['open', 'in-progress', 'resolved', 'closed', 'escalated']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  validateRequest
];

const commentValidation = [
  param('id').isMongoId().withMessage('Invalid ticket ID'),
  body('content').trim().isLength({ min: 1, max: 2000 }).withMessage('Comment 1-2000 chars'),
  body('isInternal').optional().isBoolean(),
  validateRequest
];

const listValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['open', 'in-progress', 'resolved', 'closed', 'escalated']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('category').optional().isIn(['technical', 'billing', 'general', 'feature-request', 'bug-report']),
  validateRequest
];

// Routes
router.post('/', authenticate, createTicketValidation, ticketController.create);
router.get('/', authenticate, listValidation, cache(60), ticketController.list);
router.get('/stats', authenticate, ticketController.getStats);
router.get('/categories', authenticate, ticketController.getCategories);
router.get('/priorities', authenticate, ticketController.getPriorities);
router.get('/statuses', authenticate, ticketController.getStatuses);

router.get('/:id', authenticate, param('id').isMongoId(), validateRequest, ticketController.getById);
router.patch('/:id', authenticate, updateTicketValidation, ticketController.update);
router.delete('/:id', authenticate, param('id').isMongoId(), validateRequest, ticketController.delete);

router.post('/:id/comments', authenticate, commentValidation, ticketController.addComment);
router.patch('/:id/status', authenticate, [
  param('id').isMongoId(),
  body('status').isIn(['open', 'in-progress', 'resolved', 'closed', 'escalated']),
  validateRequest
], ticketController.updateStatus);

router.patch('/:id/assign', authenticate, authorize('admin', 'agent'), [
  param('id').isMongoId(),
  body('agentId').isMongoId().withMessage('Valid agent ID required'),
  validateRequest
], ticketController.assign);

router.post('/:id/summary', authenticate, [
  param('id').isMongoId(),
  validateRequest
], ticketController.generateSummary);

module.exports = router;
