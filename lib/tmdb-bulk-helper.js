// lib/tmdb-bulk-helper.js - Helper utilities for TMDB bulk API usage
import { createBulkRequests } from '../pages/api/tmdb-bulk';

/**
 * High-level helper for common TMDB bulk operations
 */
export class TMDBBulkHelper {
  constructor() {
    this.bulkRequests = createBulkRequests();
  }

  /**
   * Fetch complete movie data (search + details + streaming + credits)
   */
  async fetchCompleteMovieData(movies) {
    const requests = [];

    movies.forEach((movie, index) => {
      const baseId = `movie_${index}`;

      if (movie.tmdb_id) {
        // If we have TMDB ID, get details, streaming, and credits
        requests.push(
          this.bulkRequests.movieDetails(`${baseId}_details`, movie.tmdb_id),
          this.bulkRequests.movieStreaming(`${baseId}_streaming`, movie.tmdb_id),
          this.bulkRequests.movieCredits(`${baseId}_credits`, movie.tmdb_id)
        );
      } else if (movie.title && movie.year) {
        // If we only have title/year, search first
        requests.push(this.bulkRequests.searchMovie(`${baseId}_search`, movie.title, movie.year));
      }
    });

    const response = await fetch('/api/tmdb-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      throw new Error(`TMDB bulk request failed: ${response.status}`);
    }

    const data = await response.json();
    return this.organizeMovieResults(data.results, movies);
  }

  /**
   * Fetch streaming data for multiple movies
   */
  async fetchStreamingData(tmdbIds) {
    const requests = tmdbIds.map((tmdbId, index) =>
      this.bulkRequests.movieStreaming(`streaming_${index}`, tmdbId)
    );

    const response = await fetch('/api/tmdb-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      throw new Error(`TMDB streaming bulk request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.results
      .filter(result => result.success)
      .map(result => ({
        tmdb_id: result.data.tmdb_id,
        streamingText: result.data.streamingText,
        providers: result.data.providers,
      }));
  }

  /**
   * Search for multiple movies at once
   */
  async searchMovies(movieQueries) {
    const requests = movieQueries.map((query, index) =>
      this.bulkRequests.searchMovie(`search_${index}`, query.title, query.year)
    );

    const response = await fetch('/api/tmdb-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      throw new Error(`TMDB search bulk request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.results.filter(result => result.success).map(result => result.data);
  }

  /**
   * Fetch person details for multiple people
   */
  async fetchPeopleDetails(personIds) {
    const requests = personIds.map((personId, index) =>
      this.bulkRequests.personDetails(`person_${index}`, personId)
    );

    const response = await fetch('/api/tmdb-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    });

    if (!response.ok) {
      throw new Error(`TMDB people bulk request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.results.filter(result => result.success).map(result => result.data);
  }

  /**
   * Organize movie results by original input order
   */
  organizeMovieResults(results, originalMovies) {
    const organized = originalMovies.map(() => ({
      search: null,
      details: null,
      streaming: null,
      credits: null,
    }));

    results.forEach(result => {
      if (!result.success) return;

      const idParts = result.id.split('_');
      const movieIndex = parseInt(idParts[1]);
      const dataType = idParts[2];

      if (organized[movieIndex]) {
        organized[movieIndex][dataType] = result.data;
      }
    });

    return organized;
  }
}

/**
 * Convenience function for MediaCard enhancement
 */
export async function enhanceMediaCards(mediaCards) {
  const helper = new TMDBBulkHelper();

  // Group cards by what data they need
  const needsSearch = mediaCards.filter(card => !card.tmdb_id && card.title && card.year);

  const needsStreaming = mediaCards.filter(
    card => card.tmdb_id && (!card.initialStreaming || card.initialStreaming === 'TBD')
  );

  const needsPosters = mediaCards.filter(
    card => card.tmdb_id && (!card.initialPoster || card.initialPoster.includes('placeholder'))
  );

  // Batch requests
  const promises = [];

  if (needsSearch.length > 0) {
    promises.push(
      helper.searchMovies(
        needsSearch.map(card => ({
          title: card.title,
          year: card.year,
        }))
      )
    );
  }

  if (needsStreaming.length > 0) {
    promises.push(helper.fetchStreamingData(needsStreaming.map(card => card.tmdb_id)));
  }

  const [searchResults = [], streamingResults = []] = await Promise.allSettled(promises);

  // Apply results back to cards
  const enhancedCards = [...mediaCards];

  // Apply search results
  if (searchResults.status === 'fulfilled') {
    searchResults.value.forEach((result, index) => {
      const card = needsSearch[index];
      if (card && result) {
        const cardIndex = mediaCards.findIndex(c => c === card);
        enhancedCards[cardIndex] = {
          ...card,
          tmdb_id: result.tmdb_id,
          initialPoster: result.poster || card.initialPoster,
        };
      }
    });
  }

  // Apply streaming results
  if (streamingResults.status === 'fulfilled') {
    streamingResults.value.forEach((result, index) => {
      const card = needsStreaming[index];
      if (card && result) {
        const cardIndex = mediaCards.findIndex(c => c === card);
        enhancedCards[cardIndex] = {
          ...enhancedCards[cardIndex],
          initialStreaming: result.streamingText,
        };
      }
    });
  }

  return enhancedCards;
}

/**
 * Convenience function for analysis generation (movie mentions)
 */
export async function enhanceAnalysisMovies(movieMentions) {
  const helper = new TMDBBulkHelper();

  const movies = movieMentions.map(mention => ({
    title: mention.title,
    year: mention.year,
    tmdb_id: mention.tmdb_id,
  }));

  try {
    const results = await helper.fetchCompleteMovieData(movies);

    return movieMentions.map((mention, index) => {
      const result = results[index];

      // Use search result if available, otherwise details
      const movieData = result.details || result.search;

      if (movieData) {
        return {
          ...mention,
          tmdb_id: movieData.tmdb_id,
          poster: movieData.poster || mention.poster,
          initialStreaming: result.streaming?.streamingText || mention.initialStreaming,
          enhanced: true,
        };
      }

      return mention;
    });
  } catch (error) {
    console.warn('Bulk enhancement failed, returning original movies:', error);
    return movieMentions;
  }
}

export default TMDBBulkHelper;
