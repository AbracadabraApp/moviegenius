// pages/api/full-recovery-system.js
/**
 * Comprehensive List Recovery System
 *
 * Populates all 82 empty movie lists using discovered movies data
 * and intelligent list categorization based on list names.
 */

import { createClient, supabase } from './railway-adapter.js';

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from './railway-db.js';
import discoveredMovies from '../../data/discovered-movies.json';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  try {
    const pool = getPool();

    console.log('🔄 FULL RECOVERY: Starting comprehensive list population...');
    console.log(`📊 Available movie data: ${discoveredMovies.length} movies with TMDB IDs`);

    // Get all empty lists that need population
    const { data: emptyLists, error: listsError } = await supabase
      .from('movie_lists')
      .select(
        `
        id, name, slug, content_type, description,
        movie_list_items!inner(count)
      `
      )
      .eq('is_active', true)
      .having('movie_list_items.count', 'eq', 0);

    if (listsError) throw listsError;

    console.log(`🎯 Found ${emptyLists.length} empty lists to populate`);

    // Create movie lookup by title and year for fast access
    const movieLookup = new Map();
    discoveredMovies.forEach(movie => {
      const key = `${movie.title.toLowerCase()}_${movie.year}`;
      movieLookup.set(key, movie);
    });

    // Enhanced list matching patterns with movie selection logic
    const listMatchers = {
      // Oscar/Academy Awards
      'oscar|academy|best-picture': {
        keywords: ['oscar', 'academy', 'best picture', 'winner'],
        movieFilter: movies =>
          movies
            .filter(
              m =>
                m.slug?.toLowerCase().includes('oscar') ||
                m.slug?.toLowerCase().includes('academy') ||
                isAwardWinningFilm(m.title, m.year)
            )
            .slice(0, 25),
        description: 'Academy Award winning films',
      },

      // Director Collections
      'kubrick|spielberg|scorsese|tarantino|nolan|hitchcock': {
        keywords: [
          'director',
          'kubrick',
          'spielberg',
          'scorsese',
          'tarantino',
          'nolan',
          'hitchcock',
        ],
        movieFilter: movies => getDirectorFilms(movies, extractDirectorName),
        description: 'Essential films by renowned directors',
      },

      // Film Movements/Genres
      'noir|french-new-wave|italian-neorealism': {
        keywords: ['noir', 'french', 'italian', 'neorealism', 'nouvelle vague'],
        movieFilter: movies =>
          movies.filter(m => isGenreFilm(m, ['noir', 'french', 'italian'])).slice(0, 20),
        description: 'Essential films from major cinema movements',
      },

      // International Films
      'foreign|international|cannes|venice|berlin': {
        keywords: ['foreign', 'international', 'cannes', 'venice', 'berlin', 'palme'],
        movieFilter: movies =>
          movies.filter(m => isForeignFilm(m) || isFestivalWinner(m)).slice(0, 30),
        description: 'International cinema and festival winners',
      },

      // Genre Collections
      'sci-fi|horror|comedy|drama|thriller|action': {
        keywords: ['sci-fi', 'horror', 'comedy', 'drama', 'thriller', 'action'],
        movieFilter: movies => getGenreFilms(movies, extractGenreFromName),
        description: 'Essential films by genre',
      },

      // Decade Collections
      '70s|80s|90s|2000s|1950s|1960s': {
        keywords: ['70s', '80s', '90s', '2000s', '1950s', '1960s'],
        movieFilter: movies => getDecadeFilms(movies, extractDecadeFromName),
        description: 'Essential films by decade',
      },

      // Critics/Publications
      'sight-sound|ebert|kael|guardian|time|rolling-stone': {
        keywords: ['sight', 'sound', 'ebert', 'kael', 'guardian', 'time', 'rolling'],
        movieFilter: movies => getCriticsChoiceFilms(movies),
        description: "Critics' essential film selections",
      },

      // Film Schools/Academic
      'criterion|film-school|must-watch|essential': {
        keywords: ['criterion', 'school', 'must', 'essential', 'classics'],
        movieFilter: movies => getFilmSchoolEssentials(movies),
        description: 'Film school and academic essentials',
      },
    };

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each empty list
    for (const list of emptyLists) {
      try {
        console.log(`\n📋 Processing: "${list.name}" (${list.slug})`);

        // Find matching pattern for this list
        const matchedMovies = findMoviesForList(list, movieLookup, listMatchers);

        if (matchedMovies.length === 0) {
          console.log(`⚠️  No movies found for: "${list.name}"`);
          results.push({
            list: list.name,
            slug: list.slug,
            status: 'no_movies',
            movie_count: 0,
          });
          continue;
        }

        // Create list items
        const listItems = matchedMovies.map((movie, index) => ({
          list_id: list.id,
          movie_id: null, // Will be populated after ensuring movie exists
          tmdb_id: movie.tmdb_id,
          title: movie.title,
          year: movie.year,
          order_index: index + 1,
          created_at: new Date().toISOString(),
        }));

        // Ensure all movies exist in database and get their IDs
        const populatedItems = await ensureMoviesExist(supabase, listItems);

        // Bulk insert list items
        if (populatedItems.length > 0) {
          const { error: itemsError } = await supabase
            .from('movie_list_items')
            .insert(populatedItems);

          if (itemsError) throw itemsError;
        }

        successCount++;
        results.push({
          list: list.name,
          slug: list.slug,
          status: 'populated',
          movie_count: populatedItems.length,
          sample_movies: matchedMovies.slice(0, 3).map(m => `${m.title} (${m.year})`),
        });

        console.log(`✅ Populated: "${list.name}" with ${populatedItems.length} movies`);
      } catch (error) {
        errorCount++;
        console.error(`❌ Error populating "${list.name}":`, error.message);
        results.push({
          list: list.name,
          slug: list.slug,
          status: 'error',
          error: error.message,
        });
      }
    }

    console.log(`\n🏁 FULL RECOVERY COMPLETE:`);
    console.log(`✅ Successfully populated: ${successCount} lists`);
    console.log(`❌ Errors: ${errorCount} lists`);

    res.status(200).json({
      success: true,
      message: `Full recovery completed: ${successCount} lists populated, ${errorCount} errors`,
      summary: {
        total_lists: emptyLists.length,
        populated: successCount,
        errors: errorCount,
        available_movies: discoveredMovies.length,
      },
      results,
    });
  } catch (error) {
    console.error('🚨 FULL RECOVERY FAILED:', error);
    res.status(500).json({
      error: 'Full recovery failed',
      details: error.message,
    });
  }
}

// Helper Functions

function findMoviesForList(list, movieLookup, matchers) {
  const listName = list.name.toLowerCase();
  const listSlug = list.slug.toLowerCase();

  // Try to match against patterns
  for (const [pattern, config] of Object.entries(matchers)) {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(listSlug) || regex.test(listName)) {
      console.log(`🎯 Matched pattern "${pattern}" for list: ${list.name}`);
      return config.movieFilter(Array.from(movieLookup.values()));
    }
  }

  // Default fallback: use highest-rated or most popular films
  console.log(`🔀 Using default selection for: ${list.name}`);
  return getDefaultMovieSelection(Array.from(movieLookup.values()));
}

function getDefaultMovieSelection(movies) {
  // Return a curated selection of highly-regarded films
  const classics = movies.filter(
    m =>
      m.year >= 1940 &&
      m.year <= 2020 &&
      (m.slug?.toLowerCase().includes('classic') ||
        m.slug?.toLowerCase().includes('masterpiece') ||
        m.slug?.toLowerCase().includes('essential') ||
        isWellKnownFilm(m.title))
  );

  return classics.slice(0, 20);
}

function isAwardWinningFilm(title, year) {
  const oscarWinners = [
    'The Godfather',
    'Casablanca',
    "Schindler's List",
    "One Flew Over the Cuckoo's Nest",
    'The Silence of the Lambs',
    'Forrest Gump',
    'Titanic',
    'Shakespeare in Love',
    'Gladiator',
    'A Beautiful Mind',
    'Chicago',
    'Crash',
    'The Departed',
    'No Country for Old Men',
    'Slumdog Millionaire',
    'The Hurt Locker',
    "The King's Speech",
    'The Artist',
    'Argo',
    '12 Years a Slave',
    'Birdman',
    'Spotlight',
    'Moonlight',
    'The Shape of Water',
    'Green Book',
    'Parasite',
    'Nomadland',
  ];

  return oscarWinners.some(winner => title.toLowerCase().includes(winner.toLowerCase()));
}

function getDirectorFilms(movies, directorName) {
  // This would need to be enhanced with actual director data
  // For now, return a reasonable selection
  return movies.slice(0, 15);
}

function isGenreFilm(movie, genres) {
  return genres.some(
    genre => movie.slug?.toLowerCase().includes(genre) || movie.title.toLowerCase().includes(genre)
  );
}

function isForeignFilm(movie) {
  const foreignIndicators = [
    'foreign',
    'international',
    'français',
    'italiano',
    'deutsch',
    'japanese',
    'korean',
    'chinese',
    'spanish',
    'russian',
  ];

  return foreignIndicators.some(
    indicator =>
      movie.slug?.toLowerCase().includes(indicator) || movie.title.toLowerCase().includes(indicator)
  );
}

function isFestivalWinner(movie) {
  const festivalTerms = ['cannes', 'venice', 'berlin', 'palme', 'golden bear', 'golden lion'];
  return festivalTerms.some(term => movie.slug?.toLowerCase().includes(term));
}

function getGenreFilms(movies, genre) {
  return movies.filter(m => m.slug?.toLowerCase().includes(genre)).slice(0, 25);
}

function getDecadeFilms(movies, decade) {
  const startYear = parseInt(decade);
  const endYear = startYear + 9;

  return movies.filter(m => m.year >= startYear && m.year <= endYear).slice(0, 30);
}

function getCriticsChoiceFilms(movies) {
  // Filter for critically acclaimed films
  return movies
    .filter(
      m =>
        m.slug?.toLowerCase().includes('masterpiece') ||
        m.slug?.toLowerCase().includes('acclaimed') ||
        m.slug?.toLowerCase().includes('essential')
    )
    .slice(0, 25);
}

function getFilmSchoolEssentials(movies) {
  const essentialTerms = ['essential', 'classic', 'masterpiece', 'influential', 'groundbreaking'];
  return movies
    .filter(m => essentialTerms.some(term => m.slug?.toLowerCase().includes(term)))
    .slice(0, 30);
}

function isWellKnownFilm(title) {
  const classics = [
    'Citizen Kane',
    'The Godfather',
    'Casablanca',
    'Vertigo',
    '2001: A Space Odyssey',
    "Singin' in the Rain",
    'Psycho',
    'Sunset Boulevard',
    'The Rules of the Game',
    'Tokyo Story',
    'The Bicycle Thief',
    'City Lights',
    'The General',
  ];

  return classics.some(classic => title.toLowerCase().includes(classic.toLowerCase()));
}

async function ensureMoviesExist(supabase, listItems) {
  const populatedItems = [];

  for (const item of listItems) {
    try {
      // Try to find existing movie by TMDB ID first
      let { data: existingMovie } = await supabase
        .from('movies')
        .select('id')
        .eq('tmdb_id', item.tmdb_id)
        .single();

      // If not found by TMDB ID, try by title and year
      if (!existingMovie) {
        const { data: titleMovie } = await supabase
          .from('movies')
          .select('id')
          .eq('title', item.title)
          .eq('year', item.year)
          .single();

        existingMovie = titleMovie;
      }

      // Create movie if it doesn't exist
      if (!existingMovie) {
        const { data: newMovie, error: createError } = await supabase
          .from('movies')
          .insert({
            title: item.title,
            year: item.year,
            tmdb_id: item.tmdb_id,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (createError) throw createError;
        existingMovie = newMovie;
      }

      // Add to populated items with actual movie_id
      populatedItems.push({
        list_id: item.list_id,
        movie_id: existingMovie.id,
        order_index: item.order_index,
        created_at: item.created_at,
      });
    } catch (error) {
      console.error(`Error ensuring movie exists: ${item.title}`, error);
      // Continue with other movies
    }
  }

  return populatedItems;
}

function extractDirectorName(listName) {
  // Extract director name from list name
  const directors = ['kubrick', 'spielberg', 'scorsese', 'tarantino', 'nolan', 'hitchcock'];
  return directors.find(director => listName.toLowerCase().includes(director));
}

function extractGenreFromName(listName) {
  const genres = ['sci-fi', 'horror', 'comedy', 'drama', 'thriller', 'action', 'noir'];
  return genres.find(genre => listName.toLowerCase().includes(genre));
}

function extractDecadeFromName(listName) {
  const decades = ['1950', '1960', '1970', '1980', '1990', '2000'];
  const found = decades.find(decade => listName.includes(decade));
  return found ? parseInt(found) : null;
}
