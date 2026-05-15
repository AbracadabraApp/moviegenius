# MovieGenius Priority Roadmap

**Last Updated:** 2026-05-11
**Purpose:** Clear prioritization of all major improvements
**Status:** Strategic Planning

---

## Catalog Completeness Tiers

**Not all completeness is equal.** Movies progress through tiers of value:

| Tier | Features | Value Delivered | Current Status |
|------|----------|-----------------|----------------|
| **Tier 0** | Title + Poster | Discoverable (searchable/browsable) | 98.8% (32,554/32,953) |
| **Tier 1** | + WhyWatch + Analysis | Provides recommendation value | 39.9% (13,145/32,953) |
| **Tier 2** | + Contributors | Person-based discovery | 41.4% (13,645/32,953) |
| **Tier 3** | + Trailers | Video preview | 45.6% (15,020/32,953) |

**Priority:** Backfill sequentially (Tier 1 → Tier 2 → Tier 3) to maximize value delivery per dollar spent.

---

## Priority 0: CRITICAL - Site Survival

### P0.1: Fix UseOnce Violations (Week 1)
**Problem:** 7,900 TMDB calls/day approaching free tier limit (10,000/day)
**Impact:** Site will break if rate limited
**Effort:** 1 week
**Cost:** $0

**What to fix:**
1. `movie-details.js` - Verify DB-first compliance
2. `tmdb-person-details.js` - Add DB-first check
3. `youtube-trailer-search.js` - Cache trailers in DB
4. `tmdb-genre-search.js` - Save genre search results
5. `tmdb-credits.js` - Cache credits (backend only, low priority)

**Success metric:** TMDB calls < 1,000/day (88% reduction)

**Blockers:** None
**Dependencies:** None
**Owner:** Engineering

---

## Priority 1: HIGH - Catalog Completeness

### P1.1: Build Enrichment Pipeline (Weeks 2-3)
**Problem:** 60% of catalog incomplete (missing analysis, WhyWatch, cast, trailers)
**Impact:** Inconsistent user experience, incomplete movie pages, MoreIdeas failures
**Effort:** 2 weeks
**Cost:** $0 dev, infrastructure ready

**What to build:**
1. Add enrichment_status tracking to movies table
2. Build background worker with priority queue
3. Implement setPriority() logic
4. Deploy worker for new movies only

**Success metric:** New movies 95%+ complete within 24 hours

**Blockers:** P0.1 must complete first (TMDB usage under control)
**Dependencies:** UseOnce compliance
**Owner:** Engineering

---

### P1.2a: Backfill Tier 1 - Core Value (Weeks 4-5)
**Problem:** 13,600 movies have title+poster but missing WhyWatch + Analysis
**Impact:** Movies discoverable but provide no recommendation value
**Effort:** 2 weeks
**Cost:** $1,632 one-time (AI generation)

**Tier Structure:**
- **Tier 0 (Baseline)**: Title + Poster (98.8% complete - already done)
- **Tier 1 (Core Value)**: + WhyWatch + Analysis (this backfill)

**What to backfill:**
- 13,583 missing analyses (200-word concise format)
- 13,664 missing WhyWatch (YES/NO + 3 reasons)
- Priority: Popular movies first (TMDB popularity score)

**Success metric:** 95%+ of movies have Tier 1 complete (title + poster + WhyWatch + analysis)

**Blockers:** P1.1 must be stable (worker tested and deployed)
**Dependencies:** Enrichment Pipeline operational
**Owner:** Engineering + Budget approval for $1,632

---

### P1.2b: Backfill Tier 2 - Enhancement (Week 6)
**Problem:** 19,308 movies at Tier 1 but missing contributors
**Impact:** Person-based discovery incomplete ("More like this" by actor/director)
**Effort:** 1 week
**Cost:** $0 (TMDB fetch only, UseOnce-compliant)

**Tier Structure:**
- **Tier 2 (Enhancement)**: Tier 1 + Contributors

**What to backfill:**
- 19,308 missing contributors (cast/crew)
- Fetch via existing `tmdb-credits.js` (UseOnce-compliant)
- No AI cost, just TMDB API calls

**Success metric:** 95%+ of movies have Tier 2 complete (title + poster + WhyWatch + analysis + contributors)

**Blockers:** P1.2a complete (Tier 1 delivered first)
**Dependencies:** UseOnce violations fixed (P0.1)
**Owner:** Engineering

---

### P1.2c: Backfill Tier 3 - Polish (Week 7)
**Problem:** 17,933 movies at Tier 2 but missing trailers
**Impact:** No video preview on movie pages
**Effort:** 1 week
**Cost:** $0 (YouTube search only)
**Priority:** LOW - Optional polish

**Tier Structure:**
- **Tier 3 (Polish)**: Tier 2 + Trailers

**What to backfill:**
- 17,933 missing trailers
- Fetch via existing `youtube-trailer-search.js`
- No AI cost, just YouTube API calls

**Success metric:** 90%+ of movies have Tier 3 complete (all features)

**Blockers:** P1.2b complete (Tier 2 delivered first)
**Dependencies:** UseOnce violations fixed (P0.1)
**Owner:** Engineering
**Note:** Can be deferred to V2 if budget/time constrained

---

## Priority 2: MEDIUM - Quality Improvements

### P2.1: Fix MoreIdeas Matching (Week 3)
**Problem:** 14% of AI recommendations can't match existing movies
**Impact:** Wasted TMDB calls, duplicate movies, poor recommendations
**Effort:** 1 week
**Cost:** $0

**What to fix:**
1. Implement ±1 year fuzzy matching (fixes 4.9%)
2. Add AI confidence scoring (reduces waste)
3. Consider title normalization (fixes 2-3%)

**Success metric:** Match rate >95% (up from 86.7%)

**Blockers:** None (can run in parallel with P1)
**Dependencies:** None
**Owner:** Engineering

---

### P2.2: Improve Search Quality (Week 4)
**Problem:** Search returns mix of complete/incomplete results
**Impact:** User sees empty movie pages, inconsistent experience
**Effort:** 1 week (mostly automated after P1 complete)
**Cost:** $0

**What to improve:**
- Prioritize complete movies in search results
- Filter out incomplete movies until enriched
- Show enrichment status in search results

**Success metric:** Top 20 search results 100% complete

**Blockers:** P1.1 (need enrichment status tracking)
**Dependencies:** Enrichment Pipeline
**Owner:** Engineering

---

## Priority 3: LOW - Optimizations

### P3.1: Implement "Not Found" Cache (Week 7)
**Problem:** 8.4% of MoreIdeas recommendations not in DB, repeatedly fetched
**Impact:** Wasted TMDB API calls
**Effort:** 3 days
**Cost:** $0

**What to build:**
- Cache failed lookups in `movie_lookup_failures` table
- Skip TMDB fetch for known failures
- Saves ~250 TMDB calls per audit

**Success metric:** ~$15/year savings

**Blockers:** None (low priority optimization)
**Dependencies:** None
**Owner:** Engineering (when time available)

---

### P3.2: Add Monitoring Dashboard (Week 8)
**Problem:** No visibility into catalog health, enrichment status, TMDB usage
**Impact:** Can't detect issues early, no metrics for optimization
**Effort:** 1 week
**Cost:** $0

**What to build:**
- Daily TMDB usage chart
- Catalog completeness percentage
- Enrichment queue depth
- DB hit rate
- Top incomplete movies

**Success metric:** Real-time visibility into system health

**Blockers:** P1.1 complete (need enrichment infrastructure)
**Dependencies:** Enrichment Pipeline
**Owner:** Engineering

---

## Priority 4: DEFERRED - V2 Features

### P4.1: Streaming Data Refresh (V2)
**Problem:** Streaming availability becomes stale (7+ days old)
**Impact:** "Where to watch" section outdated
**Effort:** 2 weeks
**Cost:** ~$20/month ongoing

**What to build:**
- Staleness tracking per movie
- Weekly refresh for active movies only
- View-based prioritization

**Success metric:** <7 days old for active movies

**Blockers:** None (deferred to V2)
**Dependencies:** None
**Owner:** Engineering (V2 planning)

---

### P4.2: Full Search Results Page (V2)
**Problem:** Search dropdown only, no browse/compare UI
**Impact:** Limited discovery, can't compare multiple options
**Effort:** 2 weeks
**Cost:** $0

**What to build:**
- `/search?q={query}` results page
- SearchResultCard with WhyWatch preview
- Grid/list view toggle
- Filters (year, genre, sort)

**Success metric:** Enhanced discovery experience

**Blockers:** None (deferred to V2)
**Dependencies:** None
**Owner:** Engineering (V2 planning)

---

## Summary by Priority

| Priority | Item | Effort | Cost | Impact | Status |
|----------|------|--------|------|--------|--------|
| **P0.1** | Fix UseOnce violations | 1w | $0 | Site survival | Ready |
| **P1.1** | Enrichment Pipeline | 2w | $0 | Catalog infrastructure | Blocked by P0.1 |
| **P1.2a** | Tier 1 backfill (WhyWatch+Analysis) | 2w | $1,632 | Core value complete | Blocked by P1.1 |
| **P1.2b** | Tier 2 backfill (Contributors) | 1w | $0 | Discovery enabled | Blocked by P1.2a |
| **P1.2c** | Tier 3 backfill (Trailers) | 1w | $0 | Enhancement (optional) | Blocked by P1.2b |
| **P2.1** | MoreIdeas matching | 1w | $0 | Recommendation quality | Ready |
| **P2.2** | Search quality | 1w | $0 | UX consistency | Blocked by P1.1 |
| **P3.1** | Not Found cache | 3d | $0 | Small optimization | Ready |
| **P3.2** | Monitoring | 1w | $0 | Visibility | Blocked by P1.1 |
| **P4.1** | Streaming refresh | 2w | $20/mo | V2 feature | Deferred |
| **P4.2** | Full search page | 2w | $0 | V2 feature | Deferred |

---

## Timeline

### Weeks 1-7: Critical Path (Must Complete)

```
Week 1: P0.1 UseOnce fixes (CRITICAL)
├─ Fix 5 UseOnce violations
├─ Verify movie-details.js
└─ Monitor TMDB usage drops to <1,000/day

Week 2-3: P1.1 Enrichment Pipeline + P2.1 MoreIdeas (Parallel)
├─ Build worker infrastructure
├─ Test on 100 movies
├─ Deploy for new movies
└─ P2.1: Year fuzzy matching + confidence scoring

Week 4-5: P1.2a Tier 1 Backfill (WhyWatch + Analysis) + P2.2 Search
├─ Start Tier 1 backfill (5 movies/min)
├─ Monitor costs and API limits
├─ Increase to 10 movies/min
├─ Complete 13,600 movies (AI generation)
└─ P2.2: Prioritize complete results in search

Week 6: P1.2b Tier 2 Backfill (Contributors)
├─ Fetch contributors via TMDB (UseOnce-compliant)
├─ Complete 19,300 movies
└─ No AI cost, just TMDB API calls

Week 7: P1.2c Tier 3 Backfill (Trailers) [Optional]
├─ Fetch trailers via YouTube search
├─ Complete 17,900 movies
└─ Can be deferred if time/budget constrained
```

**End of Week 5 (Tier 1 Complete):**
- ✅ TMDB usage under control (<1,000/day)
- ✅ Core value features 95%+ complete (WhyWatch + Analysis)
- ✅ MoreIdeas match rate >95%
- ✅ Search returns WhyWatch-complete results

**End of Week 7 (All Tiers Complete):**
- ✅ Full catalog 95%+ complete (all features)
- ✅ Discovery features working (person-based search)
- ✅ Video previews available

---

### Weeks 8-9: Optimizations (Nice to Have)

```
Week 8: P3.1 Not Found cache
└─ Small optimization, low effort

Week 9: P3.2 Monitoring dashboard
└─ Visibility and metrics
```

---

### V2 (Q3 2026): Deferred Features

```
Q3 2026:
├─ P4.1: Streaming refresh
└─ P4.2: Full search results page
```

---

## Dependencies Graph

```
P0.1 (UseOnce fixes)
  └─> P1.1 (Enrichment Pipeline)
        ├─> P1.2a (Tier 1: WhyWatch + Analysis)
        │     └─> P1.2b (Tier 2: Contributors)
        │           └─> P1.2c (Tier 3: Trailers) [Optional]
        ├─> P2.2 (Search quality)
        └─> P3.2 (Monitoring)

P2.1 (MoreIdeas matching) [Independent, can run parallel with P1.1]
P3.1 (Not Found cache) [Independent, low priority]
P4.x (V2 features) [Independent, deferred to Q3 2026]
```

**Key insight:** Tiers are sequential - each tier must complete before the next begins. This allows:
- Budget approval for Tier 1 only ($1,632)
- Evaluate Tier 2/3 value after Tier 1 delivers
- Defer Tier 3 to V2 if needed

---

## Budget Summary

### One-Time Costs
- **P1.2a Tier 1 Backfill:** $1,632 (AI generation for 13,600 movies)
- **P1.2b Tier 2 Backfill:** $0 (TMDB fetch, UseOnce-compliant)
- **P1.2c Tier 3 Backfill:** $0 (YouTube search)
- **Total:** $1,632

**Tiered Investment Strategy:**
- **Minimum viable**: $1,632 for Tier 1 only (core value)
- **Full investment**: $1,632 for all tiers (Tier 2/3 are free, just time)
- **Deferred option**: Complete Tier 1, evaluate Tier 2/3 based on user feedback

### Ongoing Costs
- **Enrichment (new movies):** ~$300/month (1,800 movies × $0.17)
- **Worker compute:** ~$20/month
- **P4.1 Streaming refresh (V2):** ~$20/month
- **Total:** ~$320/month (V1), ~$340/month (V2)

### ROI
**P0.1 (UseOnce):**
- **Cost:** $0
- **Benefit:** Site stays online (priceless)

**P1.2a (Tier 1 Completeness):**
- **Cost:** $1,632 one-time + $300/month ongoing
- **Benefit:** Core value delivered (WhyWatch + Analysis for all movies)
- **Impact:** Movies provide recommendations, not just metadata

**P1.2b (Tier 2 Completeness):**
- **Cost:** $0 (TMDB fetch only)
- **Benefit:** Person-based discovery ("More like this" by actor/director)
- **Impact:** Enhanced discovery, no additional cost

**P1.2c (Tier 3 Completeness):**
- **Cost:** $0 (YouTube search only)
- **Benefit:** Video previews
- **Impact:** Polish, can be deferred if needed

**P2 (Quality Improvements):**
- **Cost:** $0
- **Benefit:** Better recommendations, search quality

**Tiered Investment Strategy:**
- **Minimum viable**: $1,632 for Tier 1 only (95% value)
- **Full investment**: $1,632 + time for all tiers (100% value)
- **ROI**: Tier 1 delivers most value per dollar, Tier 2/3 are free time investments

**Total investment:** $1,632 one-time + $320/month
**Alternative:** Accept 60% incomplete catalog + risk of rate limiting (unacceptable)

---

## Success Criteria

### Week 1 (P0.1 complete):
- [ ] TMDB calls < 1,000/day (down from 7,900)
- [ ] DB hit rate > 90%
- [ ] No rate limiting errors in logs

### Week 3 (P1.1 + P2.1 complete):
- [ ] New movies 95%+ complete within 24 hours
- [ ] MoreIdeas match rate >95% (up from 86.7%)
- [ ] Enrichment worker stable and monitored

### Week 5 (P1.2a Tier 1 complete):
- [ ] 95%+ of catalog at Tier 1 (title + poster + WhyWatch + analysis)
- [ ] Core value delivered - movies provide recommendations
- [ ] Search returns recommendation-complete results

### Week 6 (P1.2b Tier 2 complete):
- [ ] 95%+ of catalog at Tier 2 (Tier 1 + contributors)
- [ ] Person-based discovery enabled
- [ ] "More like this" working for cast/crew

### Week 7 (P1.2c Tier 3 complete):
- [ ] 90%+ of catalog at Tier 3 (Tier 2 + trailers)
- [ ] Full feature completeness achieved
- [ ] Video previews available

### Week 9 (P3 complete):
- [ ] Monitoring dashboard live
- [ ] Not Found cache reducing waste
- [ ] System fully optimized

---

## Risk Mitigation

### Risk: Budget approval delays P1.2
**Mitigation:** P1.1 (enrichment pipeline) still delivers value for new movies. Backfill can wait if needed.

### Risk: TMDB rate limits us before P0.1 completes
**Mitigation:** Emergency fix - add aggressive caching, reduce TMDB calls immediately. P0.1 becomes drop-everything priority.

### Risk: Backfill costs more than estimated
**Mitigation:** Start slow (5 movies/min), monitor costs daily, adjust rate or pause if needed. Can spread over 2-3 weeks instead of 1 week.

### Risk: Enrichment worker has bugs/failures
**Mitigation:** Test on 100 movies first, monitor error rates, roll back if >5% failure rate. Keep old system as fallback.

---

## Decision Points

### After P0.1 (Week 1):
**Question:** Are TMDB calls under control?
- **Yes:** Proceed to P1.1
- **No:** Debug further, identify remaining offenders

### After P1.1 (Week 3):
**Question:** Is enrichment worker stable? Are new movies completing?
- **Yes:** Proceed to P1.2 backfill
- **No:** Fix worker issues, delay backfill

### After P1.2a Tier 1 complete (Week 5):
**Question:** Is Tier 1 delivering value? Should we proceed to Tier 2?
- **Yes:** Users engaging with WhyWatch, proceed to Tier 2 (contributors)
- **No:** Debug Tier 1 quality issues, delay Tier 2

### After P1.2b Tier 2 complete (Week 6):
**Question:** Is Tier 2 needed? Should we proceed to Tier 3?
- **Yes:** Person-based discovery valuable, proceed to Tier 3 (trailers)
- **Defer:** Tier 3 is polish only, can wait until V2 if time-constrained

### After P1.2a start (Week 4):
**Question:** Are costs/API usage within budget?
- **Yes:** Continue at current rate
- **No:** Slow down to 3 movies/min, extend timeline

---

## Related Documentation

- `/docs/strategies/CATALOG_MANAGEMENT_STRATEGY.md` - Complete strategy
- `/docs/strategies/MOREIDEAS_MATCHING_STRATEGY.md` - P2.1 details
- `/docs/V2_DATA_REFRESH.md` - P4.1 details
- `/docs/V2_SEARCH_FEATURES.md` - P4.2 details

---

**Document Status:**
- Version: 1.0
- Owner: Engineering + Product
- Next Review: After each priority completes
- **This is the canonical prioritization. All work follows this order.**
