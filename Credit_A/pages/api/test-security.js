// Simple test endpoint to verify security imports
const logger = require('../../lib/logger.js');

export default async function handler(req, res) {
  try {
    logger.info('Test security endpoint called');
    
    res.status(200).json({
      success: true,
      message: 'Security test endpoint working',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test security error:', error);
    res.status(500).json({
      error: true,
      message: error.message
    });
  }
}