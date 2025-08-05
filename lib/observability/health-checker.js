// lib/observability/health-checker.js - Comprehensive health monitoring for MovieGenius
// Monitors Railway PostgreSQL, APIs, critical paths, and system health

import { Client } from 'pg';
import { logger, railwayLogger, apiLogger } from './logger.js';

export class HealthChecker {
  constructor() {
    this.checks = new Map();
    this.lastResults = new Map();
    this.healthHistory = [];
    this.maxHistoryEntries = 50;
    
    // Register all health checks
    this.registerChecks();
  }

  registerChecks() {
    // Database connectivity
    this.checks.set('railway_database', {
      name: 'Railway PostgreSQL Connection',
      critical: true,
      timeout: 5000,
      check: this.checkRailwayDatabase.bind(this)
    });

    // Database query performance
    this.checks.set('database_performance', {
      name: 'Database Query Performance',
      critical: true,
      timeout: 3000,
      check: this.checkDatabasePerformance.bind(this)
    });

    // Movie analysis API
    this.checks.set('movie_analysis_api', {
      name: 'Movie Analysis API',
      critical: true,
      timeout: 10000,
      check: this.checkMovieAnalysisAPI.bind(this)
    });

    // TMDB API connectivity
    this.checks.set('tmdb_api', {
      name: 'TMDB API Connection',
      critical: true,
      timeout: 5000,
      check: this.checkTMDBAPI.bind(this)
    });

    // Critical movie data
    this.checks.set('essential_movies', {
      name: 'Essential Movies Data',
      critical: true,
      timeout: 3000,
      check: this.checkEssentialMovies.bind(this)
    });

    // Static file system
    this.checks.set('static_files', {
      name: 'Nuclear Static Files',
      critical: false,
      timeout: 2000,
      check: this.checkStaticFiles.bind(this)
    });

    // Memory and performance
    this.checks.set('system_resources', {
      name: 'System Resources',
      critical: false,
      timeout: 1000,
      check: this.checkSystemResources.bind(this)
    });
  }

  // Run all health checks
  async runHealthChecks(includeNonCritical = true) {
    const startTime = Date.now();
    const results = {
      timestamp: new Date().toISOString(),
      overall: 'unknown',
      duration: 0,
      checks: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        critical_failed: 0
      },
      deployment: {
        id: process.env.RAILWAY_DEPLOYMENT_ID || 'local',
        version: process.env.npm_package_version || '1.0.0'
      }
    };

    logger.info('Starting health check run', { includeNonCritical });

    for (const [checkId, checkConfig] of this.checks) {
      if (!includeNonCritical && !checkConfig.critical) {
        continue;
      }

      results.summary.total++;
      const checkResult = await this.runSingleCheck(checkId, checkConfig);
      results.checks[checkId] = checkResult;

      if (checkResult.status === 'pass') {
        results.summary.passed++;
      } else {
        results.summary.failed++;
        if (checkConfig.critical) {
          results.summary.critical_failed++;
        }
      }
    }

    // Determine overall health
    if (results.summary.critical_failed > 0) {
      results.overall = 'critical';
    } else if (results.summary.failed > 0) {
      results.overall = 'degraded';
    } else {
      results.overall = 'healthy';
    }

    results.duration = Date.now() - startTime;
    
    // Store in history
    this.healthHistory.unshift(results);
    if (this.healthHistory.length > this.maxHistoryEntries) {
      this.healthHistory.pop();
    }

    // Log overall result
    const level = results.overall === 'healthy' ? 'info' : 
                 results.overall === 'degraded' ? 'warn' : 'error';
    logger._log(level, 'Health check completed', {
      overall: results.overall,
      duration: results.duration,
      passed: results.summary.passed,
      failed: results.summary.failed,
      critical_failed: results.summary.critical_failed
    });

    return results;
  }

  // Run a single health check with timeout
  async runSingleCheck(checkId, checkConfig) {
    const startTime = Date.now();
    const result = {
      name: checkConfig.name,
      status: 'unknown',
      duration: 0,
      message: '',
      details: {},
      critical: checkConfig.critical,
      timestamp: new Date().toISOString()
    };

    try {
      // Run check with timeout
      const checkPromise = checkConfig.check();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), checkConfig.timeout);
      });

      const checkResult = await Promise.race([checkPromise, timeoutPromise]);
      
      result.status = checkResult.status || 'pass';
      result.message = checkResult.message || 'Check passed';
      result.details = checkResult.details || {};
      
    } catch (error) {
      result.status = 'fail';
      result.message = error.message || 'Check failed';
      result.details = { error: error.name, stack: error.stack };
      
      logger.error(`Health check failed: ${checkConfig.name}`, {
        checkId,
        error: error.message
      }, error);
    }

    result.duration = Date.now() - startTime;
    this.lastResults.set(checkId, result);
    
    return result;
  }

  // Individual health check implementations
  async checkRailwayDatabase() {
    const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
    
    if (!dbUrl) {
      return {
        status: 'fail',
        message: 'No database URL configured',
        details: { 
          env_vars: Object.keys(process.env).filter(k => k.includes('DATABASE'))
        }
      };
    }

    const client = new Client({ connectionString: dbUrl });
    const startTime = Date.now();
    
    try {
      await client.connect();
      
      // Test basic query
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      const connectionTime = Date.now() - startTime;
      
      railwayLogger.railwayConnection('connected', {
        connectionTime,
        version: result.rows[0].pg_version.split(' ')[0]
      });

      return {
        status: 'pass',
        message: `Connected to Railway PostgreSQL in ${connectionTime}ms`,
        details: {
          connection_time: connectionTime,
          postgres_version: result.rows[0].pg_version,
          current_time: result.rows[0].current_time,
          ssl_enabled: dbUrl.includes('sslmode=require')
        }
      };
      
    } finally {
      await client.end();
    }
  }

  async checkDatabasePerformance() {
    const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
    const client = new Client({ connectionString: dbUrl });
    
    try {
      await client.connect();
      
      // Test critical queries with timing
      const tests = [
        { name: 'movie_lookup', query: 'SELECT COUNT(*) FROM movies WHERE tmdb_id IS NOT NULL' },
        { name: 'analysis_lookup', query: 'SELECT COUNT(*) FROM movie_analyses WHERE created_at > NOW() - INTERVAL \'24 hours\'' },
        { name: 'index_scan', query: 'SELECT tmdb_id FROM movies WHERE tmdb_id = 550 LIMIT 1' }
      ];

      const results = {};
      let totalTime = 0;
      
      for (const test of tests) {
        const startTime = Date.now();
        try {
          const result = await client.query(test.query);
          const duration = Date.now() - startTime;
          totalTime += duration;
          
          results[test.name] = {
            duration,
            success: true,
            rowCount: result.rowCount
          };
          
          // Log slow queries
          if (duration > 1000) {
            logger.warn('Slow database query detected', {
              query: test.name,
              duration,
              threshold: 1000
            });
          }
        } catch (error) {
          results[test.name] = {
            duration: Date.now() - startTime,
            success: false,
            error: error.message
          };
        }
      }

      const avgTime = totalTime / tests.length;
      const status = avgTime > 2000 ? 'fail' : avgTime > 1000 ? 'warn' : 'pass';
      
      return {
        status,
        message: `Database performance: ${avgTime.toFixed(0)}ms average`,
        details: {
          average_query_time: avgTime,
          total_time: totalTime,
          query_results: results,
          performance_threshold: '1000ms warning, 2000ms critical'
        }
      };
      
    } finally {
      await client.end();
    }
  }

  async checkMovieAnalysisAPI() {
    // Test with The Maltese Falcon (TMDB ID: 963) - should be in Railway DB
    const testMovieId = 963;
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${this.getBaseUrl()}/api/movie-analysis?tmdbId=${testMovieId}`, {
        headers: { 'User-Agent': 'MovieGenius-HealthCheck/1.0' }
      });
      
      const duration = Date.now() - startTime;
      const data = await response.json();
      
      if (!response.ok) {
        return {
          status: 'fail',
          message: `Movie Analysis API returned ${response.status}`,
          details: {
            status_code: response.status,
            duration,
            error: data.error || 'Unknown error',
            test_movie_id: testMovieId
          }
        };
      }

      // Validate response structure
      const hasAnalysis = data.analysis || data.rawAnalysis;
      const hasMovie = data.movie;
      const isFromRailway = data.source === 'railway-postgresql';
      
      return {
        status: hasAnalysis && hasMovie ? 'pass' : 'warn',
        message: `Movie Analysis API responding in ${duration}ms`,
        details: {
          duration,
          has_analysis: !!hasAnalysis,
          has_movie: !!hasMovie,
          source: data.source,
          using_railway: isFromRailway,
          test_movie: data.movie?.title || 'Unknown',
          analysis_length: hasAnalysis ? (data.analysis || data.rawAnalysis).length : 0
        }
      };
      
    } catch (error) {
      return {
        status: 'fail',
        message: `Movie Analysis API unreachable: ${error.message}`,
        details: {
          duration: Date.now() - startTime,
          error: error.message,
          test_movie_id: testMovieId
        }
      };
    }
  }

  async checkTMDBAPI() {
    const bearerToken = process.env.TMDB_BEARER_TOKEN;
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
    
    if (!bearerToken && (!apiKey || apiKey === 'placeholder')) {
      return {
        status: 'fail',
        message: 'No TMDB authentication configured',
        details: {
          has_bearer: !!bearerToken,
          has_api_key: !!apiKey,
          api_key_is_placeholder: apiKey === 'placeholder'
        }
      };
    }

    // Test movie details endpoint (more reliable than search)
    const testMovieId = 550; // Fight Club
    const startTime = Date.now();
    
    try {
      const headers = bearerToken 
        ? { 'Authorization': `Bearer ${bearerToken}` }
        : {};
        
      const url = bearerToken 
        ? `https://api.themoviedb.org/3/movie/${testMovieId}`
        : `https://api.themoviedb.org/3/movie/${testMovieId}?api_key=${apiKey}`;
        
      const response = await fetch(url, { headers });
      const duration = Date.now() - startTime;
      const data = await response.json();
      
      if (!response.ok) {
        return {
          status: 'fail',
          message: `TMDB API error: ${data.status_message || response.status}`,
          details: {
            status_code: response.status,
            duration,
            auth_method: bearerToken ? 'bearer' : 'api_key',
            error: data.status_message
          }
        };
      }

      return {
        status: 'pass',
        message: `TMDB API responding in ${duration}ms`,
        details: {
          duration,
          auth_method: bearerToken ? 'bearer' : 'api_key',
          test_movie: data.title,
          rate_limit_remaining: response.headers.get('x-ratelimit-remaining')
        }
      };
      
    } catch (error) {
      return {
        status: 'fail',
        message: `TMDB API unreachable: ${error.message}`,
        details: {
          duration: Date.now() - startTime,
          error: error.message
        }
      };
    }
  }

  async checkEssentialMovies() {
    const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
    const client = new Client({ connectionString: dbUrl });
    
    try {
      await client.connect();
      
      // Check for essential movies that should be in Railway DB
      const essentialIds = [963, 539, 550, 11, 238]; // The Maltese Falcon, Psycho, Fight Club, The Godfather, Citizen Kane
      const query = 'SELECT tmdb_id, title, year FROM movies WHERE tmdb_id = ANY($1)';
      const result = await client.query(query, [essentialIds]);
      
      const foundMovies = result.rows;
      const foundIds = foundMovies.map(m => m.tmdb_id);
      const missingIds = essentialIds.filter(id => !foundIds.includes(id));
      
      // Check for analyses
      const analysisQuery = 'SELECT COUNT(*) as count FROM movie_analyses ma JOIN movies m ON ma.movie_id = m.id WHERE m.tmdb_id = ANY($1)';
      const analysisResult = await client.query(analysisQuery, [foundIds]);
      const analysisCount = parseInt(analysisResult.rows[0].count);
      
      const status = missingIds.length === 0 ? 'pass' : 'warn';
      
      return {
        status,
        message: `Essential movies: ${foundMovies.length}/${essentialIds.length} found, ${analysisCount} with analysis`,
        details: {
          total_essential: essentialIds.length,
          found: foundMovies.length,
          missing: missingIds.length,
          missing_ids: missingIds,
          with_analysis: analysisCount,
          found_movies: foundMovies.map(m => ({ id: m.tmdb_id, title: m.title, year: m.year }))
        }
      };
      
    } finally {
      await client.end();
    }
  }

  async checkStaticFiles() {
    try {
      // Check if nuclear static files exist for key movies
      const testIds = [550, 238, 11]; // Fight Club, The Godfather, Citizen Kane
      const results = {};
      
      for (const id of testIds) {
        try {
          const response = await fetch(`${this.getBaseUrl()}/nuclear-static/${id}.json`);
          results[id] = {
            exists: response.ok,
            status: response.status,
            size: response.headers.get('content-length')
          };
        } catch (error) {
          results[id] = {
            exists: false,
            error: error.message
          };
        }
      }
      
      const existingFiles = Object.values(results).filter(r => r.exists).length;
      
      return {
        status: existingFiles > 0 ? 'pass' : 'warn',
        message: `Nuclear static files: ${existingFiles}/${testIds.length} available`,
        details: {
          tested_files: testIds.length,
          existing_files: existingFiles,
          file_results: results
        }
      };
      
    } catch (error) {
      return {
        status: 'warn',
        message: `Static file check failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  async checkSystemResources() {
    try {
      const memUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      // Convert bytes to MB
      const memoryMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };
      
      // Simple memory usage check (Railway typically provides 512MB-1GB)
      const highMemoryUsage = memoryMB.rss > 400; // 400MB threshold
      
      return {
        status: highMemoryUsage ? 'warn' : 'pass',
        message: `System resources: ${memoryMB.rss}MB RSS, ${Math.round(uptime/60)}min uptime`,
        details: {
          memory_mb: memoryMB,
          uptime_seconds: Math.round(uptime),
          uptime_minutes: Math.round(uptime / 60),
          high_memory_usage: highMemoryUsage,
          node_version: process.version,
          platform: process.platform
        }
      };
      
    } catch (error) {
      return {
        status: 'warn',
        message: `System resource check failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  // Get health check history
  getHealthHistory(limit = 10) {
    return this.healthHistory.slice(0, limit);
  }

  // Get last health check result
  getLastHealthCheck() {
    return this.healthHistory[0] || null;
  }

  // Utility to get base URL for internal requests
  getBaseUrl() {
    if (process.env.NODE_ENV === 'production') {
      return process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : 'https://moviegenius-production.up.railway.app';
    }
    return 'http://localhost:3000';
  }
}

// Export singleton instance
export const healthChecker = new HealthChecker();

// Quick health check function for API endpoints
export async function quickHealthCheck() {
  return await healthChecker.runHealthChecks(false); // Only critical checks
}

// Full health check function
export async function fullHealthCheck() {
  return await healthChecker.runHealthChecks(true); // All checks
}