#!/usr/bin/env node
/**
 * Clean Summary Contamination Script - 🔒 LOCKED PROTECTION 🔒
 * 
 * Removes plot summaries and TMDB overviews from slug fields
 * Ensures only organic movie poster taglines remain
 * 
 * @version LOCKED-2025-07-02
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanSummaryContamination() {
  console.log('🔒 Starting summary contamination cleanup...');
  
  try {
    // Get total count first
    const { count: totalCount, error: countError } = await supabase
      .from('movies')
      .select('*', { count: 'exact', head: true })
      .not('slug', 'is', null);
      
    if (countError) {
      console.error('❌ Error getting total count:', countError);
      return;
    }
    
    console.log(`📊 Total movies with slugs: ${totalCount}`);
    
    // Fetch all movies with pagination
    let allMovies = [];
    let offset = 0;
    const batchSize = 1000;
    
    console.log('🔄 Fetching all movies with pagination...');
    
    while (true) {
      const { data: batch, error } = await supabase
        .from('movies')
        .select('id, title, year, slug')
        .not('slug', 'is', null)
        .range(offset, offset + batchSize - 1);
        
      if (error) {
        console.error('❌ Error fetching batch:', error);
        break;
      }
      
      if (!batch || batch.length === 0) break;
      
      allMovies.push(...batch);
      console.log(`   📥 Fetched ${allMovies.length}/${totalCount} movies...`);
      offset += batchSize;
      
      if (batch.length < batchSize) break; // Last batch
    }
    
    const movies = allMovies;
    console.log(`📊 Checking ${movies.length} movies for summary contamination...`);
    
    let cleanedCount = 0;
    
    for (const movie of movies) {
      const slug = movie.slug;
      
      // Detect plot summaries and contamination
      const isContaminated = (
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
        slug.includes('tries to')
      );
      
      if (isContaminated) {
        console.log(`🧹 Cleaning contaminated slug: ${movie.title} (${movie.year})`);
        console.log(`   Old: "${slug}"`);
        
        // Clear contaminated slug - will be regenerated organically
        const { error: updateError } = await supabase
          .from('movies')
          .update({ 
            slug: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', movie.id);
          
        if (updateError) {
          console.error(`❌ Failed to clean ${movie.title}:`, updateError);
        } else {
          console.log(`   ✅ Cleared - will regenerate organically`);
          cleanedCount++;
        }
      }
    }
    
    console.log(`\n🔒 Summary contamination cleanup complete!`);
    console.log(`   📊 Movies checked: ${movies.length}`);
    console.log(`   🧹 Contaminated slugs cleared: ${cleanedCount}`);
    console.log(`   ✅ Clean movies: ${movies.length - cleanedCount}`);
    console.log(`\n💡 Cleared slugs will be regenerated with organic taglines when MediaCards load.`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run if called directly
if (require.main === module) {
  cleanSummaryContamination();
}

module.exports = { cleanSummaryContamination };