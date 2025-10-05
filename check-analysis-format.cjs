#!/usr/bin/env node
const { Pool } = require('pg');

async function checkAnalysisFormat() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log('🔍 Checking analysis data format for popular movies...\n');

    // Check Fight Club (550)
    const fightClubResult = await client.query(`
      SELECT ma.claude_response, ma.created_at, m.title
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE m.tmdb_id = $1
    `, [550]);

    if (fightClubResult.rows.length > 0) {
      const analysis = fightClubResult.rows[0];
      console.log('📊 Fight Club Analysis:');
      console.log('   Title:', analysis.title);
      console.log('   Data Type:', typeof analysis.claude_response);
      console.log('   Is Object:', typeof analysis.claude_response === 'object');
      console.log('   Is String:', typeof analysis.claude_response === 'string');

      if (typeof analysis.claude_response === 'object' && analysis.claude_response) {
        console.log('   Object Keys:', Object.keys(analysis.claude_response));
        console.log('   Sections:', analysis.claude_response.sections ? analysis.claude_response.sections.length : 'NO');
        console.log('   WhyWatch:', analysis.claude_response.whyWatch ? 'YES' : 'NO');
        console.log('   MoreIdeas:', analysis.claude_response.moreIdeas ? analysis.claude_response.moreIdeas.length : 'NO');
      }
    }

    // Check Purple Sunset (151804)
    const purpleResult = await client.query(`
      SELECT ma.claude_response, ma.created_at, m.title
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      WHERE m.tmdb_id = $1
    `, [151804]);

    if (purpleResult.rows.length > 0) {
      const analysis = purpleResult.rows[0];
      console.log('\n📊 Purple Sunset Analysis:');
      console.log('   Title:', analysis.title);
      console.log('   Data Type:', typeof analysis.claude_response);
      console.log('   Is Object:', typeof analysis.claude_response === 'object');
      console.log('   Is String:', typeof analysis.claude_response === 'string');

      if (typeof analysis.claude_response === 'object' && analysis.claude_response) {
        console.log('   Object Keys:', Object.keys(analysis.claude_response));
        console.log('   Sections:', analysis.claude_response.sections ? analysis.claude_response.sections.length : 'NO');
        console.log('   WhyWatch:', analysis.claude_response.whyWatch ? 'YES' : 'NO');
        console.log('   MoreIdeas:', analysis.claude_response.moreIdeas ? analysis.claude_response.moreIdeas.length : 'NO');
      }
    }

  } finally {
    client.release();
    await pool.end();
  }
}

checkAnalysisFormat().catch(console.error);