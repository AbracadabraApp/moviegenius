# Awards Scraper Workflow

**Created:** 2026-05-15
**Purpose:** Add prestigious film award lists (Palme d'Or, BAFTA, Sight & Sound) to MovieGenius

---

## Complete Workflow

### 1. Scrape Wikipedia (Python)

```bash
# Install dependencies
pip install requests beautifulsoup4 lxml

# Scrape WITHOUT TMDB enrichment (we use native MovieGenius scripts)
python scrape_awards.py

# Or scrape individual lists
python scrape_awards.py --only palme
python scrape_awards.py --only bafta
python scrape_awards.py --only ss
```

**Output files:**
- `data/palme_dor.json` - Cannes Palme d'Or winners (1955-present)
- `data/bafta_best_film.json` - BAFTA Best Film winners (1947-present)
- `data/sight_and_sound_2022_critics.json` - S&S Critics' Poll (top 100)
- `data/sight_and_sound_2022_directors.json` - S&S Directors' Poll (top 100)
- `data/all_lists.json` - Combined output

**JSON format:**
```json
{
  "name": "Cannes Palme d'Or",
  "source_url": "https://en.wikipedia.org/wiki/Palme_d%27Or",
  "description": "Highest prize at the Cannes Film Festival...",
  "count": 78,
  "entries": [
    {
      "year": 2023,
      "title": "Anatomy of a Fall",
      "director": "Justine Triet",
      "country": "France"
    }
  ]
}
```

---

### 2. Process to Database (Node.js)

Uses MovieGenius native TMDB infrastructure:
- **TMDBResolver** (`lib/tmdb-resolver.js`) - Multi-stage title-to-TMDB-ID resolution
- **ensureMovieInDb** (`lib/services/tmdb-persist.js`) - Add movies to database
- **browse_lists** - Create curated list entries

```bash
# Dry run (test resolution without writing)
node scripts/process-awards-to-db.cjs data/palme_dor.json --dry-run

# Process one list
node scripts/process-awards-to-db.cjs data/palme_dor.json

# Process all lists at once
node scripts/process-awards-to-db.cjs data/all_lists.json --all

# Debug mode (verbose output)
node scripts/process-awards-to-db.cjs data/bafta_best_film.json --debug
```

**What it does:**
1. **Phase 1:** Resolve titles to TMDB IDs using TMDBResolver
   - Stage 1: Normalized match against `movies.title_normalized`
   - Stage 2: TMDB API search for official title
   - Stage 3: Year fuzzy match (±5 years)

2. **Phase 2:** Ensure movies exist in database
   - Fetch full TMDB metadata
   - Insert into `movies` table (if not exists)
   - Download posters, genres, etc.

3. **Phase 3:** Create `browse_lists` entry
   - Structure: `editorial_data.subcategories[0].movies`
   - Categories: `["Awards"]` (+ genre if applicable)
   - Quality score: 95 (curated lists)
   - Status: `active`

**Output:**
```
✅ Resolved: 78/78
❌ Not found: 0/78

💾 Adding movies to database...
✅ Added: 78

📝 Creating browse_lists entry...
✅ Created browse_lists entry: uuid-here

=== SUMMARY ===
Cannes Palme d'Or:
  Resolved: 78
  Not found: 0
  Browse list ID: uuid-here
  Categories: Awards
```

---

### 3. Add to iOS GeniusView (Swift)

Currently, Awards category has:
- Best Picture (Oscars)
- Best Director (Oscars)
- Best Actor (Oscars)
- Best Actress (Oscars)
- AFI 100 Greatest Films

**Add these new lists:**
- Palme d'Or (Cannes)
- BAFTA Best Film
- Sight & Sound Critics' Poll
- Sight & Sound Directors' Poll

#### iOS Integration: All awards at same level

**File:** `ios/moviegenius/moviegenius/Views/GeniusView.swift`

**Line ~1180 (in `subcategoriesForCategory` function):**
```swift
case "Awards":
    return [
        "Best Picture",
        "Best Director",
        "Best Actor",
        "Best Actress",
        "AFI 100 Greatest Films",
        "Palme d'Or",              // NEW - Cannes
        "BAFTA Best Film",         // NEW - British Academy
        "Critics' Poll",           // NEW - Sight & Sound 2022
        "Directors' Poll"          // NEW - Sight & Sound 2022
    ]
```

**Line ~1450+ (in `CategoryEssentials` static data):**
```swift
case ("Awards", "Palme d'Or"):
    return [
        EssentialMovie(title: "Anatomy of a Fall", year: 2023, director: "Justine Triet", ...),
        EssentialMovie(title: "Triangle of Sadness", year: 2022, director: "Ruben Östlund", ...),
        // ... rest of Palme d'Or winners
    ]

case ("Awards", "BAFTA Best Film"):
    return [
        // BAFTA winners
    ]

case ("Awards", "Critics' Poll"):
    return [
        // Sight & Sound 2022 Critics top 100
    ]

case ("Awards", "Directors' Poll"):
    return [
        // Sight & Sound 2022 Directors top 100
    ]
```

**Design rationale:**
- ✅ All awards (US + International) at same level
- ✅ Clean chip names (removed "S&S" prefix)
- ✅ Full context available in editorial_data description

---

## Data Sources

### Cannes Palme d'Or
- **Wikipedia:** https://en.wikipedia.org/wiki/Palme_d%27Or
- **Coverage:** 1955-present (~78 winners)
- **Notes:** Highest prize at Cannes Film Festival

### BAFTA Best Film
- **Wikipedia:** https://en.wikipedia.org/wiki/BAFTA_Award_for_Best_Film
- **Coverage:** 1947-present (~77 winners)
- **Notes:** British Academy Film Awards

### Sight & Sound 2022
- **Wikipedia:** https://en.wikipedia.org/wiki/The_Sight_and_Sound_Greatest_Films_of_All_Time_2022
- **Coverage:** Top 100 from critics' poll + top 100 from directors' poll
- **Notes:** BFI decennial poll (1,639 critics, 480 directors)
- **Previous editions:** 1952, 1962, 1972, 1982, 1992, 2002, 2012, 2022

---

## Maintenance

**Re-scrape annually after:**
- Cannes Film Festival (May)
- BAFTA Film Awards (February)
- Sight & Sound poll (every 10 years, last: 2022, next: 2032)

**Commands:**
```bash
# Re-scrape (cached HTML will be used if recent)
python scrape_awards.py

# Force fresh fetch
python scrape_awards.py --no-cache

# Update database (only new entries will be added)
node scripts/process-awards-to-db.cjs data/all_lists.json --all
```

---

## Files

**Python scraper:**
- `scrape_awards.py` - Wikipedia scraper (331 lines)
- `data/*.json` - Output files (cached)
- `.cache/*.html` - Cached Wikipedia pages

**Node.js processor:**
- `scripts/process-awards-to-db.cjs` - Database integration (229 lines)
- `lib/tmdb-resolver.js` - TMDB resolution engine
- `lib/services/tmdb-search.js` - TMDB API client
- `lib/services/tmdb-persist.js` - Database persistence

**iOS:**
- `ios/moviegenius/moviegenius/Views/GeniusView.swift` - Awards subcategories + film data

---

## Next Steps

1. ✅ Scrape Wikipedia data (Python)
2. ✅ Process to database (Node.js)
3. ⏳ Decide: Add to "Awards" or create "International Awards"?
4. ⏳ Update iOS GeniusView.swift with new subcategories + film data
5. ⏳ Test on iOS device
6. ⏳ Commit and deploy

---

## Notes

- **No TMDB API in scraper:** MovieGenius's native TMDBResolver handles all TMDB operations
- **Wikipedia-compliant:** Descriptive User-Agent, rate limiting, caching
- **High match rate:** TMDBResolver achieves 95%+ success rate with multi-stage strategy
- **Quality score:** Award lists get score of 95 (vs. 80-90 for generated lists)
