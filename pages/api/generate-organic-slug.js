// pages/api/generate-organic-slug.js - 🔒 LOCKED ORGANIC SLUG GENERATION 🔒
//
// ⚠️  CRITICAL: This API generates ONLY movie poster taglines
// ⚠️  NO plot summaries, NO story descriptions, NO character names
// ⚠️  PROTECTED against TMDB summary contamination
//
// @version LOCKED-2025-07-02
import { createClient, supabase } from '../../lib/railway-adapter.js';

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';
import { Anthropic } from '@anthropic-ai/sdk';

const pool = getPool();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, year } = req.body;

    if (!title || !year) {
      return res.status(400).json({ error: 'Title and year required' });
    }

    console.log(`🌱 🔒 LOCKED Organic slug generation: ${title} (${year})`);

    // 🔒 LOCKED: Check if we already have a good slug in the database
    const { data: movie } = await supabase
      .from('movies')
      .select('id, slug')
      .eq('title', title)
      .eq('year', year)
      .single();

    // If we have a good existing slug, return it
    if (
      movie?.slug &&
      movie.slug.length <= 50 &&
      movie.slug.length > 5 &&
      !movie.slug.includes('Plot:') &&
      !movie.slug.includes('Overview:') &&
      !movie.slug.includes('Synopsis:')
    ) {
      console.log(`   ✅ Using existing good slug: "${movie.slug}"`);
      return res.json({ slug: movie.slug, source: 'existing' });
    }

    // Generate new slug with improved prompt
    const prompt = `Create a powerful movie poster tagline for "${title}" (${year}).

RULES:
- Maximum 50 characters
- NO plot details or story descriptions  
- NO actor names or character names
- Focus on EMOTION, STAKES, or MYSTERY
- Think movie poster marketing copy

GOOD Examples:
- "Fear has a new address"
- "Some secrets should stay buried" 
- "The hunt begins"
- "Trust no one"
- "Love is the ultimate sacrifice"
- "Revenge never felt so good"
- "The game changes everything"

BAD Examples to AVOID:
- "A man discovers his wife's secret" (plot detail)
- "Comedy starring Will Ferrell" (actor name)
- "Two friends go on adventure" (description)

Return ONLY the tagline, nothing else.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    let slug = message.content[0].text.trim();

    // Remove quotes if Claude added them
    if (slug.startsWith('"') && slug.endsWith('"')) {
      slug = slug.slice(1, -1);
    }

    // Validate slug quality
    if (slug.length > 50) {
      console.warn(`⚠️  Generated slug too long (${slug.length} chars): "${slug}"`);
      return res.status(400).json({ error: 'Generated slug too long' });
    }

    // Check for banned content
    const lowerSlug = slug.toLowerCase();
    const bannedPatterns = [
      'starring',
      'stars',
      'features',
      'follows',
      'story of',
      'about',
      'when ',
      'after ',
      'before ',
      'during ',
      'chronicles',
      'depicts',
    ];

    for (const pattern of bannedPatterns) {
      if (lowerSlug.includes(pattern)) {
        console.warn(`⚠️  Generated slug contains banned pattern "${pattern}": "${slug}"`);
        return res.status(400).json({ error: 'Generated slug contains banned content' });
      }
    }

    // Save to database if we found the movie
    if (movie?.id) {
      const { error } = await supabase
        .from('movies')
        .update({
          slug: slug,
          updated_at: new Date().toISOString(),
        })
        .eq('id', movie.id);

      if (error) {
        console.warn('Failed to save organic slug to database:', error);
      } else {
        console.log(`   💾 Saved organic slug to database: "${slug}"`);
      }
    }

    console.log(`   ✅ Generated organic slug: "${slug}" (${slug.length} chars)`);

    return res.json({
      slug,
      source: 'generated',
      length: slug.length,
    });
  } catch (error) {
    console.error('Organic slug generation error:', error);
    return res.status(500).json({ error: 'Failed to generate slug' });
  }
}
