/**
 * Test Reports API - Collect and view movie page test framework reports
 */

export default function handler(req, res) {
  if (req.method === 'POST') {
    // Receive test report from client
    const report = req.body;
    
    console.log('📊 TEST REPORT RECEIVED:', {
      movieId: report.summary?.movieId,
      redirectDetected: report.summary?.redirectDetected,
      totalErrors: report.summary?.totalErrors,
      timestamp: new Date().toISOString()
    });
    
    // Log key findings
    if (report.summary?.redirectDetected) {
      console.log('🚨 REDIRECT DETECTED in movie page:', report.summary.movieId);
    }
    
    if (report.errors?.length > 0) {
      console.log('🚨 ERRORS FOUND:', report.errors.map(e => e.message));
    }
    
    // Log failed network requests
    const failedRequests = report.networkRequests?.filter(r => r.error || r.status >= 400);
    if (failedRequests?.length > 0) {
      console.log('🚨 FAILED NETWORK REQUESTS:', failedRequests);
    }
    
    return res.status(200).json({ 
      success: true, 
      reportReceived: true,
      summary: report.summary 
    });
  }
  
  if (req.method === 'GET') {
    // Return instructions for viewing reports
    return res.status(200).json({
      instructions: {
        collectReport: "Visit any movie page and wait 10 seconds, or call window.generateMoviePageReport()",
        viewReport: "Check browser localStorage for keys starting with 'movie-page-test-' or 'latest-movie-page-test'",
        sendReport: "POST the report JSON to this endpoint to log it server-side"
      },
      testFrameworkActive: true
    });
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}