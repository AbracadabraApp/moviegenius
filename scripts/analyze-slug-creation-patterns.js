#!/usr/bin/env node

/**
 * Slug Creation Pattern Analysis Script
 * 
 * This script analyzes when slug generation broke by examining:
 * 1. Movie creation dates vs slug presence
 * 2. Patterns in slug_complete field
 * 3. Timeline of when movies started missing slugs
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Analyze slug patterns by creation date
 */
async function analyzeSlugPatterns() {
  console.log('🔍 Analyzing slug creation patterns...\n');
  
  try {
    // Get all movies with creation dates and slug information
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, title, year, slug, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching movies:', error);
      return;
    }

    console.log(`📊 Total movies in database: ${movies.length}\n`);

    // Group movies by creation date (by month)
    const monthlyStats = {};
    let totalWithSlugs = 0;
    let totalWithoutSlugs = 0;

    movies.forEach(movie => {
      const createdAt = new Date(movie.created_at);
      const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = {
          total: 0,
          withSlugs: 0,
          withoutSlugs: 0,
          movies: []
        };
      }
      
      monthlyStats[monthKey].total++;
      monthlyStats[monthKey].movies.push({
        title: movie.title,
        year: movie.year,
        hasSlug: !!movie.slug,
        createdAt: movie.created_at
      });

      if (movie.slug) {
        monthlyStats[monthKey].withSlugs++;
        totalWithSlugs++;
      } else {
        monthlyStats[monthKey].withoutSlugs++;
        totalWithoutSlugs++;
      }
    });

    // Overall statistics
    console.log('📈 OVERALL STATISTICS:');
    console.log(`   Movies with slugs: ${totalWithSlugs} (${((totalWithSlugs / movies.length) * 100).toFixed(1)}%)`);
    console.log(`   Movies without slugs: ${totalWithoutSlugs} (${((totalWithoutSlugs / movies.length) * 100).toFixed(1)}%)\n`);

    // Monthly breakdown
    console.log('📅 MONTHLY BREAKDOWN:');
    console.log('Month       | Total | With Slugs | Without Slugs | % With Slugs');
    console.log('------------|-------|------------|---------------|-------------');
    
    Object.keys(monthlyStats).sort().forEach(month => {
      const stats = monthlyStats[month];
      const slugPercentage = ((stats.withSlugs / stats.total) * 100).toFixed(1);
      
      console.log(
        `${month.padEnd(11)} | ${String(stats.total).padStart(5)} | ${String(stats.withSlugs).padStart(10)} | ${String(stats.withoutSlugs).padStart(13)} | ${slugPercentage.padStart(11)}%`
      );
    });

    // Find the transition point
    console.log('\n🎯 TRANSITION ANALYSIS:');
    let transitionFound = false;
    const sortedMonths = Object.keys(monthlyStats).sort();
    
    for (let i = 1; i < sortedMonths.length; i++) {
      const prevMonth = sortedMonths[i - 1];
      const currentMonth = sortedMonths[i];
      const prevStats = monthlyStats[prevMonth];
      const currentStats = monthlyStats[currentMonth];
      
      const prevSlugRate = (prevStats.withSlugs / prevStats.total) * 100;
      const currentSlugRate = (currentStats.withSlugs / currentStats.total) * 100;
      
      // Look for significant drops in slug generation
      if (prevSlugRate > 80 && currentSlugRate < 50) {
        console.log(`⚠️  SIGNIFICANT DROP DETECTED:`);
        console.log(`   ${prevMonth}: ${prevSlugRate.toFixed(1)}% of movies had slugs`);
        console.log(`   ${currentMonth}: ${currentSlugRate.toFixed(1)}% of movies had slugs`);
        console.log(`   Drop of ${(prevSlugRate - currentSlugRate).toFixed(1)} percentage points\n`);
        transitionFound = true;
      }
    }

    if (!transitionFound) {
      console.log('   No clear transition point found in monthly data.\n');
    }

    // Show recent movies without slugs for debugging
    console.log('🚨 RECENT MOVIES WITHOUT SLUGS (last 20):');
    const recentMoviesWithoutSlugs = movies
      .filter(movie => !movie.slug)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 20);

    if (recentMoviesWithoutSlugs.length > 0) {
      recentMoviesWithoutSlugs.forEach(movie => {
        const createdAt = new Date(movie.created_at).toLocaleDateString();
        console.log(`   ${movie.title} (${movie.year || 'Unknown'}) - Created: ${createdAt}`);
      });
    } else {
      console.log('   No recent movies found without slugs.');
    }

    // Show recent movies with slugs for comparison
    console.log('\n✅ RECENT MOVIES WITH SLUGS (last 10):');
    const recentMoviesWithSlugs = movies
      .filter(movie => movie.slug)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    if (recentMoviesWithSlugs.length > 0) {
      recentMoviesWithSlugs.forEach(movie => {
        const createdAt = new Date(movie.created_at).toLocaleDateString();
        console.log(`   ${movie.title} (${movie.year || 'Unknown'}) - Created: ${createdAt}`);
        console.log(`     Slug: "${movie.slug}"`);
      });
    } else {
      console.log('   No recent movies found with slugs.');
    }

  } catch (error) {
    console.error('Error analyzing slug patterns:', error);
  }
}

/**
 * Analyze specific date ranges for deeper investigation
 */
async function analyzeDateRange(startDate, endDate) {
  console.log(`\n🔬 DETAILED ANALYSIS: ${startDate} to ${endDate}`);
  
  try {
    const { data: movies, error } = await supabase
      .from('movies')
      .select('id, title, year, slug, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching date range:', error);
      return;
    }

    console.log(`Movies created between ${startDate} and ${endDate}: ${movies.length}`);
    
    movies.forEach(movie => {
      const createdAt = new Date(movie.created_at).toLocaleDateString();
      const hasSlug = movie.slug ? '✅' : '❌';
      
      console.log(`${hasSlug} ${movie.title} (${movie.year || 'Unknown'}) - ${createdAt}`);
      if (movie.slug) {
        console.log(`     Slug: "${movie.slug}"`);
      }
    });

  } catch (error) {
    console.error('Error analyzing date range:', error);
  }
}

// Main execution
async function main() {
  await analyzeSlugPatterns();
  
  // You can uncomment these lines to analyze specific date ranges
  // await analyzeDateRange('2024-01-01', '2024-02-01');
  // await analyzeDateRange('2024-11-01', '2024-12-31');
}

main().catch(console.error);