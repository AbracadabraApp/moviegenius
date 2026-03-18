# Entity Linking Strategy: MovieGenius Current Implementation

**Version:** 2.0  
**Created:** August 19, 2025  
**Purpose:** Unified strategy for entity linking based on working test implementation

---

## 🎯 Current Linking Design (From Working Code)

### Implementation Source
The accurate linking design is implemented in:
- **Test Pages**: `pages/static-production-test/[id].js`
- **Test Data**: `public/data/test-movies/*.json`
- **Component**: `components/MovieAnalysisWithEntities.js`

### Proven Linking Patterns

#### **1. Person Links**
```html
<a href="/person/38730" class="person-name">Wim Wenders</a>
<a href="/person/32777" class="person-name">Ry Cooder</a>
<a href="/person/14864" class="person-name">Ibrahim Ferrer</a>
```

**Pattern**: `/person/{person_id}` with `class="person-name"`

#### **2. Movie Links** 
```html
<a href="/movie/655" class="movie-title" data-tmdb-id="655">Paris, Texas</a>
<a href="/movie/13963" class="movie-title" data-tmdb-id="13963">The Last Waltz</a>
<a href="/movie/24128" class="movie-title" data-tmdb-id="24128">Stop Making Sense</a>
```

**Pattern**: `/movie/{tmdb_id}` with `class="movie-title"` and `data-tmdb-id` attribute

---

## 📊 Data Structure (Working Format)

### Static JSON Structure
```json
{
  "sections": [
    {
      "type": "text",
      "content": "Analysis with <a href=\"/person/38730\" class=\"person-name\">Wim Wenders</a> and <a href=\"/movie/655\" class=\"movie-title\" data-tmdb-id=\"655\">Paris, Texas</a>"
    }
  ],
  "featuredMovies": [
    {
      "title": "The Last Waltz",
      "year": 1978,
      "description": "Another landmark music documentary"
    }
  ],
  "exploreTopics": [...],
  "moreIdeas": [...],
  "whyWatch": {...}
}
```

### Component Integration
```javascript
// From pages/static-production-test/[id].js
const jsonAnalysisData = {
  content: staticData.sections.map((section, index) => ({
    type: index === 0 ? 'text' : sectionTypes[Math.min(index, sectionTypes.length - 1)],
    text: section.content  // Contains HTML links
  })),
  featuredMovies: staticData.featuredMovies || [],
  exploreTopics: staticData.exploreTopics || [],
  moreIdeas: staticData.moreIdeas || [],
  whyWatch: staticData.whyWatch || null
};
```

---

## 🏗️ Architecture

### Link Generation Process
1. **Analysis Content**: Contains embedded HTML links in `sections[].content`
2. **Data Conversion**: Static JSON → Analysis format for `MovieAnalysisWithEntities`
3. **Component Rendering**: Component renders HTML links directly (no runtime processing)
4. **Link Navigation**: Standard Next.js routing handles `/movie/{id}` and `/person/{id}`

### Link Types and Classes

#### **Movie Links**
- **URL Pattern**: `/movie/{tmdb_id}`
- **CSS Class**: `class="movie-title"`
- **Data Attribute**: `data-tmdb-id="{tmdb_id}"`
- **Usage**: References to other movies in analysis text

#### **Person Links**  
- **URL Pattern**: `/person/{person_id}`
- **CSS Class**: `class="person-name"`
- **Usage**: Directors, actors, composers, etc. in analysis text

#### **Media Cards** (Featured/More Ideas)
- **Structure**: Separate from text links
- **Data**: `featuredMovies`, `moreIdeas` arrays
- **Rendering**: Component-specific cards with images and descriptions

---

## 🎨 Styling Integration

### CSS Classes
The working implementation uses these established classes:
- `.person-name` - Person link styling
- `.movie-title` - Movie link styling  

### Visual Design
Based on working test pages:
- Person links and movie links have consistent styling
- Links are embedded naturally in analysis text
- No runtime JavaScript needed for basic link functionality

---

## 🔄 Component Flow

### MovieAnalysisWithEntities Integration
```javascript
// Analysis format expected by component
const formattedAnalysis = {
  claude_response: {
    raw_content: JSON.stringify(jsonAnalysisData) // Contains HTML links
  },
  entityData: {
    featuredMovies: staticData.featuredMovies,
    exploreTopics: staticData.exploreTopics,
    moreIdeas: staticData.moreIdeas,
    whyWatch: staticData.whyWatch
  }
};
```

### Rendering Path
1. **Static JSON** → Contains pre-built HTML links
2. **Data Conversion** → Format for MovieAnalysisWithEntities 
3. **Component Rendering** → Direct HTML output
4. **User Interaction** → Standard Next.js navigation

---

## ✅ Proven Patterns (Do Not Change)

### Working Link Format
```html
<!-- Person Links -->
<a href="/person/38730" class="person-name">Wim Wenders</a>

<!-- Movie Links -->
<a href="/movie/655" class="movie-title" data-tmdb-id="655">Paris, Texas</a>
```

### Working Data Structure
```json
{
  "sections": [
    {
      "type": "text", 
      "content": "Text with embedded <a href=\"/movie/123\">links</a>"
    }
  ],
  "featuredMovies": [...],
  "moreIdeas": [...],
  "whyWatch": {...}
}
```

### Working Component Integration
- Use `MovieAnalysisWithEntities` component as-is
- Format data to match component expectations
- Component handles HTML link rendering automatically

---

## 🚫 Legacy Systems (Avoid)

### Deprecated Patterns
The following patterns are **legacy** and should not be used:
- Complex entity linker libraries
- Runtime link processing
- Multiple linking system variants
- Markdown-style link patterns
- Search-based movie references

### Files to Archive
All linking documentation files are **legacy** except this strategy:
- `MOVIE_ANALYSIS_LINKING_README.md` → Archive
- `EPISODE_LINKING_README.md` → Archive  
- `MOVIE_LINKING_SYSTEM_REFACTOR_PLAN.md` → Archive
- `LINKING_*.md` files → Archive

---

## 🎯 Implementation Guidelines

### For Static Generation
1. **Pre-build Links**: Generate HTML links at build time
2. **Use Proven Format**: Follow exact working test patterns
3. **No Runtime Processing**: Links should be ready in static data
4. **Component Compatibility**: Format data for MovieAnalysisWithEntities

### For 2-Tier Architecture
1. **Static Files**: Include pre-built HTML links in static JSON
2. **Dynamic Generation**: Generate links during API processing
3. **Consistent Format**: Same link patterns for both tiers
4. **No Link Processing**: Component renders HTML directly

### For New Features
1. **Follow Proven Patterns**: Use working test implementation as reference
2. **No New Linking Systems**: Extend existing approach only
3. **Test First**: Validate against working static-production-test pages
4. **Keep It Simple**: Direct HTML links, no complex processing

---

## 📋 Link Quality Standards

### Required Attributes
```html
<!-- Movie Links MUST have -->
<a href="/movie/{tmdb_id}" class="movie-title" data-tmdb-id="{tmdb_id}">Title</a>

<!-- Person Links MUST have -->
<a href="/person/{person_id}" class="person-name">Name</a>
```

### URL Patterns
- **Movies**: Always `/movie/{tmdb_id}` (not search URLs)
- **Persons**: Always `/person/{person_id}` (not search URLs)
- **Direct Navigation**: Links should navigate directly to target pages

### Data Integrity
- **Valid IDs**: All movie/person IDs must exist or be creatable
- **Clean HTML**: Well-formed HTML with proper attributes
- **Consistent Classes**: Use established CSS classes

---

## 🔍 Testing & Validation

### Test Against Working Implementation
```bash
# Test static-production-test pages
curl http://localhost:3001/static-production-test/test_000059fa

# Verify links work
curl -s http://localhost:3001/static-production-test/test_000059fa | grep -c 'href="/movie/'
curl -s http://localhost:3001/static-production-test/test_000059fa | grep -c 'href="/person/'
```

### Quality Checks
- [ ] All movie links follow `/movie/{tmdb_id}` pattern
- [ ] All person links follow `/person/{person_id}` pattern  
- [ ] Links have proper CSS classes
- [ ] HTML is well-formed and valid
- [ ] Links navigate correctly in browser

---

## 🎯 Success Metrics

### Implementation Success
- **Format Consistency**: All links follow proven working patterns
- **Component Compatibility**: Works with existing MovieAnalysisWithEntities
- **Navigation**: All links navigate correctly
- **Performance**: No runtime link processing needed

### User Experience Success  
- **Clickable Links**: Movie and person names are clickable
- **Correct Navigation**: Links go to the right movie/person pages
- **Fast Loading**: No link processing delays
- **Visual Consistency**: Links styled consistently across site

---

**Document Status**: Based on working test implementation  
**Reference Code**: `pages/static-production-test/[id].js` and test JSON files  
**Key Principle**: Follow proven working patterns, avoid legacy documentation