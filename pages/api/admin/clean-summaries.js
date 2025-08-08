// pages/api/admin/clean-summaries.js - 🔒 LOCKED ADMIN CLEANUP 🔒

import { getPool, MovieService, EpisodeService, CacheService, PersonService } from '../../lib/railway-db.js';

const pool = getPool();

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🔒 Starting summary contamination cleanup...');

  try {
    // Get total count first
    const { count: totalCount, error: countError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .not('slug', 'is', null);

    if (countError) {
      console.error('❌ Error counting movies:', countError);
      return res.status(500).json({ error: 'Failed to count movies' });
    }

    console.log(`📊 Found ${totalCount} movies with slugs to check...`);

    // Process in batches to handle all movies
    let allMovies = [];
    let from = 0;
    const batchSize = 1000;

    while (from < totalCount) {
      const { data: batch, error } = await supabase
        .from('movies')
        .select('id, title, year, slug')
        .not('slug', 'is', null)
        .range(from, from + batchSize - 1);

      if (error) {
        console.error(`❌ Error fetching batch ${from}-${from + batchSize}:`, error);
        break;
      }

      allMovies = allMovies.concat(batch);
      from += batchSize;
      console.log(`📥 Loaded ${allMovies.length}/${totalCount} movies...`);
    }

    console.log(`📊 Checking ${allMovies.length} movies for summary contamination...`);

    let cleanedCount = 0;
    const cleanedMovies = [];

    for (const movie of allMovies) {
      const slug = movie.slug;

      // Detect plot summaries and contamination
      const isContaminated =
        slug.length > 60 || // Too long for tagline
        slug.includes('Plot:') ||
        slug.includes('Overview:') ||
        slug.includes('Synopsis:') ||
        slug.includes('Summary:') ||
        slug.includes('follows') ||
        slug.includes('tells the story') ||
        slug.includes('chronicles') ||
        slug.includes('depicts') ||
        slug.includes('centers on') ||
        slug.includes('starring') ||
        slug.includes('directed by') ||
        slug.includes('features') ||
        slug.includes('when ') ||
        slug.includes('after ') ||
        slug.includes('must ') ||
        slug.includes('finds himself') ||
        slug.includes('finds herself') ||
        slug.includes('discovers') ||
        slug.includes('struggles') ||
        slug.includes('battles') ||
        slug.includes('attempts to') ||
        slug.includes('tries to');

      if (isContaminated) {
        console.log(`🧹 Cleaning: ${movie.title} (${movie.year}) - "${slug}"`);

        // Clear contaminated slug - will be regenerated organically
        const { error: updateError } = await supabase
          .from('movies')
          .update({
            slug: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', movie.id);

        if (updateError) {
          console.error(`❌ Failed to clean ${movie.title}:`, updateError);
        } else {
          cleanedCount++;
          cleanedMovies.push(`${movie.title} (${movie.year})`);
        }
      }
    }

    const result = {
      success: true,
      totalMovies: allMovies.length,
      totalInDatabase: totalCount,
      cleanedCount,
      cleanMovies: allMovies.length - cleanedCount,
      cleanedMovies: cleanedMovies.slice(0, 10), // First 10 for display
      message: `Cleaned ${cleanedCount} contaminated slugs from ${allMovies.length} total movies. They will be regenerated with organic taglines.`,
    };

    console.log(`🔒 Cleanup complete: ${cleanedCount} slugs cleaned`);
    return res.status(200).json(result);
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return res.status(500).json({ error: 'Cleanup failed', details: error.message });
  }
}
