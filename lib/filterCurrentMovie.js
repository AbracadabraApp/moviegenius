/**
 * Filter out the current movie from a list of movie recommendations
 * to prevent redundant self-referential links on movie pages
 */

export function filterCurrentMovie(movies, currentTitle) {
  if (!movies || !Array.isArray(movies) || !currentTitle) {
    return movies || [];
  }

  const normalizedCurrentTitle = currentTitle.toLowerCase().trim();
  console.log(
    '🔍 Filtering current movie:',
    normalizedCurrentTitle,
    'from',
    movies.length,
    'movies'
  );

  // Check for data structure issues
  movies.forEach((movie, index) => {
    if (!movie) {
      console.warn(`⚠️ Movie at index ${index} is null/undefined`);
    } else if (!movie.title) {
      console.warn(`⚠️ Movie at index ${index} missing title:`, movie);
    } else if (!movie.tmdb_id) {
      console.warn(`⚠️ Movie "${movie.title}" missing tmdb_id:`, movie);
    }
  });

  const filtered = movies.filter(movie => {
    if (!movie || !movie.title) {
      console.log('🚫 Filtered out movie with missing data:', movie);
      return false;
    }

    const normalizedMovieTitle = movie.title.toLowerCase().trim();
    const shouldInclude = normalizedMovieTitle !== normalizedCurrentTitle;

    if (!shouldInclude) {
      console.log('🚫 Filtered out self-referencing movie:', normalizedMovieTitle);
    } else {
      console.log(
        '✅ Including movie:',
        normalizedMovieTitle,
        'TMDB ID:',
        movie.tmdb_id || 'MISSING'
      );
    }

    return shouldInclude;
  });

  console.log('🔍 Filtered result:', filtered.length, 'movies remaining');
  console.log(
    '🔍 Final movies for FeaturedFilmsSection:',
    filtered.map(m => ({
      title: m.title,
      tmdb_id: m.tmdb_id,
      hasRequiredFields: !!(m.title && m.tmdb_id),
    }))
  );
  return filtered;
}
