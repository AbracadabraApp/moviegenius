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
    // Find movies with contaminated slugs
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, title, year, slug')
      .not('slug', 'is', null);
      
    if (error) {
      console.error('❌ Error fetching movies:', error);
      return;
    }
    
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