const { body, param, query } = require('express-validator');

const authValidators = {
  register: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
  ],
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ]
};

const ticketValidators = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Title must be between 5 and 200 characters'),
    body('description')
      .trim()
      .isLength({ min: 10 })
      .withMessage('Description must be at least 10 characters'),
    body('category')
      .optional()
      .isIn(['technical', 'billing', 'general', 'feature-request', 'bug-report'])
      .withMessage('Invalid category'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority')
  ],
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid ticket ID'),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage('Title must be between 5 and 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 10 })
      .withMessage('Description must be at least 10 characters'),
    body('status')
      .optional()
      .isIn(['open', 'in-progress', 'resolved', 'closed', 'escalated'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority')
  ],
  addComment: [
    param('id')
      .isMongoId()
      .withMessage('Invalid ticket ID'),
    body('content')
      .trim()
      .isLength({ min: 1, max: 2000 })
      .withMessage('Comment must be between 1 and 2000 characters'),
    body('isInternal')
      .optional()
      .isBoolean()
      .withMessage('isInternal must be a boolean')
  ],
  list: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('status')
      .optional()
      .isIn(['open', 'in-progress', 'resolved', 'closed', 'escalated'])
      .withMessage('Invalid status filter'),
    query('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority filter'),
    query('category')
      .optional()
      .isIn(['technical', 'billing', 'general', 'feature-request', 'bug-report'])
      .withMessage('Invalid category filter'),
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Search query cannot be empty')
  ]
};

module.exports = { authValidators, ticketValidators };
