// lib/enhanced-entity-linker.js
/**
 * Enhanced entity linking for Genius episodes
 * Supports both movie and people linking
 */

import { extractEpisodePeople, findPersonInEpisode } from './episode-people-extractor.js';

/**
 * Process text to link both movies and people
 * @param {string} text - Text to process
 * @param {Array} episodeMovies - Movies in episode
 * @param {Object} episodePeople - People in episode
 * @returns {Array} - Array of text/link parts for React
 */
export function processEntityLinksForReact(text, episodeMovies = [], episodePeople = null) {
  if (!text || typeof text !== 'string') {
    return [text];
  }

  let parts = [text];

  // First pass: Link movies (existing system)
  parts = processMovieLinksInParts(parts, episodeMovies);

  // Second pass: Link people (new system)
  if (episodePeople) {
    parts = processPeopleLinksInParts(parts, episodePeople);
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Process movie links in text parts
 * @param {Array} parts - Current text parts
 * @param {Array} episodeMovies - Movies to link
 * @returns {Array} - Updated parts with movie links
 */
function processMovieLinksInParts(parts, episodeMovies) {
  const newParts = [];

  for (const part of parts) {
    if (typeof part === 'string') {
      // Process this text part for movie links
      const movieParts = processMovieLinks(part, episodeMovies);
      newParts.push(...movieParts);
    } else {
      // Keep existing link objects
      newParts.push(part);
    }
  }

  return newParts;
}

/**
 * Process people links in text parts
 * @param {Array} parts - Current text parts
 * @param {Object} episodePeople - People data to link
 * @returns {Array} - Updated parts with people links
 */
function processPeopleLinksInParts(parts, episodePeople) {
  const newParts = [];

  for (const part of parts) {
    if (typeof part === 'string') {
      // Process this text part for people links
      const peopleParts = processPeopleLinks(part, episodePeople);
      newParts.push(...peopleParts);
    } else {
      // Keep existing link objects
      newParts.push(part);
    }
  }

  return newParts;
}

/**
 * Process movie links (from existing simple-entity-linker.js)
 * @param {string} text - Text to process
 * @param {Array} episodeMovies - Movies to link
 * @returns {Array} - Array of text/link parts
 */
function processMovieLinks(text, episodeMovies) {
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
    const movieData = episodeMovies.find(
      movie => movie.title === title && movie.year.toString() === year
    );

    if (movieData) {
      // Create link element using TMDB ID, excluding quotes
      parts.push('"'); // Opening quote outside link
      parts.push({
        type: 'movie-link',
        href: `/movie/${movieData.tmdb_id}`,
        text: title,
        movieId: movieData.tmdb_id,
        year: year,
      });
      parts.push('"'); // Closing quote outside link
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
 * Process people links in text
 * @param {string} text - Text to process
 * @param {Object} episodePeople - People data
 * @returns {Array} - Array of text/link parts
 */
function processPeopleLinks(text, episodePeople) {
  // Conservative director patterns
  const directorPatterns = [
    // "Director Name" or "Director Name's"
    /\b([A-Z][a-z]+ [A-Z][a-z]+)(?:'s)?\b/g,
    // "Name directed" or "Name's direction"
    /\b([A-Z][a-z]+ [A-Z][a-z]+)(?:'s)?\s+(?:directed|direction)/g,
  ];

  let parts = [text];

  // Process each pattern
  for (const pattern of directorPatterns) {
    parts = processPatternInParts(parts, pattern, episodePeople, 'director');
  }

  return parts;
}

/**
 * Process a specific pattern in text parts
 * @param {Array} parts - Current parts
 * @param {RegExp} pattern - Pattern to match
 * @param {Object} episodePeople - People data
 * @param {string} preferredRole - Preferred role to match
 * @returns {Array} - Updated parts
 */
function processPatternInParts(parts, pattern, episodePeople, preferredRole) {
  const newParts = [];

  for (const part of parts) {
    if (typeof part === 'string') {
      const processedParts = processPatternInText(part, pattern, episodePeople, preferredRole);
      newParts.push(...processedParts);
    } else {
      newParts.push(part);
    }
  }

  return newParts;
}

/**
 * Process pattern in single text string
 * @param {string} text - Text to process
 * @param {RegExp} pattern - Pattern to match
 * @param {Object} episodePeople - People data
 * @param {string} preferredRole - Preferred role
 * @returns {Array} - Text parts with links
 */
function processPatternInText(text, pattern, episodePeople, preferredRole) {
  const parts = [];
  let lastIndex = 0;
  let match;

  // Reset pattern
  pattern.lastIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    const [fullMatch, name] = match;

    // Add text before this match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Find person in episode data
    const person = findPersonInEpisode(name, episodePeople);

    if (person && (!preferredRole || person.primaryRole === preferredRole)) {
      // Create person link
      const linkText = name.replace(/'s$/, ''); // Remove possessive
      const remainingText = fullMatch.slice(linkText.length);

      parts.push({
        type: 'person-link',
        href: `/person/${person.tmdb_id}`,
        text: linkText,
        personId: person.tmdb_id,
        role: person.primaryRole,
        name: person.name,
      });

      // Add any remaining text (like "'s" or " directed")
      if (remainingText) {
        parts.push(remainingText);
      }
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
 * Extract all episode movies for easier lookup (from simple-entity-linker.js)
 * @param {Object} episodeContent - Episode content
 * @returns {Array} - All movies in episode
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
 * Analyze text for entity links (movies + people)
 * @param {string} text - Text to analyze
 * @param {Array} episodeMovies - Movies in episode
 * @param {Object} episodePeople - People in episode
 * @returns {Object} - Analysis results
 */
export function analyzeTextForEntityLinks(text, episodeMovies = [], episodePeople = null) {
  if (!text)
    return {
      totalMatches: 0,
      movieMatches: 0,
      peopleMatches: 0,
      matches: [],
    };

  const matches = [];

  // Find movie matches
  const movieLinkPattern = /"([^"]+)"\s*\((\d{4})\)/g;
  const movieMatches = [...text.matchAll(movieLinkPattern)];

  movieMatches.forEach(([fullMatch, title, year]) => {
    const movieData = episodeMovies.find(
      movie => movie.title === title && movie.year.toString() === year
    );

    matches.push({
      text: fullMatch,
      type: 'movie',
      title,
      year,
      linked: !!movieData,
    });
  });

  // Find people matches
  let peopleMatchCount = 0;
  if (episodePeople) {
    const directorPattern = /\b([A-Z][a-z]+ [A-Z][a-z]+)(?:'s)?\b/g;
    const directorMatches = [...text.matchAll(directorPattern)];

    directorMatches.forEach(([fullMatch, name]) => {
      const person = findPersonInEpisode(name, episodePeople);
      if (person && person.primaryRole === 'director') {
        matches.push({
          text: fullMatch,
          type: 'person',
          name,
          role: 'director',
          linked: true,
        });
        peopleMatchCount++;
      }
    });
  }

  return {
    totalMatches: matches.length,
    movieMatches: movieMatches.length,
    peopleMatches: peopleMatchCount,
    matches,
  };
}
