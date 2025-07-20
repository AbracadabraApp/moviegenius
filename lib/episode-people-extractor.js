// lib/episode-people-extractor.js
/**
 * Extract people from Genius episode movies using TMDB credits
 * Creates episode-scoped person data for entity linking
 */

/**
 * Extract all people from episode movie data using TMDB API
 * @param {Object} episodeContent - The episode content with movies
 * @returns {Object} - Episode people organized by role
 */
export async function extractEpisodePeople(episodeContent) {
  if (!episodeContent?.sections) {
    return { directors: [], actors: [], writers: [], allPeople: [] };
  }

  const allMovies = [];
  const episodePeople = {
    directors: [],
    actors: [],
    writers: [],
    allPeople: [],
  };

  // Collect all movies from episode
  episodeContent.sections.forEach(section => {
    if (section.type === 'movies' && section.movies) {
      allMovies.push(...section.movies);
    }
  });

  // Add movies from moreIdeas
  if (episodeContent.moreIdeas?.movies) {
    allMovies.push(...episodeContent.moreIdeas.movies);
  }

  // Extract credits for each movie
  for (const movie of allMovies) {
    if (!movie.tmdb_id) continue;

    try {
      const credits = await getTMDBCredits(movie.tmdb_id);

      // Process directors
      credits.crew?.forEach(person => {
        if (person.job === 'Director') {
          addPersonToEpisode(episodePeople.directors, person, 'director', movie);
        }
      });

      // Process top 5 cast members
      credits.cast?.slice(0, 5).forEach(person => {
        addPersonToEpisode(episodePeople.actors, person, 'actor', movie);
      });

      // Process writers (screenplay, story, writer)
      credits.crew?.forEach(person => {
        if (['Screenplay', 'Writer', 'Story'].includes(person.job)) {
          addPersonToEpisode(episodePeople.writers, person, 'writer', movie);
        }
      });
    } catch (error) {
      console.warn(`Failed to get credits for ${movie.title} (${movie.tmdb_id}):`, error);
    }
  }

  // Create unified allPeople list with roles
  episodePeople.allPeople = [
    ...episodePeople.directors.map(p => ({ ...p, primaryRole: 'director' })),
    ...episodePeople.actors.map(p => ({ ...p, primaryRole: 'actor' })),
    ...episodePeople.writers.map(p => ({ ...p, primaryRole: 'writer' })),
  ];

  return episodePeople;
}

/**
 * Add person to episode people list (deduplicated)
 * @param {Array} peopleList - The list to add to
 * @param {Object} person - TMDB person object
 * @param {string} role - Role in this context
 * @param {Object} movie - Movie they worked on
 */
function addPersonToEpisode(peopleList, person, role, movie) {
  // Check if person already exists
  const existingPerson = peopleList.find(p => p.tmdb_id === person.id);

  if (existingPerson) {
    // Add this movie to their filmography
    if (!existingPerson.episodeMovies.some(m => m.tmdb_id === movie.tmdb_id)) {
      existingPerson.episodeMovies.push({
        tmdb_id: movie.tmdb_id,
        title: movie.title,
        year: movie.year,
        role: role,
      });
    }
  } else {
    // Add new person
    peopleList.push({
      tmdb_id: person.id,
      name: person.name,
      character: person.character || null, // For actors
      job: person.job || role, // For crew
      profile_path: person.profile_path,
      episodeMovies: [
        {
          tmdb_id: movie.tmdb_id,
          title: movie.title,
          year: movie.year,
          role: role,
        },
      ],
    });
  }
}

/**
 * Get TMDB credits for a movie using API endpoint
 * @param {number} tmdbId - TMDB movie ID
 * @returns {Object} - Credits with cast and crew
 */
async function getTMDBCredits(tmdbId) {
  const response = await fetch('/api/tmdb-credits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tmdbId }),
  });

  if (!response.ok) {
    throw new Error(`Credits API error: ${response.status}`);
  }

  const data = await response.json();

  // Convert back to TMDB format for compatibility
  return {
    cast: data.cast || [],
    crew: data.crew || [],
  };
}

/**
 * Find person by name in episode people (fuzzy matching)
 * @param {string} name - Name to search for
 * @param {Object} episodePeople - Episode people data
 * @returns {Object|null} - Matching person or null
 */
export function findPersonInEpisode(name, episodePeople) {
  if (!name || !episodePeople?.allPeople) return null;

  const searchName = name.toLowerCase().trim();

  // Try exact match first
  let match = episodePeople.allPeople.find(person => person.name.toLowerCase() === searchName);

  if (match) return match;

  // Try last name match (for "Hitchcock" → "Alfred Hitchcock")
  const nameWords = searchName.split(' ');
  const lastName = nameWords[nameWords.length - 1];

  if (lastName.length > 3) {
    // Avoid matching short words
    const lastNameMatches = episodePeople.allPeople.filter(person =>
      person.name.toLowerCase().includes(lastName)
    );

    // If only one person matches the last name, return them
    if (lastNameMatches.length === 1) {
      return lastNameMatches[0];
    }
  }

  // Try contains match for partial names
  match = episodePeople.allPeople.find(
    person =>
      person.name.toLowerCase().includes(searchName) ||
      searchName.includes(person.name.toLowerCase())
  );

  return match || null;
}

/**
 * Get episode people summary for debugging
 * @param {Object} episodePeople - Episode people data
 * @returns {Object} - Summary statistics
 */
export function getEpisodePeopleSummary(episodePeople) {
  return {
    totalPeople: episodePeople.allPeople?.length || 0,
    directors: episodePeople.directors?.length || 0,
    actors: episodePeople.actors?.length || 0,
    writers: episodePeople.writers?.length || 0,
    directorNames: episodePeople.directors?.map(d => d.name) || [],
    topActors: episodePeople.actors?.slice(0, 3).map(a => a.name) || [],
  };
}
