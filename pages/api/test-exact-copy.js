// EXACT COPY of movie-analysis authentication section
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // EXACT COPY of lines 149-177 from movie-analysis.js
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const { buildPrompt } = await import('../../lib/prompts/builder.js');

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Use modular prompt system for MOVIE_ANALYSIS context
    const promptConfig = buildPrompt(
      'MOVIE_ANALYSIS',
      'Include 3-5 Explore Further topics for deeper analysis'
    );
    const userPrompt = `Fight Club (1999)`;
    
    // DEBUG: Log the actual system prompt being sent
    console.log(`🔍 PROMPT DEBUG: System prompt for Fight Club:`);
    console.log(`📝 First 500 chars: ${promptConfig.system[0].text.substring(0, 500)}...`);
    console.log(`🎯 Model: ${promptConfig.model}`);
    console.log(`🔧 Temperature: ${promptConfig.temperature}`);

    const message = await anthropic.messages.create({
      ...promptConfig,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const rawAnalysis = message.content[0].text;
    
    res.status(200).json({
      success: true,
      analysis: rawAnalysis.substring(0, 200) + '...',
      method: 'exact_copy_movie_analysis'
    });

  } catch (error) {
    console.error('❌ Claude analysis generation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      method: 'exact_copy_movie_analysis'
    });
  }
}