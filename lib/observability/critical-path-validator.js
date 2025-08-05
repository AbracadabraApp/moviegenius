// lib/observability/critical-path-validator.js - Automated validation of critical user journeys
// Tests essential user flows to ensure production functionality

import { logger } from './logger.js';
import { railwayMonitor } from './railway-monitor.js';

export class CriticalPathValidator {
  constructor() {
    this.paths = new Map();
    this.results = new Map();
    this.setupCriticalPaths();
  }

  setupCriticalPaths() {
    // Critical Path 1: Movie Page Load -> Analysis Display
    this.paths.set('movie_analysis_flow', {
      name: 'Movie Analysis Display Flow',
      description: 'User visits movie page and sees analysis',
      critical: true,
      timeout: 15000,
      steps: [
        { name: 'database_connection', action: 'validateDatabaseConnection' },
        { name: 'movie_lookup', action: 'validateMovieLookup' },
        { name: 'analysis_retrieval', action: 'validateAnalysisRetrieval' },
        { name: 'api_response', action: 'validateMovieAnalysisAPI' },
        { name: 'frontend_rendering', action: 'validateFrontendResponse' }
      ]
    });

    // Critical Path 2: Search -> Results -> Movie Selection
    this.paths.set('search_flow', {
      name: 'Movie Search Flow',
      description: 'User searches for movies and navigates to results',
      critical: true,
      timeout: 10000,
      steps: [
        { name: 'tmdb_api_connection', action: 'validateTMDBConnection' },
        { name: 'search_query', action: 'validateSearchQuery' },
        { name: 'search_results', action: 'validateSearchResults' },
        { name: 'movie_navigation', action: 'validateMovieNavigation' }
      ]
    });

    // Critical Path 3: Essential Movies Availability
    this.paths.set('essential_movies', {
      name: 'Essential Movies Availability',
      description: 'Core movie content is accessible',
      critical: true,
      timeout: 8000,
      steps: [
        { name: 'database_access', action: 'validateDatabaseConnection' },
        { name: 'essential_movies_query', action: 'validateEssentialMovies' },
        { name: 'movie_data_integrity', action: 'validateMovieDataIntegrity' },
        { name: 'analysis_coverage', action: 'validateAnalysisCoverage' }
      ]
    });

    // Critical Path 4: Health Check System
    this.paths.set('health_monitoring', {
      name: 'Health Monitoring System',
      description: 'Monitoring and observability systems are functional',
      critical: false,
      timeout: 5000,
      steps: [
        { name: 'health_endpoint', action: 'validateHealthEndpoint' },
        { name: 'railway_monitor', action: 'validateRailwayMonitor' },
        { name: 'error_tracking', action: 'validateErrorTracking' }
      ]
    });

    // Critical Path 5: Static File System
    this.paths.set('static_files', {
      name: 'Nuclear Static File System',
      description: 'Pre-processed analysis files are available',
      critical: false,
      timeout: 5000,
      steps: [
        { name: 'static_file_access', action: 'validateStaticFileAccess' },
        { name: 'static_content_quality', action: 'validateStaticContentQuality' }
      ]
    });
  }

  // Run validation for a specific critical path
  async validatePath(pathId, options = {}) {
    const startTime = Date.now();
    const path = this.paths.get(pathId);
    
    if (!path) {
      throw new Error(`Critical path '${pathId}' not found`);
    }

    logger.criticalPath(pathId, 'started', {
      path_name: path.name,
      step_count: path.steps.length,
      timeout: path.timeout
    });

    const result = {
      path_id: pathId,
      path_name: path.name,
      description: path.description,
      critical: path.critical,
      status: 'unknown',
      started_at: new Date().toISOString(),
      duration: 0,
      steps: [],
      checkpoints: [],
      errors: [],
      success_rate: 0,
      failure_point: null
    };

    try {
      // Run each step with timeout
      for (let i = 0; i < path.steps.length; i++) {
        const step = path.steps[i];
        const stepStartTime = Date.now();
        
        try {
          // Add checkpoint
          result.checkpoints.push({
            step: step.name,
            timestamp: new Date().toISOString(),
            status: 'started'
          });

          // Execute step with timeout
          const stepResult = await Promise.race([
            this[step.action](options),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error(`Step timeout: ${step.name}`)), path.timeout / path.steps.length)
            )
          ]);

          const stepDuration = Date.now() - stepStartTime;
          
          result.steps.push({
            name: step.name,
            status: 'success',
            duration: stepDuration,
            result: stepResult,
            timestamp: new Date().toISOString()
          });

          result.checkpoints.push({
            step: step.name,
            timestamp: new Date().toISOString(),
            status: 'completed',
            duration: stepDuration
          });

        } catch (stepError) {
          const stepDuration = Date.now() - stepStartTime;
          
          result.steps.push({
            name: step.name,
            status: 'failed',
            duration: stepDuration,
            error: stepError.message,
            timestamp: new Date().toISOString()
          });

          result.errors.push({
            step: step.name,
            error: stepError.message,
            timestamp: new Date().toISOString()
          });

          result.failure_point = step.name;
          break; // Stop on first failure for critical paths
        }
      }

      // Calculate results
      const successfulSteps = result.steps.filter(s => s.status === 'success').length;
      result.success_rate = (successfulSteps / path.steps.length) * 100;
      result.duration = Date.now() - startTime;

      // Determine overall status
      if (result.success_rate === 100) {
        result.status = 'success';
      } else if (result.success_rate >= 80) {
        result.status = 'degraded';
      } else {
        result.status = 'failed';
      }

      // Store result
      this.results.set(pathId, result);

      // Log completion
      logger.criticalPath(pathId, result.status, {
        duration: result.duration,
        success_rate: result.success_rate,
        checkpoints: result.checkpoints.length,
        failure_point: result.failure_point
      });

      return result;

    } catch (error) {
      result.status = 'failed';
      result.duration = Date.now() - startTime;
      result.errors.push({
        step: 'validation_framework',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      logger.criticalPath(pathId, 'failed', {
        duration: result.duration,
        error: error.message,
        failure_point: 'validation_framework'
      });

      return result;
    }
  }

  // Run all critical paths
  async validateAllPaths(options = {}) {
    const startTime = Date.now();
    const results = {};
    
    logger.info('Starting critical path validation', {
      total_paths: this.paths.size,
      critical_only: options.criticalOnly || false
    });

    for (const [pathId, path] of this.paths) {
      if (options.criticalOnly && !path.critical) {
        continue;
      }

      try {
        results[pathId] = await this.validatePath(pathId, options);
      } catch (error) {
        results[pathId] = {
          path_id: pathId,
          status: 'failed',
          error: error.message,
          duration: 0
        };
      }
    }

    const summary = this.generateValidationSummary(results);
    
    logger.info('Critical path validation completed', {
      duration: Date.now() - startTime,
      total_tested: Object.keys(results).length,
      successful: summary.successful,
      failed: summary.failed,
      overall_status: summary.overall_status
    });

    return {
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      summary,
      results
    };
  }

  // Individual validation methods
  async validateDatabaseConnection() {
    const result = await railwayMonitor.testConnection();
    if (!result.success) {
      throw new Error(`Database connection failed: ${result.error}`);
    }
    return {
      connection_time: result.connection_time,
      tests_passed: result.tests ? result.tests.filter(t => t.success).length : 0
    };
  }

  async validateMovieLookup(options = {}) {
    const testMovieId = options.tmdbId || 963; // The Maltese Falcon
    const result = await railwayMonitor.monitorMovieAnalysisQuery(testMovieId);
    
    if (!result.success) {
      throw new Error(`Movie lookup failed: ${result.error}`);
    }
    
    return {
      tmdb_id: testMovieId,
      movie_found: true,
      movie_title: result.movie.title,
      lookup_time: result.performance.movie_lookup_time
    };
  }

  async validateAnalysisRetrieval(options = {}) {
    const testMovieId = options.tmdbId || 963;
    const result = await railwayMonitor.monitorMovieAnalysisQuery(testMovieId);
    
    if (!result.success) {
      throw new Error(`Analysis retrieval failed: ${result.error}`);
    }
    
    if (!result.has_analysis) {
      throw new Error('Movie found but no analysis available');
    }
    
    return {
      tmdb_id: testMovieId,
      has_analysis: result.has_analysis,
      analysis_id: result.analysis_info.id,
      content_length: result.analysis_info.content_length,
      retrieval_time: result.performance.analysis_lookup_time
    };
  }

  async validateMovieAnalysisAPI(options = {}) {
    const testMovieId = options.tmdbId || 963;
    const baseUrl = this.getBaseUrl();
    
    const response = await fetch(`${baseUrl}/api/movie-analysis?tmdbId=${testMovieId}`);
    
    if (!response.ok) {
      throw new Error(`Movie Analysis API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.analysis) {
      throw new Error('Movie Analysis API returned invalid response');
    }
    
    return {
      status_code: response.status,
      has_analysis: !!data.analysis,
      analysis_length: data.analysis.length,
      source: data.source,
      performance: data.performance
    };
  }

  async validateFrontendResponse(options = {}) {
    const testMovieId = options.tmdbId || 963;
    const baseUrl = this.getBaseUrl();
    
    // Simple validation that the movie page loads
    const response = await fetch(`${baseUrl}/movie/${testMovieId}`);
    
    if (!response.ok) {
      throw new Error(`Movie page returned ${response.status}`);
    }
    
    const html = await response.text();
    
    if (!html.includes('<title>') || html.includes('Error')) {
      throw new Error('Movie page appears to have rendering issues');
    }
    
    return {
      status_code: response.status,
      content_length: html.length,
      has_title: html.includes('<title>'),
      appears_valid: !html.includes('Error') && html.length > 1000
    };
  }

  async validateTMDBConnection() {
    const baseUrl = this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/health?test=search`);
    
    if (!response.ok) {
      throw new Error(`TMDB health check failed: ${response.status}`);
    }
    
    const data = await response.json();
    const workingTests = data.tests.filter(t => t.success);
    
    if (workingTests.length === 0) {
      throw new Error('No TMDB authentication methods working');
    }
    
    return {
      working_auth_methods: workingTests.length,
      total_methods: data.tests.length,
      tests: workingTests.map(t => t.name)
    };
  }

  async validateSearchQuery() {
    const baseUrl = this.getBaseUrl();
    const testQuery = 'fight club';
    
    const response = await fetch(`${baseUrl}/api/simple-search?q=${encodeURIComponent(testQuery)}`);
    
    if (!response.ok) {
      throw new Error(`Search API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      throw new Error('Search returned no results for test query');
    }
    
    return {
      query: testQuery,
      result_count: data.results.length,
      has_fight_club: data.results.some(r => r.title && r.title.toLowerCase().includes('fight club'))
    };
  }

  async validateSearchResults() {
    // This would typically test the search results page rendering
    // For now, we'll validate that search results have proper structure
    const baseUrl = this.getBaseUrl();
    const testQuery = 'matrix';
    
    const response = await fetch(`${baseUrl}/api/simple-search?q=${encodeURIComponent(testQuery)}`);
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      throw new Error('Search results validation failed - no results');
    }
    
    const firstResult = data.results[0];
    const hasRequiredFields = firstResult.id && firstResult.title && firstResult.poster_path;
    
    if (!hasRequiredFields) {
      throw new Error('Search results missing required fields');
    }
    
    return {
      result_count: data.results.length,
      first_result_valid: hasRequiredFields,
      sample_result: {
        id: firstResult.id,
        title: firstResult.title,
        has_poster: !!firstResult.poster_path
      }
    };
  }

  async validateMovieNavigation() {
    // Test that we can navigate from search results to a movie page
    const baseUrl = this.getBaseUrl();
    const testMovieId = 11; // Star Wars (commonly available)
    
    const response = await fetch(`${baseUrl}/movie/${testMovieId}`);
    
    if (!response.ok) {
      throw new Error(`Movie navigation failed: ${response.status}`);
    }
    
    return {
      status_code: response.status,
      navigation_successful: true,
      test_movie_id: testMovieId
    };
  }

  async validateEssentialMovies() {
    const result = await railwayMonitor.testConnection();
    
    if (!result.success) {
      throw new Error('Cannot validate essential movies - database connection failed');
    }
    
    const essentialTest = result.tests.find(t => t.name === 'essential_movie_lookup');
    
    if (!essentialTest || !essentialTest.success) {
      throw new Error('Essential movies test failed');
    }
    
    return {
      test_duration: essentialTest.duration,
      movies_found: essentialTest.row_count || 0,
      sample_data: essentialTest.sample_data
    };
  }

  async validateMovieDataIntegrity() {
    const baseUrl = this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/railway-monitor?action=schema`);
    
    if (!response.ok) {
      throw new Error(`Schema validation failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.result.success) {
      throw new Error('Database schema validation failed');
    }
    
    const hasRequiredTables = data.result.schema_info.key_tables_found >= 2;
    
    if (!hasRequiredTables) {
      throw new Error('Required database tables not found');
    }
    
    return {
      total_tables: data.result.schema_info.total_tables,
      key_tables_found: data.result.schema_info.key_tables_found,
      schema_valid: hasRequiredTables
    };
  }

  async validateAnalysisCoverage() {
    const testMovieIds = [963, 539, 550]; // Essential movies
    let coverageCount = 0;
    
    for (const tmdbId of testMovieIds) {
      try {
        const result = await railwayMonitor.monitorMovieAnalysisQuery(tmdbId);
        if (result.success && result.has_analysis) {
          coverageCount++;
        }
      } catch (error) {
        // Continue checking other movies
      }
    }
    
    const coverageRate = (coverageCount / testMovieIds.length) * 100;
    
    if (coverageRate < 50) {
      throw new Error(`Analysis coverage too low: ${coverageRate}%`);
    }
    
    return {
      movies_tested: testMovieIds.length,
      movies_with_analysis: coverageCount,
      coverage_rate: coverageRate
    };
  }

  async validateHealthEndpoint() {
    const baseUrl = this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/health?check=quick`);
    
    if (!response.ok) {
      throw new Error(`Health endpoint failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.health.overall === 'critical') {
      throw new Error('Health endpoint reports critical system status');
    }
    
    return {
      overall_status: data.health.overall,
      checks_passed: data.health.summary.passed,
      checks_failed: data.health.summary.failed
    };
  }

  async validateRailwayMonitor() {
    const baseUrl = this.getBaseUrl();
    const response = await fetch(`${baseUrl}/api/railway-monitor?action=test-connection`);
    
    if (!response.ok) {
      throw new Error(`Railway monitor failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.result.success) {
      throw new Error('Railway monitor reports connection failure');
    }
    
    return {
      connection_successful: data.result.success,
      connection_time: data.result.connection_time,
      tests_passed: data.result.tests ? data.result.tests.filter(t => t.success).length : 0
    };
  }

  async validateErrorTracking() {
    const baseUrl = this.getBaseUrl();
    
    // Test that we can retrieve error tracking data
    const response = await fetch(`${baseUrl}/api/error-tracking?limit=1`);
    
    if (!response.ok) {
      throw new Error(`Error tracking endpoint failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      endpoint_accessible: true,
      total_errors: data.summary?.total_errors || 0,
      recent_errors: data.summary?.recent_errors_1h || 0
    };
  }

  async validateStaticFileAccess() {
    const baseUrl = this.getBaseUrl();
    const testId = 550; // Fight Club
    
    const response = await fetch(`${baseUrl}/nuclear-static/${testId}.json`);
    
    return {
      static_file_available: response.ok,
      status_code: response.status,
      test_file_id: testId
    };
  }

  async validateStaticContentQuality() {
    const baseUrl = this.getBaseUrl();
    const testId = 550;
    
    try {
      const response = await fetch(`${baseUrl}/nuclear-static/${testId}.json`);
      
      if (!response.ok) {
        return {
          static_content_valid: false,
          reason: 'File not accessible'
        };
      }
      
      const data = await response.json();
      const hasProps = data.props && data.props.sections;
      const hasContent = hasProps && data.props.sections.some(s => s.content && s.content.length > 100);
      
      return {
        static_content_valid: hasContent,
        has_props: hasProps,
        section_count: hasProps ? data.props.sections.length : 0,
        has_substantive_content: hasContent
      };
      
    } catch (error) {
      return {
        static_content_valid: false,
        error: error.message
      };
    }
  }

  // Utility methods
  getBaseUrl() {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return process.env.NODE_ENV === 'production' 
      ? 'https://moviegenius-production.up.railway.app'
      : 'http://localhost:3000';
  }

  generateValidationSummary(results) {
    const pathResults = Object.values(results);
    const successful = pathResults.filter(r => r.status === 'success').length;
    const failed = pathResults.filter(r => r.status === 'failed').length;
    const degraded = pathResults.filter(r => r.status === 'degraded').length;
    
    const criticalResults = pathResults.filter(r => r.critical);
    const criticalFailed = criticalResults.filter(r => r.status === 'failed').length;
    
    let overall_status = 'healthy';
    if (criticalFailed > 0) {
      overall_status = 'critical';
    } else if (failed > 0 || degraded > 0) {
      overall_status = 'degraded';
    }
    
    return {
      total_paths: pathResults.length,
      successful,
      failed,
      degraded,
      critical_failed: criticalFailed,
      overall_status,
      success_rate: pathResults.length > 0 ? (successful / pathResults.length * 100).toFixed(1) + '%' : '0%'
    };
  }

  // Get validation history
  getValidationHistory() {
    return Array.from(this.results.values()).sort((a, b) => 
      new Date(b.started_at) - new Date(a.started_at)
    );
  }
}

// Export singleton instance
export const criticalPathValidator = new CriticalPathValidator();

// Convenience functions
export async function validateCriticalPaths() {
  return await criticalPathValidator.validateAllPaths({ criticalOnly: true });
}

export async function validateAllPaths() {
  return await criticalPathValidator.validateAllPaths();
}

export async function validateSinglePath(pathId, options = {}) {
  return await criticalPathValidator.validatePath(pathId, options);
}