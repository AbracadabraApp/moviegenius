# Hero Image Processing Scripts

This directory contains tools to streamline your hero image workflow and eliminate the time-consuming manual process.

## 🚀 Quick Start

```bash
# Run the interactive batch processor
node scripts/hero-image-processor.js

# Check what images are missing
node scripts/hero-image-processor.js
# Choose option 4 for missing images report
```

## 📁 Files Overview

### `hero-image-processor.js`
**Main batch processing tool** - Your time-saver for organizing Midjourney images

**Features:**
- ✅ **Auto-organizes** downloaded images into correct `/hero/` directories
- ✅ **Renames** images to match episode naming conventions
- ✅ **Updates** episode JSON files with correct hero image paths  
- ✅ **Moves** processed files to avoid re-processing
- ✅ **Reports** which episodes still need images

**Modes:**
1. **Process Downloads** - Scans your Downloads folder for new images
2. **Interactive Assignment** - Manually assign existing images to episodes
3. **Bulk Update** - Standardize all episode JSON paths
4. **Missing Report** - Generate list of episodes needing images

### `midjourney-prompts.json`
**Comprehensive prompt templates** for consistent, high-quality hero images

**Contents:**
- 📝 **Episode-specific prompts** for each theme/series
- 🎨 **Style modifiers** for lighting, mood, and cinematography
- ⚡ **Quick prompts** for rapid generation
- 📚 **Prompt builder** with examples and structure

## 🔄 Typical Workflow

### Step 1: Generate Images
```bash
# Use prompts from midjourney-prompts.json
# Example for Coen Brothers episode:
"Quirky americana landscape, vintage roadside diner, desert highway, 
eccentric character silhouettes, retro americana with dark humor undertones, 
wide angle composition, professional cinematography, warm golden lighting, 
--ar 2:1 --style raw"
```

### Step 2: Process Downloads
```bash
node scripts/hero-image-processor.js
# Choose option 1: Process downloaded images
# Script will guide you through organization
```

### Step 3: Check Progress
```bash
# Generate missing images report
node scripts/hero-image-processor.js
# Choose option 4: Generate missing image list
```

## 📋 Episode-Specific Prompts

### Film Noir Series
- **German Expressionism**: Distorted angular shadows, painted backdrop aesthetic
- **Urban Anxiety**: Claustrophobic city atmosphere, psychological tension
- **Femme Fatales**: Mysterious woman silhouette, dangerous beauty

### Contemporary Auteurs
- **Coen Brothers**: Quirky americana, vintage diner, dark humor undertones

### Technical Evolution  
- **Digital Revolution**: CGI workstation, digital vs practical effects

### Decades Series
- **1970s Auteur**: New Hollywood atmosphere, counterculture influence
- **1990s Independent**: Sundance festival vibe, indie film aesthetic

## 🎯 Style Guidelines

**Consistent Elements:**
- Aspect Ratio: `--ar 2:1` (always)
- Quality: `--style raw` for cinematic results
- Lighting: Warm golden hour, dramatic shadows
- Mood: Sophisticated, intellectual, museum quality
- Composition: Professional cinematography

**Color Palette:**
- Warm golds and earth tones
- Rich contrast and deep shadows  
- Film noir-inspired lighting
- Criterion Collection aesthetic

## 🔧 Advanced Usage

### Batch Process Multiple Images
```bash
# Process all images in Downloads at once
node scripts/hero-image-processor.js
# Choose option 1, then "all" when prompted
```

### Update Existing Paths
```bash
# Standardize all episode JSON hero image paths
node scripts/hero-image-processor.js  
# Choose option 3: Bulk update episode JSON files
```

### Custom Organization
```bash
# Manually assign specific images to episodes
node scripts/hero-image-processor.js
# Choose option 2: Interactive image assignment
```

## 📊 Time Savings

**Before:** Manual process taking 5-10 minutes per image
- Download from Midjourney
- Manually rename file
- Move to correct directory
- Edit episode JSON file
- Update image path

**After:** Automated process taking 30 seconds per image
- Download from Midjourney  
- Run script, select image and episode
- Everything else handled automatically

**Result:** ~90% time reduction on hero image management

## 🎨 Next Steps

1. **Enhanced Placeholders** - Visual guidance system (coming next)
2. **Alternative Sources** - Unsplash/Pexels integration options
3. **Automated Optimization** - Image compression and formatting
4. **Batch Generation** - API integration possibilities

This system transforms your hero image workflow from a manual chore into a streamlined, professional process.