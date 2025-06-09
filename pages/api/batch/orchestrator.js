/**
 * Railway Batch Orchestrator
 * 
 * Single endpoint that intelligently manages all batch processing
 * Handles movies, people, lists, and status checks based on timing
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Railway cron job auth
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.RAILWAY_BATCH_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    
    const results = [];
    const baseUrl = req.headers.host.includes('localhost') 
      ? 'http://localhost:3000' 
      : `https://${req.headers.host}`;
    
    console.log(`🤖 Batch Orchestrator running at ${now.toISOString()}`);

    // Always check status first
    try {
      const statusResponse = await fetch(`${baseUrl}/api/batch/status`, {
        method: 'POST',
        headers: {
          'Authorization': req.headers.authorization,
          'Content-Type': 'application/json'
        }
      });
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        results.push({
          task: 'status_check',
          status: 'success',
          data: statusData
        });
        console.log('✅ Status check completed');
      }
    } catch (error) {
      results.push({
        task: 'status_check',
        status: 'error',
        error: error.message
      });
      console.error('❌ Status check failed:', error.message);
    }

    // Movie analysis every 6 hours (at 0, 6, 12, 18)
    if (hour % 6 === 0 && minute >= 0 && minute < 30) {
      try {
        console.log('🎬 Running movie batch analysis...');
        const movieResponse = await fetch(`${baseUrl}/api/batch/movies`, {
          method: 'POST',
          headers: {
            'Authorization': req.headers.authorization,
            'Content-Type': 'application/json'
          }
        });
        
        if (movieResponse.ok) {
          const movieData = await movieResponse.json();
          results.push({
            task: 'movie_analysis',
            status: 'success',
            data: movieData
          });
          console.log('✅ Movie batch created:', movieData.batch_id);
        }
      } catch (error) {
        results.push({
          task: 'movie_analysis',
          status: 'error',
          error: error.message
        });
        console.error('❌ Movie batch failed:', error.message);
      }
    }

    // People discovery daily at 2 AM
    if (hour === 2 && minute >= 0 && minute < 30) {
      try {
        console.log('👥 Running people discovery...');
        const peopleResponse = await fetch(`${baseUrl}/api/batch/people`, {
          method: 'POST',
          headers: {
            'Authorization': req.headers.authorization,
            'Content-Type': 'application/json'
          }
        });
        
        if (peopleResponse.ok) {
          const peopleData = await peopleResponse.json();
          results.push({
            task: 'people_discovery',
            status: 'success',
            data: peopleData
          });
          console.log('✅ People discovery completed:', peopleData.people_created);
        }
      } catch (error) {
        results.push({
          task: 'people_discovery',
          status: 'error',
          error: error.message
        });
        console.error('❌ People discovery failed:', error.message);
      }
    }

    // List analysis weekly on Sunday at 4 AM
    if (dayOfWeek === 0 && hour === 4 && minute >= 0 && minute < 30) {
      try {
        console.log('📋 Running list analysis...');
        const listResponse = await fetch(`${baseUrl}/api/batch/lists`, {
          method: 'POST',
          headers: {
            'Authorization': req.headers.authorization,
            'Content-Type': 'application/json'
          }
        });
        
        if (listResponse.ok) {
          const listData = await listResponse.json();
          results.push({
            task: 'list_analysis',
            status: 'success',
            data: listData
          });
          console.log('✅ List analysis completed:', listData.lists_processed);
        }
      } catch (error) {
        results.push({
          task: 'list_analysis',
          status: 'error',
          error: error.message
        });
        console.error('❌ List analysis failed:', error.message);
      }
    }

    // Summary
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'error').length;
    
    console.log(`📊 Orchestrator completed: ${successful} successful, ${failed} failed`);

    return res.status(200).json({
      success: true,
      timestamp: now.toISOString(),
      hour: hour,
      minute: minute,
      day_of_week: dayOfWeek,
      tasks_run: results.length,
      successful: successful,
      failed: failed,
      results: results,
      message: `Orchestrator completed ${results.length} tasks`
    });

  } catch (error) {
    console.error('💥 Orchestrator failed:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}