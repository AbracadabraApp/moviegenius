// lib/simple-entity-linker.js
/**
 * Ultra-conservative entity linking for Genius episodes
 * Only links quoted movie titles with years: "Title" (Year)
 */


/**
 * Process text to link quoted movie titles with years
 * Only links if movie exists in provided episode data
 */
export function processMovieLinks(text, episodeMovies = []) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Ultra-conservative pattern: "Title" (Year)
  const movieLinkPattern = /"([^"]+)"\s*\((\d{4})\)/g;
  
  return text.replace(movieLinkPattern, (match, title, year) => {
    // Find matching movie in episode data
    const movieData = episodeMovies.find(movie => 
      movie.title === title && 
      movie.year.toString() === year
    );
    
    if (movieData) {
      // Use TMDB ID for URL
      return `"<a href="/movie/${movieData.tmdb_id}" class="movie-link" data-movie-id="${movieData.tmdb_id || ''}">${title}</a>" (${year})`;
    }
    
    // Keep original text if no match found
    return match;
  });
}

/**
 * Extract all episode movies for easier lookup
 * Combines movies from all movie sections + moreIdeas
 */
export function extractEpisodeMovies(episodeContent) {
  const allMovies = [];
  
  if (!episodeContent?.sections) {
    return allMovies;
  }
  
  // Extract from movie sections
  episodeContent.sections.forEach(section => {
    if (section.type === 'movies' && section.movies) {
      allMovies.push(...section.movies);
    }
  });
  
  // Extract from moreIdeas
  if (episodeContent.moreIdeas?.movies) {
    allMovies.push(...episodeContent.moreIdeas.movies);
  }
  
  return allMovies;
}

/**
 * React-safe version that returns JSX elements
 */
export function processMovieLinksForReact(text, episodeMovies = []) {
  if (!text || typeof text !== 'string') {
    return [text];
  }

  const movieLinkPattern = /"([^"]+)"\s*\((\d{4})\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = movieLinkPattern.exec(text)) !== null) {
    const [fullMatch, title, year] = match;
    
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    // Find matching movie in episode data
    const movieData = episodeMovies.find(movie => 
      movie.title === title && 
      movie.year.toString() === year
    );
    
    if (movieData) {
      // Create link element using TMDB ID, excluding quotes
      parts.push('"');  // Opening quote outside link
      parts.push({
        type: 'link',
        href: `/movie/${movieData.tmdb_id}`,
        text: title,
        movieId: movieData.tmdb_id,
        year: year
      });
      parts.push('"');  // Closing quote outside link
    } else {
      // Keep original text
      parts.push(fullMatch);
    }
    
    lastIndex = match.index + fullMatch.length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}

/**
 * Stats for testing and debugging
 */
export function analyzeTextForLinks(text, episodeMovies = []) {
  if (!text) return { totalMatches: 0, linkedMatches: 0, unlinkedMatches: 0 };
  
  const movieLinkPattern = /"([^"]+)"\s*\((\d{4})\)/g;
  const matches = [...text.matchAll(movieLinkPattern)];
  
  let linkedMatches = 0;
  let unlinkedMatches = 0;
  
  matches.forEach(([, title, year]) => {
    const movieData = episodeMovies.find(movie => 
      movie.title === title && 
      movie.year.toString() === year
    );
    
    if (movieData) {
      linkedMatches++;
    } else {
      unlinkedMatches++;
    }
  });
  
  return {
    totalMatches: matches.length,
    linkedMatches,
    unlinkedMatches,
    matches: matches.map(([fullMatch, title, year]) => ({
      text: fullMatch,
      title,
      year,
      linked: episodeMovies.some(m => m.title === title && m.year.toString() === year)
    }))
  };
}