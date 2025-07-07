# Episode Movie Linking System - V1

## Overview

Standalone system to process all 65 episode files and create proper movie links for V1 launch. Converts quoted movie mentions into direct TMDB ID links.

## Pattern Detection

### Primary Format: `"Movie Title" (Year)`
- **Detects**: `"The Cabinet of Dr. Caligari" (1920)`
- **Converts to**: `<a href="/movie/234" class="movie-title">The Cabinet of Dr. Caligari</a> (1920)`

### Secondary Format: `Movie Title (Year)`
- **Detects**: `Casablanca (1942)` (unquoted, strict capitalization)
- **Converts to**: `<a href="/movie/289" class="movie-title">Casablanca</a> (1942)`

## System Architecture

### Core Components

1. **`lib/episode-movie-linker.js`** - Main processing engine
2. **`scripts/process-episode-links.js`** - Batch processing script
3. **`components/LinkedEpisodeText.js`** - React component for display
4. **`styles/movieTitle.css`** - Existing movie link styling (gold underline)

### Database Integration

- **Lookup**: Searches existing movies table by title + year
- **Auto-add**: Uses TMDB API to add missing movies (like MediaCard logic)
- **Organic slugs**: Generates proper descriptions via `/api/generate-organic-slug`
- **Direct links**: Creates `/movie/TMDB_ID` links (not search URLs)

## Usage

### Test Pattern Detection
```bash
node test-episode-linking.js
```

### Process All Episodes
```bash
# Dry run (shows what would change)
node scripts/process-episode-links.js --dry-run

# Live processing (updates 65 episode files)
node scripts/process-episode-links.js
```

### Test Single Episode
```bash
node scripts/process-episode-links.js --test --file=genius-1-1-1.json
```

## Safety Features

- **Rate limiting**: 200ms delay between TMDB API calls
- **Error handling**: Individual episode failures don't stop batch
- **Dry run mode**: Preview changes before applying
- **Validation**: Checks for required TMDB IDs before linking
- **Fallback**: Graceful handling of missing movies

## Episode Integration

### Updated Episode Page
- Imports `LinkedEpisodeText` component
- Replaces `underlineProperNames()` calls
- Handles both opener and section content

### Movie Link Styling
- Uses existing `movie-title` class
- Gold underline pattern (#d4af37)
- Hover effects with darker gold
- Consistent with site-wide movie title styling

## Expected Results

### For 65 Episode Files:
- **Film noir episodes**: Links to classics like "The Big Heat", "Double Indemnity"
- **Horror episodes**: Links to "Nosferatu", "The Cabinet of Dr. Caligari"
- **Comedy episodes**: Links to Chaplin, Keaton films
- **World cinema**: Links to international classics

### Database Growth:
- Automatically adds missing classic films
- Builds comprehensive movie database
- Creates proper TMDB ID references
- Generates organic movie descriptions

## V1 Launch Ready

✅ **Pattern detection** for quoted movie format  
✅ **Database lookup** with auto-add capability  
✅ **React component** for safe HTML rendering  
✅ **Global styling** with theme support  
✅ **Batch processing** script for all 65 files  
✅ **Error handling** and rate limiting  

The system is production-ready and will transform episode content from:

```
"The Cabinet of Dr. Caligari" (1920) marked the movement's arrival
```

Into:

```html
<a href="/movie/234" class="movie-title">The Cabinet of Dr. Caligari</a> (1920) marked the movement's arrival
```

**Episodes will have proper movie links for V1 launch!** 🎬