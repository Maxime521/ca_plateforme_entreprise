// lib/middleware/validation.js - Input validation middleware
import Joi from 'joi';

// Search query validation schema
const searchSchema = Joi.object({
  q: Joi.string()
    .min(3)
    .max(100)
    .pattern(/^[a-zA-Z0-9\s\-_.àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]+$/)
    .required()
    .messages({
      'string.min': 'Search query must be at least 3 characters',
      'string.max': 'Search query must not exceed 100 characters',
      'string.pattern.base': 'Search query contains invalid characters',
      'any.required': 'Search query is required'
    }),
  source: Joi.string()
    .valid('all', 'local', 'insee', 'bodacc')
    .default('all')
    .messages({
      'any.only': 'Source must be one of: all, local, insee, bodacc'
    })
});

// SIREN validation schema
const sirenSchema = Joi.object({
  siren: Joi.string()
    .length(9)
    .pattern(/^\d{9}$/)
    .required()
    .messages({
      'string.length': 'SIREN must be exactly 9 digits',
      'string.pattern.base': 'SIREN must contain only digits',
      'any.required': 'SIREN is required'
    })
});

// Generic validation middleware factory
export const validateRequest = (schema, source = 'query') => {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : req.body;
    
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Invalid input parameters',
        errors
      });
    }

    // Replace original data with validated data
    if (source === 'query') {
      req.query = value;
    } else {
      req.body = value;
    }

    next();
  };
};

// Pre-configured validation middlewares
export const validateSearchQuery = validateRequest(searchSchema, 'query');
export const validateSiren = validateRequest(sirenSchema, 'query');

// Sanitization helpers
export const sanitizeQuery = (query) => {
  if (typeof query !== 'string') return '';
  
  return query
    .trim()
    .replace(/[<>'"]/g, '') // Remove potentially dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 100); // Enforce max length
};

// Rate limiting configuration
export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    retryAfter: 15 * 60 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};