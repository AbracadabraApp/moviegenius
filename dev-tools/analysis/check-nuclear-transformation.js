#!/usr/bin/env node
/**
 * Check Nuclear Transformation Results
 *
 * Verifies that the nuclear format transformation was successful
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://tjvaplqqibvlmazdvcwx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqdmFwbHFxaWJ2bG1hemR2Y3d4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDk4NTEyNiwiZXhwIjoyMDUwNTYxMTI2fQ.mzpHGqQKM5z8BdC3fFEMlnqhHoKVpIu9u4x8AItPZYY'
);

async function checkTransformation() {
  console.log('🔍 Checking nuclear transformation results...\n');

  // Get sample of transformed analyses
  const { data: analyses, error } = await supabase
    .from('movie_analyses')
    .select(
      `
      id, movie_id, claude_response,
      movies!inner(title, year)
    `
    )
    .eq('analysis_type', 'page_analysis')
    .limit(10);

  if (error) {
    console.error('❌ Error fetching analyses:', error);
    return;
  }

  let transformedCount = 0;
  let totalCount = 0;

  console.log('📊 SAMPLE TRANSFORMATION RESULTS:\n');

  analyses.forEach((analysis, index) => {
    totalCount++;
    const response = analysis.claude_response;
    const movie = analysis.movies;

    const hasNuclearFormat = !!(
      response.sections &&
      response.exploreFurther &&
      response.transformation_completed
    );

    if (hasNuclearFormat) transformedCount++;

    console.log(`${index + 1}. ${movie.title} (${movie.year})`);
    console.log(`   ✅ Sections: ${response.sections ? response.sections.length : 0}`);
    console.log(
      `   ✅ Explore Further: ${response.exploreFurther ? response.exploreFurther.length : 0}`
    );
    console.log(`   ✅ More Ideas: ${response.moreIdeas ? 'Yes' : 'No'}`);
    console.log(`   ✅ Transformed: ${response.transformation_completed ? 'Yes' : 'No'}`);
    console.log(`   📊 Nuclear Ready: ${hasNuclearFormat ? '✅ Yes' : '❌ No'}\n`);
  });

  console.log(`📈 TRANSFORMATION SUMMARY:`);
  console.log(`   🔄 Sample checked: ${totalCount}`);
  console.log(`   ✅ Nuclear format: ${transformedCount}`);
  console.log(`   📊 Success rate: ${((transformedCount / totalCount) * 100).toFixed(1)}%`);

  // Check total nuclear-ready analyses
  const { data: allAnalyses } = await supabase
    .from('movie_analyses')
    .select('claude_response')
    .eq('analysis_type', 'page_analysis');

  if (allAnalyses) {
    const totalNuclearReady = allAnalyses.filter(
      a =>
        a.claude_response.sections &&
        a.claude_response.exploreFurther &&
        a.claude_response.transformation_completed
    ).length;

    console.log(`\n🚀 TOTAL NUCLEAR STATUS:`);
    console.log(`   📊 Total analyses: ${allAnalyses.length}`);
    console.log(`   ✅ Nuclear ready: ${totalNuclearReady}`);
    console.log(`   ⏳ Need processing: ${allAnalyses.length - totalNuclearReady}`);
  }
}

checkTransformation().catch(console.error);
