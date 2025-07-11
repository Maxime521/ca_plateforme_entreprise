// Test BODACC endpoint
const { validateInput, sirenSchema } = require('../../lib/validation/schemas.js');
const logger = require('../../lib/logger.js');

export default async function handler(req, res) {
  try {
    logger.info('Test BODACC endpoint called');
    
    // Test validation
    const validation = validateInput(sirenSchema, '552032534');
    
    res.status(200).json({
      success: true,
      message: 'BODACC test endpoint working',
      validation: validation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test BODACC error:', error);
    res.status(500).json({
      error: true,
      message: error.message,
      stack: error.stack
    });
  }
}