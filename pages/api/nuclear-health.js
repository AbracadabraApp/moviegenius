// API route to check nuclear static health and diagnostics
import { diagnoseNuclearStatic, checkNuclearStatic } from '../../lib/nuclear-static';

export default async function handler(req, res) {
  try {
    const startTime = Date.now();
    
    // Basic environment info
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      railwayEnv: process.env.RAILWAY_ENVIRONMENT_NAME,
      cwd: process.cwd(),
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasTmdbKey: !!process.env.NEXT_PUBLIC_TMDB_API_KEY,
      timestamp: new Date().toISOString()
    };
    
    console.log('🔍 Nuclear health check started', envInfo);
    
    // Diagnose nuclear static directory
    const nuclearHealth = await diagnoseNuclearStatic();
    console.log('📊 Nuclear static directory health:', nuclearHealth);
    
    // Test specific movie files
    const testMovies = ['11', '550', '238'];
    const movieTests = {};
    
    for (const tmdbId of testMovies) {
      const testStart = Date.now();
      const result = await checkNuclearStatic(tmdbId);
      movieTests[tmdbId] = {
        success: !!result,
        duration: Date.now() - testStart,
        source: result?.source || 'failed',
        hasTitle: !!result?.title
      };
    }
    
    const totalDuration = Date.now() - startTime;
    
    const healthReport = {
      timestamp: new Date().toISOString(),
      environment: envInfo,
      nuclearHealth,
      movieTests,
      summary: {
        totalDuration,
        nuclearHealthy: nuclearHealth.healthy,
        successfulTests: Object.values(movieTests).filter(t => t.success).length,
        failedTests: Object.values(movieTests).filter(t => !t.success).length
      }
    };
    
    console.log('✅ Nuclear health check complete:', healthReport.summary);
    
    res.status(200).json(healthReport);
    
  } catch (error) {
    console.error('❌ Nuclear health check failed:', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      error: 'Nuclear health check failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}