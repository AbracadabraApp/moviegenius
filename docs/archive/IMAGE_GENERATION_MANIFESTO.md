# MovieGenius Background Images - Generation Manifesto

## Technical Specifications

**Required Dimensions:** 1080px × 1920px (9:16 portrait, Full HD)
**Aspect Ratio:** 0.5625 (9:16)
**Format:** JPG
**Quality:** High (suitable for retina displays)
**Total Images Needed:** 29

## Image Requirements

### Composition Guidelines
- **Portrait orientation** (vertical/tall format)
- **Cinematic aesthetic** - sophisticated, film-related imagery
- **Minimal text** - no words or readable text
- **Center-focused subjects** - important elements in center third
- **Avoid edge details** - nothing critical near left/right edges
- **Dark/moody tones** - works well with overlays

### Content Themes
Classic cinema imagery suitable for a movie discovery app homepage:
- Vintage film equipment (cameras, projectors, film reels)
- Classic movie theater aesthetics (seats, curtains, marquees)
- Cinematic lighting (spotlights, stage lights, dramatic shadows)
- Film noir atmospheres (rain-slicked streets, venetian blinds)
- Golden age Hollywood imagery
- Abstract cinema-related compositions
- Artistic interpretations of movie-making

### Style Guidelines
- Professional cinematography quality
- Warm golden lighting preferred
- Rich contrast and depth
- Museum-quality composition
- Editorial photography style
- Timeless, not trendy
- Sophisticated and artistic

## Midjourney Generation Prompt Template

```
[SUBJECT DESCRIPTION], cinematic background image, portrait orientation, sophisticated film aesthetic, warm golden lighting, rich contrast, professional cinematography, museum quality composition, editorial photography style, no text, center-focused composition --ar 9:16 --v 6 --style raw
```

## Example Prompts

1. **Vintage Film Camera**
```
Vintage 35mm film camera on wooden desk, cinematic background image, portrait orientation, sophisticated film aesthetic, warm golden lighting, rich contrast, professional cinematography, museum quality composition, editorial photography style, no text, center-focused composition --ar 9:16 --v 6 --style raw
```

2. **Movie Theater Interior**
```
Classic movie theater red velvet seats and stage curtain, cinematic background image, portrait orientation, sophisticated film aesthetic, warm golden lighting, rich contrast, professional cinematography, museum quality composition, editorial photography style, no text, center-focused composition --ar 9:16 --v 6 --style raw
```

3. **Film Noir Street Scene**
```
Rain-slicked city street at night with vintage street lamps, film noir atmosphere, cinematic background image, portrait orientation, sophisticated film aesthetic, dramatic lighting, rich contrast, professional cinematography, museum quality composition, editorial photography style, no text, center-focused composition --ar 9:16 --v 6 --style raw
```

## Post-Processing
- Ensure 1080×1920 exact dimensions
- Export as high-quality JPG (85-95% quality)
- Verify file size reasonable (<400KB per image)
- Check center focus (important elements visible when width-cropped)

## Current Usage Context
- Displayed on homepage at 359×651px viewport
- Random image selected on each page load
- Dark overlay applied when search results shown
- Images must work well with semi-transparent dark gradient overlay

## Quality Checklist
- [ ] Correct dimensions: 1080×1920
- [ ] Portrait orientation
- [ ] Cinema-related subject
- [ ] No text or readable words
- [ ] Center-focused composition
- [ ] Sophisticated aesthetic
- [ ] Works with dark overlay
- [ ] High quality, no pixelation
- [ ] File size <400KB
