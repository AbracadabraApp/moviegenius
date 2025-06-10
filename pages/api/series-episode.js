/**
 * Series Episode API Route
 * 
 * Generates series episode content using Claude AI following the ask-claude pattern.
 * Returns same data structure as ask-claude for consistency.
 */

// Import series configuration
import fs from 'fs';
import path from 'path';

// Load series data from static configuration file
function loadSeriesData() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'series-config.json');
    
    // Check if file exists first
    if (!fs.existsSync(filePath)) {
      console.error('Series config file not found:', filePath);
      return getFallbackSeriesData();
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Validate JSON structure
    const seriesData = JSON.parse(fileContent);
    
    // Basic validation - ensure it's an object with at least one series
    if (!seriesData || typeof seriesData !== 'object' || Object.keys(seriesData).length === 0) {
      console.error('Invalid series config structure');
      return getFallbackSeriesData();
    }
    
    console.log(`Loaded ${Object.keys(seriesData).length} series from config`);
    return seriesData;
    
  } catch (error) {
    console.error('Error loading series config:', error.message);
    return getFallbackSeriesData();
  }
}

// Fallback series data to prevent loops
function getFallbackSeriesData() {
  return {
    '2': {
      id: 2,
      title: "Cinema Through Time - 1970-2025",
      description: "How film evolved from the auteur renaissance through the present day",
      episodes: [
        {
          id: 1,
          title: "1970s: The Auteur Renaissance",
          subtitle: "When directors became superstars",
          posters: [
            "https://image.tmdb.org/t/p/w200/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
            "https://image.tmdb.org/t/p/w200/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg"
          ]
        }
      ]
    }
  };
}

// Simplified movie data processing for testing
function processMovieData(movieData) {
  return {
    title: movieData.title,
    year: movieData.year,
    slug: movieData.slug,
    poster_url: null, // Will be enhanced later
    tmdb_id: null,    // Will be enhanced later
    streaming: null   // Will be enhanced later
  };
}

// Load pre-generated episode content
function loadEpisodeContent(seriesId, episodeId) {
  try {
    const episodePath = path.join(process.cwd(), 'data', 'episodes', `series-${seriesId}-episode-${episodeId}.json`);
    
    if (fs.existsSync(episodePath)) {
      const episodeContent = fs.readFileSync(episodePath, 'utf8');
      const episodeData = JSON.parse(episodeContent);
      return episodeData.content;
    } else {
      console.log(`Pre-generated content not found for Series ${seriesId}, Episode ${episodeId}`);
      return null;
    }
  } catch (error) {
    console.error(`Error loading pre-generated content for Series ${seriesId}, Episode ${episodeId}:`, error);
    return null;
  }
}

// Generate episode content on-demand using Claude AI
async function generateEpisodeContentFallback(seriesId, episodeId) {
  console.log(`Generating content for Series ${seriesId}, Episode ${episodeId}`);
  
  // Get episode metadata for prompt
  const seriesData = loadSeriesData();
  const series = seriesData[seriesId];
  const episode = series?.episodes.find(ep => ep.id.toString() === episodeId);
  
  if (!series || !episode) {
    throw new Error('Series or episode not found');
  }

  try {
    // Import and use Anthropic API
    const { Anthropic } = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.7,
      system: `You are a film expert providing thorough, professional analysis. You have encyclopedic knowledge of films from all eras and countries.

CRITICAL REQUIREMENTS:
- START with OPENER: [one compelling sentence that captures the essence]
- Write EXACTLY 6 PARAGRAPH sections (no more, no less)
- Each PARAGRAPH: should be 3-4 sentences and include specific film titles
- ONLY include MOVIES: for films mentioned by title in that paragraph
- End with extensive MORE_IDEAS: list (8-10 additional films)

STRUCTURE EXAMPLE:
OPENER: [one sentence that captures the essence]
PARAGRAPH: [3-4 sentences with specific film titles mentioned]
MOVIES: The Godfather|1972|Coppola's epic family saga|tt0068646
PARAGRAPH: [3-4 sentences about related films/directors]
MOVIES: Taxi Driver|1976|Scorsese's urban nightmare|tt0075314
PARAGRAPH: [3-4 sentences mentioning more films]
MOVIES: Mean Streets|1973|Early Scorsese masterpiece|tt0070379
PARAGRAPH: [3-4 sentences about techniques/innovations]
MOVIES: [relevant films for this paragraph]
PARAGRAPH: [3-4 sentences about cultural impact]
MOVIES: [relevant films for this paragraph]
PARAGRAPH: [3-4 sentences about legacy/influence]
MOVIES: [relevant films for this paragraph]
MORE_IDEAS: [8-10 additional films with format: Title|Year|Description|TMDB_ID]

IMPORTANT: Include TMDB IDs in format ttXXXXXXX for all movies.`,
      messages: [{
        role: 'user',
        content: `Create comprehensive educational content for "${series.title}" - Episode: "${episode.title}: ${episode.subtitle}".

CRITICAL FORMATTING REQUIREMENTS:
- Write EXACTLY 6 paragraphs (no more, no less)
- Each paragraph should be 3-4 sentences
- Each paragraph MUST mention specific film titles
- Include TMDB IDs for all films mentioned
- Follow the exact format specified in system prompt

Structure your 6 paragraphs to cover:
1. Historical context and key breakthrough films
2. Major directors and their signature works
3. Technical and artistic innovations with examples
4. Genre-defining films and their impact
5. Cultural influence and box office success
6. Legacy and influence on modern cinema

Write exactly 6 substantial paragraphs with specific film titles and director names throughout. Focus on film school level depth but keep structure clear and organized.`
      }]
    });

    const responseText = response.content[0].text;
    return parseClaudeResponse(responseText);

  } catch (error) {
    console.error('Error generating episode content:', error);
    
    // Return more robust fallback content
    return {
      opener: `${episode.title} represents a pivotal moment in ${series.title.toLowerCase()}, showcasing the evolution of cinematic artistry and storytelling.`,
      sections: [
        {
          type: 'text',
          content: `This episode explores "${episode.title}: ${episode.subtitle}" as part of "${series.title}". This content examines the historical context, artistic innovations, and lasting impact of this important period in cinema history.`
        },
        {
          type: 'text', 
          content: `The films from this era demonstrate significant technological and narrative advances that continue to influence modern filmmaking. Directors and cinematographers during this period pushed creative boundaries while establishing new cinematic languages.`
        },
        {
          type: 'text',
          content: `Cultural impact extended far beyond the box office, as these films reflected and shaped societal values. The legacy of this period continues to inform contemporary cinema and inspire new generations of filmmakers.`
        }
      ],
      moreIdeas: {
        title: 'Related Films to Explore',
        movies: []
      }
    };
  }
}

// Copy the parseClaudeResponse function from ask-claude.js
function parseClaudeResponse(responseText) {
  const sections = [];
  const moreIdeasMovies = [];
  let opener = null;
  
  const lines = responseText.split('\n');
  let currentSection = null;
  let currentMovies = [];
  let inMoreIdeas = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    if (!trimmedLine) continue;
    
    if (trimmedLine.startsWith('OPENER:')) {
      opener = trimmedLine.substring('OPENER:'.length).trim();
      
    } else if (trimmedLine.startsWith('SUBHEAD:')) {
      // Save previous section if exists
      if (currentSection) {
        sections.push({
          type: 'text',
          content: currentSection
        });
        
        if (currentMovies.length > 0) {
          sections.push({
            type: 'movies',
            movies: currentMovies
          });
          currentMovies = [];
        }
      }
      
      // Add subhead
      sections.push({
        type: 'subhead',
        content: trimmedLine.substring('SUBHEAD:'.length).trim()
      });
      currentSection = null;
      
    } else if (trimmedLine.startsWith('PARAGRAPH:')) {
      // Save previous section if exists
      if (currentSection) {
        sections.push({
          type: 'text',
          content: currentSection
        });
        
        if (currentMovies.length > 0) {
          sections.push({
            type: 'movies',
            movies: currentMovies
          });
          currentMovies = [];
        }
      }
      
      // Start new section
      currentSection = trimmedLine.substring('PARAGRAPH:'.length).trim();
      
    } else if (trimmedLine.startsWith('MOVIES:') && !inMoreIdeas) {
      const movieData = trimmedLine.substring('MOVIES:'.length).trim();
      const [title, year, description, streaming] = movieData.split('|').map(s => s?.trim());
      
      if (title && year) {
        currentMovies.push({
          title,
          year: parseInt(year),
          slug: description || '',
          streaming: streaming || ''
        });
      }
      
      
    } else if (trimmedLine.startsWith('MORE_IDEAS:')) {
      inMoreIdeas = true;
      
      // Save any pending section
      if (currentSection) {
        sections.push({
          type: 'text',
          content: currentSection
        });
        currentSection = null;
        
        if (currentMovies.length > 0) {
          sections.push({
            type: 'movies',
            movies: currentMovies
          });
          currentMovies = [];
        }
      }
      
      const movieData = trimmedLine.substring('MORE_IDEAS:'.length).trim();
      const [title, year, description, streaming] = movieData.split('|').map(s => s?.trim());
      
      if (title && year) {
        moreIdeasMovies.push({
          title,
          year: parseInt(year),
          slug: description || '',
          streaming: streaming || ''
        });
      }
    }
  }
  
  // Save final section
  if (currentSection) {
    sections.push({
      type: 'text',
      content: currentSection
    });
    
    if (currentMovies.length > 0) {
      sections.push({
        type: 'movies',
        movies: currentMovies
      });
    }
  }
  
  return {
    opener,
    sections,
    moreIdeas: {
      title: 'More Ideas',
      movies: moreIdeasMovies
    }
  };
}

export default async function handler(req, res) {
  const { seriesId, episodeId } = req.body;
  
  // Basic validation
  if (!seriesId || !episodeId) {
    return res.status(400).json({
      error: 'Missing required fields: seriesId and episodeId'
    });
  }

  try {
    // Get series metadata from static config
    const seriesData = loadSeriesData();
    const series = seriesData[seriesId];
    if (!series) {
      return res.status(404).json({ error: `Series ${seriesId} not found` });
    }

    // Get episode metadata
    const episode = series.episodes.find(ep => ep.id.toString() === episodeId);
    if (!episode) {
      return res.status(404).json({ error: `Episode ${episodeId} not found in series ${seriesId}` });
    }

    // Generate content dynamically (same pattern as ask page)
    let rawContent = await generateEpisodeContentFallback(seriesId, episodeId);

    // Process movies (simplified for now)
    const processedSections = rawContent.sections.map(section => {
      if (section.type === 'movies') {
        const processedMovies = section.movies.map(movie => processMovieData(movie));
        return { ...section, movies: processedMovies };
      }
      return section;
    });

    // Process more ideas movies
    let processedMoreIdeas = rawContent.moreIdeas;
    if (rawContent.moreIdeas && rawContent.moreIdeas.movies) {
      const processedMoreMovies = rawContent.moreIdeas.movies.map(movie => processMovieData(movie));
      processedMoreIdeas = {
        ...rawContent.moreIdeas,
        movies: processedMoreMovies
      };
    }

    // Return same structure as ask-claude.js
    return res.status(200).json({
      data: {
        sections: processedSections,
        moreIdeas: processedMoreIdeas
      },
      series,
      episode
    });

  } catch (error) {
    console.error('Error in series-episode API:', error);
    
    return res.status(500).json({ 
      error: 'Failed to generate episode content',
      details: error.message 
    });
  }
}