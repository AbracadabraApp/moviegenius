# Quick Start: YouTube Trailer Fix

## Step 1: Add Swift Package (REQUIRED)

Open Xcode, then:

1. File → Add Package Dependencies
2. Paste: `https://github.com/youtube/youtube-ios-player-helper`
3. Version: Up to Next Major (1.0.4)
4. Add to Target: `moviegenius`
5. Click "Add Package"

## Step 2: Build & Run

```bash
# Should build successfully after package added
⌘ + B
```

## Step 3: Test Trailer Playback

1. Launch app on simulator or device
2. Search for "Lost in Translation" or navigate to any recent movie
3. Tap the **play button** on the movie poster
4. Trailer should auto-play in full-screen player

## What Changed

- **Removed:** Old `TrailerPlayerView.swift` (WKWebView-based, broken)
- **Added:** `TrailerView.swift` + `YouTubePlayerView.swift` (official library)
- **Added:** `TMDBVideo.swift` models for TMDB `/videos` endpoint
- **Modified:** `APIClient.swift` - new `fetchVideos()` method
- **Modified:** `MoviePosterView.swift` - uses `hasTrailers` flag instead of URL
- **Modified:** `MovieDetailViewModel.swift` - parallel trailer availability check

## Technical Details

See `/Users/josh.petersen/moviegenius/ios/YOUTUBE_TRAILER_SETUP.md` for:
- Full architecture documentation
- Testing instructions
- Production readiness checklist
- Known limitations

## Troubleshooting

**Build error: "No such module 'YouTubeiOSPlayerHelper'"**
→ You skipped Step 1. Add the Swift Package.

**Play button doesn't appear**
→ Movie has no trailers in TMDB. Try a different movie.

**"Video not found or unavailable"**
→ YouTube embedding restrictions. Try official trailers from major studios.

**Player shows loading forever**
→ Check internet connection. Enable WiFi/cellular data.
