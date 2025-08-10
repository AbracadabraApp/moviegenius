/**
 * Poster URL Audit Trail System
 * Tracks all poster URL changes for debugging and validation
 */

import { Client } from 'pg';
import fs from 'fs';

class PosterAuditTrail {
  constructor() {
    this.client = null;
    this.log_file = 'logs/poster-audit.log';
    this.ensure_log_directory();
  }

  ensure_log_directory() {
    const dir = 'logs';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async initialize() {
    this.client = new Client({
      connectionString: process.env.RAILWAY_DATABASE_URL || process.env.DATABASE_URL
    });
    await this.client.connect();
    await this.create_audit_table();
  }

  async create_audit_table() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS poster_audit_log (
        id SERIAL PRIMARY KEY,
        movie_id UUID NOT NULL,
        tmdb_id INTEGER,
        movie_title VARCHAR(255),
        old_poster_url TEXT,
        new_poster_url TEXT,
        change_source VARCHAR(100) NOT NULL,
        validation_result VARCHAR(50) NOT NULL,
        validation_reason TEXT,
        user_agent TEXT,
        ip_address INET,
        created_at TIMESTAMP DEFAULT NOW(),
        
        -- Add indexes for performance
        CONSTRAINT fk_movie_id FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
      );
      
      CREATE INDEX IF NOT EXISTS idx_poster_audit_movie_id ON poster_audit_log(movie_id);
      CREATE INDEX IF NOT EXISTS idx_poster_audit_tmdb_id ON poster_audit_log(tmdb_id);
      CREATE INDEX IF NOT EXISTS idx_poster_audit_created_at ON poster_audit_log(created_at);
      CREATE INDEX IF NOT EXISTS idx_poster_audit_source ON poster_audit_log(change_source);
    `;

    try {
      await this.client.query(createTableQuery);
      console.log('✅ Poster audit table ready');
    } catch (error) {
      console.warn('⚠️ Audit table creation failed:', error.message);
    }
  }

  /**
   * Log a poster URL change attempt
   */
  async log_poster_change(options) {
    const {
      movie_id,
      tmdb_id = null,
      movie_title = null,
      old_poster_url = null,
      new_poster_url = null,
      change_source = 'unknown',
      validation_result = 'unknown',
      validation_reason = null,
      user_agent = null,
      ip_address = null
    } = options;

    const log_entry = {
      timestamp: new Date().toISOString(),
      movie_id,
      tmdb_id,
      movie_title,
      old_poster_url,
      new_poster_url,
      change_source,
      validation_result,
      validation_reason,
      user_agent,
      ip_address
    };

    // Log to file
    this.log_to_file(log_entry);

    // Log to database if available
    if (this.client) {
      await this.log_to_database(log_entry);
    }

    return log_entry;
  }

  log_to_file(log_entry) {
    const log_line = JSON.stringify(log_entry) + '\n';
    
    try {
      fs.appendFileSync(this.log_file, log_line);
    } catch (error) {
      console.warn('⚠️ Failed to write audit log:', error.message);
    }
  }

  async log_to_database(log_entry) {
    if (!this.client) return;

    const insertQuery = `
      INSERT INTO poster_audit_log (
        movie_id, tmdb_id, movie_title, old_poster_url, new_poster_url,
        change_source, validation_result, validation_reason, 
        user_agent, ip_address, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const values = [
      log_entry.movie_id,
      log_entry.tmdb_id,
      log_entry.movie_title,
      log_entry.old_poster_url,
      log_entry.new_poster_url,
      log_entry.change_source,
      log_entry.validation_result,
      log_entry.validation_reason,
      log_entry.user_agent,
      log_entry.ip_address,
      log_entry.timestamp
    ];

    try {
      await this.client.query(insertQuery, values);
    } catch (error) {
      console.warn('⚠️ Database audit log failed:', error.message);
    }
  }

  /**
   * Get audit history for a specific movie
   */
  async get_movie_history(movie_id, limit = 50) {
    if (!this.client) return [];

    const query = `
      SELECT * FROM poster_audit_log 
      WHERE movie_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;

    try {
      const result = await this.client.query(query, [movie_id, limit]);
      return result.rows;
    } catch (error) {
      console.warn('⚠️ Failed to fetch audit history:', error.message);
      return [];
    }
  }

  /**
   * Get corruption statistics from audit log
   */
  async get_corruption_stats(hours = 24) {
    if (!this.client) return null;

    const query = `
      SELECT 
        change_source,
        validation_result,
        COUNT(*) as count
      FROM poster_audit_log 
      WHERE created_at > NOW() - INTERVAL '${hours} hours'
      GROUP BY change_source, validation_result
      ORDER BY count DESC
    `;

    try {
      const result = await this.client.query(query);
      return result.rows;
    } catch (error) {
      console.warn('⚠️ Failed to fetch corruption stats:', error.message);
      return null;
    }
  }

  /**
   * Detect suspicious patterns in poster changes
   */
  async detect_suspicious_activity(hours = 1) {
    if (!this.client) return [];

    const query = `
      SELECT 
        new_poster_url,
        COUNT(*) as usage_count,
        COUNT(DISTINCT movie_id) as affected_movies,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen,
        STRING_AGG(DISTINCT change_source, ', ') as sources
      FROM poster_audit_log 
      WHERE created_at > NOW() - INTERVAL '${hours} hours'
        AND new_poster_url IS NOT NULL
      GROUP BY new_poster_url
      HAVING COUNT(*) > 5
      ORDER BY usage_count DESC
    `;

    try {
      const result = await this.client.query(query);
      return result.rows.map(row => ({
        ...row,
        suspicious: row.affected_movies > 10 || row.usage_count > 20,
        risk_level: this.calculate_risk_level(row)
      }));
    } catch (error) {
      console.warn('⚠️ Failed to detect suspicious activity:', error.message);
      return [];
    }
  }

  calculate_risk_level(pattern) {
    const { usage_count, affected_movies } = pattern;
    
    if (affected_movies > 100 || usage_count > 500) return 'CRITICAL';
    if (affected_movies > 50 || usage_count > 100) return 'HIGH';
    if (affected_movies > 10 || usage_count > 20) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate audit report
   */
  async generate_report(hours = 24) {
    const stats = await this.get_corruption_stats(hours);
    const suspicious = await this.detect_suspicious_activity(hours);
    
    const report = {
      timestamp: new Date().toISOString(),
      period_hours: hours,
      statistics: stats,
      suspicious_patterns: suspicious,
      summary: this.generate_summary(stats, suspicious)
    };

    const filename = `poster-audit-report-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    
    console.log(`📊 Audit report generated: ${filename}`);
    return report;
  }

  generate_summary(stats, suspicious) {
    const total_changes = stats ? stats.reduce((sum, s) => sum + parseInt(s.count), 0) : 0;
    const blocked_changes = stats ? 
      stats.filter(s => s.validation_result === 'BLOCKED')
           .reduce((sum, s) => sum + parseInt(s.count), 0) : 0;
    
    const high_risk_patterns = suspicious.filter(p => ['CRITICAL', 'HIGH'].includes(p.risk_level)).length;
    
    return {
      total_changes,
      blocked_changes,
      block_rate: total_changes > 0 ? (blocked_changes / total_changes * 100).toFixed(1) + '%' : '0%',
      high_risk_patterns,
      health_status: high_risk_patterns > 0 ? 'ATTENTION_NEEDED' : 'HEALTHY'
    };
  }

  async cleanup() {
    if (this.client) {
      await this.client.end();
    }
  }
}

// Create global audit trail instance
const audit_trail = new PosterAuditTrail();

/**
 * Convenience function to log poster changes
 */
async function log_poster_change(options) {
  if (!audit_trail.client) {
    await audit_trail.initialize().catch(console.warn);
  }
  return await audit_trail.log_poster_change(options);
}

/**
 * Enhanced validation with audit logging
 */
async function validate_and_log_poster(poster_url, context = {}) {
  const { isValidPosterUrl } = await import('./poster-validation-utils.js');
  
  const validation_result = isValidPosterUrl(poster_url, context.movie_title);
  const validation_status = validation_result ? 'APPROVED' : 'BLOCKED';
  
  // Extract validation reason
  let validation_reason = null;
  if (!validation_result) {
    if (!poster_url) validation_reason = 'NULL_URL';
    else if (poster_url.includes('7kNcpmP1Pe9fWLKEbEOX5GEWueC')) validation_reason = 'KNOWN_CORRUPTION';
    else if (poster_url.includes('h7Lcio0c9ohxPhSZg42eTlKIVVY')) validation_reason = 'KNOWN_CORRUPTION';
    else if (poster_url.includes('placeholder')) validation_reason = 'PLACEHOLDER';
    else validation_reason = 'VALIDATION_FAILED';
  }

  // Log the validation attempt
  if (context.movie_id) {
    await log_poster_change({
      movie_id: context.movie_id,
      tmdb_id: context.tmdb_id,
      movie_title: context.movie_title,
      old_poster_url: context.old_poster_url,
      new_poster_url: poster_url,
      change_source: context.change_source || 'validation_check',
      validation_result: validation_status,
      validation_reason,
      user_agent: context.user_agent,
      ip_address: context.ip_address
    });
  }

  return {
    is_valid: validation_result,
    status: validation_status,
    reason: validation_reason
  };
}

export {
  PosterAuditTrail,
  log_poster_change,
  validate_and_log_poster,
  audit_trail
};