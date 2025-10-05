const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Sample 1000 movies from the September backup
pool.query('SELECT m.title, m.year, ma.claude_response FROM movies m JOIN movie_analyses_safety_backup_1758938858703 ma ON m.id = ma.movie_id ORDER BY RANDOM() LIMIT 1000')
.then(result => {
  console.log('Sampling 1000 movies from September backup...');
  console.log('Total found:', result.rows.length);

  let hasFullAnalysis = 0;
  let hasOnlyMetadata = 0;
  let hasNoData = 0;
  let totalContentLength = 0;
  let fullAnalysisLengths = [];

  result.rows.forEach(row => {
    const response = row.claude_response;

    if (!response) {
      hasNoData++;
    } else if (typeof response === 'string') {
      // String format - full analysis
      hasFullAnalysis++;
      totalContentLength += response.length;
      fullAnalysisLengths.push(response.length);
    } else if (response.raw_content) {
      // Object with raw_content - full analysis
      hasFullAnalysis++;
      totalContentLength += response.raw_content.length;
      fullAnalysisLengths.push(response.raw_content.length);
    } else if (response.cost || response.input_tokens || response.output_tokens) {
      // Only metadata
      hasOnlyMetadata++;
    } else {
      hasNoData++;
    }
  });

  console.log('\n--- SEPTEMBER BACKUP CONTENT ANALYSIS ---');
  console.log('Movies with full analysis:', hasFullAnalysis, '(' + (hasFullAnalysis/result.rows.length*100).toFixed(1) + '%)');
  console.log('Movies with only metadata:', hasOnlyMetadata, '(' + (hasOnlyMetadata/result.rows.length*100).toFixed(1) + '%)');
  console.log('Movies with no data:', hasNoData, '(' + (hasNoData/result.rows.length*100).toFixed(1) + '%)');

  if (hasFullAnalysis > 0) {
    const avgLength = totalContentLength / hasFullAnalysis;
    const maxLength = Math.max(...fullAnalysisLengths);
    const minLength = Math.min(...fullAnalysisLengths);

    console.log('\nFull analysis content stats:');
    console.log('Average length:', Math.round(avgLength), 'characters');
    console.log('Max length:', maxLength, 'characters');
    console.log('Min length:', minLength, 'characters');
  }

  pool.end();
})
.catch(error => {
  console.error('Error:', error.message);
  pool.end();
});