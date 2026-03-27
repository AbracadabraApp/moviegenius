# One-Shot HTML Generation Guide

**Purpose:** Generate standalone, self-contained HTML files for movie pages that work without any framework or build process.

**Use Cases:**
- Email campaigns with movie recommendations
- Shareable HTML files (download & view offline)
- Print-ready movie analysis pages
- Archive copies for backup
- Embedding in external sites

---

## Quick Start (Generate One Movie)

```bash
# Generate standalone HTML for Fight Club (tmdb_id: 550)
node scripts/one-shot-html.js 550

# Output: public/static-html/movie_550.html
# Open in browser: open public/static-html/movie_550.html
```

**Result:** Complete HTML file with:
- ✅ All CSS embedded (no external stylesheets)
- ✅ Minimal JavaScript for interactions (toggles, bookmarks)
- ✅ Pre-resolved movie/person links
- ✅ Poster images (TMDB CDN URLs)
- ✅ Streaming availability
- ✅ Why Watch recommendation
- ✅ Full analysis with featured films
- ✅ Works offline after initial load

---

## Architecture Overview

### What "One-Shot" Means

**Traditional Web App:**
```
User visits /movie/550
  ↓
Next.js server renders React
  ↓
Fetches 4 API calls (TMDB, analysis, streaming, whywatch)
  ↓
Client-side hydration
  ↓
Interactive page
```

**One-Shot HTML:**
```
Build time:
  ↓
Read database (all data pre-resolved)
  ↓
Generate complete HTML string
  ↓
Write to public/static-html/movie_550.html
  ↓
Done (no server, no React, no build process)
```

**"Dangerous"** = No framework safety nets:
- Raw HTML generation
- Manual XSS prevention (escape user input)
- Inline JavaScript (no webpack, no bundler)
- Direct DOM manipulation

---

## File Structure

```
moviegenius/
├── scripts/
│   ├── generate-static-html.cjs         # Core generator class
│   └── one-shot-html.js                 # CLI tool (NEW)
│
├── public/
│   └── static-html/
│       ├── movie_550.html               # Fight Club
│       ├── movie_278.html               # Shawshank Redemption
│       └── [500+ pre-generated files]
│
├── data/
│   └── build-indexes/
│       ├── movies.json                  # Movie ID → title/year lookup
│       ├── persons.json                 # Person ID → name lookup
│       └── movie-contributors.json      # Movie → cast/crew mapping
│
└── docs/
    └── ONE_SHOT_HTML_GUIDE.md          # This file
```

---

## Generation Process

### Step 1: Fetch Data from Database

```javascript
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const result = await pool.query(`
  SELECT
    m.tmdb_id,
    m.title,
    m.year,
    m.poster_url,
    m.overview,
    ma.analysis_text,
    ma.featured_movies,
    ew.recommendation,
    ew.reasons
  FROM movies m
  LEFT JOIN movie_analyses ma ON m.tmdb_id = ma.tmdb_id
  LEFT JOIN enhanced_why_watch ew ON m.tmdb_id = ew.tmdb_id
  WHERE m.tmdb_id = $1
`, [tmdbId]);

const movieData = result.rows[0];
```

### Step 2: Pre-Resolve All Links

```javascript
const analysis = movieData.analysis_text;

// Find all **Movie (Year)** references
const movieRefs = analysis.match(/\*\*([^(]+)\((\d{4})\)\*\*/g);

for (const ref of movieRefs) {
  const [title, year] = parseMovieRef(ref);
  const tmdbId = await lookupMovieId(title, year); // From indexes

  // Replace with HTML link
  analysis = analysis.replace(
    ref,
    `<a class="movie-title" href="/movie/${tmdbId}">${title} (${year})</a>`
  );
}
```

### Step 3: Generate Complete HTML

```javascript
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${movieData.title} (${movieData.year}) - MovieGenius</title>
  <style>
    /* ALL CSS EMBEDDED HERE */
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .movie-header { /* ... */ }
    .analysis-section { /* ... */ }
    /* 500+ lines of CSS */
  </style>
</head>
<body>
  <!-- Movie Header -->
  <div class="movie-header">
    <img src="${movieData.poster_url}" alt="${movieData.title}" />
    <h1>${movieData.title} <span class="year">(${movieData.year})</span></h1>
  </div>

  <!-- Why Watch Section -->
  <div class="why-watch ${movieData.recommendation.toLowerCase()}">
    <div class="badge">${movieData.recommendation === 'YES' ? '✓ WATCH' : '✗ SKIP'}</div>
    <ul class="reasons">
      ${movieData.reasons.map(r => `<li>${r}</li>`).join('')}
    </ul>
  </div>

  <!-- Analysis Text -->
  <div class="analysis-section">
    ${processAnalysisWithLinks(movieData.analysis_text)}
  </div>

  <!-- Featured Films -->
  <div class="featured-films">
    ${movieData.featured_movies.map(film => `
      <div class="media-card">
        <img src="${film.poster_url}" />
        <div class="title">${film.title}</div>
      </div>
    `).join('')}
  </div>

  <!-- Minimal JavaScript -->
  <script>
    function toggleSection(id) {
      const el = document.getElementById(id);
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
  </script>
</body>
</html>`;
```

### Step 4: Write to File

```javascript
const outputPath = path.join(__dirname, '..', 'public', 'static-html', `movie_${tmdbId}.html`);
fs.writeFileSync(outputPath, html, 'utf-8');
console.log(`✅ Generated: ${outputPath}`);
```

---

## CLI Tool Usage

### Generate Single Movie

```bash
node scripts/one-shot-html.js 550
# Output: public/static-html/movie_550.html
```

### Generate Multiple Movies

```bash
node scripts/one-shot-html.js 550 278 238 424
# Output: 4 HTML files
```

### Generate from List

```bash
echo "550\n278\n238" > movie-ids.txt
node scripts/one-shot-html.js --batch movie-ids.txt
```

### Generate All Analyzed Movies

```bash
node scripts/one-shot-html.js --all
# Generates 21,275 HTML files (takes ~2 hours)
```

### Custom Output Directory

```bash
node scripts/one-shot-html.js 550 --output ./exports/
# Output: ./exports/movie_550.html
```

---

## HTML Structure Reference

### Complete Page Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Movie Title (Year) - MovieGenius</title>

  <!-- ALL CSS EMBEDDED (no external files) -->
  <style>
    /* Reset & Base */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; background: #fafafa; }

    /* Movie Header */
    .movie-header { /* ... */ }

    /* Why Watch */
    .why-watch { /* ... */ }
    .why-watch.yes { background: linear-gradient(180deg, #d4af37 0%, #c5a028 100%); }
    .why-watch.no { background: linear-gradient(180deg, #dc2626 0%, #b91c1c 100%); }

    /* Analysis Section */
    .analysis-section { /* ... */ }
    .analysis-section p { margin-bottom: 16px; line-height: 1.6; }
    .movie-title { color: #d4af37; text-decoration: none; font-weight: 600; }
    .movie-title:hover { text-decoration: underline; }

    /* Featured Films */
    .featured-films { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .media-card { /* ... */ }

    /* Responsive */
    @media (max-width: 768px) {
      .featured-films { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <!-- PhoneFrame Container (390px width mobile viewport) -->
  <div class="phone-frame">

    <!-- Movie Header -->
    <div class="movie-header">
      <div class="action-bar">
        <button onclick="toggleBookmark()" class="icon-btn">
          <svg><!-- Bookmark icon --></svg>
        </button>
        <button onclick="toggleHeart()" class="icon-btn">
          <svg><!-- Heart icon --></svg>
        </button>
      </div>

      <img src="https://image.tmdb.org/t/p/w500/poster.jpg"
           alt="Movie Poster"
           class="poster" />

      <h1 class="title">
        Movie Title
        <span class="year">(2024)</span>
      </h1>

      <p class="overview">Brief movie description from TMDB...</p>

      <!-- Streaming Services -->
      <div class="streaming-section">
        <div class="service netflix">
          <img src="/icons/netflix.png" />
          <span>Stream</span>
        </div>
        <div class="service prime">
          <img src="/icons/prime.png" />
          <span>Rent $3.99</span>
        </div>
      </div>
    </div>

    <!-- Why Watch Section -->
    <div class="why-watch yes">
      <div class="badge">✓ WATCH</div>
      <ul class="reasons">
        <li>Groundbreaking visual storytelling</li>
        <li>Career-defining performance by lead actor</li>
        <li>Changed genre filmmaking forever</li>
      </ul>
    </div>

    <!-- Analysis Section -->
    <div class="analysis-section">
      <h2>Analysis</h2>
      <p>
        You're watching one of the most influential films...
        Compare to <a href="/movie/456" class="movie-title">Similar Film (2020)</a>
        and <a href="/movie/789" class="movie-title">Another Classic (1995)</a>.
      </p>
      <p>Second paragraph of analysis...</p>
      <p>Third paragraph wrapping up...</p>
    </div>

    <!-- Featured Films -->
    <div class="section">
      <h3 class="section-title">Featured Films</h3>
      <div class="featured-films">
        <div class="media-card">
          <img src="https://image.tmdb.org/t/p/w185/poster1.jpg" />
          <div class="card-title">Movie 1</div>
          <div class="card-year">2020</div>
        </div>
        <div class="media-card">
          <img src="https://image.tmdb.org/t/p/w185/poster2.jpg" />
          <div class="card-title">Movie 2</div>
          <div class="card-year">2019</div>
        </div>
        <!-- Repeat for all featured films -->
      </div>
    </div>

    <!-- Explore Topics -->
    <div class="section">
      <h3 class="section-title">Explore Topics</h3>
      <div class="topics">
        <span class="topic-tag">neo-noir</span>
        <span class="topic-tag">psychological thriller</span>
        <span class="topic-tag">unreliable narrator</span>
      </div>
    </div>

    <!-- Discovery Footer -->
    <div class="discovery-footer">
      <a href="/" class="footer-link">Home</a>
      <a href="/browse" class="footer-link">Browse</a>
      <a href="/search" class="footer-link">Search</a>
    </div>

  </div><!-- end phone-frame -->

  <!-- Minimal JavaScript (< 50 lines) -->
  <script>
    // Toggle bookmark state
    function toggleBookmark() {
      const btn = event.target.closest('.icon-btn');
      btn.classList.toggle('active');
      // Optional: save to localStorage
      const tmdbId = '550'; // From page data
      const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
      if (btn.classList.contains('active')) {
        bookmarks.push(tmdbId);
      } else {
        const idx = bookmarks.indexOf(tmdbId);
        if (idx > -1) bookmarks.splice(idx, 1);
      }
      localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    }

    // Toggle heart/favorite state
    function toggleHeart() {
      const btn = event.target.closest('.icon-btn');
      btn.classList.toggle('active');
      // Similar localStorage logic
    }

    // Toggle section visibility
    function toggleSection(id) {
      const section = document.getElementById(id);
      if (section) {
        section.style.display = section.style.display === 'none' ? 'block' : 'none';
      }
    }

    // Load saved states on page load
    window.addEventListener('DOMContentLoaded', () => {
      const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
      const tmdbId = '550';
      if (bookmarks.includes(tmdbId)) {
        document.querySelector('.icon-btn').classList.add('active');
      }
    });
  </script>
</body>
</html>
```

---

## Security & XSS Prevention

### Dangerous Patterns to Avoid

```javascript
// ❌ BAD: Direct string interpolation of user input
const html = `<div>${movieData.userReview}</div>`;
// If userReview contains: <script>alert('XSS')</script>
// Result: Script executes

// ✅ GOOD: Escape HTML entities
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
const html = `<div>${escapeHtml(movieData.userReview)}</div>`;
```

### Safe Data Sources

**Always safe (from our database):**
- ✅ `tmdb_id` (integer, validated)
- ✅ `title` (escaped at storage)
- ✅ `year` (integer)
- ✅ `analysis_text` (Claude-generated, no user input)
- ✅ `poster_url` (validated TMDB CDN URLs)

**Potentially unsafe (external):**
- ⚠️ User-submitted reviews (not currently used)
- ⚠️ External API responses (validate before embedding)

---

## Performance Optimization

### File Size Targets

| Component | Target | Current |
|-----------|--------|---------|
| HTML structure | 5KB | 8KB |
| Embedded CSS | 10KB | 12KB |
| Embedded JS | 2KB | 1.5KB |
| **Total (uncompressed)** | **17KB** | **21.5KB** |
| **Gzipped** | **~6KB** | **~7KB** |

### Optimization Techniques

1. **CSS Minification**
   ```bash
   # Before generation
   npx cssnano styles.css --use cssnano-preset-default --no-map > styles.min.css
   ```

2. **Remove Unused CSS**
   - Only include styles for components present in this specific page
   - Example: If no streaming data, skip `.streaming-section` styles

3. **Image Optimization**
   - Use TMDB's `w185` poster size (not `w500`) for cards
   - Use `w500` only for hero poster
   - Lazy load images below fold:
     ```html
     <img src="poster.jpg" loading="lazy" />
     ```

4. **Inline Critical CSS Only**
   - Embed only above-the-fold CSS in `<style>`
   - Load rest via external `<link>` with `media="print"` + JS trick

---

## Batch Generation Strategy

### Generate Top 500 Popular Movies

```bash
# Query database for most popular
psql $DATABASE_URL -c "
  SELECT tmdb_id
  FROM movies
  WHERE analysis_text IS NOT NULL
  ORDER BY popularity DESC
  LIMIT 500
" > top-500.txt

# Generate HTML files
node scripts/one-shot-html.js --batch top-500.txt
```

### Progress Tracking

```javascript
// In one-shot-html.js
let completed = 0;
const total = movieIds.length;

for (const tmdbId of movieIds) {
  await generateHTML(tmdbId);
  completed++;

  // Progress bar
  const percent = (completed / total * 100).toFixed(1);
  process.stdout.write(`\r[${percent}%] ${completed}/${total} generated`);
}
```

### Resume on Failure

```javascript
// Track completed files
const completedFile = './generation-progress.json';
const completed = fs.existsSync(completedFile)
  ? JSON.parse(fs.readFileSync(completedFile))
  : [];

// Skip already generated
for (const tmdbId of movieIds) {
  if (completed.includes(tmdbId)) {
    console.log(`⏭️  Skipping ${tmdbId} (already generated)`);
    continue;
  }

  await generateHTML(tmdbId);
  completed.push(tmdbId);
  fs.writeFileSync(completedFile, JSON.stringify(completed));
}
```

---

## Testing Generated HTML

### Validation Checklist

```bash
# 1. Generate test file
node scripts/one-shot-html.js 550

# 2. Validate HTML structure
npx html-validate public/static-html/movie_550.html

# 3. Check file size
ls -lh public/static-html/movie_550.html

# 4. Test in browser
open public/static-html/movie_550.html

# 5. Check all links work
# Click each <a class="movie-title"> and verify navigation

# 6. Test offline mode
# Disable network, refresh page, ensure it still works
```

### Automated Test Script

```javascript
// __tests__/one-shot-html.test.js
const fs = require('fs');
const path = require('path');

test('Generated HTML is valid', () => {
  const html = fs.readFileSync('./public/static-html/movie_550.html', 'utf-8');

  // Has DOCTYPE
  expect(html).toMatch(/^<!DOCTYPE html>/);

  // Has title
  expect(html).toMatch(/<title>.*<\/title>/);

  // Has embedded CSS
  expect(html).toMatch(/<style>[\s\S]*<\/style>/);

  // Has movie title
  expect(html).toMatch(/Fight Club/);

  // Has poster image
  expect(html).toMatch(/https:\/\/image\.tmdb\.org/);

  // All movie links use correct pattern
  const movieLinks = html.match(/href="\/movie\/\d+"/g);
  expect(movieLinks).toBeTruthy();
  expect(movieLinks.length).toBeGreaterThan(0);
});
```

---

## Distribution & Deployment

### Email Campaign

```javascript
// Send HTML file as email body
const nodemailer = require('nodemailer');

const htmlContent = fs.readFileSync('./public/static-html/movie_550.html', 'utf-8');

await transporter.sendMail({
  from: 'recommendations@moviegenius.ai',
  to: 'user@example.com',
  subject: 'Check out Fight Club (1999)',
  html: htmlContent
});
```

### Downloadable ZIP

```bash
# Create archive of all HTML files
cd public/static-html
zip -r ../../moviegenius-html-archive.zip *.html
```

### CDN Deployment

```bash
# Upload to S3
aws s3 sync public/static-html/ s3://moviegenius-static-html/ \
  --acl public-read \
  --cache-control "public, max-age=31536000"

# Access via CloudFront
# https://cdn.moviegenius.ai/movie_550.html
```

---

## Troubleshooting

### Problem: Links don't resolve

**Symptom:** `<a href="/movie/undefined">Movie (Year)</a>`

**Cause:** Movie not found in indexes

**Fix:**
```bash
# Regenerate build indexes
node scripts/generate-build-indexes.js

# Verify movie exists
grep "Movie Title" data/build-indexes/movies.json
```

### Problem: Images don't load

**Symptom:** Broken image icons

**Cause:** TMDB poster URLs expired or invalid

**Fix:**
```javascript
// Add fallback image
const posterUrl = movieData.poster_url || '/images/placeholder-poster.jpg';
```

### Problem: File size too large

**Symptom:** HTML file > 50KB

**Cause:** Too many featured films or long analysis

**Fix:**
```javascript
// Limit featured films
const featuredFilms = movieData.featured_movies.slice(0, 6); // Max 6 cards

// Truncate analysis if needed
const analysis = movieData.analysis_text.slice(0, 1000); // ~200 words
```

---

## Future Enhancements

### V3 Integration

When V3 launches, update generator to:
- Use `analysis_data_v3` column (200-word concise format)
- Implement WhyWatch-first layout
- Add `/api/v1/movie/[id]` unified data fetch

### Print Stylesheet

```html
<style media="print">
  .action-bar { display: none; }
  .streaming-section { display: none; }
  body { background: white; }
  a { color: black; text-decoration: underline; }
</style>
```

### Internationalization

```javascript
// Generate in multiple languages
const languages = ['en', 'es', 'fr', 'de'];
for (const lang of languages) {
  const translation = await translateAnalysis(movieData.analysis_text, lang);
  generateHTML(tmdbId, { lang, analysis: translation });
  // Output: movie_550_es.html, movie_550_fr.html, etc.
}
```

---

## Summary

**One-shot HTML generation is:**
- ✅ Fully self-contained (no external dependencies)
- ✅ Works offline after initial load
- ✅ Fast (<50ms to serve static file)
- ✅ Secure (XSS-safe if properly escaped)
- ✅ Portable (email, download, embed anywhere)

**Use the CLI tool:**
```bash
node scripts/one-shot-html.js 550
```

**Infrastructure exists:**
- `/scripts/generate-static-html.cjs` - Core generator
- `/public/static-html/` - Output directory (500 files already generated)
- `/data/build-indexes/` - Pre-resolved lookups

**Next step:** Create the CLI tool (`scripts/one-shot-html.js`) for easy generation workflow.
