const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to check validation results and return errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ===== AUTH VALIDATIONS =====
const validateSignup = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  handleValidationErrors,
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

// ===== CLIENT/SETTINGS VALIDATIONS =====
const validateUUID = [
  param('id').isUUID().withMessage('Invalid ID format'),
  handleValidationErrors,
];

const validateTransferSettings = [
  body('transfer_number').optional().isMobilePhone().withMessage('Invalid phone number'),
  body('transfer_mode').optional().isIn(['all_calls', 'on_request']).withMessage('Invalid transfer mode'),
  handleValidationErrors,
];

const validateAISettings = [
  body('language').optional().isString().isLength({ max: 50 }),
  body('booking_link').optional({ checkFalsy: true }).isURL().withMessage('Invalid booking URL'),
  body('primary_services').optional().isString().isLength({ max: 5000 }),
  body('ai_goal').optional().isIn(['book_appointment', 'take_message', 'answer_faqs', 'qualify_leads']),
  body('website_url').optional({ checkFalsy: true }).isURL().withMessage('Invalid website URL'),
  handleValidationErrors,
];

const validateBrandSettings = [
  body('avg_lead_value').optional().isInt({ min: 0, max: 10000000 }).withMessage('Invalid lead value'),
  body('logo_url').optional({ checkFalsy: true }).isURL().withMessage('Invalid logo URL'),
  body('n8n_webhook_url').optional({ checkFalsy: true }).isURL().withMessage('Invalid webhook URL'),
  body('gstin').optional({ checkFalsy: true }).isLength({ min: 15, max: 15 }).withMessage('GSTIN must be 15 characters'),
  body('business_name').optional().isString().isLength({ max: 255 }).withMessage('Invalid business name'),
  handleValidationErrors,
];

const validateCRMSettings = [
  body('crm_type').optional().isIn(['none', 'zoho', 'hubspot', 'custom']).withMessage('Invalid CRM type'),
  body('crm_webhook_url').optional().isURL().withMessage('Invalid CRM webhook URL'),
  handleValidationErrors,
];

// ===== LEADS VALIDATIONS =====
const validateLeadStatus = [
  body('status').isIn(['new', 'followed_up', 'transferred']).withMessage('Invalid lead status'),
  handleValidationErrors,
];

const validateLeadQuery = [
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  query('status').optional().isIn(['all', 'new', 'followed_up', 'transferred']),
  handleValidationErrors,
];

// ===== ADMIN VALIDATIONS =====
const validateCreateClient = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be 8+ characters'),
  body('business_name').optional().trim().isLength({ max: 255 }),
  body('plan_name').optional().isIn(['free_trial', 'trial', 'starter', 'growth', 'pro', 'scale', 'enterprise']),
  body('initial_minutes').optional().isInt({ min: 0 }),
  body('plivo_number').optional().isString(),
  handleValidationErrors,
];

const validateAddMinutes = [
  body('minutes').isInt({ min: 1, max: 100000 }).withMessage('Minutes must be a positive number'),
  handleValidationErrors,
];

const validateChangePlan = [
  body('plan_name').isIn(['free_trial', 'trial', 'starter', 'growth', 'pro', 'scale', 'enterprise']).withMessage('Invalid plan'),
  handleValidationErrors,
];

const validatePasswordReset = [
  body('password').isLength({ min: 8 }).withMessage('Password must be 8+ characters'),
  handleValidationErrors,
];

// ===== PAYMENT VALIDATIONS =====
const validateCreateOrder = [
  body('plan').notEmpty().withMessage('Plan is required'),
  body('isUpgrade').optional().isBoolean(),
  handleValidationErrors,
];

module.exports = {
  handleValidationErrors,
  validateSignup,
  validateLogin,
  validateUUID,
  validateTransferSettings,
  validateAISettings,
  validateBrandSettings,
  validateCRMSettings,
  validateLeadStatus,
  validateLeadQuery,
  validateCreateClient,
  validateAddMinutes,
  validateChangePlan,
  validatePasswordReset,
  validateCreateOrder,
};
