export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const { buildPrompt } = await import('../../lib/prompts/builder.js');
    
    // Get the promptConfig that the working endpoint uses
    const promptConfig = buildPrompt('MOVIE_ANALYSIS', 'Test');
    
    // Create the configuration objects
    const workingConfig = {
      ...promptConfig,
      messages: [{ role: 'user', content: 'Say hello' }],
    };
    
    const failingConfig = {
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say hello' }],
    };

    console.log('=== CONFIGURATION COMPARISON ===');
    console.log('Working config keys:', Object.keys(workingConfig));
    console.log('Failing config keys:', Object.keys(failingConfig));
    console.log('Working config model:', workingConfig.model);
    console.log('Failing config model:', failingConfig.model);
    console.log('Working config system:', !!workingConfig.system);
    console.log('Working config system content:', workingConfig.system?.[0]?.cache_control);
    
    // Test the actual difference
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    let workingResult = null;
    let failingResult = null;
    let workingError = null;
    let failingError = null;

    try {
      console.log('Testing working configuration...');
      const workingResponse = await anthropic.messages.create(workingConfig);
      workingResult = workingResponse.content[0].text;
      console.log('WORKING CONFIG SUCCESS');
    } catch (error) {
      workingError = error.message;
      console.log('WORKING CONFIG FAILED:', error.message);
    }

    try {
      console.log('Testing failing configuration...');
      const failingResponse = await anthropic.messages.create(failingConfig);
      failingResult = failingResponse.content[0].text;
      console.log('FAILING CONFIG SUCCESS');
    } catch (error) {
      failingError = error.message;
      console.log('FAILING CONFIG FAILED:', error.message);
    }

    res.status(200).json({
      success: true,
      comparison: {
        workingConfigKeys: Object.keys(workingConfig),
        failingConfigKeys: Object.keys(failingConfig),
        workingModel: workingConfig.model,
        failingModel: failingConfig.model,
        hasSystemPrompt: !!workingConfig.system,
        hasCacheControl: !!workingConfig.system?.[0]?.cache_control
      },
      results: {
        workingSuccess: !!workingResult,
        failingSuccess: !!failingResult,
        workingError,
        failingError
      }
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}