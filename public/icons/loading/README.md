# Loading Icons

This folder contains cinema-themed loading icons for the movie detail page.

## Required Files

Create these 40px × 40px PNG files:

1. **film-reel.png** - Classic film reel with holes around perimeter (iconfinder reference)
2. **movie-projector.png** - Vintage movie projector (uxwing reference) 
3. **film-minimalist.png** - Clean, minimalist film reel (Noun Project reference)

## Adding New Icons

To add more loading icons:
1. Add PNG file to this folder
2. Update the `iconFiles` array in `/pages/movie/[slug].js`

## Specifications

- **Size**: 40px × 40px
- **Format**: PNG (with transparency)
- **Style**: Cinema/film themed
- **Color**: Gray tones (#6b7280 recommended)

## Usage

Icons are randomly selected on each page load for visual variety.