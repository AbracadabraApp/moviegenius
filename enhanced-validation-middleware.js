/**
 * Enhanced Validation Middleware
 * Adds comprehensive poster URL validation to all database operations
 */

import { log_poster_change, validate_and_log_poster } from './lib/poster-audit-trail.js';
import { isValidPosterUrl, addCorruptedPosterUrl, getValidationStats } from './lib/poster-validation-utils.js';

/**
 * Express middleware to add poster validation to API requests
 */
export function posterValidationMiddleware(req, res, next) {
  // Extract client information for audit trail
  const client_info = {
    user_agent: req.headers['user-agent'],
    ip_address: req.ip || req.connection.remoteAddress,
    change_source: `api_${req.path.replace(/[^a-zA-Z0-9]/g, '_')}`
  };

  // Add validation helper to request object
  req.validate_poster = async (poster_url, context = {}) => {
    return await validate_and_log_poster(poster_url, {
      ...context,
      ...client_info
    });
  };

  // Add audit logging helper to request object
  req.log_poster_change = async (options) => {
    return await log_poster_change({
      ...options,
      ...client_info
    });
  };

  next();
}

/**
 * Database wrapper for safe poster URL operations
 */
export class SafePosterDatabase {
  constructor(client) {
    this.client = client;
    this.validation_stats = {
      total_attempts: 0,
      blocked_attempts: 0,
      approved_attempts: 0
    };
  }

  /**
   * Safe INSERT with poster validation
   */
  async safe_insert_movie(movie_data, context = {}) {
    const { poster_url } = movie_data;
    
    // Validate poster URL
    if (poster_url) {
      const validation = await validate_and_log_poster(poster_url, {
        movie_title: movie_data.title,
        change_source: context.change_source || 'database_insert',
        ...context
      });

      this.validation_stats.total_attempts++;
      
      if (!validation.is_valid) {
        console.warn(`🚫 Safe insert blocked poster for "${movie_data.title}": ${validation.reason}`);
        this.validation_stats.blocked_attempts++;
        
        // Remove poster URL from insert
        movie_data = { ...movie_data, poster_url: null };
      } else {
        this.validation_stats.approved_attempts++;
      }
    }

    // Perform the insert
    const insert_query = `
      INSERT INTO movies (tmdb_id, title, year, poster_url, official_title, release_date, slug, streaming_data, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;

    const values = [
      movie_data.tmdb_id,
      movie_data.title,
      movie_data.year,
      movie_data.poster_url,
      movie_data.official_title,
      movie_data.release_date,
      movie_data.slug,
      movie_data.streaming_data
    ];

    return await this.client.query(insert_query, values);
  }

  /**
   * Safe UPDATE with poster validation
   */
  async safe_update_poster(movie_id, new_poster_url, context = {}) {
    // Get current movie data
    const current_result = await this.client.query(
      'SELECT id, tmdb_id, title, poster_url FROM movies WHERE id = $1',
      [movie_id]
    );

    if (current_result.rows.length === 0) {
      throw new Error('Movie not found');
    }

    const current_movie = current_result.rows[0];
    
    // Skip if poster URL hasn't changed
    if (current_movie.poster_url === new_poster_url) {
      console.log(`⏭️  Poster unchanged for "${current_movie.title}", skipping update`);
      return current_result;
    }

    // Validate new poster URL
    const validation = await validate_and_log_poster(new_poster_url, {
      movie_id: current_movie.id,
      tmdb_id: current_movie.tmdb_id,
      movie_title: current_movie.title,
      old_poster_url: current_movie.poster_url,
      change_source: context.change_source || 'database_update',
      ...context
    });

    this.validation_stats.total_attempts++;

    if (!validation.is_valid) {
      console.warn(`🚫 Safe update blocked poster for "${current_movie.title}": ${validation.reason}`);
      this.validation_stats.blocked_attempts++;
      
      // Return current data unchanged
      return current_result;
    }

    this.validation_stats.approved_attempts++;

    // Perform the update
    const update_query = `
      UPDATE movies 
      SET poster_url = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    return await this.client.query(update_query, [new_poster_url, movie_id]);
  }

  /**
   * Batch poster update with validation
   */
  async safe_batch_update_posters(updates, context = {}) {
    const results = {
      total: updates.length,
      successful: 0,
      blocked: 0,
      failed: 0,
      errors: []
    };

    for (const update of updates) {
      try {
        const result = await this.safe_update_poster(update.movie_id, update.poster_url, {
          ...context,
          change_source: context.change_source || 'batch_update'
        });

        if (result.rows[0].poster_url === update.poster_url) {
          results.successful++;
        } else {
          results.blocked++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          movie_id: update.movie_id,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get validation statistics
   */
  get_validation_stats() {
    const block_rate = this.validation_stats.total_attempts > 0 ?
      (this.validation_stats.blocked_attempts / this.validation_stats.total_attempts * 100).toFixed(1) :
      0;

    return {
      ...this.validation_stats,
      block_rate: `${block_rate}%`,
      global_stats: getValidationStats()
    };
  }

  /**
   * Reset validation statistics
   */
  reset_validation_stats() {
    this.validation_stats = {
      total_attempts: 0,
      blocked_attempts: 0,
      approved_attempts: 0
    };
  }
}

/**
 * Enhanced corruption detection
 */
export class CorruptionDetector {
  constructor() {
    this.detection_thresholds = {
      mass_duplication: 10,      // Same poster used >10 times in short period
      rapid_changes: 50,         // >50 poster changes per minute
      validation_failure_rate: 0.3  // >30% validation failures
    };
    
    this.recent_activity = new Map();
    this.alert_cooldown = new Map();
  }

  /**
   * Check for corruption patterns
   */
  async check_corruption_patterns(poster_changes) {
    const alerts = [];
    
    // Check for mass duplication
    const poster_usage = new Map();
    poster_changes.forEach(change => {
      if (change.new_poster_url) {
        const count = poster_usage.get(change.new_poster_url) || 0;
        poster_usage.set(change.new_poster_url, count + 1);
      }
    });

    for (const [poster_url, count] of poster_usage.entries()) {
      if (count >= this.detection_thresholds.mass_duplication) {
        const alert_key = `mass_dup_${poster_url}`;
        
        if (!this.is_in_cooldown(alert_key)) {
          alerts.push({
            type: 'MASS_DUPLICATION',
            severity: 'HIGH',
            message: `Poster URL used ${count} times: ${poster_url}`,
            data: { poster_url, usage_count: count }
          });
          
          this.set_alert_cooldown(alert_key, 3600000); // 1 hour cooldown
          
          // Add to corruption blocklist
          addCorruptedPosterUrl(poster_url);
        }
      }
    }

    // Check validation failure rate
    const total_changes = poster_changes.length;
    const failed_validations = poster_changes.filter(c => c.validation_result === 'BLOCKED').length;
    
    if (total_changes > 0) {
      const failure_rate = failed_validations / total_changes;
      
      if (failure_rate > this.detection_thresholds.validation_failure_rate) {
        alerts.push({
          type: 'HIGH_VALIDATION_FAILURE_RATE',
          severity: 'MEDIUM',
          message: `${(failure_rate * 100).toFixed(1)}% of poster validations failed`,
          data: { failure_rate, total_changes, failed_validations }
        });
      }
    }

    return alerts;
  }

  is_in_cooldown(alert_key) {
    const cooldown_end = this.alert_cooldown.get(alert_key);
    return cooldown_end && Date.now() < cooldown_end;
  }

  set_alert_cooldown(alert_key, duration_ms) {
    this.alert_cooldown.set(alert_key, Date.now() + duration_ms);
  }

  /**
   * Process alerts
   */
  async process_alerts(alerts) {
    for (const alert of alerts) {
      console.warn(`🚨 CORRUPTION ALERT [${alert.severity}]: ${alert.message}`);
      
      // Here you could integrate with external alerting systems:
      // - Send to Slack
      // - Trigger PagerDuty incident
      // - Email notifications
      // - Log to monitoring service
    }
  }
}

/**
 * Initialize enhanced validation system
 */
export async function initialize_enhanced_validation() {
  console.log('🛡️ Initializing enhanced poster validation system...');
  
  const validation_stats = getValidationStats();
  console.log(`📊 Validation rules active: ${validation_stats.corrupted_urls_blocked} corrupted URLs blocked`);
  
  // Initialize audit trail
  const { audit_trail } = await import('./lib/poster-audit-trail.js');
  await audit_trail.initialize().catch(console.warn);
  
  console.log('✅ Enhanced validation system ready');
  
  return {
    SafePosterDatabase,
    CorruptionDetector,
    posterValidationMiddleware
  };
}

export default {
  SafePosterDatabase,
  CorruptionDetector,
  posterValidationMiddleware,
  initialize_enhanced_validation
};