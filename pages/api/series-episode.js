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
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error loading series config:', error);
    // Fallback to basic structure
    return {
      '2': {
        id: 2,
        title: "Cinema Through Time - 1970-2025",
        description: "How film evolved from the auteur renaissance through the present day",
        episodes: []
      }
    };
  }
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

async function generateEpisodeContent(seriesId, episodeId) {
  // Import Claude AI for content generation
  const { Anthropic } = await import('@anthropic-ai/sdk');
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Get episode metadata for prompt
  const seriesData = loadSeriesData();
  const series = seriesData[seriesId];
  const episode = series?.episodes.find(ep => ep.id.toString() === episodeId);
  
  if (!series || !episode) {
    throw new Error('Series or episode not found');
  }

  // Enhanced prompt for series episodes with forced structure
  const systemPrompt = `You are a film expert providing thorough, professional analysis. You have encyclopedic knowledge of films from all eras and countries.

CRITICAL REQUIREMENTS:
- START with OPENER: [one compelling sentence that captures the essence]
- Write EXACTLY 6 PARAGRAPH sections (no more, no less)
- Each PARAGRAPH: should be 3-4 sentences and include specific film titles
- ONLY include MOVIES: for films mentioned by title in that paragraph
- End with extensive MORE_IDEAS: list (8-10 additional films)

STRUCTURE EXAMPLE:
OPENER: [one sentence that captures the essence]
PARAGRAPH: [3-4 sentences with specific film titles mentioned]
MOVIES: The Godfather|1972|Coppola's epic family saga|Available on Paramount+
PARAGRAPH: [3-4 sentences about related films/directors]
MOVIES: Taxi Driver|1976|Scorsese's urban nightmare|Available on multiple platforms
PARAGRAPH: [3-4 sentences mentioning more films]
MOVIES: Mean Streets|1973|Early Scorsese masterpiece|Criterion Channel
PARAGRAPH: [3-4 sentences about techniques/innovations]
MOVIES: [relevant films for this paragraph]
PARAGRAPH: [3-4 sentences about cultural impact]
MOVIES: [relevant films for this paragraph]
PARAGRAPH: [3-4 sentences about legacy/influence]
MOVIES: [relevant films for this paragraph]
MORE_IDEAS: [8-10 additional films with format: Title|Year|Description|Platform]

You MUST write exactly 6 paragraphs. Each paragraph should mention specific films by title.`;

  const userPrompt = `Create comprehensive educational content for "${series.title}" - Episode: "${episode.title}: ${episode.subtitle}".

CRITICAL FORMATTING REQUIREMENTS:
- Write EXACTLY 6 paragraphs (no more, no less)
- Each paragraph should be 3-4 sentences
- Each paragraph MUST mention specific film titles
- Follow the exact format specified in system prompt

Structure your 6 paragraphs to cover:
1. Historical context and key breakthrough films
2. Major directors and their signature works
3. Technical and artistic innovations with examples
4. Genre-defining films and their impact
5. Cultural influence and box office success
6. Legacy and influence on modern cinema

Write exactly 6 substantial paragraphs with specific film titles and director names throughout. Focus on film school level depth but keep structure clear and organized.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    });

    const responseText = message.content[0].text.trim();
    return parseClaudeResponse(responseText);

  } catch (error) {
    console.error('Error generating episode content with Claude:', error);
    
    // Fallback to test content for development
    if (seriesId === '2' && episodeId === '1') {
      return {
        sections: [
          {
            type: 'text',
            content: 'The 1970s marked a revolutionary period in American cinema when directors emerged from the shadows to become the true stars of Hollywood. This auteur renaissance transformed filmmaking from a factory system into a director-driven art form, giving birth to what we now call "New Hollywood." Visionary filmmakers like Francis Ford Coppola, Martin Scorsese, and Steven Spielberg didn\'t just make movies—they created personal statements that reflected their unique artistic visions while achieving unprecedented commercial success.'
          },
          {
            type: 'movies',
            movies: [
              { title: 'The Godfather', year: 1972, slug: 'Coppola\'s epic family saga redefined cinematic storytelling' },
              { title: 'Taxi Driver', year: 1976, slug: 'Scorsese\'s urban nightmare explores isolation and violence' },
              { title: 'Jaws', year: 1975, slug: 'Spielberg\'s thriller invented the summer blockbuster' }
            ]
          }
        ],
        moreIdeas: {
          title: 'More 1970s Auteur Films',
          movies: [
            { title: 'Mean Streets', year: 1973, slug: 'Scorsese\'s breakthrough indie about Catholic guilt and street life' },
            { title: 'The Conversation', year: 1974, slug: 'Coppola\'s paranoid thriller about surveillance and guilt' }
          ]
        }
      };
    }
    
    // Default placeholder
    return {
      sections: [
        {
          type: 'text',
          content: 'This episode content is being generated. Please check back soon for comprehensive analysis of this crucial period in cinema history.'
        }
      ],
      moreIdeas: {
        title: 'Related Films',
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

    // Generate episode content
    const rawContent = await generateEpisodeContent(seriesId, episodeId);

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