// Test imports individually
export default async function handler(req, res) {
  try {
    // Test logger
    const logger = require('../../lib/logger.js');
    logger.info('Logger test OK');
    
    // Test validation schemas
    const { validateInput, sirenSchema } = require('../../lib/validation/schemas.js');
    const validation = validateInput(sirenSchema, '552032534');
    
    // Test security error handler
    const { handleBODACCError } = require('../../lib/security/error-handler.js');
    
    res.status(200).json({
      success: true,
      message: 'All imports working',
      validation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Import test error:', error);
    res.status(500).json({
      error: true,
      message: error.message,
      stack: error.stack
    });
  }
}