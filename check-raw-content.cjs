#!/usr/bin/env node
const { Pool } = require('pg');

async function checkRawContent() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('🔍 Checking raw_content field in analysis data...\n');

    // Check Fight Club (550) raw content
    const result = await client.query(`
      SELECT ma.claude_response, m.title
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE m.tmdb_id = $1
    `, [550]);

    if (result.rows.length > 0) {
      const analysis = result.rows[0];
      console.log('📊 Fight Club Raw Content:');

      if (analysis.claude_response && analysis.claude_response.raw_content) {
        const rawContent = analysis.claude_response.raw_content;
        console.log('   Raw Content Type:', typeof rawContent);
        console.log('   Raw Content Length:', rawContent.length);
        console.log('   Raw Content Preview:', rawContent.substring(0, 200) + '...');

        // Try to parse as JSON
        try {
          const parsed = JSON.parse(rawContent);
          console.log('\n   ✅ Successfully parsed as JSON');
          console.log('   Parsed Keys:', Object.keys(parsed));
          console.log('   Sections:', parsed.sections ? parsed.sections.length : 'NO');
          console.log('   WhyWatch:', parsed.whyWatch ? 'YES' : 'NO');
          console.log('   MoreIdeas:', parsed.moreIdeas ? parsed.moreIdeas.length : 'NO');
          console.log('   FeaturedMovies:', parsed.featuredMovies ? parsed.featuredMovies.length : 'NO');
          console.log('   ExploreTopics:', parsed.exploreTopics ? parsed.exploreTopics.length : 'NO');

          if (parsed.whyWatch) {
            console.log('   WhyWatch Recommendation:', parsed.whyWatch.recommendation);
            console.log('   WhyWatch Reasons:', parsed.whyWatch.reasons ? parsed.whyWatch.reasons.length : 'NO');
          }

        } catch (parseError) {
          console.log('\n   ❌ Failed to parse as JSON:', parseError.message);
        }
      } else {
        console.log('   ❌ No raw_content field found');
      }
    }

  } finally {
    client.release();
    await pool.end();
  }
}

checkRawContent().catch(console.error);