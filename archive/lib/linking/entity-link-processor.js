// Centralized Entity Linking Processor
import { MovieService } from '../pages/api/railway-db.js';

// Enhanced entity extraction with robust fallback
export async function processEntityLinks(content, context = {}) {
  if (!content || typeof content !== 'string') {
    console.warn('Invalid content passed to entity link processor');
    return { processedContent: content, entities: {} };
  }

  const movieTitleRegex = /\*\*([^*]+)\*\*\s*\((\d{4})\)/g;
  const personNameRegex = /\*\*([^*]+)\*\*/g;

  const movieEntities = new Set();
  const peopleEntities = new Set();

  // Function to get TMDB ID for a movie, with caching
  const getMovieTmdbId = async (title, year) => {
    try {
      const movieDetails = await MovieService.findMovieByTitleAndYear(title, year);
      return movieDetails?.tmdb_id || null;
    } catch (error) {
      console.error(`Failed to find TMDB ID for ${title} (${year}):`, error);
      return null;
    }
  };

  // Function to get person ID, with caching
  const getPersonId = async (name) => {
    try {
      const personDetails = await MovieService.findPersonByName(name);
      return personDetails?.id || null;
    } catch (error) {
      console.error(`Failed to find person ID for ${name}:`, error);
      return null;
    }
  };

  // Process movie titles
  let processedContent = content.replace(movieTitleRegex, async (match, title, year) => {
    const tmdbId = await getMovieTmdbId(title, parseInt(year));
    movieEntities.add({ title, year: parseInt(year), tmdb_id: tmdbId });
    return tmdbId 
      ? `<a href="/movie/${tmdbId}">${title}</a> (${year})`
      : match;
  });

  // Process person names
  processedContent = processedContent.replace(personNameRegex, async (match, name) => {
    const personId = await getPersonId(name);
    peopleEntities.add({ name, person_id: personId });
    return personId
      ? `<a href="/person/${personId}">${name}</a>`
      : match;
  });

  // Wait for all async replacements to complete
  processedContent = await Promise.all(processedContent);
  processedContent = processedContent.join('');

  return {
    processedContent,
    entities: {
      movies: Array.from(movieEntities),
      people: Array.from(peopleEntities)
    }
  };
}

// Utility function for direct lookup without complex parsing
export async function extractBasicEntities(content) {
  const movieTitles = [...content.matchAll(/\*\*([^*]+)\*\*\s*\((\d{4})\)/g)]
    .map(match => ({ title: match[1], year: parseInt(match[2]) }));
  
  const peopleNames = [...content.matchAll(/\*\*([^*]+)\*\*/g)]
    .map(match => match[1]);

  return { movies: movieTitles, people: peopleNames };
}