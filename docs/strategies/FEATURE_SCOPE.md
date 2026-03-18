# MovieGenius Feature Scope

**Last Updated:** 2026-03-17
**Production Status:** Live, needs stabilization

---

## 📋 V1: Launch Features

**Goal:** Fix broken functionality + layout polish
**Timeline:** Deploy and test existing features
**Rule:** NO new feature development

### Core Features

**Movie Detail Pages**
- Nuclear static generation (6K+ movies)
- AI analysis display
- "Reasons to Watch" section (from `enhanced_why_watch`)
- "More Ideas" related movies (from `more_ideas`)
- TMDB metadata integration
- PhoneFrame mobile UI

**Search & Discovery**
- SimpleSearch component
- TMDB movie search
- Title search functionality
- Basic search results display

**Infrastructure**
- Nuclear static system
- Railway deployment
- Database connections (Railway PostgreSQL)
- Production monitoring

### Critical Bugs (Must Fix)

| Issue | Description | Priority |
|-------|-------------|----------|
| #22 | SimpleSearch not working in production | 🚨 Critical |
| #25 | camelCase URL routing issues | ⚠️ High |
| #34 | Deployment monitoring system | 🔧 High |

### Layout & UI Polish

- PhoneFrame responsive design
- MediaCard component styling
- Mobile-first optimization
- Typography and spacing
- Visual consistency

### V1 Success Criteria

- [ ] Movie pages load <200ms
- [ ] Search returns accurate results
- [ ] AI analysis renders correctly
- [ ] Mobile UI works smoothly
- [ ] No critical production errors
- [ ] Railway deployment stable

---

## 🚀 V2: Discovery Features

**Goal:** Build serendipitous browse system
**Timeline:** After V1 ships and user data collected
**Dependency:** V1 usage analytics required

### Browse Collections System

**Theme Extraction**
- Extract 3-5 granular themes per movie
- Process all 20,375 analyses (~$20-30 cost)
- Generate 60K-100K theme tags
- Cluster movies by shared themes

**Collection Generation**
- Filter to 2,500-4,000 unique themes
- Require ≥6 movies per collection
- Generate editorial titles (no "films/movies")
- Create collection descriptions

**Examples:**
- "In the Ring" (boxing dramas)
- "Vietnam's Shadows" (war trauma)
- "Exposing Corruption" (whistleblowers)
- "Caught in Time" (time loops)

### Quality Scoring (V2.1)

**Based on Real V1 Usage Data:**
- Engagement tracking (clicks, watches)
- Bounce rate analysis
- Collection performance metrics
- Featured collection algorithm
- Assignment relevance scoring

### Database Tables

- `browse_lists` (already exists)
- `list_movies` (already exists)
- `browse_themes` (new - extracted themes)
- `theme_assignments` (new - movie→theme mappings)

### V2 Architecture

```
1. Extract themes from analyses (one-time)
2. Cluster movies by shared themes
3. Generate editorial titles (AI polish)
4. Insert collections into database
5. Build search API (collections + movies)
6. Track engagement and optimize
```

---

## 🗑️ DEPRECATED: Out of Scope

**Educational Series System**
- 40 series pages
- 240 episode pages
- `/recs` routing
- Episode content generation
- Theme pages
- Series configuration
- Episode-to-theme mapping

**Related Components:**
- Episode page templates
- Series navigation
- Educational content generation
- Film school modules
- Learning path systems

**Related Issues (Ignored):**
- #21 - Platforms modal skip button
- #24 - Episode hero banners
- #26 - Film noir theme styling
- #27 - Episode covers/images
- #28 - Episode movie links
- #29 - Episode branding
- #30 - Episode footers
- #31 - Episode "Explore Further"
- #33 - Theme box formatting

**Browse Collections (Current Implementation)**
- 3,500+ existing collections
- Old browse-collection-generator.js
- Genre-based generation
- Musical-specific data
- Static JSON build files

**Reason:** Fundamentally broken architecture, needs V2 rebuild

### Files to Archive

Move to `archive/deprecated/`:
```
pages/recs/
components/EducationalSeries/
components/EpisodePage/
components/ThemePage/
data/series-config.json
data/episodes/
scripts/generate-educational-series.js
browse-collection-generator.js
```

---

## 📊 Feature Matrix

| Feature | V1 | V2 | Deprecated |
|---------|----|----|------------|
| Movie detail pages | ✅ | - | - |
| AI analysis display | ✅ | - | - |
| "Reasons to Watch" | ✅ | - | - |
| "More Ideas" | ✅ | - | - |
| TMDB search | ✅ | - | - |
| Nuclear static system | ✅ | - | - |
| Browse collections | - | ✅ | ❌ (old impl) |
| Theme extraction | - | ✅ | - |
| Quality scoring | - | ✅ | - |
| Educational series | - | - | ❌ |
| Episode pages | - | - | ❌ |
| Theme pages | - | - | ❌ |
| `/recs` routes | - | - | ❌ |

---

## 🎯 Decision Framework

### Include in V1 if:
- ✅ Already working in production
- ✅ Core to movie discovery
- ✅ Just needs bug fixes/polish
- ✅ No new architecture required

### Defer to V2 if:
- 📌 Requires significant new development
- 📌 Needs user data to inform design
- 📌 Can wait until V1 is stable
- 📌 Serendipitous discovery (not core search)

### Mark Deprecated if:
- ❌ Educational content (out of scope)
- ❌ Broken architecture needing rebuild
- ❌ Low priority for launch
- ❌ Not core to movie discovery

---

## 🚢 Shipping Strategy

### V1 Launch (Now)
1. Fix critical bugs (#22, #25, #34)
2. Polish layout and UI
3. Deploy to production
4. Monitor and stabilize
5. **NO new features**

### V1 → V2 Transition (Week 1-2)
1. Collect V1 usage data
2. Analyze search patterns
3. Identify popular themes
4. Plan V2 architecture

### V2 Development (Week 3-8)
1. Run theme extraction ($20-30)
2. Build collection generation
3. Create browse UI
4. Test and iterate
5. Add quality scoring

---

## 📝 Summary

**V1 = Stabilize Core**
- Movie pages + search
- Fix critical bugs
- Polish UI
- Deploy and monitor

**V2 = Build Discovery**
- Theme-based collections
- 2,500-4,000 serendipitous lists
- Quality scoring
- Informed by V1 data

**Deprecated = Educational Content**
- Series/episodes system
- Theme pages
- Old browse implementation
- Out of scope permanently

---

**Next Action:** Fix SimpleSearch bug (#22) and deploy to production.
