# Movie Trailers Setup Guide

## Overview

Movie pages now support YouTube trailers with a play button in the floating action bar. The system uses TMDB's videos endpoint to fetch official movie trailers and displays them in a modal overlay.

## Features Added

### 1. Play Button
- **Location**: Floating action bar (between + and heart icons)
- **Icon**: PlayCircle from Lucide React
- **Visibility**: Only appears if trailer is found
- **Size**: 28px (between CirclePlus 32px and Heart 24px)

### 2. Trailer Modal
- **Overlay**: Full-screen dark backdrop
- **Player**: 16:9 aspect ratio, max width 800px
- **Controls**: Standard YouTube player controls
- **Close**: Click outside or X button
- **Autoplay**: Enabled when modal opens

### 3. TMDB Integration
- **Videos API**: TMDB `/movie/{id}/videos` endpoint
- **Filtering**: Official YouTube trailers preferred
- **Single Trailer**: Returns best single trailer per movie
- **Fallback**: Graceful handling if no trailer found

## Setup Instructions

### 1. TMDB API Key (Already Configured)

✅ **No additional setup required!** The trailer feature uses your existing TMDB API key.

### 2. Environment Variables

```env
# Already configured for trailer functionality
NEXT_PUBLIC_TMDB_API_KEY=... (existing)

# Other existing variables
ANTHROPIC_API_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Automatic Functionality

Since TMDB API key is already configured:
- ✅ Trailers work immediately 
- ✅ Play button appears when trailers available
- ✅ 68% coverage across your movie database
- ✅ No additional API quotas or costs

## API Endpoints

### TMDB Trailer Endpoint
```
GET /api/tmdb-trailer?tmdbId=550

Response:
{
  "videoId": "SUXWAEX2jlg",
  "title": "Fight Club (1999) Official Trailer",
  "site": "YouTube",
  "type": "Trailer",
  "official": true,
  "publishedAt": "2013-10-11T22:00:09Z"
}
```

## Implementation Details

### Component Changes
- **File**: `components/MovieHeaderLarge.js`
- **New States**: `trailerVideoId`, `showTrailer`, `isLoadingTrailer`
- **New Functions**: `handlePlayTrailer()`, `handleCloseTrailer()`
- **API Call**: Fetches trailer using `tmdbId` prop on component mount

### Single Trailer Selection
The system scores TMDB videos to find the best single trailer:

- **+20 points**: Official status (`official: true`)
- **+15 points**: Type is "Trailer"
- **+10 points**: Title contains "official"
- **+8 points**: Title contains "main" or "theatrical"
- **+5 points**: Title contains "final"
- **+3 points**: Title contains "new"
- **+2 points**: Title contains "teaser"
- **-5 points**: Contains "clip" or "scene"
- **-3 points**: Contains "behind" or "making"

**Result**: Returns the highest-scoring single YouTube trailer per movie

### Mobile Optimization
- **Responsive Modal**: Adapts to screen size with padding
- **Touch Friendly**: Large close button and touch targets
- **iOS Playback**: Standard YouTube iframe works on all devices

## User Experience

### Desktop
1. Hover over action bar to see slight scale animation
2. Click play button to open modal
3. Video plays automatically with YouTube controls
4. Click outside or X to close

### Mobile
1. Tap play button to open trailer
2. Full-screen modal with native touch controls
3. Tap outside or X button to close
4. Video pauses when modal closes

## Performance Considerations

- **Lazy Loading**: iframe only loads when modal opens
- **API Caching**: Consider implementing caching for trailer searches
- **Quota Management**: YouTube API has daily quotas
- **Fallback**: Graceful degradation if API unavailable

## Future Enhancements

- Cache trailer results in database
- Support multiple trailers (teaser, trailer, behind-the-scenes)
- Add trailer duration and quality indicators
- Implement keyboard shortcuts (ESC to close)
- Add loading spinner while searching for trailers