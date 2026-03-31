import Anthropic from '@anthropic-ai/sdk';
import { buildPrompt } from '../../lib/prompts/builder.js';

/**
 * Streaming Movie Analysis API
 * 
 * Returns real-time streaming analysis for enhanced user experience
 * Integrates with existing movie-analysis.js logic but streams response
 */
export default async function handler(req, res) {
  const { id: movieId, title, year } = req.query;

  // Set up streaming headers
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (!movieId && (!title || !year)) {
    res.status(400).json({ error: 'Movie ID or title/year required' });
    return;
  }

  try {
    console.log(`🎬 Starting streaming analysis for ${title || `ID:${movieId}`} (${year || 'unknown year'})`);

    // For now, get movie info from TMDB if we have ID
    let movieTitle = title;
    let movieYear = year;

    if (movieId && !title) {
      // TODO: Fetch from TMDB API
      // For now, use fallback
      movieTitle = 'Unknown Movie';
      movieYear = 'Unknown Year';
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Use existing prompt system
    const promptConfig = buildPrompt(
      'MOVIE_ANALYSIS',
      'Include 3-5 Explore Further topics for deeper analysis'
    );
    
    const userPrompt = `${movieTitle} (${movieYear})`;

    console.log(`🤖 Requesting analysis from Claude for: ${userPrompt}`);

    // Create streaming request
    const stream = await anthropic.messages.create({
      model: promptConfig.model,
      max_tokens: promptConfig.max_tokens,
      messages: [{
        role: 'user',
        content: userPrompt,
      }],
      system: promptConfig.system,
      stream: true,
    });

    console.log(`📡 Claude streaming started`);

    // Stream the response
    let fullText = '';
    let chunkCount = 0;

    for await (const messageStreamEvent of stream) {
      if (messageStreamEvent.type === 'content_block_delta') {
        const chunk = messageStreamEvent.delta.text;
        if (chunk) {
          fullText += chunk;
          chunkCount++;
          
          // Write chunk to response
          res.write(chunk);
          
          // Log progress occasionally
          if (chunkCount % 10 === 0) {
            console.log(`📝 Streamed ${chunkCount} chunks (${fullText.length} chars)`);
          }
        }
      }
    }

    // Signal completion
    res.write('\n\n__STREAMING_COMPLETE__');
    console.log(`✅ Streaming complete: ${chunkCount} chunks, ${fullText.length} characters`);
    
    res.end();

  } catch (error) {
    console.error('❌ Streaming analysis failed:', error);
    
    // For development, fall back to POC endpoint
    if (process.env.NODE_ENV === 'development') {
      console.log('🔄 Falling back to streaming POC for development');
      
      try {
        // Import and call the POC handler
        const streamingPoc = await import('./streaming-poc.js');
        return streamingPoc.default(req, res);
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        res.status(500).json({ error: 'Analysis failed: ' + error.message });
      }
    } else {
      res.status(500).json({ error: 'Analysis failed: ' + error.message });
    }
  }
}