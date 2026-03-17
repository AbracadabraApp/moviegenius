// pages/api/recover-definitive-lists.js
/**
 * Recovery API for Definitive Lists
 *
 * Restores all definitive movie lists that were lost.
 * Emergency recovery endpoint for demo preparation.
 */

import { createClient, supabase } from '../../lib/railway-adapter.js';

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';
import afi100Data from '../../data/afi100.json';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  try {
    const pool = getPool();

    console.log('🚨 EMERGENCY RECOVERY: Restoring definitive lists...');

    // Define all definitive lists data (preserved from admin interface)
    const definitiveListsData = {
      'afi-100-greatest-american-films': {
        name: 'AFI 100 Greatest American Films',
        description:
          "The American Film Institute's definitive ranking of the greatest American movies",
        content_type: 'declarative',
        movies: afi100Data,
      },
      'sight-sound-greatest-films': {
        name: 'Sight & Sound Greatest Films of All Time',
        description: "The critics' poll from the British Film Institute's prestigious magazine",
        content_type: 'declarative',
        movies: [
          {
            title: 'Citizen Kane',
            year: 1941,
            tmdbId: 15,
            slug: "A newspaper magnate's rise and fall.",
          },
          {
            title: 'Vertigo',
            year: 1958,
            tmdbId: 832,
            slug: "A detective's obsession with a mysterious woman.",
          },
          {
            title: 'The Rules of the Game',
            year: 1939,
            tmdbId: 14429,
            slug: "French aristocrats' weekend hunting party.",
          },
          {
            title: 'Tokyo Story',
            year: 1953,
            tmdbId: 18148,
            slug: 'Elderly parents visit their adult children.',
          },
          {
            title: '2001: A Space Odyssey',
            year: 1968,
            tmdbId: 62,
            slug: "Humanity's journey from apes to starchild.",
          },
        ],
      },
      'criterion-collection-essentials': {
        name: 'Criterion Collection Essentials',
        description: 'Essential films from the prestigious Criterion Collection',
        content_type: 'declarative',
        movies: [
          {
            title: 'Seven Samurai',
            year: 1954,
            tmdbId: 346,
            slug: 'Samurai defend a village from bandits.',
          },
          {
            title: '8½',
            year: 1963,
            tmdbId: 15,
            slug: "A director's creative and personal crisis.",
          },
          {
            title: 'Persona',
            year: 1966,
            tmdbId: 14579,
            slug: 'An actress goes silent, her nurse speaks.',
          },
          {
            title: 'The 400 Blows',
            year: 1959,
            tmdbId: 12477,
            slug: "A troubled boy's coming of age in Paris.",
          },
          {
            title: 'Bicycle Thieves',
            year: 1948,
            tmdbId: 14535,
            slug: 'A man searches Rome for his stolen bicycle.',
          },
        ],
      },
      'best-picture-winners-2000s': {
        name: 'Best Picture Winners (2000-2020)',
        description: 'Academy Award Best Picture winners from the 21st century',
        content_type: 'declarative',
        movies: [
          {
            title: 'Parasite',
            year: 2019,
            tmdbId: 496243,
            slug: 'A poor family infiltrates a wealthy household.',
          },
          {
            title: 'Green Book',
            year: 2018,
            tmdbId: 490132,
            slug: "A pianist's tour through the segregated South.",
          },
          {
            title: 'The Shape of Water',
            year: 2017,
            tmdbId: 399055,
            slug: 'A mute woman falls for an amphibian creature.',
          },
          {
            title: 'Moonlight',
            year: 2016,
            tmdbId: 376867,
            slug: "A young man's journey of self-discovery.",
          },
          {
            title: 'Spotlight',
            year: 2015,
            tmdbId: 359940,
            slug: 'Journalists uncover Catholic Church scandal.',
          },
        ],
      },
      'film-noir-classics': {
        name: 'Film Noir Classics',
        description: 'Essential films from the golden age of noir cinema',
        content_type: 'declarative',
        movies: [
          {
            title: 'The Maltese Falcon',
            year: 1941,
            tmdbId: 891,
            slug: 'A detective hunts for a valuable bird statue.',
          },
          {
            title: 'Double Indemnity',
            year: 1944,
            tmdbId: 18,
            slug: 'An insurance salesman plans the perfect murder.',
          },
          {
            title: 'The Big Sleep',
            year: 1946,
            tmdbId: 1398,
            slug: 'A private eye investigates a blackmail case.',
          },
          {
            title: 'Touch of Evil',
            year: 1958,
            tmdbId: 754,
            slug: 'A cop investigates a bombing on the border.',
          },
          {
            title: 'The Third Man',
            year: 1949,
            tmdbId: 1104,
            slug: 'A writer searches for his friend in post-war Vienna.',
          },
        ],
      },
      'foreign-language-masterpieces': {
        name: 'Foreign Language Masterpieces',
        description: 'Essential non-English language films that changed cinema',
        content_type: 'declarative',
        movies: [
          {
            title: 'Amélie',
            year: 2001,
            tmdbId: 194,
            slug: 'A whimsical waitress changes lives in Montmartre.',
          },
          {
            title: 'Cinema Paradiso',
            year: 1988,
            tmdbId: 11216,
            slug: 'A filmmaker remembers his childhood projectionist.',
          },
          {
            title: 'Akira',
            year: 1988,
            tmdbId: 149,
            slug: 'Psychic powers awaken in post-apocalyptic Tokyo.',
          },
          {
            title: 'Spirited Away',
            year: 2001,
            tmdbId: 129,
            slug: 'A girl enters a world of spirits and magic.',
          },
          {
            title: 'Bicycle Thieves',
            year: 1948,
            tmdbId: 14535,
            slug: 'A man searches Rome for his stolen bicycle.',
          },
        ],
      },
    };

    const results = [];

    // Process each definitive list
    for (const [slug, listData] of Object.entries(definitiveListsData)) {
      try {
        console.log(`📋 Recovering list: "${listData.name}"`);

        // Check if list already exists
        const { data: existingList, error: findError } = await supabase
          .from('movie_lists')
          .select('id, name')
          .eq('slug', slug)
          .single();

        let listId;

        if (existingList && !findError) {
          // Update existing list
          const { data: updatedList, error: updateError } = await supabase
            .from('movie_lists')
            .update({
              name: listData.name,
              description: listData.description,
              content_type: listData.content_type,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingList.id)
            .select()
            .single();

          if (updateError) throw updateError;

          listId = updatedList.id;
          console.log(`📝 Updated existing list: "${listData.name}"`);

          // Clear existing list items
          await supabase.from('movie_list_items').delete().eq('list_id', listId);
        } else {
          // Create new list
          const { data: newList, error: createError } = await supabase
            .from('movie_lists')
            .insert({
              name: listData.name,
              slug,
              description: listData.description,
              content_type: listData.content_type,
              is_active: true,
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (createError) throw createError;

          listId = newList.id;
          console.log(`✨ Created new list: "${listData.name}"`);
        }

        // Process movies for this list
        const listItems = [];
        const movieResults = [];

        for (let i = 0; i < listData.movies.length; i++) {
          const movie = listData.movies[i];

          try {
            // Find or create movie
            let movieRecord = null;

            // Try by TMDB ID first
            if (movie.tmdbId) {
              const { data: tmdbMovie } = await supabase
                .from('movies')
                .select('id, title, year')
                .eq('tmdb_id', movie.tmdbId)
                .single();

              movieRecord = tmdbMovie;
            }

            // Try by title and year if not found
            if (!movieRecord) {
              const { data: titleMovie } = await supabase
                .from('movies')
                .select('id, title, year')
                .eq('title', movie.title)
                .eq('year', movie.year)
                .single();

              movieRecord = titleMovie;
            }

            // Create if not found
            if (!movieRecord) {
              const { data: newMovie, error: movieError } = await supabase
                .from('movies')
                .insert({
                  title: movie.title,
                  year: movie.year,
                  tmdb_id: movie.tmdbId || null,
                  slug: movie.slug || null,
                  created_at: new Date().toISOString(),
                })
                .select('id, title, year')
                .single();

              if (movieError) throw movieError;

              movieRecord = newMovie;
              console.log(`🎬 Created movie: "${movie.title}" (${movie.year})`);
            }

            // Add to list items
            listItems.push({
              list_id: listId,
              movie_id: movieRecord.id,
              order_index: i + 1,
              created_at: new Date().toISOString(),
            });

            movieResults.push({
              title: movieRecord.title,
              year: movieRecord.year,
              status: 'added',
            });
          } catch (movieError) {
            console.error(`Error processing movie "${movie.title}":`, movieError);
            movieResults.push({
              title: movie.title,
              year: movie.year,
              status: 'error',
              error: movieError.message,
            });
          }
        }

        // Bulk insert list items
        if (listItems.length > 0) {
          const { error: itemsError } = await supabase.from('movie_list_items').insert(listItems);

          if (itemsError) throw itemsError;
        }

        results.push({
          list: listData.name,
          slug,
          status: 'recovered',
          movie_count: listItems.length,
          movies: movieResults,
        });

        console.log(`✅ Recovered list: "${listData.name}" with ${listItems.length} movies`);
      } catch (listError) {
        console.error(`Error recovering list "${listData.name}":`, listError);
        results.push({
          list: listData.name,
          slug,
          status: 'error',
          error: listError.message,
        });
      }
    }

    const successCount = results.filter(r => r.status === 'recovered').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    console.log(`🏁 Recovery complete: ${successCount} lists recovered, ${errorCount} errors`);

    res.status(200).json({
      success: true,
      message: `Recovery completed: ${successCount} lists recovered, ${errorCount} errors`,
      results,
      summary: {
        total_lists: results.length,
        recovered: successCount,
        errors: errorCount,
      },
    });
  } catch (error) {
    console.error('🚨 RECOVERY FAILED:', error);
    res.status(500).json({
      error: 'Recovery failed',
      details: error.message,
    });
  }
}
