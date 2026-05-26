# MovieGenius Tier Specification

**Created:** 2026-05-26
**Status:** Canonical source of truth for tier naming
**Purpose:** Define the official 5-tier progression system for MovieGenius

## Official Tier Names (5-Tier System)

The MovieGenius app uses a 5-tier progression system for categorizing film knowledge and experience. These are the **ONLY** valid tier names:

### Canonical Names (in order from easiest to hardest)

1. **Beginner** (Tier 0) - Entry level, most accessible films
2. **Fan** (Tier 1) - Casual enthusiast level
3. **Expert** (Tier 2) - Knowledgeable film viewer
4. **Auteur** (Tier 3) - Deep appreciation for film as art
5. **Genius** (Tier 4) - Master level, most challenging films

## Usage Guidelines

- **These names are final and canonical**
- All code, tests, and data files must use these exact names
- Case-sensitive: Use exact capitalization as shown above
- No variations, synonyms, or alternatives are permitted

## Invalid/Deprecated Names

The following names are **INVALID** and must not be used:

### From 10-tier system (deprecated):
- Essential, Foundational, Classics, Well-Versed, Devotee
- Connoisseur, Deep Cuts, Specialist, Archivist, Master

### From journey-themed system (replaced):
- Wanderer, Explorer, Adventurer, Seeker

### Other invalid variations:
- Novice, Intermediate, Advanced
- Apprentice, Journeyman
- Enthusiast, Scholar, Sage

## Files That Must Use These Names

- `/ios/moviegenius/moviegenius/Resources/genius_data.json` - Data file
- `/ios/moviegenius/moviegenius/Views/GeniusView.swift` - UI display
- `/ios/moviegenius/moviegenius/Services/GeniusDataStore.swift` - Data loading
- `/ios/moviegenius/moviegenius/ViewModels/GeniusViewModel.swift` - Progress tracking
- All test files that verify tier functionality

## Color Progression

Tiers map to visual progression (implementation in CategoryBadgeColors.swift):
- **Beginner** - Light gray
- **Fan** - Bronze
- **Expert** - Copper
- **Auteur** - Rose gold
- **Genius** - Gold

## Migration Notes

This specification replaces all previous tier naming systems. Any code or data using different names must be updated to match this specification.

---

**Remember:** When in doubt, refer to this file. These 5 names are the single source of truth.