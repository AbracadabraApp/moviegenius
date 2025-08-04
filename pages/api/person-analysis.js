// pages/api/person-analysis.js
/**
 * Person Analysis API Route
 *
 * Provides Claude-generated comprehensive analysis for actors, directors, and film people.
 * Takes person name and birth/death years, returns detailed career analysis.
 * Uses modular prompt system for consistency with movie analysis quality.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { name, birthYear, deathYear } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Person name is required' });
  }

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // First, try to find the person in database
    let query = supabase.from('people').select('id').eq('name', name);

    // Add birth year filter if provided for better matching
    if (birthYear) {
      query = query.eq('birth_year', birthYear);
    }

    const { data: person, error: personError } = await query.single();

    if (personError || !person) {
      return res.status(404).json({
        error: 'Person not found in database',
        analysis: `${name} ${birthYear ? `(${birthYear}${deathYear ? `–${deathYear}` : ''})` : ''} is a notable figure in cinema who has made significant contributions to the film industry.`,
      });
    }

    // Check if we already have a cached analysis
    const { data: existingAnalysis, error: analysisError } = await supabase
      .from('person_analyses')
      .select('claude_response')
      .eq('person_id', person.id)
      .eq('analysis_type', 'page_analysis')
      .single();

    if (existingAnalysis && !analysisError) {
      console.log(`Using cached analysis for ${name} (${birthYear || 'unknown'})`);
      // Cache for 24 hours since content is stable
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800');
      return res.status(200).json({
        analysis: existingAnalysis.claude_response.raw_content,
        person: { name, birthYear, deathYear },
        cached: true,
      });
    }

    // Generate new analysis with Claude using modular prompt system
    console.log(`Generating new analysis for ${name} (${birthYear || 'unknown'})`);
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const { buildPrompt } = await import('../../lib/prompts/builder.js');

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Use modular prompt system for PERSON context (same depth as movie analysis)
    const promptConfig = buildPrompt(
      'PERSON',
      'Include 4-5 Explore Further topics for deeper career analysis'
    );

    // Build user prompt with available information
    let userPrompt = name;
    if (birthYear && deathYear) {
      userPrompt += ` (${birthYear}–${deathYear})`;
    } else if (birthYear) {
      userPrompt += ` (b. ${birthYear})`;
    }

    const message = await anthropic.messages.create({
      ...promptConfig,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const analysis = message.content[0].text;

    // Calculate cost estimate (rough)
    const costEstimate =
      (message.usage.input_tokens * 3) / 1000000 + (message.usage.output_tokens * 15) / 1000000;

    // Save to database
    const analysisData = {
      raw_content: analysis,
      generated_at: new Date().toISOString(),
      cost_estimate: costEstimate,
      input_tokens: message.usage.input_tokens,
      output_tokens: message.usage.output_tokens,
      model: promptConfig.model, // Use configurable model from prompt system
    };

    const { error: saveError } = await supabase.from('person_analyses').insert({
      person_id: person.id,
      analysis_type: 'page_analysis',
      claude_response: analysisData,
      query_text: `Person page analysis for ${name} ${birthYear ? `(${birthYear}${deathYear ? `–${deathYear}` : ''})` : ''}`,
    });

    if (saveError) {
      console.error('Failed to save analysis to database:', saveError);
      // Don't fail the request, just log the error
    } else {
      console.log(
        `Saved analysis for ${name} (${birthYear || 'unknown'}) - Cost: $${costEstimate.toFixed(4)}`
      );
    }

    // Cache newly generated content for 24 hours
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800');
    res.status(200).json({
      analysis: analysis,
      person: { name, birthYear, deathYear },
      cached: false,
      cost: costEstimate,
    });
  } catch (error) {
    console.error('Error generating person analysis:', error);
    res.status(500).json({
      error: 'Failed to generate person analysis',
      analysis: `${name} ${birthYear ? `(${birthYear}${deathYear ? `–${deathYear}` : ''})` : ''} is a notable figure in cinema who has made significant contributions to the film industry. Their work showcases exceptional talent and continues to be appreciated by audiences and critics alike.`,
    });
  }
}
