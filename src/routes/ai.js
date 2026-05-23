const express = require('express');
const router = express.Router();
const { body } = require('express-validator');

const aiController = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');
const validateRequest = require('../middleware/requestValidator');

router.use(authenticate);

router.post('/categorize', [
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('description').trim().isLength({ min: 1 }).withMessage('Description is required'),
  validateRequest
], aiController.categorize);

router.post('/priority', [
  body('title').trim().isLength({ min: 1 }),
  body('description').trim().isLength({ min: 1 }),
  validateRequest
], aiController.suggestPriority);

router.post('/analyze', [
  body('title').trim().isLength({ min: 1 }),
  body('description').trim().isLength({ min: 1 }),
  validateRequest
], aiController.analyzeTicket);

router.post('/tickets/:ticketId/summary', [
  param('ticketId').isMongoId(),
  validateRequest
], aiController.generateSummary);

router.post('/tickets/:ticketId/suggest-response', [
  param('ticketId').isMongoId(),
  validateRequest
], aiController.suggestResponse);

module.exports = router;
