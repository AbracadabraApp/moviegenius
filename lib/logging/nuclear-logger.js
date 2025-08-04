/**
 * Nuclear Static Page Creation Logger
 *
 * Server-side only logging system for tracking nuclear static page generation
 * Provides detailed metrics and monitoring capabilities
 */

// Server-side only - use dynamic imports to avoid client-side bundling
let fs, path, LOG_DIR, NUCLEAR_LOG_FILE, METRICS_FILE;

function initializeLogger() {
  if (typeof window !== 'undefined') {
    return false; // Client-side - don't initialize
  }

  if (!fs) {
    fs = require('fs');
    path = require('path');
    LOG_DIR = path.join(process.cwd(), 'logs');
    NUCLEAR_LOG_FILE = path.join(LOG_DIR, 'nuclear-capture.log');
    METRICS_FILE = path.join(LOG_DIR, 'nuclear-metrics.json');
  }
  return true;
}

/**
 * Ensure log directory exists
 */
function ensureLogDirectory() {
  if (!initializeLogger()) return;

  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Format timestamp for logging
 */
function formatTimestamp() {
  return new Date().toISOString();
}

/**
 * Write to nuclear capture log file
 */
function writeToLog(level, message, data = null) {
  if (!initializeLogger()) return; // Client-side - do nothing

  ensureLogDirectory();

  const logEntry = {
    timestamp: formatTimestamp(),
    level,
    message,
    ...(data && { data }),
  };

  const logLine = JSON.stringify(logEntry) + '\n';

  try {
    fs.appendFileSync(NUCLEAR_LOG_FILE, logLine);
  } catch (error) {
    console.warn('Failed to write to nuclear log:', error.message);
  }
}

/**
 * Load existing metrics or create new ones
 */
function loadMetrics() {
  try {
    if (fs.existsSync(METRICS_FILE)) {
      const data = fs.readFileSync(METRICS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Failed to load metrics:', error.message);
  }

  return {
    totalCaptures: 0,
    totalAttempts: 0,
    successRate: 0,
    averageFileSize: 0,
    dailyStats: {},
    movieStats: {},
    errorCounts: {},
    lastUpdated: null,
  };
}

/**
 * Save metrics to file
 */
function saveMetrics(metrics) {
  ensureLogDirectory();

  try {
    metrics.lastUpdated = formatTimestamp();
    fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
  } catch (error) {
    console.warn('Failed to save metrics:', error.message);
  }
}

/**
 * Update metrics with new capture data
 */
function updateMetrics(tmdbId, success, fileSize = null, errorType = null) {
  const metrics = loadMetrics();
  const today = new Date().toISOString().split('T')[0];

  // Update totals
  metrics.totalAttempts++;
  if (success) {
    metrics.totalCaptures++;
  }

  // Update success rate
  metrics.successRate = Math.round((metrics.totalCaptures / metrics.totalAttempts) * 100);

  // Update daily stats
  if (!metrics.dailyStats[today]) {
    metrics.dailyStats[today] = {
      attempts: 0,
      captures: 0,
      errors: 0,
      averageFileSize: 0,
    };
  }

  metrics.dailyStats[today].attempts++;
  if (success) {
    metrics.dailyStats[today].captures++;

    if (fileSize) {
      const dayStats = metrics.dailyStats[today];
      dayStats.averageFileSize = Math.round(
        (dayStats.averageFileSize * (dayStats.captures - 1) + fileSize) / dayStats.captures
      );
    }
  } else {
    metrics.dailyStats[today].errors++;
  }

  // Update movie-specific stats
  if (!metrics.movieStats[tmdbId]) {
    metrics.movieStats[tmdbId] = {
      attempts: 0,
      lastAttempt: null,
      captured: false,
      capturedAt: null,
    };
  }

  metrics.movieStats[tmdbId].attempts++;
  metrics.movieStats[tmdbId].lastAttempt = formatTimestamp();

  if (success) {
    metrics.movieStats[tmdbId].captured = true;
    metrics.movieStats[tmdbId].capturedAt = formatTimestamp();
  }

  // Update error counts
  if (errorType) {
    metrics.errorCounts[errorType] = (metrics.errorCounts[errorType] || 0) + 1;
  }

  // Update global average file size
  if (success && fileSize) {
    metrics.averageFileSize = Math.round(
      (metrics.averageFileSize * (metrics.totalCaptures - 1) + fileSize) / metrics.totalCaptures
    );
  }

  saveMetrics(metrics);
}

/**
 * Nuclear Logger Class
 */
export class NuclearLogger {
  /**
   * Log successful nuclear capture
   */
  static logCapture(tmdbId, movieTitle, fileSize, processingTime = null) {
    if (!initializeLogger()) {
      // Client-side - just console log
      console.log(
        `📦 Nuclear captured: ${movieTitle} (${tmdbId}) - ${Math.round(fileSize / 1024)}KB`
      );
      return;
    }

    const message = `Nuclear capture SUCCESS: ${movieTitle} (${tmdbId})`;
    const data = {
      tmdbId,
      movieTitle,
      fileSize,
      processingTime,
      event: 'capture_success',
    };

    writeToLog('INFO', message, data);
    updateMetrics(tmdbId, true, fileSize);

    console.log(
      `📦 Nuclear captured: ${movieTitle} (${tmdbId}) - ${Math.round(fileSize / 1024)}KB`
    );
  }

  /**
   * Log failed nuclear capture attempt
   */
  static logCaptureFailure(tmdbId, movieTitle, error, errorType = 'unknown') {
    const message = `Nuclear capture FAILED: ${movieTitle} (${tmdbId})`;
    const data = {
      tmdbId,
      movieTitle,
      error: error.message || error,
      errorType,
      event: 'capture_failure',
    };

    writeToLog('ERROR', message, data);
    updateMetrics(tmdbId, false, null, errorType);

    console.warn(
      `❌ Nuclear capture failed: ${movieTitle} (${tmdbId}) - ${error.message || error}`
    );
  }

  /**
   * Log nuclear capture attempt (before processing)
   */
  static logCaptureAttempt(tmdbId, movieTitle, pageProps) {
    const message = `Nuclear capture ATTEMPT: ${movieTitle} (${tmdbId})`;
    const data = {
      tmdbId,
      movieTitle,
      hasAnalysis: pageProps.hasAnalysis,
      sectionsCount: pageProps.sections?.length || 0,
      event: 'capture_attempt',
    };

    writeToLog('DEBUG', message, data);
  }

  /**
   * Log nuclear file already exists (skip)
   */
  static logSkipExisting(tmdbId, movieTitle) {
    const message = `Nuclear capture SKIPPED: ${movieTitle} (${tmdbId}) - already exists`;
    const data = {
      tmdbId,
      movieTitle,
      event: 'capture_skipped',
    };

    writeToLog('DEBUG', message, data);
  }

  /**
   * Log nuclear file load/serve
   */
  static logNuclearServe(tmdbId, movieTitle, loadTime = null) {
    const message = `Nuclear file SERVED: ${movieTitle} (${tmdbId})`;
    const data = {
      tmdbId,
      movieTitle,
      loadTime,
      event: 'nuclear_serve',
    };

    writeToLog('INFO', message, data);
    console.log(
      `⚡ Nuclear served: ${movieTitle} (${tmdbId})${loadTime ? ` - ${loadTime}ms` : ''}`
    );
  }

  /**
   * Get current metrics summary
   */
  static getMetrics() {
    return loadMetrics();
  }

  /**
   * Get daily statistics
   */
  static getDailyStats(days = 7) {
    const metrics = loadMetrics();
    const today = new Date();
    const stats = {};

    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      stats[dateStr] = metrics.dailyStats[dateStr] || {
        attempts: 0,
        captures: 0,
        errors: 0,
        averageFileSize: 0,
      };
    }

    return stats;
  }

  /**
   * Get top captured movies
   */
  static getTopCapturedMovies(limit = 10) {
    const metrics = loadMetrics();

    return Object.entries(metrics.movieStats)
      .filter(([_, stats]) => stats.captured)
      .sort((a, b) => new Date(b[1].capturedAt) - new Date(a[1].capturedAt))
      .slice(0, limit)
      .map(([tmdbId, stats]) => ({
        tmdbId: parseInt(tmdbId),
        attempts: stats.attempts,
        capturedAt: stats.capturedAt,
      }));
  }

  /**
   * Get error summary
   */
  static getErrorSummary() {
    const metrics = loadMetrics();

    return {
      totalErrors: Object.values(metrics.errorCounts).reduce((sum, count) => sum + count, 0),
      errorBreakdown: metrics.errorCounts,
      errorRate: Math.round(
        ((metrics.totalAttempts - metrics.totalCaptures) / metrics.totalAttempts) * 100
      ),
    };
  }

  /**
   * Clear old logs (keep last N days)
   */
  static clearOldLogs(daysToKeep = 30) {
    try {
      if (!fs.existsSync(NUCLEAR_LOG_FILE)) return;

      const logs = fs.readFileSync(NUCLEAR_LOG_FILE, 'utf8').split('\n').filter(Boolean);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const recentLogs = logs.filter(logLine => {
        try {
          const log = JSON.parse(logLine);
          return new Date(log.timestamp) > cutoffDate;
        } catch {
          return false;
        }
      });

      fs.writeFileSync(NUCLEAR_LOG_FILE, recentLogs.join('\n') + '\n');
      console.log(`🧹 Cleared old logs, kept ${recentLogs.length} recent entries`);
    } catch (error) {
      console.warn('Failed to clear old logs:', error.message);
    }
  }

  /**
   * Generate daily report
   */
  static generateDailyReport() {
    const metrics = loadMetrics();
    const today = new Date().toISOString().split('T')[0];
    const todayStats = metrics.dailyStats[today] || { attempts: 0, captures: 0, errors: 0 };

    return {
      date: today,
      summary: {
        totalAttempts: todayStats.attempts,
        totalCaptures: todayStats.captures,
        totalErrors: todayStats.errors,
        successRate:
          todayStats.attempts > 0
            ? Math.round((todayStats.captures / todayStats.attempts) * 100)
            : 0,
        averageFileSize: todayStats.averageFileSize,
      },
      overall: {
        totalCaptures: metrics.totalCaptures,
        totalAttempts: metrics.totalAttempts,
        overallSuccessRate: metrics.successRate,
        averageFileSize: metrics.averageFileSize,
      },
    };
  }
}

// Export default instance
export default NuclearLogger;
