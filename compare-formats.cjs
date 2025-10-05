#!/usr/bin/env node
const { Pool } = require('pg');

async function compareFormats() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('🔍 Comparing raw vs enhanced content formats...\n');

    const result = await client.query(`
      SELECT
        ma.enhanced_sections,
        ma.enhanced_key_elements,
        ma.claude_response
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE m.tmdb_id = $1
    `, [550]);

    if (result.rows.length > 0) {
      const data = result.rows[0];

      // Parse raw content
      const rawContent = JSON.parse(data.claude_response.raw_content);
      console.log('📄 RAW Content Structure:');
      console.log('   Content sections:', rawContent.content?.length);
      console.log('   Featured movies:', rawContent.featuredMovies?.length);
      console.log('   Why watch:', !!rawContent.whyWatch);
      console.log('   More ideas:', rawContent.moreIdeas?.length);

      // Check enhanced content
      console.log('\n✨ ENHANCED Content Structure:');
      console.log('   Enhanced sections:', data.enhanced_sections?.length);
      console.log('   Enhanced key elements keys:', Object.keys(data.enhanced_key_elements || {}));

      // Compare first section
      if (rawContent.content?.[0] && data.enhanced_sections?.[0]) {
        console.log('\n🔍 First Section Comparison:');
        console.log('   Raw section keys:', Object.keys(rawContent.content[0]));
        console.log('   Enhanced section keys:', Object.keys(data.enhanced_sections[0]));
      }
    }

  } finally {
    client.release();
    await pool.end();
  }
}

compareFormats().catch(console.error);