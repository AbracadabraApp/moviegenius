/**
 * Filter out the current movie from a list of movie recommendations
 * to prevent redundant self-referential links on movie pages
 */

export function filterCurrentMovie(movies, currentTitle) {
  if (!movies || !Array.isArray(movies) || !currentTitle) {
    return movies || [];
  }
  
  const normalizedCurrentTitle = currentTitle.toLowerCase().trim();
  console.log('🔍 Filtering current movie:', normalizedCurrentTitle, 'from', movies.length, 'movies');
  
  const filtered = movies.filter(movie => {
    if (!movie || !movie.title) return true;
    
    const normalizedMovieTitle = movie.title.toLowerCase().trim();
    const shouldInclude = normalizedMovieTitle !== normalizedCurrentTitle;
    
    if (!shouldInclude) {
      console.log('🚫 Filtered out self-referencing movie:', normalizedMovieTitle);
    } else {
      console.log('✅ Including movie:', normalizedMovieTitle);
    }
    
    return shouldInclude;
  });
  
  console.log('🔍 Filtered result:', filtered.length, 'movies remaining');
  return filtered;
}