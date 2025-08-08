/**
 * Nuclear Promotion Service
 *
 * Handles organic nuclear candidate flagging and promotion
 * for movies discovered through search, entity linking, etc.
 */

import { getPool, MovieService } from '../railway-db.js';

/**
 * Check if we're in pre-launch mode (ultra-low promotion thresholds)
 * Based on environment or user count
 */
export function isPreLaunchMode() {
  // For now, always pre-launch mode since you have <20 users/month
  // Can be updated to check environment variables or user metrics
  return process.env.NUCLEAR_MODE === 'pre_launch' || true;
}

/**
 * Flag a movie for nuclear promotion based on discovery source
 */
export async function flagForNuclearPromotion(tmdbId, source, metadata = {}) {
  try {
    console.log(`🎯 Flagging for nuclear promotion: TMDB ${tmdbId} from ${source}`);

    // In pre-launch mode, immediate promotion for any discovery
    if (isPreLaunchMode()) {
      await addImmediateNuclearCandidate(tmdbId, source, metadata);
      return;
    }

    // Post-launch: engagement-based promotion
    await trackDiscoveryEvent(tmdbId, source, metadata);
    const shouldPromote = await evaluateForPromotion(tmdbId);

    if (shouldPromote) {
      await addNuclearCandidate(tmdbId, source, 'organic');
    }
  } catch (error) {
    console.error('Nuclear promotion flagging error:', error);
  }
}

/**
 * Add movie as immediate nuclear candidate (pre-launch mode)
 */
async function addImmediateNuclearCandidate(tmdbId, source, metadata) {
  try {
    const candidateData = {
      tmdb_id: tmdbId,
      source: source,
      priority: 'immediate',
      status: 'queued',
      metadata: metadata,
      discovered_at: new Date().toISOString(),
      promotion_reason: 'pre_launch_immediate',
      created_at: new Date().toISOString(),
    };

    // Use Railway database to upsert nuclear candidate
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO nuclear_candidates (tmdb_id, priority_score, source, metadata, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (tmdb_id) DO UPDATE SET
          priority_score = $2,
          source = $3,
          metadata = $4,
          created_at = $5
        RETURNING *
      `;
      
      const result = await client.query(query, [
        candidateData.tmdb_id,
        candidateData.priority_score,
        candidateData.source,
        JSON.stringify(candidateData.metadata),
        candidateData.created_at
      ]);
    } catch (error) {
      console.error('Failed to add immediate nuclear candidate:', error);
      return;
    } finally {
      client.release();
    }

    console.log(`⚡ Added immediate nuclear candidate: TMDB ${tmdbId} (${source})`);

    // Trigger background processing if available
    await triggerBackgroundProcessing(tmdbId, 'immediate');
  } catch (error) {
    console.error('Error adding immediate nuclear candidate:', error);
  }
}

/**
 * Track discovery event for post-launch engagement analysis
 */
async function trackDiscoveryEvent(tmdbId, source, metadata) {
  try {
    const eventData = {
      tmdb_id: tmdbId,
      event_type: 'discovery',
      source: source,
      metadata: metadata,
      timestamp: new Date().toISOString(),
      user_agent: metadata.userAgent || null,
      ip_hash: metadata.ipHash || null,
    };

    // Use Railway database to insert discovery event
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO discovery_events (tmdb_id, event_type, source, metadata, timestamp, user_agent, ip_hash)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      
      await client.query(query, [
        eventData.tmdb_id,
        eventData.event_type,
        eventData.source,
        JSON.stringify(eventData.metadata),
        eventData.timestamp,
        eventData.user_agent,
        eventData.ip_hash
      ]);
    } catch (error) {
      console.warn('Error inserting discovery event:', error);
    } finally {
      client.release();
    }

    console.log(`📊 Tracked discovery event: TMDB ${tmdbId} from ${source}`);
  } catch (error) {
    console.warn('Error tracking discovery event:', error);
  }
}

/**
 * Evaluate if a movie should be promoted based on engagement
 */
async function evaluateForPromotion(tmdbId) {
  try {
    // Get recent discovery events for this movie using Railway
    const pool = await getPool();
    const client = await pool.connect();
    let events = [];
    try {
      const query = `
        SELECT * FROM discovery_events 
        WHERE tmdb_id = $1 AND timestamp >= $2 
        ORDER BY timestamp DESC
      `;
      
      const result = await client.query(query, [
        tmdbId, 
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      ]);
      
      events = result.rows;
    } catch (error) {
      console.warn('Error getting discovery events:', error);
      return false;
    } finally {
      client.release();
    }

    if (!events || events.length === 0) {
      return false;
    }

    // Post-launch promotion criteria
    const criteria = {
      minViews: 2, // At least 2 views
      minSources: 1, // From at least 1 source
      timeWindow: 24 * 60 * 60 * 1000, // Within 24 hours
    };

    const uniqueSources = new Set(events.map(e => e.source)).size;
    const viewCount = events.length;

    const shouldPromote = viewCount >= criteria.minViews && uniqueSources >= criteria.minSources;

    console.log(
      `🎯 Promotion evaluation for TMDB ${tmdbId}: ${viewCount} views, ${uniqueSources} sources -> ${shouldPromote ? 'PROMOTE' : 'WAIT'}`
    );

    return shouldPromote;
  } catch (error) {
    console.error('Error evaluating for promotion:', error);
    return false;
  }
}

/**
 * Add movie as nuclear candidate (post-launch organic promotion)
 */
async function addNuclearCandidate(tmdbId, source, priority = 'normal') {
  try {
    const candidateData = {
      tmdb_id: tmdbId,
      source: source,
      priority: priority,
      status: 'queued',
      discovered_at: new Date().toISOString(),
      promotion_reason: 'organic_engagement',
      created_at: new Date().toISOString(),
    };

    // Use Railway database to upsert nuclear candidate
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO nuclear_candidates (tmdb_id, priority_score, source, metadata, promotion_reason, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (tmdb_id) DO UPDATE SET
          priority_score = $2,
          source = $3,
          metadata = $4,
          promotion_reason = $5,
          created_at = $6
        RETURNING *
      `;
      
      await client.query(query, [
        candidateData.tmdb_id,
        candidateData.priority_score,
        candidateData.source,
        JSON.stringify(candidateData.metadata),
        candidateData.promotion_reason,
        candidateData.created_at
      ]);
    } catch (error) {
      console.error('Failed to add nuclear candidate:', error);
      return;
    } finally {
      client.release();
    }

    console.log(`🎯 Added nuclear candidate: TMDB ${tmdbId} (${source}, ${priority})`);
  } catch (error) {
    console.error('Error adding nuclear candidate:', error);
  }
}

/**
 * Trigger background nuclear processing
 * This could be a queue, webhook, or immediate processing
 */
async function triggerBackgroundProcessing(tmdbId, priority) {
  try {
    // For immediate priority in pre-launch, could trigger webhook
    if (priority === 'immediate') {
      console.log(`⚡ Triggering immediate nuclear processing for TMDB ${tmdbId}`);

      // Could call a background service here
      // await fetch('/api/nuclear/process-immediate', {
      //   method: 'POST',
      //   body: JSON.stringify({ tmdbId, priority })
      // });
    }
  } catch (error) {
    console.warn('Error triggering background processing:', error);
  }
}

/**
 * Get nuclear candidate status for a movie
 */
export async function getNuclearCandidateStatus(tmdbId) {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM nuclear_candidates WHERE tmdb_id = $1';
      const result = await client.query(query, [tmdbId]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  } catch (error) {
    return null;
  }
}

/**
 * Check if a movie is already nuclear (built as static page)
 */
export async function isMovieNuclear(tmdbId) {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const query = 'SELECT status FROM nuclear_candidates WHERE tmdb_id = $1 AND status = $2';
      const result = await client.query(query, [tmdbId, 'completed']);
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  } catch (error) {
    return false;
  }
}

/**
 * Mark a movie as nuclear (completed static generation)
 */
export async function markMovieAsNuclear(tmdbId) {
  try {
    const pool = await getPool();
    const client = await pool.connect();
    try {
      const query = `
        UPDATE nuclear_candidates 
        SET status = $1, completed_at = $2 
        WHERE tmdb_id = $3
      `;
      
      await client.query(query, ['completed', new Date().toISOString(), tmdbId]);
      
      console.log(`⚡ Marked as nuclear: TMDB ${tmdbId}`);
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error marking movie as nuclear:', error);
    return false;
  }
}
