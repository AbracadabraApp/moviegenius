// pages/api/smart-list-populator.js
/**
 * Smart List Population System
 *
 * Uses discovered movies data to intelligently populate empty lists
 * based on list names, keywords, and movie metadata.
 */

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { batchSize = 10, dryRun = false } = req.body;

  try {
    const pool = getPool();

    console.log('🎯 SMART POPULATION: Starting intelligent list population...');

    // Load discovered movies data
    const dataPath = path.join(process.cwd(), 'data', 'discovered-movies.json');
    const discoveredMovies = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    console.log(`📊 Source data: ${discoveredMovies.length} movies available`);

    // Get empty lists (those with 0 movies)
    const { data: allLists, error: listsError } = await supabase
      .from('movie_lists')
      .select('id, name, slug, content_type, description')
      .eq('is_active', true);

    if (listsError) throw listsError;

    // Check which lists are empty
    const emptyLists = [];
    for (const list of allLists) {
      const { count } = await supabase
        .from('movie_list_items')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', list.id);

      if (count === 0) {
        emptyLists.push(list);
      }
    }

    console.log(`🎯 Found ${emptyLists.length} empty lists to populate`);

    // Create movie categorization from discovered movies
    const movieCategories = categorizeMovies(discoveredMovies);
    console.log(`📋 Categorized movies into ${Object.keys(movieCategories).length} categories`);

    const results = [];
    let processedCount = 0;

    // Process empty lists in batches
    for (const list of emptyLists.slice(0, batchSize)) {
      try {
        console.log(`\n📝 Processing: "${list.name}"`);

        // Find best movie matches for this list
        const selectedMovies = selectMoviesForList(list, movieCategories, discoveredMovies);

        if (selectedMovies.length === 0) {
          console.log(`⚠️  No suitable movies found for: "${list.name}"`);
          results.push({
            list: list.name,
            status: 'no_matches',
            reason: 'No movies matched list criteria',
          });
          continue;
        }

        console.log(`🎬 Selected ${selectedMovies.length} movies for "${list.name}"`);

        if (!dryRun) {
          // Actually populate the list
          const populatedCount = await populateListWithMovies(supabase, list.id, selectedMovies);

          results.push({
            list: list.name,
            slug: list.slug,
            status: 'populated',
            movie_count: populatedCount,
            sample_movies: selectedMovies.slice(0, 3).map(m => `${m.title} (${m.year})`),
          });

          console.log(`✅ Populated "${list.name}" with ${populatedCount} movies`);
        } else {
          results.push({
            list: list.name,
            slug: list.slug,
            status: 'dry_run',
            potential_movies: selectedMovies.length,
            sample_movies: selectedMovies.slice(0, 5).map(m => `${m.title} (${m.year})`),
          });
        }

        processedCount++;
      } catch (error) {
        console.error(`❌ Error processing "${list.name}":`, error.message);
        results.push({
          list: list.name,
          status: 'error',
          error: error.message,
        });
      }
    }

    const summary = {
      total_empty_lists: emptyLists.length,
      processed: processedCount,
      available_movies: discoveredMovies.length,
      dry_run: dryRun,
    };

    console.log(`\n🏁 BATCH COMPLETE: Processed ${processedCount}/${emptyLists.length} lists`);

    res.status(200).json({
      success: true,
      message: dryRun ? 'Dry run completed' : `Populated ${processedCount} lists`,
      summary,
      results,
      next_batch:
        emptyLists.length > batchSize
          ? {
              remaining: emptyLists.length - batchSize,
              next_lists: emptyLists.slice(batchSize, batchSize + 5).map(l => l.name),
            }
          : null,
    });
  } catch (error) {
    console.error('🚨 SMART POPULATION FAILED:', error);
    res.status(500).json({
      error: 'Smart population failed',
      details: error.message,
    });
  }
}

function categorizeMovies(movies) {
  const categories = {
    // Awards & Recognition
    oscar_winners: [],
    critics_choice: [],
    festival_winners: [],

    // Genres
    sci_fi: [],
    horror: [],
    comedy: [],
    drama: [],
    thriller: [],
    action: [],
    romance: [],
    noir: [],
    documentary: [],

    // Decades
    classics_pre1960: [],
    sixties: [],
    seventies: [],
    eighties: [],
    nineties: [],
    modern_2000s: [],
    contemporary_2010s: [],

    // Origins
    american: [],
    foreign: [],
    french: [],
    japanese: [],
    korean: [],
    italian: [],

    // Directors (based on slug content)
    auteur_films: [],

    // Quality indicators
    masterpieces: [],
    cult_films: [],
    popular: [],
  };

  movies.forEach(movie => {
    const title = movie.title.toLowerCase();
    const slug = (movie.slug || '').toLowerCase();
    const year = movie.year;

    // Categorize by decade
    if (year < 1960) categories.classics_pre1960.push(movie);
    else if (year >= 1960 && year < 1970) categories.sixties.push(movie);
    else if (year >= 1970 && year < 1980) categories.seventies.push(movie);
    else if (year >= 1980 && year < 1990) categories.eighties.push(movie);
    else if (year >= 1990 && year < 2000) categories.nineties.push(movie);
    else if (year >= 2000 && year < 2010) categories.modern_2000s.push(movie);
    else if (year >= 2010) categories.contemporary_2010s.push(movie);

    // Categorize by quality/recognition
    if (slug.includes('oscar') || slug.includes('academy') || slug.includes('winner')) {
      categories.oscar_winners.push(movie);
    }
    if (slug.includes('masterpiece') || slug.includes('classic') || slug.includes('essential')) {
      categories.masterpieces.push(movie);
    }
    if (slug.includes('cult') || slug.includes('underground')) {
      categories.cult_films.push(movie);
    }
    if (slug.includes('critics') || slug.includes('acclaimed')) {
      categories.critics_choice.push(movie);
    }

    // Categorize by genre (basic keyword matching)
    if (
      slug.includes('sci-fi') ||
      slug.includes('science fiction') ||
      slug.includes('space') ||
      slug.includes('future')
    ) {
      categories.sci_fi.push(movie);
    }
    if (slug.includes('horror') || slug.includes('scary') || slug.includes('terror')) {
      categories.horror.push(movie);
    }
    if (slug.includes('comedy') || slug.includes('funny') || slug.includes('humor')) {
      categories.comedy.push(movie);
    }
    if (slug.includes('thriller') || slug.includes('suspense')) {
      categories.thriller.push(movie);
    }
    if (slug.includes('action') || slug.includes('adventure') || slug.includes('fight')) {
      categories.action.push(movie);
    }
    if (slug.includes('romance') || slug.includes('love') || slug.includes('romantic')) {
      categories.romance.push(movie);
    }
    if (slug.includes('noir') || slug.includes('detective') || slug.includes('crime')) {
      categories.noir.push(movie);
    }

    // Categorize by origin
    if (slug.includes('french') || slug.includes('france')) {
      categories.french.push(movie);
    }
    if (slug.includes('japanese') || slug.includes('japan')) {
      categories.japanese.push(movie);
    }
    if (slug.includes('korean') || slug.includes('korea')) {
      categories.korean.push(movie);
    }
    if (slug.includes('italian') || slug.includes('italy')) {
      categories.italian.push(movie);
    }
  });

  return categories;
}

function selectMoviesForList(list, categories, allMovies) {
  const listName = list.name.toLowerCase();
  const listSlug = list.slug.toLowerCase();

  console.log(`🔍 Matching for: "${listName}"`);

  // Priority matching rules
  const matchingRules = [
    // Oscar/Academy Awards
    {
      condition: (name, slug) =>
        name.includes('oscar') || name.includes('academy') || name.includes('best picture'),
      movies: categories.oscar_winners,
      maxCount: 30,
    },

    // Directors
    {
      condition: (name, slug) =>
        name.includes('kubrick') || name.includes('spielberg') || name.includes('scorsese'),
      movies:
        categories.auteur_films.length > 0 ? categories.auteur_films : categories.masterpieces,
      maxCount: 20,
    },

    // Genres
    {
      condition: (name, slug) => name.includes('sci-fi') || name.includes('science fiction'),
      movies: categories.sci_fi,
      maxCount: 25,
    },
    {
      condition: (name, slug) => name.includes('horror'),
      movies: categories.horror,
      maxCount: 25,
    },
    {
      condition: (name, slug) => name.includes('comedy'),
      movies: categories.comedy,
      maxCount: 25,
    },
    {
      condition: (name, slug) => name.includes('thriller'),
      movies: categories.thriller,
      maxCount: 25,
    },
    {
      condition: (name, slug) => name.includes('action'),
      movies: categories.action,
      maxCount: 25,
    },
    {
      condition: (name, slug) => name.includes('noir'),
      movies: categories.noir,
      maxCount: 20,
    },

    // International
    {
      condition: (name, slug) => name.includes('foreign') || name.includes('international'),
      movies: [
        ...categories.french,
        ...categories.japanese,
        ...categories.korean,
        ...categories.italian,
      ],
      maxCount: 30,
    },
    {
      condition: (name, slug) => name.includes('french'),
      movies: categories.french,
      maxCount: 25,
    },

    // Decades
    {
      condition: (name, slug) => name.includes('70s') || name.includes('1970'),
      movies: categories.seventies,
      maxCount: 30,
    },
    {
      condition: (name, slug) => name.includes('80s') || name.includes('1980'),
      movies: categories.eighties,
      maxCount: 30,
    },
    {
      condition: (name, slug) => name.includes('90s') || name.includes('1990'),
      movies: categories.nineties,
      maxCount: 30,
    },

    // Quality/Critics
    {
      condition: (name, slug) =>
        name.includes('greatest') || name.includes('top') || name.includes('best'),
      movies:
        categories.masterpieces.length > 0 ? categories.masterpieces : categories.critics_choice,
      maxCount: 50,
    },
    {
      condition: (name, slug) => name.includes('criterion') || name.includes('essential'),
      movies: categories.masterpieces,
      maxCount: 30,
    },
    {
      condition: (name, slug) => name.includes('critics') || name.includes('poll'),
      movies: categories.critics_choice,
      maxCount: 25,
    },
  ];

  // Try to find a matching rule
  for (const rule of matchingRules) {
    if (rule.condition(listName, listSlug) && rule.movies.length > 0) {
      console.log(
        `✅ Matched rule for "${listName}" - found ${rule.movies.length} potential movies`
      );
      return rule.movies.slice(0, rule.maxCount);
    }
  }

  // Fallback: use a curated selection of high-quality films
  console.log(`🔀 Using fallback selection for: "${listName}"`);
  const fallbackMovies = [
    ...categories.masterpieces.slice(0, 15),
    ...categories.oscar_winners.slice(0, 10),
    ...categories.critics_choice.slice(0, 10),
  ];

  return fallbackMovies.length > 0 ? fallbackMovies.slice(0, 20) : [];
}

async function populateListWithMovies(supabase, listId, selectedMovies) {
  let populatedCount = 0;

  for (let i = 0; i < selectedMovies.length; i++) {
    const movie = selectedMovies[i];

    try {
      // Find or create the movie in the database
      let { data: existingMovie } = await supabase
        .from('movies')
        .select('id')
        .eq('tmdb_id', movie.tmdb_id)
        .single();

      if (!existingMovie) {
        // Try by title and year
        const { data: titleMovie } = await supabase
          .from('movies')
          .select('id')
          .eq('title', movie.title)
          .eq('year', movie.year)
          .single();

        existingMovie = titleMovie;
      }

      if (!existingMovie) {
        // Create new movie
        const { data: newMovie, error: createError } = await supabase
          .from('movies')
          .insert({
            title: movie.title,
            year: movie.year,
            tmdb_id: movie.tmdb_id,
            poster_url: movie.poster_url,
            slug: movie.slug,
            streaming_data: movie.streaming_data,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (createError) throw createError;
        existingMovie = newMovie;
      }

      // Add to list
      const { error: itemError } = await supabase.from('movie_list_items').insert({
        list_id: listId,
        movie_id: existingMovie.id,
        order_index: i + 1,
        created_at: new Date().toISOString(),
      });

      if (itemError) throw itemError;

      populatedCount++;
    } catch (error) {
      console.error(`Error adding movie "${movie.title}":`, error.message);
      // Continue with other movies
    }
  }

  return populatedCount;
}
