/**
 * Predictive Loading React Hook
 *
 * Integrates predictive content loading into React components
 * with automatic behavior tracking and performance monitoring.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';

/**
 * Custom hook for predictive content loading
 *
 * Automatically tracks page views and triggers predictive loading
 * based on user behavior patterns in demo mode.
 */
export function usePredictiveLoading(pageType, movieId, metadata = {}) {
  const router = useRouter();
  const predictiveLoaderRef = useRef(null);
  const hasTrackedRef = useRef(false);

  // Initialize predictive loader (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initializePredictiveLoader = async () => {
      try {
        const { getPredictiveLoader } = await import('../lib/predictive-loader.js');
        predictiveLoaderRef.current = getPredictiveLoader();

        // Track initial page view if not already tracked
        if (!hasTrackedRef.current && movieId) {
          trackPageView();
          hasTrackedRef.current = true;
        }
      } catch (error) {
        console.warn('Failed to initialize predictive loader:', error);
      }
    };

    initializePredictiveLoader();
  }, []);

  // Track page view and trigger predictive loading
  const trackPageView = useCallback(() => {
    if (!predictiveLoaderRef.current || !movieId) return;

    try {
      const enhancedMetadata = {
        ...metadata,
        route: router.asPath,
        timestamp: Date.now(),
        referrer: document.referrer,
        userAgent: navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop',
      };

      predictiveLoaderRef.current.trackPageView(pageType, movieId, enhancedMetadata);

      console.log(`🔮 Tracked page view: ${pageType} ${movieId}`);
    } catch (error) {
      console.warn('Failed to track page view:', error);
    }
  }, [pageType, movieId, metadata, router.asPath]);

  // Track page view on route changes
  useEffect(() => {
    if (movieId && !hasTrackedRef.current) {
      trackPageView();
      hasTrackedRef.current = true;
    }
  }, [movieId, trackPageView]);

  // Track user interactions for better predictions
  const trackInteraction = useCallback(
    (interactionType, targetMovieId, additionalData = {}) => {
      if (!predictiveLoaderRef.current) return;

      try {
        const interactionMetadata = {
          type: interactionType,
          target_movie_id: targetMovieId,
          source_movie_id: movieId,
          timestamp: Date.now(),
          ...additionalData,
        };

        // Track interaction as a micro page view for prediction purposes
        predictiveLoaderRef.current.trackPageView(
          'interaction',
          targetMovieId,
          interactionMetadata
        );

        console.log(
          `🔮 Tracked interaction: ${interactionType} from ${movieId} to ${targetMovieId}`
        );
      } catch (error) {
        console.warn('Failed to track interaction:', error);
      }
    },
    [movieId]
  );

  // Get predictive loading status (for debugging/monitoring)
  const getStatus = useCallback(() => {
    if (!predictiveLoaderRef.current) return null;

    try {
      return predictiveLoaderRef.current.getStatus();
    } catch (error) {
      console.warn('Failed to get predictive loader status:', error);
      return null;
    }
  }, []);

  // Prefetch specific content (manual trigger)
  const prefetchContent = useCallback(async targetMovieIds => {
    if (!predictiveLoaderRef.current || !Array.isArray(targetMovieIds)) return;

    try {
      const predictions = targetMovieIds.map(id => ({
        type: 'manual_prefetch',
        movieId: parseInt(id),
        confidence: 1.0,
        reason: 'Manual prefetch request',
      }));

      await predictiveLoaderRef.current.loadPredictions(predictions);

      console.log(`🔮 Manual prefetch completed for: ${targetMovieIds.join(', ')}`);
    } catch (error) {
      console.warn('Failed to prefetch content:', error);
    }
  }, []);

  return {
    trackPageView,
    trackInteraction,
    prefetchContent,
    getStatus,
    isEnabled: predictiveLoaderRef.current?.demoConfig?.PREDICTIVE?.enabled || false,
  };
}

/**
 * Hook for tracking MediaCard interactions
 *
 * Specialized hook for tracking MediaCard clicks and interactions
 * to improve predictive loading accuracy.
 */
export function useMediaCardTracking(sourceMovieId) {
  const { trackInteraction } = usePredictiveLoading('media_card', sourceMovieId);

  const trackCardClick = useCallback(
    targetMovie => {
      trackInteraction('card_click', targetMovie.tmdb_id || targetMovie.id, {
        title: targetMovie.title,
        year: targetMovie.year,
        interaction_source: 'media_card',
      });
    },
    [trackInteraction]
  );

  const trackCardHover = useCallback(
    (targetMovie, hoverDuration) => {
      // Only track longer hovers (indicates interest)
      if (hoverDuration > 1000) {
        // 1 second
        trackInteraction('card_hover', targetMovie.tmdb_id || targetMovie.id, {
          title: targetMovie.title,
          year: targetMovie.year,
          hover_duration: hoverDuration,
          interaction_source: 'media_card',
        });
      }
    },
    [trackInteraction]
  );

  const trackCardView = useCallback(
    targetMovie => {
      trackInteraction('card_view', targetMovie.tmdb_id || targetMovie.id, {
        title: targetMovie.title,
        year: targetMovie.year,
        interaction_source: 'media_card',
      });
    },
    [trackInteraction]
  );

  return {
    trackCardClick,
    trackCardHover,
    trackCardView,
  };
}

/**
 * Hook for tracking Genius episode interactions
 *
 * Tracks navigation patterns within Genius content to predict
 * related movie interests.
 */
export function useGeniusTracking(seriesId, episodeId) {
  const { trackInteraction } = usePredictiveLoading('genius_episode', episodeId);

  const trackEpisodeView = useCallback(
    (metadata = {}) => {
      trackInteraction('genius_episode_view', episodeId, {
        series_id: seriesId,
        episode_id: episodeId,
        ...metadata,
      });
    },
    [trackInteraction, seriesId, episodeId]
  );

  const trackMovieReference = useCallback(
    (referencedMovieId, referenceType = 'mention') => {
      trackInteraction('movie_reference', referencedMovieId, {
        reference_type: referenceType,
        source_series: seriesId,
        source_episode: episodeId,
        interaction_source: 'genius_content',
      });
    },
    [trackInteraction, seriesId, episodeId]
  );

  const trackSeriesNavigation = useCallback(
    (targetSeriesId, targetEpisodeId) => {
      trackInteraction('series_navigation', targetEpisodeId, {
        from_series: seriesId,
        from_episode: episodeId,
        to_series: targetSeriesId,
        to_episode: targetEpisodeId,
        interaction_source: 'genius_navigation',
      });
    },
    [trackInteraction, seriesId, episodeId]
  );

  return {
    trackEpisodeView,
    trackMovieReference,
    trackSeriesNavigation,
  };
}

/**
 * Hook for demo performance monitoring
 *
 * Provides real-time insights into predictive loading performance
 * for demo optimization.
 */
export function usePredictivePerformance() {
  const { getStatus } = usePredictiveLoading();

  const getPerformanceMetrics = useCallback(() => {
    const status = getStatus();
    if (!status) return null;

    return {
      enabled: status.enabled,
      predictions_generated: status.session.predictionsGenerated,
      success_rate: status.performance.successRate,
      average_load_time: status.performance.averageLoadTime,
      circuit_breaker_state: status.circuitBreaker.state,
      resource_utilization: status.resourceUsage.utilizationPercent,
      session_duration: status.session.duration,
      unique_movies_visited: status.session.uniqueMovies,
    };
  }, [getStatus]);

  const isPerformingWell = useCallback(() => {
    const metrics = getPerformanceMetrics();
    if (!metrics) return true; // Default to good if not available

    return (
      parseFloat(metrics.success_rate) > 80 &&
      metrics.circuit_breaker_state !== 'OPEN' &&
      parseFloat(metrics.resource_utilization) < 90
    );
  }, [getPerformanceMetrics]);

  const getRecommendations = useCallback(() => {
    const metrics = getPerformanceMetrics();
    if (!metrics) return [];

    const recommendations = [];

    if (parseFloat(metrics.success_rate) < 80) {
      recommendations.push(
        'Predictive loading success rate is low - consider reducing prefetch count'
      );
    }

    if (metrics.circuit_breaker_state === 'OPEN') {
      recommendations.push(
        'Predictive loading circuit breaker is open - system is recovering from errors'
      );
    }

    if (parseFloat(metrics.resource_utilization) > 90) {
      recommendations.push('High resource utilization - consider reducing concurrent predictions');
    }

    if (metrics.predictions_generated < 5 && metrics.session_duration > 60) {
      recommendations.push('Low prediction generation - user behavior may not match demo patterns');
    }

    return recommendations;
  }, [getPerformanceMetrics]);

  return {
    getPerformanceMetrics,
    isPerformingWell,
    getRecommendations,
  };
}

export default usePredictiveLoading;
