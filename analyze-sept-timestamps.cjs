require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Get timestamp data from the September backup analyses
const query = `
  SELECT
    ma.created_at,
    ma.updated_at,
    m.title,
    m.year,
    CASE
      WHEN ma.claude_response IS NULL THEN 'no_data'
      WHEN jsonb_typeof(ma.claude_response) = 'string' THEN 'full_analysis'
      WHEN ma.claude_response->>'raw_content' IS NOT NULL THEN 'full_analysis'
      WHEN ma.claude_response->>'cost' IS NOT NULL OR ma.claude_response->>'input_tokens' IS NOT NULL THEN 'metadata_only'
      ELSE 'unknown'
    END as content_type,
    CASE
      WHEN jsonb_typeof(ma.claude_response) = 'string' THEN length(ma.claude_response::text)
      WHEN ma.claude_response->>'raw_content' IS NOT NULL THEN length(ma.claude_response->>'raw_content')
      ELSE 0
    END as content_length
  FROM movie_analyses_safety_backup_1758938858703 ma
  JOIN movies m ON m.id = ma.movie_id
  WHERE ma.claude_response IS NOT NULL
  ORDER BY ma.created_at;
`;

pool.query(query)
.then(result => {
  console.log('September backup timestamp analysis...');
  console.log('Total records with data:', result.rows.length);

  const fullAnalyses = result.rows.filter(r => r.content_type === 'full_analysis');
  const metadataOnly = result.rows.filter(r => r.content_type === 'metadata_only');

  console.log('\n--- CONTENT BREAKDOWN ---');
  console.log('Full analyses:', fullAnalyses.length);
  console.log('Metadata only:', metadataOnly.length);

  if (fullAnalyses.length > 0) {
    const dates = fullAnalyses.map(r => new Date(r.created_at));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    console.log('\n--- FULL ANALYSIS TIMESTAMPS ---');
    console.log('Earliest:', minDate.toISOString());
    console.log('Latest:', maxDate.toISOString());
    console.log('Date range:', minDate.toDateString(), 'to', maxDate.toDateString());

    // Group by hour
    const hourCounts = {};
    fullAnalyses.forEach(r => {
      const hour = new Date(r.created_at).toISOString().slice(0, 13) + ':00:00';
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    console.log('\n--- HOURLY DISTRIBUTION OF FULL ANALYSES ---');
    Object.entries(hourCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([hour, count]) => {
        console.log(`${hour}: ${count} analyses`);
      });
  }

  if (metadataOnly.length > 0) {
    const dates = metadataOnly.map(r => new Date(r.created_at));
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    console.log('\n--- METADATA-ONLY TIMESTAMPS ---');
    console.log('Earliest:', minDate.toISOString());
    console.log('Latest:', maxDate.toISOString());
  }

  pool.end();
})
.catch(error => {
  console.error('Error:', error.message);
  pool.end();
});