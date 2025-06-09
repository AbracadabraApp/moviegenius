/**
 * Railway Batch Processing API - Lists
 * 
 * Endpoint for automated list analysis generation
 * Processes movie lists missing Claude analysis
 */

import { createClient } from '@supabase/supabase-js';
import { Anthropic } from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

class RailwayListBatchProcessor {
  constructor() {
    this.maxBatchSize = 20; // Process up to 20 lists per run
    this.systemPrompt = `You are an authoritative cinema expert specializing in film curation and list analysis. Write with the confident voice of a film programmer who understands the cultural significance of curated movie collections.

Voice & Tone:
- Authoritative but accessible - explain why these films matter together
- Focus on curatorial vision and thematic connections
- Mention specific films, directors, and movements when relevant
- Show the cultural or historical significance of the collection
- Use specific cinematic terminology where appropriate

Content Guidelines:
- Write 2-3 substantial paragraphs about this specific list/collection
- Explain the curatorial criteria and what unifies these films
- Discuss the cultural/historical context of the collection
- Highlight standout films and their significance within the collection
- ONLY include movie cards for films specifically mentioned by title in each paragraph
- After analysis, suggest 4 areas for further exploration related to this collection`;
  }

  async findListsMissingAnalysis(limit = 20) {
    try {
      // Get lists that don't have analysis
      const { data: allLists, error: listsError } = await supabase
        .from('movie_lists')
        .select('id, name, description, category')
        .order('name')
        .limit(100);

      if (listsError) throw listsError;
      if (!allLists || allLists.length === 0) return [];

      // Check which lists have analysis
      const listIds = allLists.map(l => l.id);
      const { data: analyses, error: analysisError } = await supabase
        .from('list_analyses')
        .select('list_id')
        .in('list_id', listIds);

      if (analysisError) throw analysisError;

      const analyzedIds = new Set(analyses?.map(a => a.list_id) || []);
      const missingAnalysis = allLists.filter(l => !analyzedIds.has(l.id));

      return missingAnalysis.slice(0, limit);
    } catch (error) {
      console.error('Error finding lists missing analysis:', error);
      throw error;
    }
  }

  async getListMovies(listId) {
    try {
      const { data: listMovies, error } = await supabase
        .from('list_movies')
        .select(`
          movies (
            id,
            title,
            year,
            tmdb_id
          )
        `)
        .eq('list_id', listId)
        .limit(10); // Get sample of movies for analysis

      if (error) throw error;
      return listMovies?.map(lm => lm.movies) || [];
    } catch (error) {
      console.error(`Error getting movies for list ${listId}:`, error);
      return [];
    }
  }

  async generateListAnalysis(list) {
    try {
      const movies = await this.getListMovies(list.id);
      const movieTitles = movies.map(m => `${m.title} (${m.year})`).join(', ');
      
      const prompt = `Analyze the curated film collection "${list.name}".

Description: ${list.description || 'No description provided'}
Category: ${list.category || 'General'}
Sample films: ${movieTitles}

Write an authoritative analysis explaining:
1. The curatorial vision and what unifies these films
2. The cultural/historical significance of this collection
3. Key films that exemplify the collection's themes

Format your response exactly like this:

PARAGRAPH
[Your first paragraph about the collection's significance]

MOVIES
- "Film Title" (Year), Brief description of its relevance

PARAGRAPH
[Your second paragraph about curatorial themes]

MOVIES
- "Film Title" (Year), Brief description

EXPLORE_FURTHER
- Topic 1 related to this collection (8-12 words)
- Topic 2 related to this collection (8-12 words)
- Topic 3 related to this collection (8-12 words)
- Topic 4 related to this collection (8-12 words)`;

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: this.systemPrompt,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      return response.content[0].text;
    } catch (error) {
      console.error(`Error generating analysis for list ${list.name}:`, error);
      throw error;
    }
  }

  async saveListAnalysis(listId, analysis) {
    try {
      const { error } = await supabase
        .from('list_analyses')
        .insert({
          list_id: listId,
          analysis_type: 'comprehensive',
          claude_response: {
            content: analysis,
            model: 'claude-3-5-sonnet-20241022',
            timestamp: new Date().toISOString()
          },
          created_at: new Date().toISOString()
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error(`Error saving analysis for list ${listId}:`, error);
      return false;
    }
  }

  async processBatch() {
    try {
      const lists = await this.findListsMissingAnalysis(this.maxBatchSize);
      
      if (lists.length === 0) {
        return {
          success: true,
          message: 'No lists needing analysis',
          processed: 0
        };
      }

      let processed = 0;
      let succeeded = 0;
      let failed = 0;
      const results = [];

      for (const list of lists) {
        try {
          console.log(`Processing list: ${list.name}`);
          
          const analysis = await this.generateListAnalysis(list);
          const saved = await this.saveListAnalysis(list.id, analysis);
          
          if (saved) {
            succeeded++;
            results.push({
              list_name: list.name,
              status: 'success'
            });
          } else {
            failed++;
            results.push({
              list_name: list.name,
              status: 'save_failed'
            });
          }
          
          processed++;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          failed++;
          results.push({
            list_name: list.name,
            status: 'error',
            error: error.message
          });
          processed++;
        }
      }

      return {
        success: true,
        lists_processed: processed,
        succeeded: succeeded,
        failed: failed,
        estimated_cost: (succeeded * 0.015).toFixed(3),
        results: results,
        message: `Processed ${processed} lists, ${succeeded} successful`
      };
    } catch (error) {
      console.error('List batch processing failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// TMDB ID mapping for the IMDb Top 250 list
const IMDB_TOP_250_TMDB_IDS = [
  238, 278, 240, 424, 389, 129, 19404, 155, 497, 372058,
  429, 346, 13, 769, 15, 324, 11216, 637, 539, 120737,
  810, 11, 329, 550, 1255, 680, 103, 12477, 73, 429203,
  475557, 140607, 16869, 77338, 12096, 630, 18148, 11423, 1422,
  745, 8587, 207, 406, 105, 637649, 510, 14161, 578, 11024, 862
  // This is a sample of 50 TMDB IDs - would need the full 250
];

async function populateImdbTop250List() {
  const LIST_ID = 'a8c56f19-759f-4583-a519-d97dbe07db1d';
  
  try {
    console.log('🎬 Starting IMDb Top 250 list population...');
    
    // Check if list already has movies
    const { data: existingItems, error: checkError } = await supabase
      .from('movie_list_items')
      .select('id')
      .eq('list_id', LIST_ID);
    
    if (checkError) throw checkError;
    
    if (existingItems && existingItems.length > 0) {
      return {
        success: true,
        message: `List already has ${existingItems.length} movies - skipping population`,
        movies_added: 0,
        already_populated: true
      };
    }
    
    let moviesAdded = 0;
    let errors = [];
    
    // Process each TMDB ID
    for (let i = 0; i < IMDB_TOP_250_TMDB_IDS.length; i++) {
      const tmdbId = IMDB_TOP_250_TMDB_IDS[i];
      
      try {
        // Check if movie exists in our database
        let { data: movie, error: movieError } = await supabase
          .from('movies')
          .select('id')
          .eq('tmdb_id', tmdbId)
          .single();
        
        // If movie doesn't exist, fetch from TMDB and create it
        if (!movie) {
          const tmdbResponse = await fetch(
            `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${process.env.NEXT_PUBLIC_TMDB_API_KEY}`
          );
          
          if (tmdbResponse.ok) {
            const tmdbData = await tmdbResponse.json();
            
            // Create movie record
            const { data: newMovie, error: createError } = await supabase
              .from('movies')
              .insert({
                tmdb_id: tmdbId,
                title: tmdbData.title,
                year: new Date(tmdbData.release_date).getFullYear(),
                poster_url: tmdbData.poster_path ? 
                  `https://image.tmdb.org/t/p/w500${tmdbData.poster_path}` : null,
                slug: tmdbData.overview?.substring(0, 100) || 'Classic film',
                created_at: new Date().toISOString()
              })
              .select('id')
              .single();
            
            if (createError) throw createError;
            movie = newMovie;
          } else {
            errors.push(`TMDB fetch failed for ID ${tmdbId}`);
            continue;
          }
        }
        
        // Add movie to list
        const { error: listError } = await supabase
          .from('movie_list_items')
          .insert({
            list_id: LIST_ID,
            movie_id: movie.id,
            order_index: i + 1,
            created_at: new Date().toISOString()
          });
        
        if (listError) throw listError;
        
        moviesAdded++;
        console.log(`✅ Added movie ${i + 1}/${IMDB_TOP_250_TMDB_IDS.length} (TMDB: ${tmdbId})`);
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        errors.push(`Error processing TMDB ID ${tmdbId}: ${error.message}`);
        console.error(`❌ Error with TMDB ID ${tmdbId}:`, error.message);
      }
    }
    
    return {
      success: true,
      message: `Successfully populated IMDb Top 250 list with ${moviesAdded} movies`,
      movies_added: moviesAdded,
      total_attempted: IMDB_TOP_250_TMDB_IDS.length,
      errors: errors.slice(0, 5), // Only show first 5 errors
      list_id: LIST_ID
    };
    
  } catch (error) {
    console.error('❌ List population failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export default async function handler(req, res) {
  // Allow both GET and POST requests
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify Railway cron job auth
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${process.env.RAILWAY_BATCH_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { action } = req.query;

  try {
    // Handle population action
    if (action === 'populate') {
      console.log('🚀 Starting list population...');
      const result = await populateImdbTop250List();
      console.log('List population result:', result);
      return res.status(200).json(result);
    }
    
    // Default behavior - analysis generation
    const processor = new RailwayListBatchProcessor();
    const result = await processor.processBatch();

    // Log the result
    console.log('List batch processing result:', result);

    return res.status(200).json(result);
  } catch (error) {
    console.error('List batch processing error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}