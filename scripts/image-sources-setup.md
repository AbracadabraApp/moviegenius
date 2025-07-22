# Alternative Image Sources Setup Guide

This guide will help you set up automatic image sourcing to reduce your dependency on manual Midjourney generation.

## 🚀 Quick Setup (5 minutes)

### 1. Get API Keys (All Free)

#### Unsplash (Best for artistic photography)
1. Go to [unsplash.com/developers](https://unsplash.com/developers)
2. Create account / sign in
3. Click "New Application"
4. Fill out form (Demo/Educational use)
5. Copy your **Access Key**

#### Pexels (Good for general photography)  
1. Go to [pexels.com/api](https://www.pexels.com/api/)
2. Create account / sign in
3. Click "Your API Key" 
4. Copy your **API Key**

#### TMDB (Official movie stills)
1. Go to [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
2. Create account / sign in
3. Request API key (free for non-commercial)
4. Copy your **API Key (v3 auth)**

### 2. Configure Environment

```bash
# Copy the example file
cp env.example .env

# Add your keys to .env
UNSPLASH_ACCESS_KEY=your_key_here
PEXELS_API_KEY=your_key_here  
TMDB_API_KEY=your_key_here
```

### 3. Test the Integration

```bash
# Test API configuration
node scripts/test-image-sources.js

# Should show:
# ✅ Unsplash: Connected
# ✅ Pexels: Connected  
# ✅ TMDB: Connected
```

## 🎯 How It Works

### Automatic Image Discovery
When an episode is missing a hero image, the system:

1. **Analyzes episode content** → Extracts themes, mood, visual elements
2. **Searches multiple sources** → Unsplash, Pexels, TMDB in parallel
3. **Filters for 2:1 aspect ratio** → Only shows suitable hero images
4. **Provides one-click download** → Automatic processing and organization

### Smart Search Queries
Each episode type gets tailored search terms:

```javascript
// Film Noir episodes
"german expressionism film shadows dramatic lighting"
"angular shadows geometric lighting black white"

// Contemporary Auteurs  
"americana desert highway vintage diner"
"modern cinema film production artistic"

// Technical Evolution
"film technology digital effects production"
"movie studio equipment cinematography"
```

### Source Priority
1. **TMDB (Official stills)** → Authentic movie imagery
2. **Unsplash (Artistic)** → High-quality, cinematic photography  
3. **Pexels (Versatile)** → Broad selection, good fallback

## 🖼️ Using the Image Browser

### Access the Browser
1. Navigate to any episode missing a hero image
2. Enhanced placeholder shows → click "Find Images"
3. Browser opens with episode-specific results

### Filter and Select
- **Source filter**: All, Official Stills, Unsplash, Pexels
- **Aspect filter**: 2:1 suitable, Official only, All images
- **Click image** → Automatic download and processing

### Automatic Processing
Selected images are:
- ✅ Downloaded to correct `/hero/` directory
- ✅ Renamed to match episode conventions
- ✅ Episode JSON updated with image path
- ✅ Attribution saved for licensing compliance

## 📊 API Limits & Costs

### Free Tier Limits
- **Unsplash**: 50 requests/hour (sufficient for ~12 episodes)
- **Pexels**: 200 requests/hour (sufficient for ~50 episodes)
- **TMDB**: 40 requests/10 seconds (essentially unlimited)

### Cost Considerations
- ✅ **All completely free** for educational/non-commercial use
- ✅ **Unsplash/Pexels** images are license-free for commercial use
- ✅ **TMDB** stills fall under fair use for educational content

### Rate Limiting
If you hit limits:
- **Wait 1 hour** for reset (automatic)
- **Use different source** temporarily
- **Upgrade to paid tier** if needed (Unsplash $10/month, Pexels $20/month)

## 🔧 Advanced Configuration

### Custom Search Terms
Edit `/lib/image-sources.js` to customize search queries:

```javascript
getEpisodeSearchQueries(episode) {
  // Add your custom search logic
  if (title.includes('your-keyword')) {
    queries.push('your custom search terms');
  }
}
```

### Image Processing
Modify `/pages/api/download-image.js` for:
- Custom image sizing/cropping
- Watermark removal
- Color adjustment
- Format conversion

### Batch Processing
```bash
# Process multiple episodes at once
node scripts/batch-image-discovery.js

# Generate images for all missing episodes
node scripts/auto-populate-images.js
```

## 🎨 Integration with Enhanced Placeholders

The enhanced placeholder system works seamlessly:

1. **Missing image detected** → Placeholder shows with "Find Images" button
2. **Visual guidance displayed** → Shows mood, colors, elements needed
3. **Source browser opens** → Pre-filtered for episode theme
4. **One-click selection** → Image downloaded and applied automatically

## 📋 Troubleshooting

### Common Issues

**"No images found"**
- Check API keys in `.env` file
- Try broader search terms
- Check rate limits haven't been exceeded

**"Download failed"**  
- Check file permissions on `/public/images/hero/` directory
- Ensure sufficient disk space
- Check network connectivity

**"API authentication failed"**
- Verify API keys are correct
- Check for extra spaces in `.env` file
- Ensure keys haven't expired

### Testing Commands
```bash
# Test individual APIs
node -e "require('./lib/image-sources').UnsplashSource().searchImages('film noir')"

# Check configuration
node -e "console.log(require('./lib/image-sources').configureImageSources())"

# Verify directory permissions
ls -la public/images/hero/
```

## 🚀 Benefits Summary

**Time Savings:**
- 90% reduction in manual image sourcing
- Automatic organization and processing
- No more copy-paste of Midjourney prompts

**Quality Assurance:**
- Episode-specific search terms
- Automatic 2:1 aspect ratio filtering
- Professional photography sources

**Legal Compliance:**
- Automatic attribution tracking
- License-compliant image sources
- Fair use documentation for movie stills

**Workflow Integration:**
- Seamless with existing batch processing tools
- Enhanced placeholder visual guidance
- One-click image replacement system

With this setup, you can source high-quality hero images in seconds instead of spending 10+ minutes per image with Midjourney!