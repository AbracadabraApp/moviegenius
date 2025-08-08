// pages/api/batch-populate-all-lists.js
/**
 * Batch Population of All Empty Lists
 *
 * Processes all 78 empty lists in manageable batches to avoid timeouts.
 * Uses the smart list populator with optimized batch processing.
 */

import { createClient, supabase } from '../lib/railway-adapter.js';

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const {
    startFrom = 0,
    batchSize = 10,
    maxProcessingTime = 4 * 60 * 1000, // 4 minutes max
    dryRun = false,
  } = req.body;

  try {
    const pool = getPool();

    const startTime = Date.now();
    console.log('🚀 BATCH POPULATION: Starting full list population...');
    console.log(`⚙️  Config: startFrom=${startFrom}, batchSize=${batchSize}, dryRun=${dryRun}`);

    // Load discovered movies data
    const dataPath = path.join(process.cwd(), 'data', 'discovered-movies.json');
    const discoveredMovies = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

    console.log(`📊 Source data: ${discoveredMovies.length} movies available`);

    // Get all empty lists
    const { data: allLists, error: listsError } = await supabase
      .from('movie_lists')
      .select('id, name, slug, content_type, description')
      .eq('is_active', true)
      .order('name');

    if (listsError) throw listsError;

    // Filter to empty lists only
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

    console.log(`🎯 Found ${emptyLists.length} empty lists total`);

    // Process the batch
    const batchLists = emptyLists.slice(startFrom, startFrom + batchSize);
    console.log(
      `📋 Processing batch: ${startFrom + 1}-${startFrom + batchLists.length} of ${emptyLists.length}`
    );

    if (batchLists.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No more lists to process',
        summary: {
          total_empty_lists: emptyLists.length,
          processed: 0,
          remaining: 0,
          completed: true,
        },
      });
    }

    // Categorize movies for efficient lookup
    const movieCategories = categorizeMovies(discoveredMovies);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Process each list in the batch
    for (let i = 0; i < batchLists.length; i++) {
      const list = batchLists[i];

      // Check if we're running out of time
      if (Date.now() - startTime > maxProcessingTime) {
        console.log('⏰ Approaching timeout, stopping batch processing');
        break;
      }

      try {
        console.log(`\n📝 Processing ${startFrom + i + 1}/${emptyLists.length}: "${list.name}"`);

        // Smart movie selection based on list name/content
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

          successCount++;
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
      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing "${list.name}":`, error.message);
        results.push({
          list: list.name,
          status: 'error',
          error: error.message,
        });
      }
    }

    const processedCount = dryRun ? results.length : successCount;
    const remainingLists = emptyLists.length - (startFrom + batchLists.length);
    const isCompleted = remainingLists <= 0;

    console.log(`\n🏁 BATCH COMPLETE: Processed ${processedCount} lists`);
    console.log(`📊 Success: ${successCount}, Errors: ${errorCount}, Remaining: ${remainingLists}`);

    const summary = {
      total_empty_lists: emptyLists.length,
      processed: processedCount,
      success: successCount,
      errors: errorCount,
      remaining: remainingLists,
      completed: isCompleted,
      next_start_from: isCompleted ? null : startFrom + batchLists.length,
      processing_time_ms: Date.now() - startTime,
      dry_run: dryRun,
    };

    res.status(200).json({
      success: true,
      message: dryRun
        ? `Dry run completed: ${processedCount} lists analyzed`
        : `Batch completed: ${successCount} lists populated, ${errorCount} errors`,
      summary,
      results,
      next_batch: isCompleted
        ? null
        : {
            recommended_payload: {
              startFrom: startFrom + batchLists.length,
              batchSize,
              dryRun,
            },
          },
    });
  } catch (error) {
    console.error('🚨 BATCH POPULATION FAILED:', error);
    res.status(500).json({
      error: 'Batch population failed',
      details: error.message,
    });
  }
}

// Helper functions (copied from smart-list-populator for consistency)
function categorizeMovies(movies) {
  const categories = {
    oscar_winners: [],
    masterpieces: [],
    critics_choice: [],
    sci_fi: [],
    horror: [],
    comedy: [],
    drama: [],
    thriller: [],
    action: [],
    romance: [],
    noir: [],
    french: [],
    japanese: [],
    korean: [],
    italian: [],
    seventies: [],
    eighties: [],
    nineties: [],
    modern_2000s: [],
    contemporary_2010s: [],
  };

  movies.forEach(movie => {
    const slug = (movie.slug || '').toLowerCase();
    const year = movie.year;

    // Decade categorization
    if (year >= 1970 && year < 1980) categories.seventies.push(movie);
    else if (year >= 1980 && year < 1990) categories.eighties.push(movie);
    else if (year >= 1990 && year < 2000) categories.nineties.push(movie);
    else if (year >= 2000 && year < 2010) categories.modern_2000s.push(movie);
    else if (year >= 2010) categories.contemporary_2010s.push(movie);

    // Quality indicators
    if (slug.includes('oscar') || slug.includes('academy') || slug.includes('winner')) {
      categories.oscar_winners.push(movie);
    }
    if (slug.includes('masterpiece') || slug.includes('classic') || slug.includes('essential')) {
      categories.masterpieces.push(movie);
    }
    if (slug.includes('critics') || slug.includes('acclaimed')) {
      categories.critics_choice.push(movie);
    }

    // Genre categorization
    if (slug.includes('sci-fi') || slug.includes('science fiction') || slug.includes('space')) {
      categories.sci_fi.push(movie);
    }
    if (slug.includes('horror') || slug.includes('scary')) {
      categories.horror.push(movie);
    }
    if (slug.includes('comedy') || slug.includes('funny')) {
      categories.comedy.push(movie);
    }
    if (slug.includes('thriller') || slug.includes('suspense')) {
      categories.thriller.push(movie);
    }
    if (slug.includes('action') || slug.includes('adventure')) {
      categories.action.push(movie);
    }
    if (slug.includes('romance') || slug.includes('love')) {
      categories.romance.push(movie);
    }
    if (slug.includes('noir') || slug.includes('detective') || slug.includes('crime')) {
      categories.noir.push(movie);
    }

    // Origin categorization
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

  // Enhanced matching rules with better keyword detection
  const matchingRules = [
    // Awards
    {
      condition: (name, slug) =>
        name.includes('oscar') ||
        name.includes('academy') ||
        name.includes('best picture') ||
        slug.includes('oscar') ||
        slug.includes('academy') ||
        slug.includes('best-picture'),
      movies: categories.oscar_winners,
      maxCount: 30,
      description: 'Oscar/Academy Award winners',
    },

    // Directors - Enhanced detection
    {
      condition: (name, slug) =>
        name.includes('kubrick') ||
        name.includes('spielberg') ||
        name.includes('scorsese') ||
        name.includes('tarantino') ||
        name.includes('nolan') ||
        name.includes('hitchcock') ||
        name.includes('truffaut') ||
        name.includes('cassavetes'),
      movies:
        categories.masterpieces.length > 0 ? categories.masterpieces : categories.critics_choice,
      maxCount: 20,
      description: 'Auteur/Director collections',
    },

    // Genres
    {
      condition: (name, slug) => name.includes('sci-fi') || name.includes('science fiction'),
      movies: categories.sci_fi,
      maxCount: 25,
      description: 'Science Fiction films',
    },
    {
      condition: (name, slug) => name.includes('horror'),
      movies: categories.horror,
      maxCount: 25,
      description: 'Horror films',
    },
    {
      condition: (name, slug) => name.includes('comedy'),
      movies: categories.comedy,
      maxCount: 25,
      description: 'Comedy films',
    },
    {
      condition: (name, slug) => name.includes('thriller'),
      movies: categories.thriller,
      maxCount: 25,
      description: 'Thriller films',
    },
    {
      condition: (name, slug) => name.includes('noir'),
      movies: categories.noir,
      maxCount: 20,
      description: 'Film Noir',
    },

    // International
    {
      condition: (name, slug) =>
        name.includes('foreign') ||
        name.includes('international') ||
        name.includes('french') ||
        name.includes('neorealism'),
      movies: [...categories.french, ...categories.italian, ...categories.japanese],
      maxCount: 25,
      description: 'International cinema',
    },

    // Decades
    {
      condition: (name, slug) => name.includes('70') || name.includes('1970'),
      movies: categories.seventies,
      maxCount: 30,
      description: '1970s films',
    },
    {
      condition: (name, slug) => name.includes('80') || name.includes('1980'),
      movies: categories.eighties,
      maxCount: 30,
      description: '1980s films',
    },
    {
      condition: (name, slug) => name.includes('90') || name.includes('1990'),
      movies: categories.nineties,
      maxCount: 30,
      description: '1990s films',
    },

    // Quality/Critical lists
    {
      condition: (name, slug) =>
        name.includes('greatest') ||
        name.includes('top') ||
        name.includes('best') ||
        name.includes('ebert') ||
        name.includes('sight') ||
        name.includes('sound'),
      movies:
        categories.masterpieces.length > 0 ? categories.masterpieces : categories.critics_choice,
      maxCount: 40,
      description: 'Greatest/Top films',
    },

    // Educational content
    {
      condition: (name, slug) =>
        name.includes('how did') ||
        name.includes('educational') ||
        name.includes('change cinema') ||
        name.includes('revolutionize'),
      movies: categories.masterpieces,
      maxCount: 15,
      description: 'Educational film content',
    },
  ];

  // Try to find a matching rule
  for (const rule of matchingRules) {
    if (rule.condition(listName, listSlug) && rule.movies.length > 0) {
      console.log(`✅ Matched rule: ${rule.description} - ${rule.movies.length} movies available`);
      return shuffleArray(rule.movies).slice(0, rule.maxCount);
    }
  }

  // Fallback: use a diverse selection
  console.log(`🔀 Using diverse fallback selection for: "${listName}"`);
  const fallbackMovies = [
    ...shuffleArray(categories.masterpieces).slice(0, 8),
    ...shuffleArray(categories.oscar_winners).slice(0, 7),
    ...shuffleArray(categories.critics_choice).slice(0, 5),
  ];

  return fallbackMovies.length > 0 ? fallbackMovies.slice(0, 20) : [];
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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
