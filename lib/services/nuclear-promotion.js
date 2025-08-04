/**
 * Nuclear Promotion Service
 *
 * Handles organic nuclear candidate flagging and promotion
 * for movies discovered through search, entity linking, etc.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

    // Upsert to avoid duplicates
    const { data, error } = await supabase.from('nuclear_candidates').upsert(candidateData, {
      onConflict: 'tmdb_id',
      ignoreDuplicates: false,
    });

    if (error) {
      console.error('Failed to add immediate nuclear candidate:', error);
      return;
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

    await supabase.from('discovery_events').insert(eventData);

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
    // Get recent discovery events for this movie
    const { data: events, error } = await supabase
      .from('discovery_events')
      .select('*')
      .eq('tmdb_id', tmdbId)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('timestamp', { ascending: false });

    if (error || !events) {
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

    const { data, error } = await supabase.from('nuclear_candidates').upsert(candidateData, {
      onConflict: 'tmdb_id',
      ignoreDuplicates: false,
    });

    if (error) {
      console.error('Failed to add nuclear candidate:', error);
      return;
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
    const { data: candidate, error } = await supabase
      .from('nuclear_candidates')
      .select('*')
      .eq('tmdb_id', tmdbId)
      .single();

    return error ? null : candidate;
  } catch (error) {
    return null;
  }
}

/**
 * Check if a movie is already nuclear (built as static page)
 */
export async function isMovieNuclear(tmdbId) {
  try {
    // Check if movie is in the nuclear candidates list with 'completed' status
    const { data: candidate, error } = await supabase
      .from('nuclear_candidates')
      .select('status')
      .eq('tmdb_id', tmdbId)
      .eq('status', 'completed')
      .single();

    return !error && candidate;
  } catch (error) {
    return false;
  }
}

/**
 * Mark a movie as nuclear (completed static generation)
 */
export async function markMovieAsNuclear(tmdbId) {
  try {
    const { error } = await supabase
      .from('nuclear_candidates')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('tmdb_id', tmdbId);

    if (error) {
      console.error('Failed to mark movie as nuclear:', error);
      return false;
    }

    console.log(`⚡ Marked as nuclear: TMDB ${tmdbId}`);
    return true;
  } catch (error) {
    console.error('Error marking movie as nuclear:', error);
    return false;
  }
}
