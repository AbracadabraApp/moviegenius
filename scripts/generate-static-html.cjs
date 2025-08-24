/**
 * Static HTML Generator for MovieGenius Test Environment
 * 
 * Generates pre-built HTML fragments for movie pages, moving away from 
 * runtime React composition toward static HTML generation.
 * 
 * Architecture:
 * 1. Read analysis JSON files with resolved links
 * 2. Generate complete HTML sections (header, analysis, featured films, etc)
 * 3. Output static HTML files that can be served with minimal JavaScript
 * 4. Pre-resolve all database relationships at build time
 */

const fs = require('fs');
const path = require('path');

class StaticHTMLGenerator {
  constructor() {
    this.outputDir = path.join(__dirname, '..', 'public', 'static-html');
    this.dataDir = path.join(__dirname, '..', 'public', 'data', 'test-movies');
    this.indexesDir = path.join(__dirname, '..', 'data', 'build-indexes');
    
    // Load database indexes for lookups
    this.movieIndexes = null;
    this.personIndexes = null;
    this.contributorIndexes = null;
    
    this.loadIndexes();
    this.ensureOutputDirectory();
  }

  loadIndexes() {
    try {
      const moviesPath = path.join(this.indexesDir, 'movies.json');
      const personsPath = path.join(this.indexesDir, 'persons.json');
      const contributorsPath = path.join(this.indexesDir, 'movie-contributors.json');

      if (fs.existsSync(moviesPath)) {
        this.movieIndexes = JSON.parse(fs.readFileSync(moviesPath, 'utf-8'));
        console.log(`✅ Loaded ${Object.keys(this.movieIndexes).length} movie indexes`);
      }
      
      if (fs.existsSync(personsPath)) {
        this.personIndexes = JSON.parse(fs.readFileSync(personsPath, 'utf-8'));
        console.log(`✅ Loaded ${Object.keys(this.personIndexes).length} person indexes`);
      }
      
      if (fs.existsSync(contributorsPath)) {
        this.contributorIndexes = JSON.parse(fs.readFileSync(contributorsPath, 'utf-8'));
        console.log(`✅ Loaded ${Object.keys(this.contributorIndexes).length} contributor indexes`);
      }
    } catch (error) {
      console.error('⚠️ Failed to load database indexes:', error.message);
    }
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${this.outputDir}`);
    }
  }

  /**
   * Generate TestMovieHeaderLarge - EXACT COPY from components/test/TestMovieHeaderLarge.js
   */
  generateTestMovieHeader(movieData) {
    return `
      <style>
        /* EXACT COPY of TestMovieHeaderLarge styles */
        .movie-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0px;
          width: 100%;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          position: relative;
          padding-bottom: 20px;
        }
        
        .action-bar-container {
          position: absolute;
          right: 16px;
          top: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 13px 4.5px;
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4), 0 4px 16px rgba(0, 0, 0, 0.2), 0 1px 4px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.6);
          z-index: 1000;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          transform-origin: center;
        }
        
        .action-bar-container:hover {
          transform: scale(1.1);
        }
        
        .action-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          transform: scale(1);
          flex-direction: column;
          gap: 6px;
        }
        
        .icon-with-text {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-direction: column;
        }
        
        .icon {
          font-size: 16px;
          color: #6b7280;
          font-weight: 500;
        }
        
        .icon-label {
          font-size: 11px;
          line-height: 1;
          user-select: none;
          text-align: center;
          color: #6b7280;
          font-weight: 500;
        }
        
        .action-btn.active .icon,
        .action-btn.active .icon-label {
          color: #000000;
          font-weight: 700;
        }
        
        .poster-container {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
          padding-top: 0px;
        }
        
        .large-poster {
          max-width: 267px;
          width: auto;
          height: 400px;
          object-fit: contain;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .movie-info {
          text-align: center;
          width: 100%;
          padding-left: 20px;
          padding-right: 20px;
        }
        
        .title {
          font-size: 24px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px 0;
          line-height: 1.2;
        }
        
        .metadata {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 12px;
          line-height: 1.4;
        }
        
        .year {
          font-weight: 500;
        }
        
        .director, .genre {
          font-weight: 400;
        }
        
        .overview {
          font-size: 16px;
          color: #374151;
          line-height: 1.5;
          margin: 0;
          text-align: left;
        }
        
        .streaming-info {
          width: 100%;
          text-align: left;
          margin-top: 16px;
          padding-left: 20px;
        }
        
        .streaming-text {
          font-size: 14px;
          color: #6b7280;
          font-weight: 300;
          font-family: inherit;
          word-wrap: break-word;
          line-height: 1.3;
        }
      </style>
      
      <div class="movie-header">
        <!-- Action Bar -->
        <div class="action-bar-container">
          <button class="action-btn" data-action="bookmark" aria-label="Add to list">
            <div class="icon-with-text">
              <span class="icon">+</span>
              <span class="icon-label">Add</span>
            </div>
          </button>
          
          <button class="action-btn" data-action="heart" aria-label="Mark as seen">
            <div class="icon-with-text">
              <span class="icon">✓</span>
              <span class="icon-label">Seen</span>
            </div>
          </button>
          
          <button class="action-btn" data-action="play" aria-label="Play trailer">
            <div class="icon-with-text">
              <span class="icon">▶</span>
              <span class="icon-label">Play</span>
            </div>
          </button>
        </div>
        
        <!-- Large poster at top, centered -->
        <div class="poster-container">
          <img 
            src="${movieData.poster_url || '/images/placeholder-poster.jpg'}" 
            alt="Poster for ${movieData.title}"
            class="large-poster"
          />
        </div>
        
        <!-- Movie Info -->
        <div class="movie-info">
          <h1 class="title">${movieData.title}</h1>
          <div class="metadata">
            <span class="year">${movieData.year}</span>
            ${movieData.director ? ` • <span class="director">${movieData.director}</span>` : ''}
            ${movieData.genre ? ` • <span class="genre">${movieData.genre}</span>` : ''}
          </div>
          ${movieData.overview ? `<p class="overview">${movieData.overview}</p>` : ''}
        </div>
        
        <!-- Streaming availability -->
        ${movieData.streaming && movieData.streaming.length > 0 && movieData.streaming !== 'TBD' ? `
          <div class="streaming-info">
            <span class="streaming-text">
              Streaming on ${movieData.streaming}
            </span>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Generate movie header HTML with streaming and metadata
   */
  generateMovieHeader(movieData) {
    return `
      <div class="movie-header">
        <div class="action-bar">
          <button class="action-btn" data-action="bookmark" aria-label="Add to list">
            <span class="icon">+</span>
            <span class="label">Add</span>
          </button>
          <button class="action-btn" data-action="heart" aria-label="Mark as seen">
            <span class="icon">✓</span>
            <span class="label">Seen</span>
          </button>
          <button class="action-btn" data-action="play" aria-label="Play trailer">
            <span class="icon">▶</span>
            <span class="label">Play</span>
          </button>
        </div>
        
        <div class="poster-container">
          <img 
            src="${movieData.poster_url || '/images/placeholder-poster.jpg'}" 
            alt="Poster for ${movieData.title}"
            class="large-poster"
          />
        </div>
        
        <div class="movie-info">
          <h1 class="title">${movieData.title}</h1>
          <div class="metadata">
            <span class="year">${movieData.year}</span>
            ${movieData.director ? ` • <span class="director">${movieData.director}</span>` : ''}
            ${movieData.genre ? ` • <span class="genre">${movieData.genre}</span>` : ''}
          </div>
          ${movieData.overview ? `<p class="overview">${movieData.overview}</p>` : ''}
        </div>
        
        ${movieData.streaming && movieData.streaming !== 'TBD' ? `
          <div class="streaming-info">
            <span class="streaming-text">Streaming on ${movieData.streaming}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Generate analysis sections with pre-resolved links
   */
  generateAnalysisSections(sections) {
    if (!sections || sections.length === 0) return '';
    
    return sections.map((section, index) => `
      <div class="analysis-text-section" data-section="${index}">
        ${section.content}
      </div>
    `).join('\n');
  }

  /**
   * Generate featured films section with media cards
   */
  generateFeaturedFilms(featuredMovies) {
    if (!featuredMovies || featuredMovies.length === 0) return '';
    
    const movieCards = featuredMovies.map((movie, index) => `
      <div class="movie-card" data-movie-index="${index}">
        <div class="movie-card-header">
          <div class="movie-card-title">${movie.title} (${movie.year})</div>
          <div class="movie-card-actions">
            <button class="card-action-btn" data-action="heart" aria-label="Heart movie">
              <span class="heart-icon">♥</span>
            </button>
            <button class="card-action-btn" data-action="bookmark" aria-label="Bookmark movie">
              <span class="bookmark-icon">🔖</span>
            </button>
          </div>
        </div>
        ${movie.description ? `
          <div class="movie-card-description">${movie.description}</div>
        ` : ''}
      </div>
    `).join('\n');

    return `
      <div class="featured-films-section">
        <div class="section-header" data-toggle="featuredFilms">
          <div class="section-title">
            <span class="section-icon">🎬</span>
            Featured Films
          </div>
          <div class="expand-button">
            <span class="chevron">⌄</span>
          </div>
        </div>
        <div class="section-content collapsible" data-section="featuredFilms">
          <div class="movie-cards-grid">
            ${movieCards}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate explore topics section
   */
  generateExploreTopics(exploreTopics) {
    if (!exploreTopics || exploreTopics.length === 0) return '';
    
    const topicCards = exploreTopics.map((topic, index) => `
      <div class="topic-card" data-topic-index="${index}">
        <div class="topic-name">${topic.topic}</div>
        <div class="topic-meta">
          ${topic.category ? `<span class="topic-category">${topic.category}</span>` : ''}
          ${topic.category && topic.difficulty ? ' • ' : ''}
          ${topic.difficulty ? `<span class="topic-difficulty">${topic.difficulty}</span>` : ''}
        </div>
      </div>
    `).join('\n');

    return `
      <div class="explore-topics-section">
        <div class="section-header" data-toggle="exploreTopics">
          <div class="section-title">
            <span class="section-icon">🧭</span>
            Explore Further
          </div>
          <div class="expand-button">
            <span class="chevron">⌄</span>
          </div>
        </div>
        <div class="section-content collapsible" data-section="exploreTopics">
          <div class="topics-grid">
            ${topicCards}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate why watch section
   */
  generateWhyWatch(whyWatch) {
    if (!whyWatch) return '';
    
    const reasonsList = whyWatch.reasons ? whyWatch.reasons.map((reason, index) => `
      <li class="reason-item" data-reason-index="${index}">
        ${reason}
      </li>
    `).join('\n') : '';

    return `
      <div class="why-watch-section">
        <div class="section-header" data-toggle="whyWatch">
          <div class="section-title">
            <span class="section-icon">⭐</span>
            Why Watch
          </div>
          <div class="expand-button">
            <span class="chevron">⌄</span>
          </div>
        </div>
        <div class="section-content collapsible" data-section="whyWatch">
          <div class="why-watch-content">
            ${whyWatch.recommendation ? `
              <div class="recommendation-badge">
                📍 ${whyWatch.recommendation}
              </div>
            ` : ''}
            ${reasonsList ? `
              <ul class="reasons-list">
                ${reasonsList}
              </ul>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate complete static HTML page - EXACT DOM STRUCTURE that React renders
   */
  generateCompletePage(movieData) {
    // Extract the exact styled-jsx content from pages/test-movie/[id].js
    const styledJsxCSS = this.getExactStyledJsxCSS();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${movieData.title} (${movieData.year}) - MovieGenius</title>
  <style>
    /* EXACT COPY of styled-jsx from pages/test-movie/[id].js */
    .production-movie-content {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
    }
    
    /* Analysis Text Sections */
    .analysis-text-section {
      padding: 20px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      line-height: 1.75;
      font-size: 15px;
      color: #374151;
      transition: all 0.3s ease;
    }
    
    .analysis-text-section.expanded {
      background: #fafafa;
    }
    
    .analysis-text-section a.movie-title {
      color: #dc2626;
      text-decoration: none;
      font-weight: 600;
      padding: 2px 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }
    
    .analysis-text-section a.movie-title:hover {
      background: #fef2f2;
      color: #b91c1c;
    }
    
    .analysis-text-section a.person-name {
      color: #7c3aed;
      text-decoration: none;
      font-weight: 500;
      padding: 2px 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }
    
    .analysis-text-section a.person-name:hover {
      background: #f3f0ff;
      color: #6d28d9;
    }
    
    /* Featured Films Section */
    .featured-films-section {
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }
    
    .section-header {
      padding: 20px 20px 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    
    .section-header:hover {
      background: rgba(0, 0, 0, 0.02);
    }
    
    .section-title {
      display: flex;
      align-items: center;
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
    }
    
    .section-icon {
      margin-right: 8px;
      font-size: 16px;
    }
    
    .expand-button {
      padding: 4px;
      border-radius: 4px;
      transition: background 0.2s ease;
      color: #6b7280;
    }
    
    .expand-button:hover {
      background: rgba(0, 0, 0, 0.1);
      color: #374151;
    }
    
    .section-content {
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }
    
    .section-content.expanded {
      max-height: 1000px;
    }
    
    .movie-cards-grid {
      padding: 0 20px 20px 20px;
      display: grid;
      gap: 12px;
    }
    
    .movie-card {
      background: white;
      border-radius: 12px;
      padding: 16px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
      transition: all 0.2s ease;
      position: relative;
    }
    
    .movie-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
      border-color: rgba(0, 0, 0, 0.12);
    }
    
    .movie-card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    
    .movie-card-title {
      font-weight: 600;
      color: #1f2937;
      font-size: 16px;
      line-height: 1.4;
    }
    
    .movie-card-actions {
      display: flex;
      gap: 8px;
      opacity: 0;
      transition: opacity 0.2s ease;
    }
    
    .movie-card:hover .movie-card-actions {
      opacity: 1;
    }
    
    .action-button {
      padding: 6px;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.04);
      color: #6b7280;
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
    }
    
    .action-button:hover {
      background: rgba(0, 0, 0, 0.08);
      color: #374151;
    }
    
    .action-button.active {
      background: #dc2626;
      color: white;
    }
    
    .movie-card-description {
      color: #6b7280;
      font-size: 14px;
      line-height: 1.5;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  <!-- EXACT COPY of PhoneFrame structure -->
  <div style="max-width: 375px; margin: 0 auto; background: #ffffff; min-height: 100vh; box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);">
    <div style="background: #ffffff; min-height: 100vh;">
      
      <!-- Simple Search Bar - EXACT COPY -->
      <div style="padding: 16px 20px 16px 20px;">
        <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 16px; display: flex; align-items: center;">
          <input type="text" placeholder="Search Movies . . ." style="flex: 1; border: none; outline: none; font-size: 16px;" />
        </div>
      </div>

      <!-- Production-Grade Movie Header - TestMovieHeaderLarge equivalent -->
      <div style="padding-left: 0px;">
        ${this.generateTestMovieHeader(movieData)}
      </div>

      <!-- Production-Grade Movie Analysis - EXACT structure -->
      <div class="production-movie-content">
        
        <!-- Analysis Text Sections -->
        ${movieData.sections && movieData.sections.map((section, index) => `
          <div class="analysis-text-section">
            ${section.content}
          </div>
        `).join('')}

        <!-- Featured Films Section -->
        ${movieData.featuredMovies && movieData.featuredMovies.length > 0 ? `
          <div class="featured-films-section">
            <div class="section-header" onclick="toggleSection('featuredFilms')">
              <div class="section-title">
                <span class="section-icon">🎬</span>
                Featured Films
              </div>
              <div class="expand-button">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </div>
            </div>
            <div class="section-content expanded" id="featuredFilms-content">
              <div class="movie-cards-grid">
                ${movieData.featuredMovies.map((movie, index) => `
                  <div class="movie-card">
                    <div class="movie-card-header">
                      <div class="movie-card-title">
                        ${movie.title} (${movie.year})
                      </div>
                      <div class="movie-card-actions">
                        <button class="action-button" onclick="toggleHeart(this)">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                          </svg>
                        </button>
                        <button class="action-button" onclick="toggleBookmark(this)">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    ${movie.description ? `
                      <div class="movie-card-description">
                        ${movie.description}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        ` : ''}

      </div>

      <!-- Test Environment Badge - EXACT position -->
      <div style="position: fixed; top: 10px; right: 10px; background: #8b5cf6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; z-index: 1000;">
        STATIC HTML
      </div>
      
    </div>
  </div>
  
  <script>
    // EXACT COPY of interaction functionality
    function toggleSection(sectionName) {
      const content = document.getElementById(sectionName + '-content');
      content.classList.toggle('expanded');
    }
    
    function toggleHeart(button) {
      button.classList.toggle('active');
    }
    
    function toggleBookmark(button) {
      button.classList.toggle('active');
    }
  </script>
</body>
</html>`;
  }

  /**
   * Generate static HTML for a single movie
   */
  async generateMovieHTML(movieId) {
    try {
      const movieFilePath = path.join(this.dataDir, `${movieId}.json`);
      
      if (!fs.existsSync(movieFilePath)) {
        console.log(`⚠️ Movie file not found: ${movieId}.json`);
        return null;
      }

      const movieData = JSON.parse(fs.readFileSync(movieFilePath, 'utf-8'));
      const htmlContent = this.generateCompletePage(movieData);
      
      const outputPath = path.join(this.outputDir, `${movieId}.html`);
      fs.writeFileSync(outputPath, htmlContent, 'utf-8');
      
      console.log(`✅ Generated static HTML: ${movieId}.html`);
      return outputPath;
      
    } catch (error) {
      console.error(`❌ Failed to generate HTML for ${movieId}:`, error.message);
      return null;
    }
  }

  /**
   * Generate static HTML for all test movies
   */
  async generateAllMovieHTML() {
    const startTime = Date.now();
    
    if (!fs.existsSync(this.dataDir)) {
      console.error(`❌ Data directory not found: ${this.dataDir}`);
      return;
    }

    const movieFiles = fs.readdirSync(this.dataDir)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
    
    console.log(`🏗️ Generating static HTML for ${movieFiles.length} movies...`);
    
    const results = [];
    for (const movieId of movieFiles) {
      const result = await this.generateMovieHTML(movieId);
      if (result) {
        results.push(result);
      }
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅ Generated ${results.length} static HTML files in ${duration}ms`);
    console.log(`📁 Output directory: ${this.outputDir}`);
    
    return results;
  }
}

// CLI execution
if (require.main === module) {
  const generator = new StaticHTMLGenerator();
  
  const movieId = process.argv[2];
  
  if (movieId) {
    // Generate single movie
    generator.generateMovieHTML(movieId);
  } else {
    // Generate all movies
    generator.generateAllMovieHTML();
  }
}

module.exports = StaticHTMLGenerator;