// pages/api/enhance-movie-data.js
// 🛡️ SLUG PROTECTION: This API should NOT overwrite existing good Claude slugs
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { title, year, needsSlug, needsPoster } = req.body;

  if (!title || !year) {
    return res.status(400).json({ error: 'Title and year are required' });
  }

  try {
    let slug = null;

    // Only fetch slug if needed AND if no good slug exists in database
    if (needsSlug) {
      console.log('Checking for existing slug for:', title, year);
      
      // 🛡️ PROTECTION: Check database first for existing Claude slug
      const { data: existingMovie, error: dbError } = await supabase
        .from('movies')
        .select('slug')
        .eq('title', title)
        .eq('year', year)
        .single();
        
      if (!dbError && existingMovie?.slug && existingMovie.slug.length <= 50) {
        console.log('✅ Found existing good short slug, not overwriting');
        return res.status(200).json({
          slug: existingMovie.slug,
          title: title,
          year: year,
          source: 'existing_short_slug'
        });
      }
      
      console.log('Generating new short slug for:', title, year);
      
      const prompt = `For the movie "${title}" (${year}), provide a punchy marketing tagline under 50 characters. Think movie poster tagline - short, memorable, exciting. Examples: "Terror has a new name", "Love conquers all", "Justice is coming". Just return the tagline, nothing else.`;

      const message = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      slug = message.content[0].text.trim();
      
      // Remove quotes if Claude added them
      if (slug.startsWith('"') && slug.endsWith('"')) {
        slug = slug.slice(1, -1);
      }
      
      console.log('Generated new slug:', slug);
    }

    return res.status(200).json({
      slug: slug,
      title: title,
      year: year,
      source: slug ? 'generated' : 'none'
    });

  } catch (error) {
    console.error('Error enhancing movie data:', error);
    return res.status(500).json({ 
      error: 'Failed to enhance movie data',
      details: error.message 
    });
  }
}