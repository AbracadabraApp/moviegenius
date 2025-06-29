const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeSlugDistribution() {
  console.log('📊 Analyzing Claude slug character distribution...');
  
  // Get all movies with slugs
  const { data: movies } = await supabase
    .from('movies')
    .select('title, year, slug')
    .not('slug', 'is', null)
    .neq('slug', '')
    .limit(2000); // Large sample
    
  if (!movies || movies.length === 0) {
    console.log('No slugs found');
    return;
  }
  
  console.log(`\n📈 SAMPLE SIZE: ${movies.length} movies with slugs`);
  
  // Filter to likely Claude slugs (exclude obvious TMDB contamination)
  const claudeSlugs = movies.filter(movie => {
    const slug = movie.slug || '';
    return !slug.includes('Plot:') && 
           !slug.includes('Overview:') && 
           !slug.includes('Synopsis:') &&
           slug.length > 0;
  });
  
  console.log(`✅ CLAUDE SLUGS: ${claudeSlugs.length} (after filtering TMDB contamination)`);
  
  // Character length distribution
  const lengths = claudeSlugs.map(m => (m.slug || '').length);
  lengths.sort((a, b) => a - b);
  
  // Calculate percentiles
  const percentile = (arr, p) => {
    const index = Math.ceil(arr.length * p / 100) - 1;
    return arr[Math.max(0, index)];
  };
  
  console.log('\n📏 CHARACTER LENGTH DISTRIBUTION:');
  console.log(`   Min: ${Math.min(...lengths)} chars`);
  console.log(`   10th percentile: ${percentile(lengths, 10)} chars`);
  console.log(`   25th percentile: ${percentile(lengths, 25)} chars`);
  console.log(`   Median (50th): ${percentile(lengths, 50)} chars`);
  console.log(`   75th percentile: ${percentile(lengths, 75)} chars`);
  console.log(`   90th percentile: ${percentile(lengths, 90)} chars`);
  console.log(`   95th percentile: ${percentile(lengths, 95)} chars`);
  console.log(`   Max: ${Math.max(...lengths)} chars`);
  
  // Create length buckets
  const buckets = {
    'Very Short (1-20)': 0,
    'Short (21-30)': 0,
    'Medium (31-40)': 0,
    'Good (41-50)': 0,
    'Long (51-60)': 0,
    'Very Long (61-70)': 0,
    'Too Long (71+)': 0
  };
  
  lengths.forEach(len => {
    if (len <= 20) buckets['Very Short (1-20)']++;
    else if (len <= 30) buckets['Short (21-30)']++;
    else if (len <= 40) buckets['Medium (31-40)']++;
    else if (len <= 50) buckets['Good (41-50)']++;
    else if (len <= 60) buckets['Long (51-60)']++;
    else if (len <= 70) buckets['Very Long (61-70)']++;
    else buckets['Too Long (71+)']++;
  });
  
  console.log('\n📊 LENGTH BUCKETS:');
  Object.entries(buckets).forEach(([bucket, count]) => {
    const percentage = (count / claudeSlugs.length * 100).toFixed(1);
    const bar = '█'.repeat(Math.floor(count / claudeSlugs.length * 40));
    console.log(`   ${bucket.padEnd(18)}: ${count.toString().padStart(4)} (${percentage.padStart(5)}%) ${bar}`);
  });
  
  // Show examples from each bucket
  console.log('\n📝 EXAMPLES BY LENGTH:');
  
  const examples = {
    'Very Short': claudeSlugs.filter(m => m.slug.length <= 20).slice(0, 3),
    'Short': claudeSlugs.filter(m => m.slug.length >= 21 && m.slug.length <= 30).slice(0, 3),
    'Medium': claudeSlugs.filter(m => m.slug.length >= 31 && m.slug.length <= 40).slice(0, 3),
    'Good': claudeSlugs.filter(m => m.slug.length >= 41 && m.slug.length <= 50).slice(0, 3),
    'Long': claudeSlugs.filter(m => m.slug.length >= 51 && m.slug.length <= 60).slice(0, 3),
    'Too Long': claudeSlugs.filter(m => m.slug.length >= 71).slice(0, 3)
  };
  
  Object.entries(examples).forEach(([category, movies]) => {
    if (movies.length > 0) {
      console.log(`\n${category.toUpperCase()} EXAMPLES:`);
      movies.forEach(movie => {
        console.log(`   ${movie.title} (${movie.year}) - ${movie.slug.length} chars`);
        console.log(`   "${movie.slug}"`);
      });
    }
  });
  
  // Quality assessment
  const goodSlugs = lengths.filter(len => len <= 50).length;
  const problemSlugs = lengths.filter(len => len > 50).length;
  
  console.log('\n🎯 QUALITY ASSESSMENT:');
  console.log(`   ✅ Good slugs (≤50 chars): ${goodSlugs}/${claudeSlugs.length} (${(goodSlugs/claudeSlugs.length*100).toFixed(1)}%)`);
  console.log(`   🔴 Problem slugs (>50 chars): ${problemSlugs}/${claudeSlugs.length} (${(problemSlugs/claudeSlugs.length*100).toFixed(1)}%)`);
}

analyzeSlugDistribution().catch(console.error);