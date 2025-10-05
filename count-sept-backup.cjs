require('dotenv').config({path:'.env.local'});
const {Pool} = require('pg');
const pool = new Pool({connectionString: process.env.DATABASE_URL});

pool.query('SELECT claude_response FROM movie_analyses_safety_backup_1758938858703')
.then(result => {
  console.log('Analyzing all', result.rows.length, 'movies in September backup...');

  let hasFullAnalysis = 0;
  let hasOnlyMetadata = 0;
  let hasNoData = 0;

  result.rows.forEach(row => {
    const response = row.claude_response;

    if (!response) {
      hasNoData++;
    } else if (typeof response === 'string' && response.length > 100) {
      // String format with substantial content
      hasFullAnalysis++;
    } else if (response.raw_content && response.raw_content.length > 100) {
      // Object with raw_content and substantial content
      hasFullAnalysis++;
    } else if (response.cost || response.input_tokens || response.output_tokens) {
      // Has metadata but no substantial content
      hasOnlyMetadata++;
    } else {
      hasNoData++;
    }
  });

  console.log('\n--- SEPTEMBER BACKUP ANALYSIS ---');
  console.log('Total movies:', result.rows.length);
  console.log('Has full analysis:', hasFullAnalysis, '(' + (hasFullAnalysis/result.rows.length*100).toFixed(1) + '%)');
  console.log('Has only metadata:', hasOnlyMetadata, '(' + (hasOnlyMetadata/result.rows.length*100).toFixed(1) + '%)');
  console.log('Has no data:', hasNoData, '(' + (hasNoData/result.rows.length*100).toFixed(1) + '%)');

  pool.end();
})
.catch(error => {
  console.error('Error:', error.message);
  pool.end();
});