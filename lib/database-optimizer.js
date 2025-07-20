/**
 * Database Performance Optimizer
 *
 * Implements and manages database indexes for optimal query performance.
 * Includes performance measurement, index monitoring, and automated optimization.
 *
 * Critical optimizations:
 * - Movie title+year compound indexes for exact lookups
 * - TMDB ID indexes for data enrichment
 * - Text search GIN indexes for fuzzy matching
 * - Cache expiration cleanup optimization
 * - Batch processing acceleration
 */

import { createClient } from '@supabase/supabase-js';
import { getPerformanceMonitor } from './performance-monitor.js';

/**
 * Database Optimizer Class
 *
 * Manages database indexes, query performance monitoring,
 * and automated optimization recommendations.
 */
class DatabaseOptimizer {
  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.monitor = getPerformanceMonitor();

    // Track query performance for optimization recommendations
    this.queryStats = new Map();
    this.slowQueryThreshold = 1000; // 1 second
  }

  /**
   * Critical database indexes for immediate performance improvement
   */
  async createCriticalIndexes() {
    console.log('🚀 Creating critical database indexes...');
    const startTime = Date.now();

    const criticalIndexes = [
      {
        name: 'idx_movies_title_year',
        table: 'movies',
        sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_title_year ON movies(title, year)',
        description: 'Compound index for exact movie lookups',
      },
      {
        name: 'idx_movies_tmdb_id',
        table: 'movies',
        sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_tmdb_id ON movies(tmdb_id) WHERE tmdb_id IS NOT NULL',
        description: 'TMDB ID lookups for data enrichment',
      },
      {
        name: 'idx_movie_analyses_movie_type',
        table: 'movie_analyses',
        sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movie_analyses_movie_type ON movie_analyses(movie_id, analysis_type)',
        description: 'Movie analysis retrieval optimization',
      },
      {
        name: 'idx_query_cache_hash',
        table: 'query_cache',
        sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_cache_hash ON query_cache(query_hash)',
        description: 'Cache lookup optimization',
      },
      {
        name: 'idx_query_cache_expires',
        table: 'query_cache',
        sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_cache_expires ON query_cache(expires_at)',
        description: 'Cache cleanup optimization',
      },
      {
        name: 'idx_movies_created_at',
        table: 'movies',
        sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_created_at ON movies(created_at DESC)',
        description: 'Sorted movie lists performance',
      },
    ];

    const results = [];

    for (const index of criticalIndexes) {
      try {
        const indexStartTime = Date.now();

        // Check if index already exists
        const { data: existingIndex } = await this.supabase
          .from('pg_indexes')
          .select('indexname')
          .eq('indexname', index.name)
          .single();

        if (existingIndex) {
          console.log(`✅ Index ${index.name} already exists`);
          results.push({
            ...index,
            status: 'exists',
            duration: 0,
          });
          continue;
        }

        // Create the index
        const { error } = await this.supabase.rpc('exec_sql', {
          sql: index.sql,
        });

        const duration = Date.now() - indexStartTime;

        if (error) {
          console.error(`❌ Failed to create index ${index.name}:`, error);
          results.push({
            ...index,
            status: 'error',
            error: error.message,
            duration,
          });
        } else {
          console.log(`✅ Created index ${index.name} (${duration}ms)`);
          results.push({
            ...index,
            status: 'created',
            duration,
          });
        }

        // Track performance improvement
        this.monitor.trackMetric('database_index_creation', duration, {
          index_name: index.name,
          table: index.table,
          status: error ? 'error' : 'created',
        });
      } catch (error) {
        console.error(`💥 Error creating index ${index.name}:`, error);
        results.push({
          ...index,
          status: 'exception',
          error: error.message,
          duration: 0,
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`🎯 Critical indexes completed in ${totalDuration}ms`);

    this.monitor.trackMetric('database_optimization_phase', totalDuration, {
      phase: 'critical_indexes',
      indexes_created: results.filter(r => r.status === 'created').length,
      indexes_existing: results.filter(r => r.status === 'exists').length,
      indexes_failed: results.filter(r => r.status === 'error' || r.status === 'exception').length,
    });

    return results;
  }

  /**
   * Text search indexes for fuzzy matching performance
   */
  async createTextSearchIndexes() {
    console.log('🔍 Creating text search indexes...');

    const textIndexes = [
      {
        name: 'idx_movies_title_gin',
        sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_title_gin ON movies USING GIN(title gin_trgm_ops)',
        description: 'Fuzzy title search optimization',
      },
      {
        name: 'idx_movies_official_title_gin',
        sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_official_title_gin ON movies USING GIN(official_title gin_trgm_ops)',
        description: 'Fuzzy official title search',
      },
      {
        name: 'idx_movies_slug_gin',
        sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_slug_gin ON movies USING GIN(slug gin_trgm_ops)',
        description: 'Fuzzy description search',
      },
      {
        name: 'idx_people_name_gin',
        sql: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_people_name_gin ON people USING GIN(name gin_trgm_ops)',
        description: 'Fuzzy person name search',
      },
    ];

    // First enable pg_trgm extension if not already enabled
    try {
      await this.supabase.rpc('exec_sql', {
        sql: 'CREATE EXTENSION IF NOT EXISTS pg_trgm',
      });
      console.log('✅ pg_trgm extension enabled');
    } catch (error) {
      console.warn('⚠️ Could not enable pg_trgm extension:', error.message);
    }

    const results = [];

    for (const index of textIndexes) {
      try {
        const startTime = Date.now();

        const { error } = await this.supabase.rpc('exec_sql', {
          sql: index.sql,
        });

        const duration = Date.now() - startTime;

        if (error) {
          console.error(`❌ Failed to create text index ${index.name}:`, error);
          results.push({ ...index, status: 'error', error: error.message, duration });
        } else {
          console.log(`✅ Created text index ${index.name} (${duration}ms)`);
          results.push({ ...index, status: 'created', duration });
        }
      } catch (error) {
        console.error(`💥 Error creating text index ${index.name}:`, error);
        results.push({ ...index, status: 'exception', error: error.message });
      }
    }

    return results;
  }

  /**
   * Measure query performance with automatic optimization detection
   */
  async measureQueryPerformance(queryName, queryFunction, context = {}) {
    const startTime = Date.now();
    let result,
      error = null;

    try {
      result = await queryFunction();
    } catch (queryError) {
      error = queryError;
    }

    const duration = Date.now() - startTime;

    // Track query performance
    this.monitor.trackMetric(`database_query_${queryName}`, duration, {
      ...context,
      success: !error,
      slow_query: duration > this.slowQueryThreshold,
    });

    // Update query statistics
    if (!this.queryStats.has(queryName)) {
      this.queryStats.set(queryName, {
        totalExecutions: 0,
        totalTime: 0,
        slowQueries: 0,
        averageTime: 0,
        lastExecuted: Date.now(),
      });
    }

    const stats = this.queryStats.get(queryName);
    stats.totalExecutions++;
    stats.totalTime += duration;
    stats.averageTime = stats.totalTime / stats.totalExecutions;
    stats.lastExecuted = Date.now();

    if (duration > this.slowQueryThreshold) {
      stats.slowQueries++;
      console.warn(`🐌 Slow query detected: ${queryName} took ${duration}ms`);
    }

    // Log performance for analysis
    if (duration > 100) {
      // Log queries over 100ms
      console.log(`📊 Query performance: ${queryName} = ${duration}ms`);
    }

    if (error) {
      throw error;
    }

    return result;
  }

  /**
   * Optimized movie lookup by title and year
   */
  async lookupMovie(title, year) {
    return await this.measureQueryPerformance(
      'movie_title_year_lookup',
      async () => {
        const { data, error } = await this.supabase
          .from('movies')
          .select('*')
          .eq('title', title)
          .eq('year', year)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        return data;
      },
      { title: title.substring(0, 30), year }
    );
  }

  /**
   * Optimized movie lookup by TMDB ID
   */
  async lookupMovieByTmdbId(tmdbId) {
    return await this.measureQueryPerformance(
      'movie_tmdb_lookup',
      async () => {
        const { data, error } = await this.supabase
          .from('movies')
          .select('*')
          .eq('tmdb_id', tmdbId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        return data;
      },
      { tmdb_id: tmdbId }
    );
  }

  /**
   * Optimized fuzzy movie search
   */
  async searchMovies(query, limit = 20) {
    return await this.measureQueryPerformance(
      'movie_fuzzy_search',
      async () => {
        const { data, error } = await this.supabase
          .from('movies')
          .select('id, title, year, slug, poster_url, tmdb_id')
          .or(`title.ilike.%${query}%, official_title.ilike.%${query}%, slug.ilike.%${query}%`)
          .order('title')
          .limit(limit);

        if (error) {
          throw error;
        }

        return data || [];
      },
      { query: query.substring(0, 30), limit }
    );
  }

  /**
   * Optimized movie analysis retrieval
   */
  async getMovieAnalysis(movieId, analysisType = 'page_analysis') {
    return await this.measureQueryPerformance(
      'movie_analysis_lookup',
      async () => {
        const { data, error } = await this.supabase
          .from('movie_analyses')
          .select('claude_response')
          .eq('movie_id', movieId)
          .eq('analysis_type', analysisType)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        return data;
      },
      { movie_id: movieId, analysis_type: analysisType }
    );
  }

  /**
   * Cache cleanup with optimized expiration query
   */
  async cleanupExpiredCache() {
    return await this.measureQueryPerformance('cache_cleanup', async () => {
      const { data, error } = await this.supabase
        .from('query_cache')
        .delete()
        .lt('expires_at', new Date().toISOString());

      if (error) {
        throw error;
      }

      return data;
    });
  }

  /**
   * Get performance statistics for all queries
   */
  getQueryStats() {
    const stats = {};

    for (const [queryName, queryStats] of this.queryStats.entries()) {
      stats[queryName] = {
        ...queryStats,
        slowQueryPercentage:
          ((queryStats.slowQueries / queryStats.totalExecutions) * 100).toFixed(1) + '%',
      };
    }

    return stats;
  }

  /**
   * Generate optimization recommendations based on query performance
   */
  generateOptimizationRecommendations() {
    const recommendations = [];

    for (const [queryName, stats] of this.queryStats.entries()) {
      if (stats.averageTime > this.slowQueryThreshold) {
        recommendations.push({
          type: 'slow_query',
          query: queryName,
          averageTime: stats.averageTime,
          recommendation: `Consider adding indexes for ${queryName} - average time ${stats.averageTime}ms`,
        });
      }

      if (stats.slowQueries / stats.totalExecutions > 0.1) {
        recommendations.push({
          type: 'frequent_slow_queries',
          query: queryName,
          slowPercentage: ((stats.slowQueries / stats.totalExecutions) * 100).toFixed(1),
          recommendation: `${queryName} has frequent slow queries (${((stats.slowQueries / stats.totalExecutions) * 100).toFixed(1)}%)`,
        });
      }
    }

    return recommendations;
  }

  /**
   * Run complete database optimization
   */
  async optimizeDatabase() {
    console.log('🚀 Starting complete database optimization...');
    const startTime = Date.now();

    try {
      // Phase 1: Critical indexes
      const criticalResults = await this.createCriticalIndexes();

      // Phase 2: Text search indexes (if critical indexes succeeded)
      const successfulCritical = criticalResults.filter(
        r => r.status === 'created' || r.status === 'exists'
      ).length;
      let textResults = [];

      if (successfulCritical >= criticalResults.length * 0.8) {
        textResults = await this.createTextSearchIndexes();
      } else {
        console.warn('⚠️ Skipping text search indexes due to critical index failures');
      }

      const totalDuration = Date.now() - startTime;

      const summary = {
        duration: totalDuration,
        critical_indexes: criticalResults,
        text_indexes: textResults,
        total_indexes_created: [...criticalResults, ...textResults].filter(
          r => r.status === 'created'
        ).length,
        optimization_completed: Date.now(),
      };

      console.log(`✅ Database optimization completed in ${totalDuration}ms`);
      console.log(`📊 Created ${summary.total_indexes_created} new indexes`);

      return summary;
    } catch (error) {
      console.error('💥 Database optimization failed:', error);
      throw error;
    }
  }
}

// Singleton instance
let databaseOptimizer = null;

export function getDatabaseOptimizer() {
  if (!databaseOptimizer) {
    databaseOptimizer = new DatabaseOptimizer();
  }
  return databaseOptimizer;
}

export default getDatabaseOptimizer;
