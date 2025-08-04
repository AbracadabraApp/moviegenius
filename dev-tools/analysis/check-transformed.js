const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTransformedAnalysis() {
  console.log('🔍 Checking transformed analysis format...');

  const { data: analysis } = await supabase
    .from('movie_analyses')
    .select('claude_response, movies!inner(title, year)')
    .eq('analysis_type', 'page_analysis')
    .eq('movies.title', '20,000 Days on Earth')
    .limit(1);

  if (analysis && analysis[0]) {
    const response = analysis[0].claude_response;
    console.log('Movie:', analysis[0].movies.title);
    console.log('Has sections?', !!response.sections);
    console.log('Has exploreFurther?', !!response.exploreFurther);
    console.log('Has moreIdeas?', !!response.moreIdeas);
    console.log('Has transformation_completed?', !!response.transformation_completed);

    if (response.sections) {
      console.log('Sections count:', response.sections.length);
      console.log('First section type:', response.sections[0]?.type);
      console.log(
        'First section content preview:',
        response.sections[0]?.content?.substring(0, 100) + '...'
      );
    }

    if (response.exploreFurther) {
      console.log('Explore Further topics:', response.exploreFurther);
    }
  }
}

checkTransformedAnalysis().catch(console.error);
