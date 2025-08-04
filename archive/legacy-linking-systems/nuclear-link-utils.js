/**
 * Nuclear Link Processing Utilities
 * Standalone functions for testing movie link processing logic
 */

/**
 * Build a movie title lookup from all movies in sections
 * Creates a Map for fast O(1) lookups during text processing
 *
 * @param {Array} sections - Analysis sections containing movie data
 * @param {string} currentTitle - Title of current movie to exclude (prevent self-referential links)
 * @returns {Map} - Map with "title (year)" keys and movie data values
 */
function buildMovieLookup(sections, currentTitle) {
  const movieLookup = new Map();

  sections.forEach(section => {
    if (section.type === 'movies' && section.movies) {
      section.movies.forEach(movie => {
        // Only include movies with valid TMDB IDs and exclude current movie
        if (movie.title && movie.tmdb_id && movie.title !== currentTitle) {
          // Use lowercase key for case-insensitive matching
          const key = `${movie.title.toLowerCase().trim()} (${movie.year})`;
          movieLookup.set(key, {
            title: movie.title,
            tmdb_id: movie.tmdb_id,
            year: movie.year,
          });
        }
      });
    }
  });

  return movieLookup;
}

/**
 * Process text content to convert movie mentions to direct TMDB links
 *
 * Converts patterns like "**Movie Title** (Year)" to direct HTML links.
 * Applies business logic to prevent self-referential links.
 *
 * @param {string} content - Text content to process
 * @param {Map} movieLookup - Movie lookup map from buildMovieLookup()
 * @param {string} currentTitle - Current movie title to prevent self-links
 * @returns {string} - Processed content with HTML links
 */
function processTextLinks(content, movieLookup, currentTitle) {
  if (!content || typeof content !== 'string') {
    return content;
  }

  let processedContent = content;

  // Pattern for **Movie Title** (Year) format in markdown
  const moviePattern = /\*\*([^*]+)\*\* \((\d{4})\)/g;
  const matches = [];
  let match;

  // Collect all matches first to avoid regex state issues
  while ((match = moviePattern.exec(content)) !== null) {
    const title = match[1].trim();
    const year = parseInt(match[2]);
    const lookupKey = `${title.toLowerCase()} (${year})`;

    // BUSINESS LOGIC: Skip self-referential links (case-insensitive)
    if (title.toLowerCase().trim() === currentTitle.toLowerCase().trim()) {
      continue;
    }

    // Look up TMDB ID from related movies data
    const movieData = movieLookup.get(lookupKey);
    if (movieData) {
      matches.push({
        fullMatch: match[0],
        title: title, // Preserve original casing
        year: year,
        tmdbId: movieData.tmdb_id,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  // Process matches in reverse order to maintain string positions
  for (const movieMatch of matches.reverse()) {
    // Convert **Title** (Year) to <a href="/movie/ID">Title</a> (Year)
    const link = `<a href="/movie/${movieMatch.tmdbId}" class="movie-title">${movieMatch.title}</a> (${movieMatch.year})`;
    processedContent =
      processedContent.slice(0, movieMatch.start) + link + processedContent.slice(movieMatch.end);
  }

  return processedContent;
}

/**
 * Validate generated static data for quality and correctness
 *
 * @param {Object} staticData - The generated static page data
 * @param {string} movieTitle - Title of the movie for context
 * @returns {Object} - Validation result with issues array
 */
function validateStaticData(staticData, movieTitle) {
  const issues = [];

  try {
    // Check required top-level structure
    if (!staticData.props) {
      issues.push('Missing props object');
      return { valid: false, issues };
    }

    const props = staticData.props;

    // Check required fields
    const requiredFields = ['title', 'year', 'tmdbId', 'hasAnalysis', 'sections'];
    for (const field of requiredFields) {
      if (props[field] === undefined || props[field] === null) {
        issues.push(`Missing required field: ${field}`);
      }
    }

    // Validate sections structure
    if (Array.isArray(props.sections)) {
      props.sections.forEach((section, index) => {
        if (!section.type) {
          issues.push(`Section ${index} missing type`);
        }

        if (section.type === 'text') {
          if (!section.content || typeof section.content !== 'string') {
            issues.push(`Text section ${index} missing or invalid content`);
          } else {
            // Check for search-based links (should be converted to direct links)
            const searchLinks = section.content.match(/href="\/search\?[^"]*"/g);
            if (searchLinks) {
              issues.push(`Section ${index} has search-based links: ${searchLinks.join(', ')}`);
            }

            // Check for unprocessed movie links (should be converted to HTML)
            const unprocessedLinks = section.content.match(/\*\*[^*]+\*\* \(\d{4}\)/g);
            if (unprocessedLinks) {
              // Filter out self-referential links which should remain unprocessed
              const problematicLinks = unprocessedLinks.filter(link => {
                const titleMatch = link.match(/\*\*([^*]+)\*\*/);
                return (
                  titleMatch &&
                  titleMatch[1].toLowerCase().trim() !== movieTitle.toLowerCase().trim()
                );
              });

              if (problematicLinks.length > 0) {
                issues.push(
                  `Section ${index} has unprocessed movie links: ${problematicLinks.join(', ')}`
                );
              }
            }

            // Check for self-referential links (should remain as markdown)
            const selfLinks = section.content.match(
              new RegExp(
                `<a href="/movie/\\d+"[^>]*>${movieTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</a>`,
                'gi'
              )
            );
            if (selfLinks) {
              issues.push(`Section ${index} has self-referential link: ${selfLinks[0]}`);
            }
          }
        }

        if (section.type === 'movies') {
          if (!Array.isArray(section.movies)) {
            issues.push(`Movies section ${index} missing or invalid movies array`);
          } else {
            section.movies.forEach((movie, movieIndex) => {
              if (!movie.title || !movie.year) {
                issues.push(`Movie ${movieIndex} in section ${index} missing title or year`);
              }

              // Check for broken poster URLs
              if (movie.poster_url) {
                if (
                  movie.poster_url.includes('placeholder') ||
                  movie.poster_url.includes('404') ||
                  movie.poster_url === '/images/placeholder-poster.jpg'
                ) {
                  issues.push(
                    `Movie ${movieIndex} in section ${index} has placeholder poster: ${movie.poster_url}`
                  );
                }
              }

              // Check for missing TMDB IDs
              if (!movie.tmdb_id) {
                issues.push(
                  `Movie ${movieIndex} in section ${index} missing TMDB ID: ${movie.title}`
                );
              }
            });
          }
        }
      });
    } else {
      issues.push('Sections is not an array');
    }

    // Check main movie poster
    if (props.initialPoster) {
      if (
        props.initialPoster.includes('placeholder') ||
        props.initialPoster.includes('404') ||
        props.initialPoster === '/images/placeholder-poster.jpg'
      ) {
        issues.push(`Main movie has placeholder poster: ${props.initialPoster}`);
      }
    }
  } catch (error) {
    issues.push(`Validation error: ${error.message}`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

module.exports = {
  buildMovieLookup,
  processTextLinks,
  validateStaticData,
};
