// TESTING: Remove static import to exactly match movie-analysis pattern

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // HYPOTHESIS TEST: Replicate movie-analysis dynamic import pattern
    console.log('=== REPLICATING MOVIE-ANALYSIS PATTERN ===');
    
    // Multiple dynamic imports like movie-analysis endpoint
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const { buildPrompt } = await import('../../lib/prompts/builder.js');
    
    // Add the same kind of processing delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('After dynamic imports - API Key exists:', !!process.env.ANTHROPIC_API_KEY);
    console.log('After dynamic imports - API Key length:', process.env.ANTHROPIC_API_KEY?.length);
    console.log('After dynamic imports - API Key prefix:', process.env.ANTHROPIC_API_KEY?.substring(0, 20));

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Use the same pattern as movie-analysis
    const promptConfig = buildPrompt('MOVIE_ANALYSIS', 'Test response');
    
    const message = await anthropic.messages.create({
      ...promptConfig,
      messages: [
        {
          role: 'user',
          content: `Current timestamp is ${Date.now()}. Say "FRESH RESPONSE" and this timestamp.`,
        },
      ],
    });

    const response = message.content[0].text;
    
    res.status(200).json({
      success: true,
      response: response,
      timestamp: Date.now(),
      tokens: message.usage,
      apiKeyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 20),
      method: 'replicated_movie_analysis_pattern'
    });
    
  } catch (error) {
    console.error('Claude API Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      apiKeyPrefix: process.env.ANTHROPIC_API_KEY?.substring(0, 20),
      timestamp: Date.now(),
      method: 'replicated_movie_analysis_pattern'
    });
  }
}