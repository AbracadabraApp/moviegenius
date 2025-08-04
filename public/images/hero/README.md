# Hero Images Directory Structure

This directory contains hero images for the genius episodes, organized by series for easy management.

## Directory Structure

```
/images/hero/
├── film-noir/                    # Film Noir series (reference model)
├── contemporary-auteurs/         # Contemporary Auteurs series
├── technical-evolution/          # Technical Evolution series  
├── decades/                      # Decades series
└── [other-series]/              # Additional series as needed
```

## Image Requirements

- **Aspect Ratio:** 2:1 (e.g., 1200x600px)
- **Format:** JPG or PNG
- **Size:** Optimized for web (typically 100-300KB)
- **Quality:** High enough for hero display

## Naming Convention

Use descriptive names that match the episode content:
- `1-coen-brothers.jpg`
- `5-digital-revolution.jpg` 
- `1-1970s-auteur-renaissance.jpg`

## Placeholder System

If a hero image is missing, the system will automatically display a placeholder with:
- 🎬 icon
- "Hero Image Placeholder" text
- Episode title for context

## Adding New Images

1. Place images in the appropriate series directory
2. Use the naming convention above
3. Update the episode JSON file's `heroImage` field if needed
4. Test that the image displays correctly

## Current Status

The following episodes need hero images:
- `/hero/contemporary-auteurs/1-coen-brothers.jpg`
- `/hero/technical-evolution/5-digital-revolution.jpg`
- `/hero/decades/1-1970s-auteur-renaissance.jpg`
- `/hero/decades/3-1990s-independent-renaissance.jpg`

These will show placeholders until images are added.