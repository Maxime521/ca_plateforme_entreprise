// pages/api/test/insee-oauth.js - Test INSEE OAuth
import INSEEOAuthService from '../../../lib/insee-oauth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('🧪 Testing INSEE OAuth...');
    
    // Test token acquisition
    const tokenResult = await INSEEOAuthService.getAccessToken();
    
    // Test token validity
    const testResult = await INSEEOAuthService.testToken();
    
    return res.status(200).json({
      success: true,
      message: 'INSEE OAuth test completed',
      results: {
        tokenObtained: !!tokenResult,
        tokenValid: testResult.valid,
        tokenStatus: testResult.status,
        message: testResult.message
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ INSEE OAuth test failed:', error);
    return res.status(500).json({
      success: false,
      message: 'INSEE OAuth test failed',
      error: error.message
    });
  }
}
