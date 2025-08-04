- series/episode list: Tracking and managing TV series and episode information

## You Page Creative Elements (Legacy/Archive)

### Cinematic Profile Analysis Types (keep these playful elements)

- 🔬 Scientific - Data-driven analysis of viewing patterns
- 🧠 Psychological - Deep dive into user motivations
- 🌟 Mystical - Ethereal, cosmic approach to taste
- 🥠 Fortune - Fortune cookie style insights
- 🧬 Cinematic DNA - Genetic metaphor for film taste
- 🎭 Personality - Character-based analysis
- 📝 Report Card - Academic scoring approach
- 💭 Philosophical - Existential film perspective

### Learning Progress Language Options

- "Deep dive complete" / "Getting into it" / "Just getting started"
- "Mastered" / "Learning" / "Exploring"
- Collection progress tracking with Essential Films
- Episode discovery suggestions

### Creative Haiku/Fortune Elements (preserve these)

- Fortune cookie style taste analysis
- Haiku-like short film insights
- Personality-based film recommendations
- Mystical/cosmic film connection language

### Design Philosophy

- Keep playful analysis elements (DNA, fortune, mystical)
- Make container/layout sophisticated and adult
- Use Lucide icons over emojis where possible
- Maintain educational value through natural discovery language

## Principal Engineer Guidelines

### Critical Debugging Protocol
- **NEVER declare "root cause found" without verification**
- **NEVER claim "this should fix it" before testing**
- Principal Engineer mistake pattern: Premature root cause declarations followed by failed deployments
- Date: 2025-07-25 - Environment variable "fix" deployed to production, didn't resolve 404s
- Lesson: Evidence-based diagnosis required before any "fix" claims

### Debugging Requirements
1. Test hypothesis with actual data before declaring solutions
2. Compare working vs broken environments systematically
3. Verify fixes on staging before production deployment
4. Document failed hypotheses to avoid repetition

### Professional Commit Message Standards

**NEVER use these words/phrases in commit messages:**
- "FIX" / "FIXED" (until verified)
- "PRODUCTION FIX" (claim before testing)
- "This should work" / "This will fix"
- "Now working" / "Now fast"
- Assumptions about causation without evidence

**Required format for reverts:**
```
Revert "original commit title"

This reverts commit [hash].

[Factual reason for revert - no assumptions about what it will accomplish]
```

**Required format for changes:**
```
[type]: [factual description of change]

[Optional: Context about why change was made]
[No predictions about outcomes]
```

**Examples:**
- ❌ "PRODUCTION FIX: Remove API calls causing 404s"
- ✅ "Revert automatic slug generation from movie creation"
- ❌ "Fix hydration issues - should resolve 404s"  
- ✅ "Remove console.log statements from JSX components"

### Coding Philosophy
- slow down and think about what you are doing - respect the code.

### MovieAnalysisWithEntities Component Structure

- Comprehensive component layout for movie analysis page
- Key sections include:
  1. Simple Search Bar at the top
  2. MovieHeaderLarge component with:
    - Movie title
    - Year
    - Movie overview (as initialSlug)
    - Poster image
    - Streaming data
    - TMDB ID
  3. MovieAnalysisWithEntities main content structure:
    - Alternating pattern of content:
      * Text paragraphs
      * FEATURED FILMS + MediaCards
      * EXPLORE FURTHER + single card
      * Repeating pattern
      * Final EXPLORE FURTHER + remaining cards
      * MORE IDEAS + related films
  4. DiscoveryFooter at the bottom

## Production Optimization Roadmap

### V1: Immediate Production Optimizations (Launch Ready)

Critical optimizations for the nuclear static system:
1. Unified Entity Format - Standardize movie references across both prompts for consistent database linking
2. Cost Optimization - Remove the planning phase wrapper from Prompt 2 to reduce token usage by ~20-30%
3. Streaming Data Fallbacks - Add handling for missing streaming info to prevent JSON parsing errors
4. JSON Structure Cleanup - Simplify the output format to match existing processing pipeline
5. Error Handling - Add fallback behaviors for edge cases in batch processing

Goal: Optimize existing prompts for reliability and cost efficiency

### V2: User Experience & Educational Enhancement (Future Growth)

Aligned with You Page Vision:
1. Progressive Analysis Depth - Create analysis variants based on user engagement levels (5 films vs 20+ films)
2. Cinematic Profile Integration - Add analysis style variants (Scientific, Mystical, DNA, Fortune Cookie)
3. Educational Progression - Align exploreTopics with progressive revelation system
4. User Demographics Targeting - Tailor contemporary relevance for 25-45 curious explorer audience
5. Smart Recommendations - Enhance movie suggestion system to feed "Films You Love/Watch" lists

Goal: Transform from generic analysis to personalized cinematic education

### Sunset Boulevard Educational Analysis Notes

- Comprehensive educational breakdown for Billy Wilder's 1950 masterpiece
- Key educational approach highlighting:
  * Unique narrative device (dead narrator)
  * Hollywood self-critique
  * Technical cinematography analysis
  * Cultural and historical context
  * Themes of celebrity, delusion, and media manipulation

#### Key Learning Objectives
- Understand meta-cinema techniques
- Explore Hollywood's transition from silent to sound era
- Analyze expressionist cinematography
- Examine power dynamics in entertainment industry
- Connect historical film to contemporary media culture

#### Technical Elements to Study
- John Seitz's expressionist lighting techniques
- Franz Waxman's psychological score integration
- Production design as narrative storytelling
- Narrative structure with retrospective voiceover
- Visual metaphors and symbolic staging

#### Recommended Companion Films
- Mulholland Drive (2001)
- All About Eve (1950)
- Birdman (2014)
- La La Land (2016)

#### Contemporary Relevance Connections
- Social media celebrity culture
- Manufactured fame
- Industry treatment of aging performers
- Parasitic media relationships

#### Thematic Deep Dive
- Delusion vs. reality
- Cost of fame
- Identity and performance
- Hollywood's self-examination

### Sunset Boulevard Critical Analysis Memory

#### Movie Analysis Overview
- Critical film noir exploring Hollywood's dark underbelly
- Directed by Billy Wilder, released in 1950
- Starring Gloria Swanson and William Holden
- Groundbreaking meta-commentary on film industry
- AFI-ranked masterpiece of American cinema

#### Key Analytical Components
- Unique narrative technique with dead narrator
- Exploration of Hollywood's transition from silent to sound era
- Psychological depth of characters trapped in media mythology
- Cinematographic brilliance by John F. Seitz
- Haunting score by Franz Waxman

#### Comparative Context
- Companion piece to "All About Eve" (1950)
- Predecessor to films like "Mulholland Drive" (2001)
- Influential in Hollywood self-critique genre

#### Contemporary Relevance
- Prescient analysis of celebrity culture
- Examination of power dynamics in entertainment
- Critique of media's treatment of aging performers
- Parallels with modern social media fame dynamics

#### Technical Innovation
- Expressionist cinematography
- Non-traditional narrative structure
- Use of real silent film actors in meta-commentary
- Psychological depth through visual metaphors

#### Thematic Exploration
- Delusion versus reality
- Parasitic nature of fame
- Identity as performance
- Technological disruption in creative industries