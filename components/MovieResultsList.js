/**
 * MovieResultsList - Consistent movie list display component
 * 
 * Provides standardized display for search results, browse lists, and other movie collections
 * Uses SearchResultCard for consistent styling and functionality
 */

import SearchResultCard from './SearchResultCard';

/**
 * MovieResultsList Component
 * 
 * @param {Object} props
 * @param {Array} props.movies - Array of movie objects with standard format
 * @param {Function} props.onMovieClick - Handler for movie clicks
 * @param {boolean} props.showTrailer - Whether to show trailer functionality
 */
export default function MovieResultsList({ 
  movies = [], 
  onMovieClick,
  showTrailer = true 
}) {
  if (!movies || movies.length === 0) {
    return null;
  }

  return (
    <div style={styles.moviesList}>
      {movies.map(movie => (
        <SearchResultCard
          key={movie.id}
          title={movie.title}
          year={movie.year}
          initialSlug={movie.initialSlug || null}
          contributors={movie.contributors}
          overview={movie.overview}
          initialPoster={movie.poster_url}
          tmdbId={movie.tmdb_id}
          showTrailer={showTrailer}
          onMovieClick={onMovieClick}
        />
      ))}
    </div>
  );
}

const styles = {
  moviesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0'
  }
};