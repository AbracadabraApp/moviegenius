# Failed Processes Archive

This directory contains scripts and processes that were attempted but ultimately failed or proved ineffective.

## Claude Analysis keyElements Extraction (Failed)

**Files:**
- `extract-contributors.js` - Original keyElements extraction script
- `extract-contributors-batch.js` - Batched version of keyElements extraction

**Why it failed:**
- Only 4.3% coverage (841 out of 19,355 movies)
- Limited to early analyses that had `claude_response.raw_content.keyElements`
- Most recent analyses don't contain structured keyElements data
- Process couldn't scale to provide meaningful contributor coverage

**Current contributor data sources:**
1. `movie_contributors` table: 68.6% coverage (structured database)
2. `enhanced_key_elements.director`: 99.1% director coverage (fallback)
3. **Not using:** TMDB API credits (potential future source)

**Date archived:** 2025-09-24
**Reason:** Insufficient coverage, replaced by better data sources

## Contributors JSON Population Script (Redundant)

**Files:**
- `populate-contributors-json.js` - Script to populate movies.contributors_json from movie_contributors table

**Why it was mothballed:**
- Production database already has a superior contributors system (67.1% coverage)
- Current system uses object format grouped by role with working person ID linking
- Script would create inferior flat array format
- Redundant with existing working contributors infrastructure

**Current production system:**
- Object format: `{"director": [{"name": "Name", "personId": 123}]}`
- 67.1% movie coverage (13,655/20,363 movies)
- Person linking fully functional with clickable contributors

**Date archived:** 2025-09-24
**Reason:** Redundant with superior existing system