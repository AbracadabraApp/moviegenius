const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugFiltering() {
  console.log('🔍 Debugging transformation filtering...');

  // Get a sample of analyses without nuclear format
  const { data: sample } = await supabase
    .from('movie_analyses')
    .select('id, claude_response, movies!inner(title, year)')
    .eq('analysis_type', 'page_analysis')
    .is('claude_response->sections', null)
    .limit(5);

  console.log('Sample analyses without sections:', sample?.length || 0);

  if (sample && sample.length > 0) {
    sample.forEach((analysis, i) => {
      const response = analysis.claude_response;
      console.log(`Analysis ${i + 1}: ${analysis.movies.title}`);
      console.log('  Has sections?', !!response.sections);
      console.log('  Has exploreFurther?', !!response.exploreFurther);
      console.log('  Has transformation_completed?', !!response.transformation_completed);
      console.log('  Has raw_content?', !!response.raw_content);
      console.log('  Raw content type:', typeof response.raw_content);
    });
  }

  // Check how many have no sections at all
  const { data: noSections, count: noSectionsCount } = await supabase
    .from('movie_analyses')
    .select('*', { count: 'exact', head: true })
    .eq('analysis_type', 'page_analysis')
    .is('claude_response->sections', null);

  console.log('\nAnalyses without sections:', noSectionsCount);

  // Check exactly what the script filtering logic would find
  const { data: allAnalyses } = await supabase
    .from('movie_analyses')
    .select('id, claude_response, movies!inner(title, year, tmdb_id)')
    .eq('analysis_type', 'page_analysis')
    .not('movies.tmdb_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100);

  console.log('\nTotal analyses fetched:', allAnalyses?.length || 0);

  if (allAnalyses) {
    let needsTransformation = 0;
    let alreadyTransformed = 0;
    let noRawContent = 0;

    allAnalyses.forEach(analysis => {
      const response = analysis.claude_response;

      // Same logic as in the script
      if (response.sections || response.exploreFurther || response.moreIdeas) {
        alreadyTransformed++;
      } else if (!response.raw_content || typeof response.raw_content !== 'string') {
        noRawContent++;
      } else {
        needsTransformation++;
      }
    });

    console.log('\nFiltering results (first 100):');
    console.log('  Already transformed:', alreadyTransformed);
    console.log('  No raw content:', noRawContent);
    console.log('  Needs transformation:', needsTransformation);
  }
}

debugFiltering().catch(console.error);
