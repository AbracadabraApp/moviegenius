// pages/api/health.js - Comprehensive health monitoring for MovieGenius
import { healthChecker, quickHealthCheck, fullHealthCheck } from '../../lib/observability/health-checker.js';
import { logger, apiLogger } from '../../lib/observability/logger.js';

export default async function handler(req, res) {
  const startTime = Date.now();
  
  if (req.method === 'GET') {
    const { test, check, format } = req.query;
    
    apiLogger.apiRequest('GET', '/api/health', req.query);
    
    try {
      // Legacy search tests (kept for backward compatibility)
      if (test === 'search') {
        const result = await runSearchTests(req, res);
        apiLogger.apiResponse('GET', '/api/health', 200, Date.now() - startTime);
        return result;
      }
      
      // Comprehensive health checks
      let healthResult;
      
      switch (check) {
        case 'quick':
          healthResult = await quickHealthCheck();
          break;
        case 'full':
          healthResult = await fullHealthCheck();
          break;
        case 'history':
          const history = healthChecker.getHealthHistory(parseInt(req.query.limit) || 10);
          apiLogger.apiResponse('GET', '/api/health', 200, Date.now() - startTime);
          return res.status(200).json({
            service: 'MovieGenius Health History',
            timestamp: new Date().toISOString(),
            history
          });
        case 'last':
          const lastCheck = healthChecker.getLastHealthCheck();
          apiLogger.apiResponse('GET', '/api/health', 200, Date.now() - startTime);
          return res.status(200).json({
            service: 'MovieGenius Last Health Check',
            timestamp: new Date().toISOString(),
            lastCheck
          });
        default:
          // Default: quick health check
          healthResult = await quickHealthCheck();
      }
      
      // Determine HTTP status based on health
      let statusCode = 200;
      if (healthResult.overall === 'critical') {
        statusCode = 503; // Service Unavailable
      } else if (healthResult.overall === 'degraded') {
        statusCode = 200; // OK but with warnings
      }
      
      // Format response
      const response = {
        service: 'MovieGenius',
        timestamp: new Date().toISOString(),
        health: healthResult,
        links: {
          self: '/api/health',
          quick: '/api/health?check=quick',
          full: '/api/health?check=full',
          history: '/api/health?check=history',
          dashboard: '/health-dashboard'
        }
      };
      
      // Simple format for monitoring systems
      if (format === 'simple') {
        const simpleResponse = {
          status: healthResult.overall,
          timestamp: healthResult.timestamp,
          checks_passed: healthResult.summary.passed,
          checks_failed: healthResult.summary.failed,
          critical_failures: healthResult.summary.critical_failed
        };
        apiLogger.apiResponse('GET', '/api/health', statusCode, Date.now() - startTime);
        return res.status(statusCode).json(simpleResponse);
      }
      
      apiLogger.apiResponse('GET', '/api/health', statusCode, Date.now() - startTime, JSON.stringify(response).length);
      return res.status(statusCode).json(response);
      
    } catch (error) {
      logger.error('Health check endpoint failed', { error: error.message }, error);
      apiLogger.apiResponse('GET', '/api/health', 500, Date.now() - startTime);
      
      return res.status(500).json({
        service: 'MovieGenius',
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
        message: 'Health check system failure'
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}

async function runSearchTests(req, res) {
  const results = {
    timestamp: new Date().toISOString(),
    testType: 'search_authentication',
    environment: process.env.NODE_ENV,
    tests: []
  };

  const testQuery = 'fight club';
  
  // Test 1: Check environment variables
  results.tests.push({
    name: 'environment_check',
    bearerToken: !!process.env.TMDB_BEARER_TOKEN,
    bearerJWT: process.env.TMDB_BEARER_TOKEN?.split('.').length === 3,
    serverKey: !!process.env.TMDB_API_KEY,
    publicKey: process.env.NEXT_PUBLIC_TMDB_API_KEY,
    publicKeyIsPlaceholder: process.env.NEXT_PUBLIC_TMDB_API_KEY === 'placeholder'
  });

  // Test 2: TMDB Search with Bearer Token
  try {
    const bearerToken = process.env.TMDB_BEARER_TOKEN;
    if (bearerToken && bearerToken.split('.').length === 3) {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(testQuery)}&include_adult=false&language=en-US`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      results.tests.push({
        name: 'search_bearer',
        status: response.status,
        success: response.ok,
        resultCount: data?.results?.length || 0,
        firstResult: data?.results?.[0]?.title || null,
        error: data?.status_message || null
      });
    } else {
      results.tests.push({
        name: 'search_bearer',
        error: 'No valid Bearer token',
        success: false
      });
    }
  } catch (error) {
    results.tests.push({
      name: 'search_bearer',
      error: error.message,
      success: false
    });
  }

  // Test 3: TMDB Search with API Key (current search endpoint method)
  try {
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || process.env.TMDB_API_KEY;
    if (apiKey && apiKey !== 'placeholder') {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(testQuery)}&include_adult=false&language=en-US`
      );
      
      const data = await response.json();
      results.tests.push({
        name: 'search_api_key',
        status: response.status,
        success: response.ok,
        resultCount: data?.results?.length || 0,
        firstResult: data?.results?.[0]?.title || null,
        error: data?.status_message || null,
        keySource: process.env.NEXT_PUBLIC_TMDB_API_KEY ? 'public' : 'server'
      });
    } else {
      results.tests.push({
        name: 'search_api_key',
        error: 'No valid API key (placeholder detected)',
        success: false,
        keyValue: apiKey
      });
    }
  } catch (error) {
    results.tests.push({
      name: 'search_api_key',
      error: error.message,
      success: false
    });
  }

  // Test 4: Movie Details (for comparison)
  try {
    const bearerToken = process.env.TMDB_BEARER_TOKEN;
    if (bearerToken && bearerToken.split('.').length === 3) {
      const response = await fetch(
        `https://api.themoviedb.org/3/movie/550`,
        {
          headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Accept': 'application/json'
          }
        }
      );
      
      const data = await response.json();
      results.tests.push({
        name: 'details_bearer',
        status: response.status,
        success: response.ok,
        movieTitle: data?.title || null,
        error: data?.status_message || null
      });
    }
  } catch (error) {
    results.tests.push({
      name: 'details_bearer',
      error: error.message,
      success: false
    });
  }

  // Analysis
  const workingTests = results.tests.filter(t => t.success);
  const searchTests = results.tests.filter(t => t.name.includes('search'));
  const detailsTests = results.tests.filter(t => t.name.includes('details'));
  
  results.analysis = {
    workingCount: workingTests.length,
    searchWorking: searchTests.some(t => t.success),
    detailsWorking: detailsTests.some(t => t.success),
    diagnosis: []
  };
  
  if (detailsTests.some(t => t.success) && !searchTests.some(t => t.success)) {
    results.analysis.diagnosis.push('Details work but search fails - authentication method issue');
  }
  
  if (results.tests[0]?.publicKeyIsPlaceholder) {
    results.analysis.diagnosis.push('Search API using placeholder public key');
  }
  
  return res.status(200).json(results);
}
