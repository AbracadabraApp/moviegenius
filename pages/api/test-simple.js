// Simple test API endpoint to debug the issue

export default async function handler(req, res) {
  try {
    console.log('🧪 Simple API test running...');
    
    return res.status(200).json({
      success: true,
      message: 'Simple API test works',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Simple API error:', error);
    
    return res.status(500).json({
      error: 'Simple API failed',
      message: error.message
    });
  }
}