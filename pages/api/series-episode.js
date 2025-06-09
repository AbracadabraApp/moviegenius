/**
 * Series Episode API Route
 * 
 * Generates series episode content using Claude AI following the ask-claude pattern.
 * Returns same data structure as ask-claude for consistency.
 */

// Series and episode metadata - will move to database
const seriesData = {
  '2': {
    id: 2,
    title: "Cinema Through Time - 1970-2025",
    description: "How film evolved from the auteur renaissance through the present day",
    episodes: [
      { id: 1, title: "1970s: The Auteur Renaissance", subtitle: "When directors became superstars" },
      { id: 2, title: "1980s: Blockbuster Revolution", subtitle: "High-concept cinema takes over" },
      { id: 3, title: "1990s: Independent Renaissance", subtitle: "Bold voices outside the system" },
      { id: 4, title: "2010s-2025: Global Cinema Rising", subtitle: "World cinema goes mainstream" }
    ]
  },
  '4': {
    id: 4,
    title: "International New Waves - 1950-1980",
    description: "Revolutionary cinema movements that transformed filmmaking worldwide",
    episodes: [
      { id: 1, title: "French New Wave: Breathless Revolution", subtitle: "Godard, Truffaut and the cinema of freedom" },
      { id: 2, title: "Italian Neorealism: Truth in Cinema", subtitle: "Post-war reality on the streets" },
      { id: 3, title: "British Kitchen Sink & Social Realism", subtitle: "Working class stories break through" },
      { id: 4, title: "Japanese New Wave: Oshima & Imamura", subtitle: "Radical voices from the East" },
      { id: 5, title: "Czech New Wave: Behind Iron Curtain", subtitle: "Artistic rebellion in Communist Europe" },
      { id: 6, title: "German New Cinema: Herzog & Fassbinder", subtitle: "New German Cinema emerges" }
    ]
  }
};

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
  const series = seriesData[seriesId];
  const episode = series?.episodes.find(ep => ep.id.toString() === episodeId);
  
  if (!series || !episode) {
    throw new Error('Series or episode not found');
  }

  // Enhanced prompt for series episodes with forced structure
  const systemPrompt = `You are a film expert providing thorough, professional analysis. You have encyclopedic knowledge of films from all eras and countries.

CRITICAL REQUIREMENTS:
- START with OPENER: [one compelling sentence]
- Keep each PARAGRAPH: to exactly 2-3 sentences maximum
- Use SUBHEAD: every 2-3 paragraphs when topic shifts
- ONLY include MOVIES: for films mentioned by title in that paragraph
- End with extensive MORE_IDEAS: list

STRUCTURE EXAMPLE:
OPENER: [one sentence that captures the essence]
PARAGRAPH: [2-3 sentences with film titles mentioned]
MOVIES: The Godfather|1972|Coppola's epic family saga|Available on Paramount+
SUBHEAD: Technical Innovation
PARAGRAPH: [2-3 sentences about cinematography/sound]
PARAGRAPH: [2-3 sentences mentioning more films]
MOVIES: Taxi Driver|1976|Scorsese's urban nightmare|Available on multiple platforms
MORE_IDEAS: Mean Streets|1973|Early Scorsese masterpiece|Criterion Channel

You MUST follow this exact format. Keep paragraphs short (2-3 sentences). Use subheads to break up topics.`;

  const userPrompt = `Create comprehensive educational content for "${series.title}" - Episode: "${episode.title}: ${episode.subtitle}".

CRITICAL FORMATTING REQUIREMENTS:
- Keep paragraphs to 2-3 sentences maximum
- Use SUBHEAD: every 2-3 paragraphs when focus shifts
- Follow the exact format specified in system prompt

Provide analysis covering:
- Historical context and significance
- Key films with specific examples and analysis
- Technical and artistic innovations
- Cultural impact and lasting influence
- Evolution and legacy

Write 8-10 SHORT paragraphs (2-3 sentences each) with extensive movie and people examples throughout. Focus on film school level depth and analysis but keep individual paragraphs concise.`;

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
    // Get series metadata
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