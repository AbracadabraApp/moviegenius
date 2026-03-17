import { getPool } from '../../lib/railway-db.js';
import { createClient, supabase } from '../../lib/railway-adapter.js';


// pages/api/educational-list-analysis.js
/**
 * Educational List Analysis API
 *
 * Generates engaging educational analysis for film studies and academic content.
 * Uses same interactive format as ask responses for consistent user experience.
 * Focuses on film movements, techniques, and cultural topics with learning insights.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { listId, listName, claudePrompt } = req.body;

  if (!listId || !listName || !claudePrompt) {
    return res.status(400).json({ error: 'List ID, name, and Claude prompt are required' });
  }

  try {
    // TEMPORARILY DISABLED: const { createClient } = await import(@supabase/supabase-js);
    const pool = getPool();

    // Check if we already have a cached analysis
    const { data: existingAnalysis, error: analysisError } = await supabase
      .from('list_analyses')
      .select('claude_response')
      .eq('list_id', listId)
      .eq('analysis_type', 'educational_analysis')
      .single();

    if (existingAnalysis && !analysisError) {
      console.log(`Using cached educational analysis for: ${listName}`);
      return res.status(200).json({
        analysis: existingAnalysis.claude_response.raw_content,
        listName: listName,
        cached: true,
      });
    }

    // Generate new educational analysis with Claude using modular prompt system
    console.log(`Generating new educational analysis for: ${listName}`);
    const { Anthropic } = await import('@anthropic-ai/sdk');
    const { buildPrompt } = await import('../../lib/prompts/builder.js');

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Use modular prompt system for EDUCATIONAL context (same format as ASK)
    const promptConfig = buildPrompt(
      'EDUCATIONAL',
      'Focus on educational insights and learning opportunities for film students and enthusiasts'
    );

    const message = await anthropic.messages.create({
      ...promptConfig,
      messages: [
        {
          role: 'user',
          content: claudePrompt,
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

    const { error: saveError } = await supabase.from('list_analyses').insert({
      list_id: listId,
      analysis_type: 'educational_analysis',
      claude_response: analysisData,
      query_text: `Educational analysis for ${listName}`,
    });

    if (saveError) {
      console.error('Failed to save educational analysis to database:', saveError);
      // Don't fail the request, just log the error
    } else {
      console.log(`Saved educational analysis for ${listName} - Cost: $${costEstimate.toFixed(4)}`);
    }

    res.status(200).json({
      analysis: analysis,
      listName: listName,
      cached: false,
      cost: costEstimate,
    });
  } catch (error) {
    console.error('Error generating educational analysis:', error);
    res.status(500).json({
      error: 'Failed to generate educational analysis',
      analysis: `${listName} represents a significant area of cinematic study that has shaped our understanding of film as both art and cultural expression. This topic encompasses key developments in filmmaking technique, artistic vision, and cultural impact that continue to influence contemporary cinema.`,
    });
  }
}
