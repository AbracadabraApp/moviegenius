/**
 * Analyze Collection Title Word Frequency
 *
 * Extracts common words from collection titles to help identify
 * top-level category labels for browse page organization.
 */

const { Pool } = require('pg');

async function analyzeWords() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('COLLECTION TITLE WORD FREQUENCY ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Get all collection titles
    const query = `
      SELECT title
      FROM browse_lists
      WHERE status = 'active'
    `;

    const result = await pool.query(query);

    console.log(`Analyzing ${result.rows.length.toLocaleString()} collection titles...\n`);

    // Extract all words
    const wordCounts = new Map();
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
      'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'will', 'with'
    ]);

    result.rows.forEach(row => {
      const words = row.title.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

      words.forEach(word => {
        wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
      });
    });

    // Sort by frequency
    const sorted = Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100);

    console.log('Top 100 Most Common Words in Collection Titles:\n');
    console.log('Rank | Word              | Count ');
    console.log('-----|-------------------|-------');

    sorted.forEach((entry, i) => {
      const [word, count] = entry;
      const rank = String(i + 1).padStart(3, ' ');
      const wordStr = word.padEnd(17, ' ');
      const countStr = String(count).padStart(5, ' ');
      console.log(`${rank}  | ${wordStr} | ${countStr}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════\n');

    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('Error:', error);
    await pool.end();
    process.exit(1);
  }
}

analyzeWords();
