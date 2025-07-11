// lib/validation/schemas.js - Input validation schemas
const Joi = require('joi');

// SIREN validation schema
const sirenSchema = Joi.string()
  .pattern(/^\d{9}$/)
  .required()
  .messages({
    'string.pattern.base': 'SIREN must be exactly 9 digits',
    'string.empty': 'SIREN is required',
    'any.required': 'SIREN is required'
  });

// SIRET validation schema
const siretSchema = Joi.string()
  .pattern(/^\d{14}$/)
  .required()
  .messages({
    'string.pattern.base': 'SIRET must be exactly 14 digits',
    'string.empty': 'SIRET is required',
    'any.required': 'SIRET is required'
  });

// Query parameters schema
const queryParamsSchema = Joi.object({
  siren: sirenSchema,
  format: Joi.string()
    .valid('html', 'pdf', 'json')
    .optional()
    .default('html'),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20)
});

// File upload schema
const fileUploadSchema = Joi.object({
  filename: Joi.string()
    .pattern(/^[a-zA-Z0-9._-]+$/)
    .max(255)
    .required(),
  mimetype: Joi.string()
    .valid(
      'application/pdf',
      'image/jpeg',
      'image/png',
      'text/html',
      'application/json'
    )
    .required(),
  size: Joi.number()
    .integer()
    .max(10 * 1024 * 1024) // 10MB max
    .required()
});

// Search query schema
const searchSchema = Joi.object({
  query: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z0-9\s\-'&.]+$/)
    .required()
    .messages({
      'string.min': 'Search query must be at least 2 characters',
      'string.max': 'Search query cannot exceed 100 characters',
      'string.pattern.base': 'Search query contains invalid characters'
    }),
  type: Joi.string()
    .valid('company', 'siren', 'name')
    .optional()
    .default('company'),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .optional()
    .default(10)
});

// User profile schema
const userProfileSchema = Joi.object({
  uid: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required(),
  email: Joi.string()
    .email()
    .required(),
  role: Joi.string()
    .valid('admin', 'user', 'viewer')
    .required(),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark').optional(),
    language: Joi.string().valid('fr', 'en').optional(),
    notifications: Joi.boolean().optional()
  }).optional()
});

// API key schema
const apiKeySchema = Joi.object({
  key: Joi.string()
    .pattern(/^[a-zA-Z0-9_-]{32,}$/)
    .required(),
  service: Joi.string()
    .valid('insee', 'inpi', 'bodacc')
    .required()
});

// Validation helper function
function validateInput(schema, data) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    return {
      isValid: false,
      errors,
      data: null
    };
  }
  
  return {
    isValid: true,
    errors: null,
    data: value
  };
}

// Sanitization helpers
function sanitizeSiren(siren) {
  if (!siren || typeof siren !== 'string') return null;
  return siren.replace(/\s+/g, '').slice(0, 9);
}

function sanitizeQuery(query) {
  if (!query || typeof query !== 'string') return null;
  return query.trim().replace(/[<>\"']/g, '');
}

function sanitizeFilename(filename) {
  if (!filename || typeof filename !== 'string') return null;
  return filename.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 255);
}

module.exports = {
  sirenSchema,
  siretSchema,
  queryParamsSchema,
  fileUploadSchema,
  searchSchema,
  userProfileSchema,
  apiKeySchema,
  validateInput,
  sanitizeSiren,
  sanitizeQuery,
  sanitizeFilename
};