# YouTube Trailers Setup Guide

## Overview

Movie pages now support YouTube trailers with a play button in the floating action bar. The system automatically searches YouTube for official movie trailers and displays them in a modal overlay.

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

### 3. YouTube Integration
- **Search API**: YouTube Data API v3
- **Search Query**: "[Movie Title] [Year] official trailer"
- **Filtering**: High-quality, short duration, official channels preferred
- **Fallback**: Graceful handling if no trailer found

## Setup Instructions

### 1. YouTube API Key (Required)

1. **Google Cloud Console**: Go to [console.cloud.google.com](https://console.cloud.google.com)
2. **Enable YouTube Data API v3**: In APIs & Services
3. **Create API Key**: In Credentials section
4. **Add to Environment**: 

```bash
# Add to .env.local or deployment environment
YOUTUBE_API_KEY=your_youtube_api_key_here
```

### 2. Environment Variables

```env
# Required for trailer functionality
YOUTUBE_API_KEY=AIzaSy...

# Existing variables (already configured)
NEXT_PUBLIC_TMDB_API_KEY=...
ANTHROPIC_API_KEY=...
```

### 3. Testing Without API Key

If `YOUTUBE_API_KEY` is not configured:
- No errors occur
- Play button simply doesn't appear
- Console shows: "YouTube API key not configured"
- All other functionality works normally

## API Endpoints

### YouTube Trailer Search
```
GET /api/youtube-trailer-search?title=Fight Club&year=1999

Response:
{
  "videoId": "SUXWAEX2jlg",
  "title": "Fight Club (1999) Official Trailer",
  "channelTitle": "20th Century Studios",
  "publishedAt": "2013-10-11T22:00:09Z"
}
```

## Implementation Details

### Component Changes
- **File**: `components/MovieHeaderLarge.js`
- **New States**: `trailerVideoId`, `showTrailer`, `isLoadingTrailer`
- **New Functions**: `handlePlayTrailer()`, `handleCloseTrailer()`
- **API Call**: Fetches trailer on component mount

### Trailer Quality Scoring
The system scores YouTube search results to find the best trailer:

- **+10 points**: Title contains "official"
- **+8 points**: Title contains "trailer"
- **+5 points**: Channel contains "official"
- **+3 points**: Channel contains "studios", "pictures", or "entertainment"
- **+2 points**: Title matches movie title
- **-5 points**: Contains "reaction", "review", or "analysis"
- **-8 points**: Contains "fan made" or "fanmade"

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