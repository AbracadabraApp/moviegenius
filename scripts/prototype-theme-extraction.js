#!/usr/bin/env node

/**
 * Prototype: Data-Driven Browse Collections
 *
 * Demonstrates sustainable browse collection generation:
 * 1. Extract themes from movie_analyses
 * 2. Cluster movies by shared themes
 * 3. Generate editorial titles
 * 4. Create collections (≥6 movies)
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { getRailwayClient } from '../lib/railway-db.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

class ThemeExtractionPrototype {
  constructor() {
    this.client = getRailwayClient();
    this.movieThemes = new Map(); // movieId -> [themes]
    this.themeMovies = new Map(); // theme -> [movieIds]
    this.movieData = new Map();   // movieId -> { title, year, reasons }
  }

  async connect() {
    await this.client.connect();
  }

  async disconnect() {
    await this.client.end();
  }

  /**
   * Step 1: Extract themes from sample movie analyses
   */
  async extractThemesFromSample(sampleSize = 50) {
    console.log('🎬 STEP 1: Extracting Themes from Sample Analyses\n');
    console.log(`Fetching ${sampleSize} movie analyses with rich content...\n`);

    const result = await this.client.query(`
      SELECT
        m.id, m.title, m.year,
        ma.claude_response->>'raw_content' as analysis_text,
        ew.reasons
      FROM movie_analyses ma
      JOIN movies m ON ma.movie_id = m.id
      LEFT JOIN enhanced_why_watch ew ON ew.movie_id = m.id
      WHERE ma.claude_response->>'raw_content' IS NOT NULL
        AND LENGTH(ma.claude_response->>'raw_content') > 1000
        AND m.year >= 1970
      ORDER BY RANDOM()
      LIMIT $1
    `, [sampleSize]);

    console.log(`✅ Fetched ${result.rows.length} analyses\n`);

    // Extract themes using Claude
    let processed = 0;
    const batchSize = 5;

    for (let i = 0; i < result.rows.length; i += batchSize) {
      const batch = result.rows.slice(i, Math.min(i + batchSize, result.rows.length));

      await Promise.all(batch.map(async (movie) => {
        const themes = await this.extractThemesFromAnalysis(movie);

        if (themes.length > 0) {
          this.movieThemes.set(movie.id, themes);

          // Store movie data for later
          this.movieData.set(movie.id, {
            id: movie.id,
            title: movie.title,
            year: movie.year,
            reasons: movie.reasons
          });

          // Index by theme
          themes.forEach(theme => {
            if (!this.themeMovies.has(theme)) {
              this.themeMovies.set(theme, []);
            }
            this.themeMovies.get(theme).push(movie.id);
          });

          processed++;
          process.stdout.write(`  Processed: ${processed}/${result.rows.length} movies...\r`);
        }
      }));

      // Rate limiting
      await this.sleep(1000);
    }

    console.log(`\n✅ Extracted themes from ${processed} movies\n`);
  }

  /**
   * Extract themes from a single movie analysis
   */
  async extractThemesFromAnalysis(movie) {
    const prompt = `Extract 2-4 specific thematic elements from this film analysis.

Movie: ${movie.title} (${movie.year})

Analysis excerpt:
${movie.analysis_text.substring(0, 1500)}

Extract SPECIFIC themes/motifs/elements. Examples of good extractions:
- "father-son relationships"
- "political corruption"
- "time travel paradoxes"
- "corporate whistleblowing"
- "identity crisis"
- "war trauma"

Avoid generic categories like "drama" or "action". Focus on narrative/thematic elements.

Return JSON array only:
["theme1", "theme2", "theme3"]`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }]
      });

      const text = response.content[0].text;
      const jsonMatch = text.match(/\[.*\]/s);

      if (jsonMatch) {
        const themes = JSON.parse(jsonMatch[0]);
        return themes.map(t => t.toLowerCase().trim());
      }
    } catch (error) {
      console.error(`  Error extracting themes for ${movie.title}:`, error.message);
    }

    return [];
  }

  /**
   * Step 2: Cluster movies by shared themes
   */
  clusterByThemes() {
    console.log('\n🎯 STEP 2: Clustering Movies by Shared Themes\n');

    // Filter to themes with ≥6 movies
    const validClusters = [];

    for (const [theme, movieIds] of this.themeMovies.entries()) {
      if (movieIds.length >= 6) {
        validClusters.push({
          theme,
          movieIds: [...new Set(movieIds)], // Deduplicate
          movieCount: new Set(movieIds).size
        });
      }
    }

    // Sort by movie count
    validClusters.sort((a, b) => b.movieCount - a.movieCount);

    console.log(`✅ Found ${validClusters.length} clusters with ≥6 movies\n`);
    console.log('Top 10 clusters:\n');
    validClusters.slice(0, 10).forEach((cluster, i) => {
      console.log(`  ${i+1}. "${cluster.theme}" - ${cluster.movieCount} movies`);
    });

    console.log('');
    return validClusters;
  }

  /**
   * Step 3: Generate editorial titles for clusters
   */
  async generateEditorialTitles(clusters) {
    console.log('\n✏️  STEP 3: Generating Editorial Titles\n');

    const clustersWithTitles = [];

    for (let i = 0; i < Math.min(clusters.length, 15); i++) {
      const cluster = clusters[i];

      // Get sample movie titles for context
      const sampleMovies = cluster.movieIds.slice(0, 5).map(id => {
        const movie = this.movieData.get(id);
        return movie ? `${movie.title} (${movie.year})` : '';
      }).filter(Boolean);

      const editorialTitle = await this.generateEditorialTitle(cluster.theme, sampleMovies);

      clustersWithTitles.push({
        ...cluster,
        editorialTitle
      });

      process.stdout.write(`  Generated: ${i+1}/${Math.min(clusters.length, 15)} titles...\r`);
      await this.sleep(800);
    }

    console.log(`\n✅ Generated ${clustersWithTitles.length} editorial titles\n`);
    return clustersWithTitles;
  }

  /**
   * Generate editorial title for a theme
   */
  async generateEditorialTitle(theme, sampleMovies) {
    const prompt = `Create a polished, editorial collection title for this movie theme.

Theme: "${theme}"
Sample movies: ${sampleMovies.join(', ')}

Guidelines:
- 2-5 words
- Natural, editorial voice
- NO words like: "films", "movies", "stories", "narratives", "cinema"
- Smart use of plurals and articles
- Active voice preferred
- Genre context ONLY when it adds clarity (e.g., "Political Thrillers" not "Political Films")

Examples:
- "father-son relationships" → "Fathers and Sons"
- "political corruption journalism" → "Exposing Corruption"
- "time travel paradoxes" → "Caught in Time"
- "war trauma veterans" → "War's Aftermath"

Return ONLY the title, no explanation.`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 50,
        messages: [{ role: 'user', content: prompt }]
      });

      return response.content[0].text.trim().replace(/["""]/g, '');
    } catch (error) {
      console.error(`  Error generating title:`, error.message);
      // Fallback: capitalize theme
      return theme.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }

  /**
   * Step 4: Create final collections
   */
  async createCollections(clustersWithTitles) {
    console.log('\n📚 STEP 4: Creating Final Collections\n');

    const collections = [];

    for (const cluster of clustersWithTitles.slice(0, 10)) {
      const movies = cluster.movieIds.map(id => this.movieData.get(id)).filter(Boolean);

      // Generate description from movie reasons
      const description = await this.generateDescription(cluster.editorialTitle, movies);

      collections.push({
        title: cluster.editorialTitle,
        description,
        movieCount: movies.length,
        movies: movies.slice(0, 10), // Sample 10 for display
        originalTheme: cluster.theme
      });
    }

    return collections;
  }

  /**
   * Generate collection description
   */
  async generateDescription(title, movies) {
    const sampleReasons = movies.slice(0, 3).map(m => {
      if (m.reasons && Array.isArray(m.reasons)) {
        return m.reasons.slice(0, 2).map(r =>
          typeof r === 'string' ? r : (r.text || r.reason || '')
        ).join('; ');
      }
      return '';
    }).filter(Boolean).join(' | ');

    const prompt = `Write a 1-sentence collection description.

Collection: "${title}"
Sample movie reasons: ${sampleReasons || 'Films exploring this theme'}

Write ONE engaging sentence (15-25 words) describing what this collection offers.
Natural voice. No marketing fluff.

Return ONLY the description, no quotes.`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }]
      });

      return response.content[0].text.trim();
    } catch (error) {
      return `Curated collection of films exploring ${title.toLowerCase()}.`;
    }
  }

  /**
   * Display results
   */
  displayResults(collections) {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🎉 PROTOTYPE RESULTS: Data-Driven Browse Collections');
    console.log('═══════════════════════════════════════════════════════════\n');

    collections.forEach((collection, i) => {
      console.log(`${i+1}. "${collection.title}" (${collection.movieCount} movies)`);
      console.log(`   ${collection.description}`);
      console.log(`   Original theme: "${collection.originalTheme}"`);
      console.log(`   Sample films:`);
      collection.movies.slice(0, 5).forEach(m => {
        console.log(`     • ${m.title} (${m.year})`);
      });
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Prototype Complete');
    console.log('═══════════════════════════════════════════════════════════\n');
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Run the full prototype
   */
  async run() {
    try {
      await this.connect();

      // Step 1: Extract themes from sample
      await this.extractThemesFromSample(50);

      // Step 2: Cluster by themes
      const clusters = this.clusterByThemes();

      // Step 3: Generate editorial titles
      const clustersWithTitles = await this.generateEditorialTitles(clusters);

      // Step 4: Create collections
      const collections = await this.createCollections(clustersWithTitles);

      // Display results
      this.displayResults(collections);

      await this.disconnect();

    } catch (error) {
      console.error('\n❌ Prototype failed:', error);
      await this.disconnect();
      process.exit(1);
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const prototype = new ThemeExtractionPrototype();
  prototype.run();
}

export { ThemeExtractionPrototype };
