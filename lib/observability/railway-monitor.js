// lib/observability/railway-monitor.js - Railway PostgreSQL monitoring and validation
// Comprehensive monitoring for Railway database connectivity, performance, and health

import { Client } from 'pg';
import { railwayLogger, dbLogger, logger } from './logger.js';

export class RailwayMonitor {
  constructor() {
    this.connectionPool = new Map();
    this.metrics = {
      connections: {
        total: 0,
        active: 0,
        failed: 0,
        avgConnectionTime: 0
      },
      queries: {
        total: 0,
        successful: 0,
        failed: 0,
        avgResponseTime: 0,
        slowQueries: 0
      },
      errors: []
    };
    this.lastHealthCheck = null;
    this.slowQueryThreshold = 1000; // 1 second
  }

  // Get Railway connection configuration
  getConnectionConfig() {
    const dbUrl = process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL;
    
    if (!dbUrl) {
      return {
        configured: false,
        error: 'No database URL found in environment variables',
        available_vars: Object.keys(process.env).filter(k => k.includes('DATABASE'))
      };
    }

    // Parse connection string for monitoring
    try {
      const url = new URL(dbUrl);
      return {
        configured: true,
        host: url.hostname,
        port: url.port || 5432,
        database: url.pathname.substring(1),
        username: url.username,
        ssl: dbUrl.includes('sslmode=require'),
        railway_host: url.hostname.includes('railway.app') || url.hostname.includes('postgres.railway'),
        connection_string_length: dbUrl.length
      };
    } catch (error) {
      return {
        configured: false,
        error: 'Invalid database URL format',
        details: error.message
      };
    }
  }

  // Test database connectivity with comprehensive validation
  async testConnection() {
    const startTime = Date.now();
    const config = this.getConnectionConfig();
    
    if (!config.configured) {
      const error = new Error(config.error);
      railwayLogger.error('Railway connection test failed - configuration error', config);
      return {
        success: false,
        error: config.error,
        config,
        duration: Date.now() - startTime
      };
    }

    let client = null;
    try {
      client = new Client({ connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL });
      
      // Test connection with timeout
      const connectStart = Date.now();
      await Promise.race([
        client.connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 10000))
      ]);
      const connectTime = Date.now() - connectStart;

      // Test basic functionality
      const tests = await this.runConnectionTests(client);
      
      // Update metrics
      this.metrics.connections.total++;
      this.metrics.connections.avgConnectionTime = 
        (this.metrics.connections.avgConnectionTime * (this.metrics.connections.total - 1) + connectTime) / 
        this.metrics.connections.total;

      const result = {
        success: true,
        config,
        connection_time: connectTime,
        tests,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      railwayLogger.info('Railway connection test successful', {
        connection_time: connectTime,
        tests_passed: tests.filter(t => t.success).length,
        total_tests: tests.length
      });

      return result;

    } catch (error) {
      this.metrics.connections.failed++;
      this.metrics.errors.push({
        type: 'connection_error',
        message: error.message,
        timestamp: new Date().toISOString()
      });

      railwayLogger.error('Railway connection test failed', {
        error: error.message,
        duration: Date.now() - startTime,
        config: config.configured ? 'valid' : 'invalid'
      }, error);

      return {
        success: false,
        error: error.message,
        config,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

    } finally {
      if (client) {
        try {
          await client.end();
        } catch (closeError) {
          railwayLogger.warn('Failed to close test connection', { error: closeError.message });
        }
      }
    }
  }

  // Run comprehensive connection tests
  async runConnectionTests(client) {
    const tests = [
      {
        name: 'basic_query',
        description: 'Test basic SELECT query',
        query: 'SELECT NOW() as current_time, version() as version',
        critical: true
      },
      {
        name: 'movies_table_access',
        description: 'Test movies table access',
        query: 'SELECT COUNT(*) as movie_count FROM movies LIMIT 1',
        critical: true
      },
      {
        name: 'movie_analyses_table_access',
        description: 'Test movie_analyses table access',
        query: 'SELECT COUNT(*) as analysis_count FROM movie_analyses LIMIT 1',
        critical: true
      },
      {
        name: 'essential_movie_lookup',
        description: 'Test essential movie lookup performance',
        query: 'SELECT tmdb_id, title FROM movies WHERE tmdb_id IN (963, 539, 550) LIMIT 3',
        critical: false
      },
      {
        name: 'analysis_join_performance',
        description: 'Test analysis join query performance',
        query: `SELECT m.tmdb_id, m.title, ma.id as analysis_id 
                 FROM movies m 
                 LEFT JOIN movie_analyses ma ON m.id = ma.movie_id 
                 WHERE m.tmdb_id = 963 
                 LIMIT 1`,
        critical: false
      },
      {
        name: 'transaction_support',
        description: 'Test transaction support',
        query: 'BEGIN; SELECT 1; ROLLBACK;',
        critical: false
      }
    ];

    const results = [];

    for (const test of tests) {
      const testStart = Date.now();
      try {
        const result = await client.query(test.query);
        const duration = Date.now() - testStart;

        // Track slow queries
        if (duration > this.slowQueryThreshold) {
          this.metrics.queries.slowQueries++;
          dbLogger.warn('Slow query detected in connection test', {
            test: test.name,
            duration,
            threshold: this.slowQueryThreshold,
            query: test.query.substring(0, 100) + '...'
          });
        }

        // Update metrics
        this.metrics.queries.total++;
        this.metrics.queries.successful++;
        this.metrics.queries.avgResponseTime = 
          (this.metrics.queries.avgResponseTime * (this.metrics.queries.successful - 1) + duration) / 
          this.metrics.queries.successful;

        results.push({
          name: test.name,
          description: test.description,
          success: true,
          duration,
          row_count: result.rowCount,
          critical: test.critical,
          sample_data: this.sanitizeRowData(result.rows[0])
        });

      } catch (error) {
        this.metrics.queries.total++;
        this.metrics.queries.failed++;
        this.metrics.errors.push({
          type: 'query_error',
          test: test.name,
          message: error.message,
          timestamp: new Date().toISOString()
        });

        results.push({
          name: test.name,
          description: test.description,
          success: false,
          duration: Date.now() - testStart,
          error: error.message,
          critical: test.critical
        });

        dbLogger.error('Connection test query failed', {
          test: test.name,
          query: test.query.substring(0, 100) + '...',
          error: error.message
        }, error);
      }
    }

    return results;
  }

  // Monitor specific movie analysis query
  async monitorMovieAnalysisQuery(tmdbId) {
    const startTime = Date.now();
    let client = null;

    try {
      client = new Client({ connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL });
      await client.connect();

      // Step 1: Movie lookup
      const movieStart = Date.now();
      const movieQuery = 'SELECT id, title, year FROM movies WHERE tmdb_id = $1';
      const movieResult = await client.query(movieQuery, [parseInt(tmdbId)]);
      const movieTime = Date.now() - movieStart;

      if (movieResult.rows.length === 0) {
        return {
          success: false,
          error: 'Movie not found',
          tmdb_id: tmdbId,
          steps: {
            movie_lookup: { duration: movieTime, success: false }
          }
        };
      }

      const movie = movieResult.rows[0];

      // Step 2: Analysis lookup
      const analysisStart = Date.now();
      const analysisQuery = 'SELECT id, created_at, LENGTH(claude_response::text) as content_length FROM movie_analyses WHERE movie_id = $1 ORDER BY created_at DESC LIMIT 1';
      const analysisResult = await client.query(analysisQuery, [movie.id]);
      const analysisTime = Date.now() - analysisStart;

      const totalTime = Date.now() - startTime;

      const result = {
        success: true,
        tmdb_id: tmdbId,
        movie: {
          id: movie.id,
          title: movie.title,
          year: movie.year
        },
        has_analysis: analysisResult.rows.length > 0,
        analysis_info: analysisResult.rows.length > 0 ? {
          id: analysisResult.rows[0].id,
          created_at: analysisResult.rows[0].created_at,
          content_length: analysisResult.rows[0].content_length
        } : null,
        performance: {
          total_time: totalTime,
          movie_lookup_time: movieTime,
          analysis_lookup_time: analysisTime
        },
        steps: {
          movie_lookup: { duration: movieTime, success: true, rows: movieResult.rowCount },
          analysis_lookup: { duration: analysisTime, success: true, rows: analysisResult.rowCount }
        }
      };

      // Log performance metrics
      railwayLogger.performance('movie_analysis_query', totalTime, {
        tmdb_id: tmdbId,
        has_analysis: result.has_analysis,
        movie_lookup_time: movieTime,
        analysis_lookup_time: analysisTime
      });

      return result;

    } catch (error) {
      this.metrics.errors.push({
        type: 'monitor_query_error',
        tmdb_id: tmdbId,
        message: error.message,
        timestamp: new Date().toISOString()
      });

      railwayLogger.error('Movie analysis query monitoring failed', {
        tmdb_id: tmdbId,
        duration: Date.now() - startTime,
        error: error.message
      }, error);

      return {
        success: false,
        tmdb_id: tmdbId,
        error: error.message,
        duration: Date.now() - startTime
      };

    } finally {
      if (client) {
        try {
          await client.end();
        } catch (closeError) {
          railwayLogger.warn('Failed to close monitoring connection', { tmdb_id: tmdbId });
        }
      }
    }
  }

  // Get database schema information
  async getDatabaseSchema() {
    let client = null;
    try {
      client = new Client({ connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL });
      await client.connect();

      // Get table information
      const tablesQuery = `
        SELECT 
          table_name,
          table_schema,
          table_type
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;
      const tablesResult = await client.query(tablesQuery);

      // Get column information for key tables
      const columnsQuery = `
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name IN ('movies', 'movie_analyses')
        ORDER BY table_name, ordinal_position
      `;
      const columnsResult = await client.query(columnsQuery);

      // Get index information
      const indexesQuery = `
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND tablename IN ('movies', 'movie_analyses')
        ORDER BY tablename, indexname
      `;
      const indexesResult = await client.query(indexesQuery);

      return {
        success: true,
        tables: tablesResult.rows,
        columns: columnsResult.rows,
        indexes: indexesResult.rows,
        schema_info: {
          total_tables: tablesResult.rowCount,
          key_tables_found: tablesResult.rows.filter(t => ['movies', 'movie_analyses'].includes(t.table_name)).length
        }
      };

    } catch (error) {
      railwayLogger.error('Database schema query failed', { error: error.message }, error);
      return {
        success: false,
        error: error.message
      };

    } finally {
      if (client) {
        try {
          await client.end();
        } catch (closeError) {
          railwayLogger.warn('Failed to close schema query connection');
        }
      }
    }
  }

  // Get current metrics
  getMetrics() {
    return {
      ...this.metrics,
      error_rate: this.metrics.queries.total > 0 ? 
        (this.metrics.queries.failed / this.metrics.queries.total * 100).toFixed(2) + '%' : '0%',
      connection_success_rate: this.metrics.connections.total > 0 ?
        ((this.metrics.connections.total - this.metrics.connections.failed) / this.metrics.connections.total * 100).toFixed(2) + '%' : '0%',
      recent_errors: this.metrics.errors.slice(-10), // Last 10 errors
      timestamp: new Date().toISOString()
    };
  }

  // Clear metrics (useful for fresh starts)
  clearMetrics() {
    this.metrics = {
      connections: { total: 0, active: 0, failed: 0, avgConnectionTime: 0 },
      queries: { total: 0, successful: 0, failed: 0, avgResponseTime: 0, slowQueries: 0 },
      errors: []
    };
    railwayLogger.info('Railway monitor metrics cleared');
  }

  // Sanitize row data for logging (remove sensitive info)
  sanitizeRowData(row) {
    if (!row) return null;
    
    const sanitized = { ...row };
    
    // Remove or truncate potentially sensitive fields
    if (sanitized.claude_response) {
      sanitized.claude_response = `[${typeof sanitized.claude_response}] ${JSON.stringify(sanitized.claude_response).length} chars`;
    }
    
    return sanitized;
  }
}

// Export singleton instance
export const railwayMonitor = new RailwayMonitor();

// Convenience functions
export async function testRailwayConnection() {
  return await railwayMonitor.testConnection();
}

export async function monitorMovieQuery(tmdbId) {
  return await railwayMonitor.monitorMovieAnalysisQuery(tmdbId);
}

export function getRailwayMetrics() {
  return railwayMonitor.getMetrics();
}