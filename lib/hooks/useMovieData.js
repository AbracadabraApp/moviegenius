/**
 * useMovieData - Shared movie data formatting utilities
 * 
 * Provides consistent movie data formatting for search results, browse lists, etc.
 */

/**
 * Format contributor data for display
 * Handles both object and string formats from database
 */
export function formatContributors(contributors_json) {
  if (!contributors_json) return null;

  const director = contributors_json.director?.[0];
  const directorName = typeof director === 'object' ? director.name : director;
  
  const topActors = contributors_json.star?.slice(0, 3) || [];
  const actorNames = topActors.map(actor => 
    typeof actor === 'object' ? actor.name : actor
  ).filter(Boolean);

  const parts = [];
  if (actorNames.length > 0) {
    parts.push(`Starring:`);
    parts.push(actorNames.join(', '));
  }
  if (directorName) {
    parts.push(`Director:`);
    parts.push(directorName);
  }
  
  return parts.length > 0 ? parts.join('\n') : null;
}

/**
 * Format movie data for SearchResultCard component
 * Ensures consistent data structure across different sources
 */
export function formatMovieForDisplay({
  tmdb_id,
  title,
  year,
  poster_url,
  overview = '',
  contributors_json,
  streaming_data,
  initialSlug = null,
  popularity = 0
}) {
  const contributorText = formatContributors(contributors_json);

  return {
    id: `tmdb_${tmdb_id}`,
    title,
    year,
    tmdb_id,
    poster_url: poster_url || '/images/placeholder-poster.jpg',
    popularity,
    streaming_data,
    initialSlug,
    overview,
    contributors: contributorText
  };
}