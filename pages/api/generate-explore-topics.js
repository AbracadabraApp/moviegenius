// pages/api/generate-explore-topics.js
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 200,
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: `Generate 4 diverse movie exploration topics inspired by this query: "${query}"

Create 4 DIFFERENT angles that branch out from this topic (25 words or less each). Avoid repeating the original query. Think: genre shifts, time periods, cultural perspectives, filmmaking approaches, or thematic variations.

Format as simple text, one per line, no bullets or numbers.

Example for "action movies":
Silent film stunts and early action sequences
Female-led action films from around the world  
Low-budget action movies with creative fight scenes
Action comedies that blend humor with thrills`,
        },
      ],
    });

    const responseText = message.content[0].text.trim();
    const topics = responseText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .slice(0, 4); // Ensure max 4 topics

    res.status(200).json({
      success: true,
      topics,
    });
  } catch (error) {
    console.error('Error generating explore topics:', error);
    res.status(500).json({
      error: 'Failed to generate explore topics',
      details: error.message,
    });
  }
}
