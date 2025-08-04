# Genius Episode Template Documentation

This document explains the complete structure for creating genius episodes that
render all required elements correctly.

## Overview

Each genius episode must contain **6 key rendering elements**:

1. **Fixed Ask Input Bar** (handled automatically by template)
2. **Hero Section** with episode image, title, and subtitle
3. **Main Content Sections** (text paragraphs, movie cards, subheads)
4. **Explore Further Section** (interactive prompts)
5. **Series Navigation** ("More in [Series Title]")
6. **More Ideas Section** ("Related Films")

## File Structure

Episodes are stored as JSON files in `/data/episodes/` with the naming
convention:

```
genius-{themeId}-{seriesId}-{episodeId}.json
```

Example: `genius-1-1-1.json` (Theme 1, Series 1, Episode 1)

## Complete JSON Structure

```json
{
  // SYSTEM METADATA - Required for all episodes
  "system": "genius",
  "themeId": 1,
  "seriesId": 1,
  "episodeId": 1,

  // THEME DATA - Updated for new 65-episode structure
  "theme": {
    "id": 1,
    "title": "Genres",
    "description": "Film genres and their evolution",
    "slug": "genres"
  },

  // SERIES DATA - Clean titles without date ranges
  "series": {
    "id": 1,
    "title": "Classic Film Noir", // NOT "Classic Film Noir (1940-1958)"
    "description": "The birth and golden age of film noir"
  },

  // EPISODE DATA
  "episode": {
    "id": 1,
    "title": "German Expressionism",
    "subtitle": "The template for noir morality"
  },

  // CONTENT STRUCTURE
  "content": {
    // OPENER - Brief intro text (optional but recommended)
    "opener": "Brief introductory paragraph...",

    // SECTIONS - Main content array (REQUIRED)
    "sections": [
      // Text sections
      {
        "type": "text",
        "content": "Paragraph content..."
      },

      // Movie sections
      {
        "type": "movies",
        "movies": [
          {
            "title": "Movie Title",
            "year": 1944,
            "slug": "Description of the movie",
            "tmdb_id": 12345,
            "poster_url": "https://...",
            "streaming": null
          }
        ]
      },

      // Subhead sections
      {
        "type": "subhead",
        "content": "Section Title"
      },

      // Explore Further section (REQUIRED)
      {
        "type": "explore_further",
        "prompts": ["Question 1?", "Question 2?", "Question 3?"]
      }
    ],

    // MORE IDEAS - Related films (REQUIRED)
    "moreIdeas": {
      "title": "More Ideas",
      "movies": [
        {
          "title": "Related Movie",
          "year": 1950,
          "slug": "Description...",
          "tmdb_id": 67890,
          "poster_url": null,
          "streaming": null
        }
      ]
    }
  },

  // METADATA
  "generatedAt": "2025-06-17T18:00:00.000Z",
  "version": "3.0",
  "type": "educational",
  "locked": true,
  "lockedAt": "2025-06-17T18:00:00.000Z",
  "lockedBy": "user",

  // HERO IMAGE PATH (REQUIRED)
  "heroImage": "/images/hero/theme-1-genres/series-1-noir/1-episode.jpg"
}
```

## Section Types Explained

### 1. Text Sections

Standard paragraph content. Should be substantial (100+ words) and educational.

```json
{
  "type": "text",
  "content": "Long-form educational content about the topic..."
}
```

### 2. Movies Sections

Movie cards that display with "Featured Films" header.

```json
{
  "type": "movies",
  "movies": [
    {
      "title": "Movie Title", // REQUIRED
      "year": 1944, // REQUIRED - Number
      "slug": "Description text", // REQUIRED - Movie description
      "tmdb_id": 12345, // REQUIRED - For poster fetching
      "poster_url": "https://...", // OPTIONAL - Direct poster URL
      "streaming": null // OPTIONAL - Streaming info
    }
  ]
}
```

### 3. Subhead Sections

Section dividers with gold styling.

```json
{
  "type": "subhead",
  "content": "Section Title"
}
```

### 4. Explore Further Sections

Interactive prompts that link to ask page. **Required for complete episodes.**

**Important**: Explore further sections should be **interleaved throughout the
content**, not just at the end.

```json
{
  "type": "explore_further",
  "prompts": ["Single focused question about the preceding content?"]
}
```

**Best Practice**:

- Use multiple explore_further sections throughout the episode
- Each section should have 1-2 focused prompts
- Place them after related text/movie sections
- Questions should build on the content that just preceded them

**Behavior**: Clicking a prompt navigates to `/ask?q=${episodeTitle}: ${prompt}`

### 5. More Ideas Section

Additional related films. **Required for complete episodes.**

```json
"moreIdeas": {
  "title": "More Ideas", // Can be customized
  "movies": [
    // Same movie object structure as above
  ]
}
```

## Hero Images

Hero images must exist at the specified path in `/public/images/hero/`.

**Directory Structure**:

```
/public/images/hero/
  theme-1-genres/
    series-1-noir/
      1-episode-name.jpg
      2-episode-name.jpg
    series-2-horror/
      1-episode-name.jpg
```

**Image Requirements**:

- Format: JPG or PNG
- Aspect ratio: 16:9 or similar landscape
- Minimum width: 800px
- Optimized for web delivery

## Series Navigation

The footer shows "More in [Series Title]" and lists other episodes in the same
series.

**Important**: Series titles should be clean without date ranges:

- ✅ "Classic Film Noir"
- ❌ "Classic Film Noir (1940-1958)"

## Theme and Series Structure (65-Episode System)

### Themes:

1. **Genres** - Film genres and their evolution
2. **Directors** - Visionary filmmakers and their personal cinema
3. **Movements** - Revolutionary cinema movements
4. **Filmmaking** - The craft and technology of cinema
5. **Topics** - Cultural and historical contexts

### URL Pattern:

```
/genius/{themeId}/{seriesId}/{episodeId}
```

Examples:

- `/genius/1/1/1` - Theme 1, Series 1, Episode 1
- `/genius/2/3/2` - Theme 2, Series 3, Episode 2

## Testing Episodes

Use the provided unit tests to verify episode structure:

```bash
npm test tests/episode-structure.test.js
```

**Tests verify**:

- Required metadata fields
- Hero image exists
- Content sections are complete
- Explore further has valid prompts
- Movie objects have required fields
- More ideas section exists
- Series navigation works

## Common Issues

### Missing Explore Further

**Problem**: Interactive prompts don't appear **Solution**: Ensure episode has
`explore_further` section with `prompts` array

### Wrong Footer Title

**Problem**: Footer shows "More in Classic Film Noir (1940-1958)" **Solution**:
Update series title to remove date range

### Broken Hero Image

**Problem**: Default image shows instead of episode image **Solution**: Verify
`heroImage` path exists in `/public/images/hero/`

### Missing More Ideas

**Problem**: "Related Films" section doesn't appear **Solution**: Ensure
`moreIdeas` object exists with `movies` array

## Creating New Episodes

1. **Copy template** from `genius-1-1-1.json`
2. **Update metadata** (themeId, seriesId, episodeId)
3. **Update theme/series titles** for correct structure
4. **Replace content** with episode-specific material
5. **Add hero image** to correct directory
6. **Test structure** with unit tests
7. **Lock episode** when complete

## Best Practices

- **Educational Content**: Write substantial, informative paragraphs (120-150
  words each)
- **Movie Selection**: Choose films that illustrate the topic effectively
- **Question Writing**: Create thought-provoking explore further prompts
- **Visual Hierarchy**: Use subheads to organize long content
- **Related Films**: Include diverse selections in more ideas
- **Testing**: Always run tests before considering episode complete

## Reference Files

- **Template**: `/data/episodes/genius-1-1-1.json`
- **Tests**: `/tests/episode-structure.test.js`
- **Component**: `/components/GeniusEpisodeTemplate.js`
