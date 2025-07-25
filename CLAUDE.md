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
