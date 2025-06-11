// Background job for warming Claude analysis cache
// Designed to run slowly over 24-48 hours to avoid rate limits and costs

import getCache from '../../lib/cache.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Job state management
let currentJob = null;
const JOB_STATE = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ERROR: 'error'
};

export default async function handler(req, res) {
  const { action, priority = 'normal' } = req.body;

  // Security check
  const adminToken = req.headers.authorization?.replace('Bearer ', '');
  const isAuthorized = process.env.NODE_ENV === 'development' || 
                      adminToken === process.env.CACHE_WARMING_TOKEN;

  if (!isAuthorized) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (action) {
      case 'start':
        return await startAnalysisWarming(res, priority);
      case 'pause':
        return pauseJob(res);
      case 'resume':
        return resumeJob(res);
      case 'stop':
        return stopJob(res);
      case 'status':
        return getJobStatus(res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Background warming error:', error);
    return res.status(500).json({ 
      error: 'Background warming failed', 
      details: error.message 
    });
  }
}

async function startAnalysisWarming(res, priority) {
  if (currentJob && currentJob.state === JOB_STATE.RUNNING) {
    return res.json({
      success: false,
      message: 'Job already running',
      job: getJobSummary()
    });
  }

  // Initialize job
  currentJob = {
    id: `analysis-warming-${Date.now()}`,
    state: JOB_STATE.RUNNING,
    priority,
    startTime: Date.now(),
    progress: {
      total: 0,
      processed: 0,
      cached: 0,
      generated: 0,
      errors: 0,
      currentBatch: 0
    },
    config: {
      batchSize: priority === 'high' ? 5 : 2, // Smaller batches for rate limiting
      delayBetweenRequests: priority === 'high' ? 3000 : 5000, // Longer delays for safety
      maxConcurrent: 1 // One at a time to avoid overwhelming Claude
    },
    estimatedCost: 0,
    lastUpdate: Date.now()
  };

  // Start the background process (don't await - let it run in background)
  runAnalysisWarmingJob().catch(error => {
    console.error('Background job error:', error);
    if (currentJob) {
      currentJob.state = JOB_STATE.ERROR;
      currentJob.error = error.message;
    }
  });

  return res.json({
    success: true,
    message: 'Analysis warming job started',
    job: getJobSummary()
  });
}

async function runAnalysisWarmingJob() {
  const cache = getCache();
  
  try {
    // Get movies to process based on priority
    const movies = await getMoviesToProcess();
    currentJob.progress.total = movies.length;
    
    console.log(`🧠 Starting analysis warming for ${movies.length} movies`);

    for (let i = 0; i < movies.length; i += currentJob.config.batchSize) {
      // Check if job should continue
      if (currentJob.state !== JOB_STATE.RUNNING) {
        console.log(`⏸️  Job paused/stopped at movie ${i}`);
        break;
      }

      const batch = movies.slice(i, i + currentJob.config.batchSize);
      currentJob.progress.currentBatch = Math.floor(i / currentJob.config.batchSize) + 1;
      
      console.log(`🔄 Processing batch ${currentJob.progress.currentBatch} (movies ${i + 1}-${Math.min(i + currentJob.config.batchSize, movies.length)})`);

      // Process batch sequentially to avoid rate limits
      for (const movie of batch) {
        try {
          const result = await warmMovieAnalysis(cache, movie);
          
          currentJob.progress.processed++;
          if (result.wasGenerated) {
            currentJob.progress.generated++;
            currentJob.estimatedCost += 0.10; // Rough estimate per analysis
          } else {
            currentJob.progress.cached++;
          }
          
          // Rate limiting delay between requests
          await new Promise(resolve => setTimeout(resolve, currentJob.config.delayBetweenRequests));
          
        } catch (error) {
          console.error(`Failed to warm analysis for ${movie.title}:`, error);
          currentJob.progress.errors++;
        }
      }
      
      // Update job status
      currentJob.lastUpdate = Date.now();
      
      // Longer delay between batches
      if (i + currentJob.config.batchSize < movies.length) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 second batch delay
      }
    }

    // Job completed
    currentJob.state = JOB_STATE.COMPLETED;
    currentJob.endTime = Date.now();
    currentJob.duration = currentJob.endTime - currentJob.startTime;
    
    console.log(`✅ Analysis warming job completed in ${Math.floor(currentJob.duration / 60000)} minutes`);
    console.log(`📊 Generated: ${currentJob.progress.generated}, Cached: ${currentJob.progress.cached}, Errors: ${currentJob.progress.errors}`);
    console.log(`💰 Estimated cost: $${currentJob.estimatedCost.toFixed(2)}`);

  } catch (error) {
    currentJob.state = JOB_STATE.ERROR;
    currentJob.error = error.message;
    console.error('Analysis warming job failed:', error);
  }
}

async function getMoviesToProcess() {
  // Priority order: AFI movies, then recent releases, then all others
  const queries = [
    // AFI Top 100 (highest priority)
    supabase
      .from('movies')
      .select('tmdb_id, title, year')
      .in('tmdb_id', [238, 278, 240, 424, 389, 129, 346, 19404, 13, 769, 19995, 680, 155, 508, 497, 324, 14, 527, 122, 807])
      .limit(100),
    
    // Recent releases (2020+)
    supabase
      .from('movies')
      .select('tmdb_id, title, year')
      .gte('year', 2020)
      .limit(200),
      
    // All other movies
    supabase
      .from('movies')
      .select('tmdb_id, title, year')
      .lt('year', 2020)
      .order('tmdb_id')
  ];

  const results = await Promise.allSettled(queries);
  const allMovies = [];
  
  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value.data) {
      allMovies.push(...result.value.data);
    }
  });

  // Remove duplicates by tmdb_id
  const uniqueMovies = allMovies.filter((movie, index, self) => 
    index === self.findIndex(m => m.tmdb_id === movie.tmdb_id)
  );

  return uniqueMovies;
}

async function warmMovieAnalysis(cache, movie) {
  const analysisCacheKey = cache.redis.generateKey('movie_analysis', movie.tmdb_id);
  const exists = await cache.redis.get(analysisCacheKey);
  
  if (exists && exists.data) {
    return { wasGenerated: false, cached: true };
  }

  try {
    // Generate analysis by calling the movie-analysis API
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/movie-analysis`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          tmdb_id: movie.tmdb_id,
          title: movie.title,
          year: movie.year
        })
      }
    );

    if (response.ok) {
      console.log(`✨ Generated analysis for ${movie.title} (${movie.year})`);
      return { wasGenerated: true, cached: false };
    } else {
      throw new Error(`API responded with status ${response.status}`);
    }
  } catch (error) {
    console.error(`Failed to generate analysis for ${movie.title}:`, error);
    throw error;
  }
}

function pauseJob(res) {
  if (currentJob && currentJob.state === JOB_STATE.RUNNING) {
    currentJob.state = JOB_STATE.PAUSED;
    return res.json({
      success: true,
      message: 'Job paused',
      job: getJobSummary()
    });
  }
  
  return res.json({
    success: false,
    message: 'No running job to pause'
  });
}

function resumeJob(res) {
  if (currentJob && currentJob.state === JOB_STATE.PAUSED) {
    currentJob.state = JOB_STATE.RUNNING;
    
    // Resume the job
    runAnalysisWarmingJob().catch(error => {
      console.error('Resume job error:', error);
      if (currentJob) {
        currentJob.state = JOB_STATE.ERROR;
        currentJob.error = error.message;
      }
    });
    
    return res.json({
      success: true,
      message: 'Job resumed',
      job: getJobSummary()
    });
  }
  
  return res.json({
    success: false,
    message: 'No paused job to resume'
  });
}

function stopJob(res) {
  if (currentJob && [JOB_STATE.RUNNING, JOB_STATE.PAUSED].includes(currentJob.state)) {
    currentJob.state = JOB_STATE.COMPLETED;
    currentJob.endTime = Date.now();
    currentJob.duration = currentJob.endTime - currentJob.startTime;
    
    return res.json({
      success: true,
      message: 'Job stopped',
      job: getJobSummary()
    });
  }
  
  return res.json({
    success: false,
    message: 'No active job to stop'
  });
}

function getJobStatus(res) {
  return res.json({
    success: true,
    job: currentJob ? getJobSummary() : null
  });
}

function getJobSummary() {
  if (!currentJob) return null;
  
  const now = Date.now();
  const elapsed = now - currentJob.startTime;
  const progress = currentJob.progress.total > 0 
    ? ((currentJob.progress.processed / currentJob.progress.total) * 100).toFixed(1)
    : 0;
  
  // Estimate remaining time
  const avgTimePerMovie = currentJob.progress.processed > 0 
    ? elapsed / currentJob.progress.processed 
    : 0;
  const remainingMovies = currentJob.progress.total - currentJob.progress.processed;
  const estimatedRemainingTime = avgTimePerMovie * remainingMovies;
  
  return {
    id: currentJob.id,
    state: currentJob.state,
    priority: currentJob.priority,
    progress: {
      ...currentJob.progress,
      percentage: `${progress}%`,
      eta: estimatedRemainingTime > 0 
        ? `${Math.floor(estimatedRemainingTime / 60000)} minutes`
        : 'N/A'
    },
    timing: {
      elapsed: `${Math.floor(elapsed / 60000)} minutes`,
      estimatedTotal: estimatedRemainingTime > 0 
        ? `${Math.floor((elapsed + estimatedRemainingTime) / 60000)} minutes`
        : 'N/A'
    },
    estimatedCost: `$${currentJob.estimatedCost.toFixed(2)}`,
    lastUpdate: new Date(currentJob.lastUpdate).toISOString(),
    error: currentJob.error || null
  };
}