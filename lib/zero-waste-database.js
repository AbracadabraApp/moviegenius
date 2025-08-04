/**
 * Zero-Waste Database Integration
 * 
 * Provides database functions for tracking completion status and zero-waste metrics.
 * Ensures bulletproof protection against content regeneration waste.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Get Supabase client with service role key for database operations
 */
function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Mark a movie analysis as complete with links
 * This prevents future regeneration (Tier 1 protection)
 */
export async function markAnalysisComplete(movieId, linkCount = 0) {
  const supabase = getSupabaseClient();
  
  try {
    // Call the database function to mark as complete
    const { error } = await supabase.rpc('mark_analysis_complete', {
      p_movie_id: movieId,
      p_link_count: linkCount
    });

    if (error) {
      console.error(`❌ Failed to mark analysis complete for movie ${movieId}:`, error);
      throw error;
    }

    console.log(`✅ Marked analysis complete for movie ${movieId} with ${linkCount} links`);
    return true;
  } catch (error) {
    console.error(`❌ Database error marking analysis complete for movie ${movieId}:`, error);
    return false;
  }
}

/**
 * Record a zero-waste operation for metrics tracking
 */
export async function recordZeroWasteOperation({
  operationType,
  contentType,
  contentId,
  costSaved = 0,
  costIncurred = 0,
  processingTimeMs = null,
  linksAdded = 0,
  metadata = {}
}) {
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase.rpc('record_zero_waste_operation', {
      p_operation_type: operationType,
      p_content_type: contentType,
      p_content_id: contentId,
      p_cost_saved: costSaved,
      p_cost_incurred: costIncurred,
      p_processing_time_ms: processingTimeMs,
      p_links_added: linksAdded,
      p_metadata: metadata
    });

    if (error) {
      console.error(`❌ Failed to record zero-waste operation:`, error);
      throw error;
    }

    console.log(`📊 Recorded zero-waste operation: ${operationType} for ${contentType} ${contentId}`);
    return data;
  } catch (error) {
    console.error(`❌ Database error recording zero-waste operation:`, error);
    return null;
  }
}

/**
 * Get completion status for all content types
 */
export async function getCompletionStatus() {
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('completion_status')
      .select('*');

    if (error) {
      console.error(`❌ Failed to get completion status:`, error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`❌ Database error getting completion status:`, error);
    return [];
  }
}

/**
 * Get zero-waste dashboard metrics
 */
export async function getZeroWasteDashboard(days = 30) {
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('zero_waste_dashboard')
      .select('*')
      .gte('date', new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString())
      .order('date', { ascending: false });

    if (error) {
      console.error(`❌ Failed to get zero-waste dashboard:`, error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`❌ Database error getting zero-waste dashboard:`, error);
    return [];
  }
}

/**
 * Get movies that need linking (Tier 2 candidates)
 */
export async function getMoviesNeedingLinks(limit = 50) {
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('movies')
      .select(`
        id,
        title,
        year,
        tmdb_id,
        movie_analyses!inner(
          claude_response
        )
      `)
      .eq('has_linked_analysis', false)
      .eq('movie_analyses.analysis_type', 'page_analysis')
      .not('movie_analyses.claude_response', 'is', null)
      .limit(limit);

    if (error) {
      console.error(`❌ Failed to get movies needing links:`, error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error(`❌ Database error getting movies needing links:`, error);
    return [];
  }
}

/**
 * Get movies that are complete (Tier 1 - should be skipped)
 */
export async function getCompleteMovies(limit = 50) {
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('movies')
      .select('id, title, year, tmdb_id, analysis_completed_at, last_processed_at')
      .eq('has_linked_analysis', true)
      .order('analysis_completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error(`❌ Failed to get complete movies:`, error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error(`❌ Database error getting complete movies:`, error);
    return [];
  }
}

/**
 * Get total savings over time period
 */
export async function getTotalSavings(days = 30) {
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('zero_waste_metrics')
      .select('cost_saved, cost_incurred, operation_type')
      .gte('created_at', new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString());

    if (error) {
      console.error(`❌ Failed to get total savings:`, error);
      throw error;
    }

    const totals = data.reduce((acc, row) => ({
      totalSaved: acc.totalSaved + parseFloat(row.cost_saved || 0),
      totalIncurred: acc.totalIncurred + parseFloat(row.cost_incurred || 0),
      tier1Skips: acc.tier1Skips + (row.operation_type === 'tier1_skip' ? 1 : 0),
      tier2Links: acc.tier2Links + (row.operation_type === 'tier2_link_only' ? 1 : 0),
      tier3Fresh: acc.tier3Fresh + (row.operation_type === 'tier3_fresh' ? 1 : 0),
    }), {
      totalSaved: 0,
      totalIncurred: 0,
      tier1Skips: 0,
      tier2Links: 0,
      tier3Fresh: 0,
    });

    return {
      ...totals,
      netSavings: totals.totalSaved - totals.totalIncurred,
      wasteEliminated: totals.tier1Skips > 0,
      periodDays: days
    };
  } catch (error) {
    console.error(`❌ Database error getting total savings:`, error);
    return {
      totalSaved: 0,
      totalIncurred: 0,
      netSavings: 0,
      tier1Skips: 0,
      tier2Links: 0,
      tier3Fresh: 0,
      wasteEliminated: false,
      periodDays: days
    };
  }
}

/**
 * Enhanced movie completion status check with database flags
 */
export async function getEnhancedMovieCompletionStatus(movieId) {
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase
      .from('movies')
      .select(`
        id,
        title,
        year,
        has_linked_analysis,
        analysis_completed_at,
        movie_analyses(
          has_links,
          linked_at,
          link_count,
          claude_response
        )
      `)
      .eq('id', movieId)
      .eq('movie_analyses.analysis_type', 'page_analysis')
      .single();

    if (error || !data) {
      return {
        tier: 'missing',
        hasAnalysis: false,
        hasLinks: false,
        analysis: null,
        databaseFlags: null
      };
    }

    const analysis = data.movie_analyses[0];
    
    // Enhanced tier detection using database flags
    let tier = 'missing';
    if (data.has_linked_analysis && analysis?.has_links) {
      tier = 'complete';
    } else if (analysis?.claude_response) {
      tier = 'unlinked';
    }

    return {
      tier,
      hasAnalysis: !!analysis,
      hasLinks: data.has_linked_analysis && analysis?.has_links,
      analysis: analysis?.claude_response,
      databaseFlags: {
        hasLinkedAnalysis: data.has_linked_analysis,
        analysisCompletedAt: data.analysis_completed_at,
        linkedAt: analysis?.linked_at,
        linkCount: analysis?.link_count
      }
    };
  } catch (error) {
    console.error(`❌ Error getting enhanced completion status for movie ${movieId}:`, error);
    return {
      tier: 'missing',
      hasAnalysis: false,
      hasLinks: false,
      analysis: null,
      databaseFlags: null
    };
  }
}

/**
 * Bulk update completion status for multiple movies
 */
export async function bulkMarkAnalysisComplete(movieIds, linkCounts = {}) {
  const supabase = getSupabaseClient();
  
  try {
    console.log(`📊 Bulk marking ${movieIds.length} movies as complete...`);
    
    const results = [];
    
    // Process in batches to avoid overwhelming the database
    const batchSize = 20;
    for (let i = 0; i < movieIds.length; i += batchSize) {
      const batch = movieIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(movieId => 
        markAnalysisComplete(movieId, linkCounts[movieId] || 0)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < movieIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    const successful = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
    const failed = results.length - successful;
    
    console.log(`✅ Bulk completion: ${successful} successful, ${failed} failed`);
    
    return { successful, failed, total: movieIds.length };
  } catch (error) {
    console.error(`❌ Database error in bulk mark analysis complete:`, error);
    return { successful: 0, failed: movieIds.length, total: movieIds.length };
  }
}