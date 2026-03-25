/**
 * WhyWatchContainer - Independent Why Watch data fetching wrapper
 *
 * Fetches Why Watch recommendations independently and passes them to WhyWatchSection.
 * Works for any movie regardless of whether it has full analysis.
 */
import { useState, useEffect } from 'react';
import WhyWatchSection from './WhyWatchSection';

export default function WhyWatchContainer({ tmdbId, streaming, style, rightSlot }) {
  const [whyWatch, setWhyWatch] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tmdbId) {
      setLoading(false);
      return;
    }

    const fetchWhyWatch = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/why-watch?tmdbId=${tmdbId}`);

        if (response.ok) {
          const data = await response.json();
          setWhyWatch(data);
        } else {
          console.warn(`Why Watch API failed for movie ${tmdbId}:`, response.status);
          setWhyWatch(null);
        }
      } catch (err) {
        console.error('Why Watch fetch error:', err);
        setWhyWatch(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWhyWatch();
  }, [tmdbId]);

  // Don't render anything while loading - no indicators
  if (loading) {
    return null;
  }

  if (!whyWatch || !whyWatch.hasData) {
    return null; // Fail silently - don't show broken or fallback states
  }

  const { whyWatch: recommendation } = whyWatch;

  // Don't show unknown/fallback recommendations
  if (recommendation.recommendation === 'UNKNOWN') {
    return null;
  }

  return (
    <div style={{ ...styles.fadeIn, ...style }}>
      <WhyWatchSection
        reasons={recommendation.reasons}
        recommendation={recommendation.recommendation}
        context={recommendation.context}
        streaming={streaming}
        rightSlot={rightSlot}
      />
    </div>
  );
}

const styles = {
  fadeIn: {
    animation: 'fadeIn 0.3s ease-in',
  }
};