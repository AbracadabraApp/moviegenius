// pages/api/get-streaming-info.js
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, year } = req.body;

  if (!title || !year) {
    return res.status(400).json({ error: 'Title and year are required' });
  }

  try {
    console.log('Fetching streaming info for:', title, year);
    
    const prompt = `Where can someone stream the movie "${title}" (${year}) right now? List the current streaming services where it's available. Be specific about platform names like Netflix, Hulu, Amazon Prime Video, Disney+, etc. If it's available for rent/purchase, mention that too. Keep your response concise and factual.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const streamingText = message.content[0].text.trim();
    console.log('Claude streaming response:', streamingText);

    return res.status(200).json({
      streamingText: streamingText,
      title: title,
      year: year
    });

  } catch (error) {
    console.error('Error fetching streaming info:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch streaming info',
      details: error.message 
    });
  }
}