const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function copyPeterPan() {
  try {
    // Check enhanced_analyses (different schema: tmdb_id, sections, key_elements)
    const enhanced = await pool.query(`
      SELECT tmdb_id, sections, key_elements
      FROM enhanced_analyses
      WHERE tmdb_id = 10601
      LIMIT 1
    `);

    if (enhanced.rows.length === 0) {
      console.log('❌ No Peter Pan analysis in enhanced_analyses');
      pool.end();
      return;
    }

    console.log('✅ Found Peter Pan in enhanced_analyses');

    const { sections, key_elements } = enhanced.rows[0];

    // Get movie_id from movies table
    const movieResult = await pool.query('SELECT id FROM movies WHERE tmdb_id = 10601');
    if (movieResult.rows.length === 0) {
      console.log('❌ Peter Pan movie not found in movies table');
      pool.end();
      return;
    }

    const movieId = movieResult.rows[0].id;

    // Build claude_response format that matches movie_analyses expectations
    // sections has {content: [...], metadata, featuredMovies, linkedReferences}
    const analysisContent = {
      ...sections,
      keyElements: key_elements
    };

    const claudeResponse = {
      raw_content: JSON.stringify(analysisContent),
      generated_at: new Date().toISOString(),
      model: 'claude-3-5-sonnet-20241022'
    };

    console.log('Built structure with content array length:', analysisContent.content?.length);

    // Copy to movie_analyses
    const insertQuery = `
      INSERT INTO movie_analyses (
        movie_id,
        claude_response,
        analysis_type,
        query_text,
        created_at,
        updated_at
      ) VALUES ($1, $2, 'movie_analysis', 'Peter Pan (2003)', NOW(), NOW())
      RETURNING id
    `;

    const result = await pool.query(insertQuery, [
      movieId,
      JSON.stringify(claudeResponse)
    ]);

    console.log('✅ Copied Peter Pan to movie_analyses');
    console.log('   New analysis ID:', result.rows[0].id.substring(0, 8) + '...');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

copyPeterPan();