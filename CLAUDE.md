# MovieGenius Project Instructions

**Last Updated:** 2025-03-22
**Version:** 3.0 (Aligned with Anthropic Claude Code Guidelines)

---

## Quick Reference

- **Master Architecture:** `/docs/MOVIEGENIUS_V3_ARCHITECTURE.md`
- **Production Status:** `/docs/strategies/RELEASE_TODO.md`
- **API Reference:** `/docs/API_REFERENCE.md`
- **Database:** Railway PostgreSQL (21,275 movie analyses)

---

## Plan Mode Default

**For tasks with 3+ steps, ALWAYS enter Plan Mode first.**

### When to Plan

✅ **Require planning:**
- Multi-file changes across components
- Database migrations or schema changes
- API redesigns or new endpoints
- Feature implementations (MVF, V3, Browse enhancements)
- Debugging multi-layered issues (build errors, deployment failures)

❌ **Skip planning for:**
- Single file edits
- Documentation updates
- Simple bug fixes (typos, imports)
- Reading/analyzing code

### Planning Template

```markdown
## Plan: [Task Name]

**Goal:** [What we're trying to achieve]

**Steps:**
1. [Research/Investigation step]
2. [Implementation step]
3. [Testing/Verification step]
4. [Deployment/Documentation step]

**Files to modify:**
- file1.js (why)
- file2.js (why)

**Risk assessment:**
- [Potential issues]
- [Rollback strategy]

**Success criteria:**
- [ ] Build passes
- [ ] Tests pass
- [ ] Verified in production
```

---

## Subagent Strategy

**Keep main context clean by offloading research to subagents.**

### When to Use Task Tool

✅ **Delegate to subagents:**
- Exploring codebase structure ("How does Browse system work?")
- Finding files/patterns ("Where are streaming APIs called?")
- Multi-file searches ("Find all uses of MediaCard component")
- Architectural analysis ("Analyze database migration strategy")

❌ **Handle directly:**
- Reading specific files you know exist
- Making edits to files already in context
- Answering from existing conversation context

### Example Usage

```javascript
// ❌ DON'T: Search directly, cluttering main context
grep -r "MovieAnalysis" src/

// ✅ DO: Delegate to Explore subagent
Task(
  subagent_type: "Explore",
  prompt: "Find all MovieAnalysis component usage patterns,
           focusing on props passed and data fetching strategy",
  description: "Analyze MovieAnalysis usage"
)
```

---

## Self-Improvement Loop

**Learn from mistakes. Update lessons after corrections.**

### Lessons File Pattern

When you make a mistake that gets corrected, create/update `/tasks/lessons.md`:

```markdown
## Lesson: [Date] - [What Went Wrong]

**Mistake:** [What I did wrong]
**Correction:** [What user/system corrected]
**Root Cause:** [Why it happened]
**Prevention:** [How to avoid next time]

---
```

### Example Lesson

```markdown
## Lesson: 2025-03-22 - Declared Fix Without Testing

**Mistake:** Committed with message "PRODUCTION FIX: Remove API calls causing 404s"
**Correction:** Build still failed, 404s persisted, had to revert
**Root Cause:** Assumed root cause without testing hypothesis
**Prevention:**
- Always run `npm run build` before claiming fix
- Test on staging before production deployment
- Use factual commit messages ("Remove X") not predictive ("Fix Y")
```

---

## Task Management Protocol

**Use TodoWrite for all multi-step tasks.**

### Requirements

- ✅ Create todo list for tasks with 3+ steps
- ✅ Mark exactly ONE task as `in_progress` at a time
- ✅ Complete tasks IMMEDIATELY after finishing (no batching)
- ✅ Use both forms:
  - `content`: "Run build" (imperative)
  - `activeForm`: "Running build" (present continuous)

### Example

```javascript
TodoWrite({
  todos: [
    { content: "Read MOVIEGENIUS_V3_ARCHITECTURE.md",
      activeForm: "Reading V3 architecture",
      status: "completed" },
    { content: "Generate WhyWatch for 35K movies",
      activeForm: "Generating WhyWatch data",
      status: "in_progress" },  // ← Only ONE in_progress
    { content: "Test movie page loading speed",
      activeForm: "Testing page performance",
      status: "pending" }
  ]
})
```

---

## Verification Before Done

**NEVER claim "fixed" without proof.**

### Debugging Protocol

1. **Reproduce the issue** - Confirm it exists
2. **Form hypothesis** - What might cause it
3. **Test hypothesis** - Verify with actual data
4. **Implement fix** - Make the change
5. **Verify fix** - Run build, check production
6. **Document** - Factual commit message

### Required Verification Steps

**Before marking any task complete:**

✅ **For code changes:**
- Run `npm run build` (must pass)
- Check for TypeScript errors
- Test locally if possible
- Review Railway logs if deployment-related

✅ **For documentation:**
- Verify no broken internal links
- Check markdown renders correctly
- Ensure references are accurate

✅ **For database changes:**
- Test migration on staging first
- Verify data integrity
- Document rollback procedure

### Commit Message Standards

❌ **NEVER use:**
- "FIX" / "FIXED" (until verified in production)
- "PRODUCTION FIX" (premature claim)
- "This should work" / "This will fix"
- Assumptions about causation

✅ **ALWAYS use:**
```
[type]: [factual description of change]

[Optional context about why]
[No predictions about outcomes]
```

**Examples:**
- ❌ "PRODUCTION FIX: Remove API calls causing 404s"
- ✅ "Remove automatic slug generation from movie creation"
- ❌ "Fix hydration issues - should resolve 404s"
- ✅ "Remove console.log statements from JSX components"

---

## Demand Elegance (Balanced)

**Simplest possible solution that works.**

### Core Principles

1. **Simplicity First**
   - Fewest lines of code
   - Minimal dependencies
   - Obvious logic flow

2. **No Laziness**
   - Never leave TODOs for users
   - Complete implementations
   - No placeholder comments

3. **Respect Existing Code**
   - Read before changing
   - Follow established patterns
   - Check LOCKED_COMPONENTS.md before modifying

### MovieGenius-Specific Guidelines

**Locked Components (Do NOT modify without explicit permission):**
- `MediaCard.js` - Standardized movie card display (125×188px posters)
- `PhoneFrame.js` - Mobile viewport container
- Database schema (movies, movie_analyses, enhanced_why_watch)

**See:** `/docs/architecture/LOCKED_COMPONENTS.md` for complete list

### Code Philosophy

> "Slow down and think about what you are doing - respect the code."

**Before any change:**
1. Read the existing implementation
2. Understand why it works that way
3. Check if locked/protected
4. Consider impact on other components
5. Test hypothesis before implementing

---

## Autonomous Bug Fixing

**Fix it without hand-holding.**

### When a Build Fails

1. **Read the error** - Exact line, file, message
2. **Check React Hook rules** - Common MovieGenius issue:
   ```javascript
   // ❌ BAD: Hook called after conditional return
   if (!data) return null;
   useEffect(() => { ... });

   // ✅ GOOD: Hooks before any returns
   useEffect(() => { ... });
   if (!data) return null;
   ```
3. **Verify dependencies** - Check package.json, node_modules
4. **Test fix locally** - Run `npm run build`
5. **Commit with factual message** - No "FIX" claims

### When Deployment Fails

1. **Check Railway logs** - `/docs/operations/DEPLOYMENT_COMPLETE_GUIDE.md`
2. **Compare environments** - Staging vs production
3. **Verify environment variables** - `/docs/guides/RAILWAY_ENV_CHECKLIST.md`
4. **Test on branch first** - Never deploy unverified fixes
5. **Document rollback** - Always have exit strategy

---

## MovieGenius-Specific Context

### Database Status

**Railway PostgreSQL (Production):**
- **Total Analyses:** 21,275 complete movie analyses
- **Connection:** Use `DATABASE_URL` from `.env.local` with `pg.Pool`
- **Access Command:**
  ```bash
  node --env-file=.env.local -e "const { Pool } = require('pg'); /* query */"
  ```

**Schema:**
- `movies` - TMDB metadata (35K+ movies)
- `movie_analyses` - Legacy analysis format
- `analysis_data_v3` - New MVF/V3 format (200-word concise)
- `enhanced_why_watch` - Binary YES/NO recommendations with 3 reasons
- `browse_lists` - Collection system
- `persons` - 39,606 cast/crew entries

**See:** `/docs/DATABASE_SCHEMA.md` (when created)

### Current Architecture Status

**Production (V2):**
- ✅ 21,275 movie analyses in database
- ✅ SimpleSearch with TMDB popularity ranking
- ✅ Browse system (827 lists, ~2,000 movies)
- ✅ WhyWatch system (YES/NO binary recommendations)
- ⚠️ Long 500-word analyses (being replaced)

**Planned (V3):**
- New 200-word concise analysis format
- WhyWatch-first page hierarchy
- Unified `/api/v1/*` endpoints (iOS-ready)
- Simplified components (1,900 → 400 lines)
- Client-side **Movie (Year)** linking (no post-processing)

**See:** `/docs/MOVIEGENIUS_V3_ARCHITECTURE.md` for complete details

### Key Design Decisions

1. **WhyWatch is the hero feature** - Binary YES/NO recommendation with 3 specific reasons
2. **Analysis is supporting context** - 200 words (not 500) with inline **Movie (Year)** links
3. **Mobile-first** - All designs use PhoneFrame, 390px width
4. **Locked MediaCard specs** - 125×188px posters (industry standard 2:3 ratio)
5. **No episodes** - Feature cancelled, docs archived

### Terminology Standards

**Correct terms:**
- "movie" (not "film" in code/UI)
- "collection" (not "list" - except browse_lists table)
- "analysis" (not "review" or "critique")
- "streaming" (not "platforms" or "services")

**See:** `/docs/TERMINOLOGY_STANDARD.md`

---

## Git Safety

**Professional branch workflow required.**

### Branch Strategy

- `main` - Production (protected)
- `feature/*` - New features
- `docs/*` - Documentation changes
- `fix/*` - Bug fixes

### Commit Requirements

1. **Feature branch** - Never commit directly to main
2. **Descriptive commits** - What changed (not why it "fixes" something)
3. **Test before commit** - Build must pass
4. **Push for review** - Create PR, don't merge directly

**See:** `/docs/GIT-SAFETY-GUIDE.md`

---

## Common Pitfalls

**Avoid these MovieGenius-specific errors:**

1. ❌ Calling React Hooks after conditional returns
2. ❌ Modifying locked components (MediaCard, PhoneFrame)
3. ❌ Using "film" instead of "movie" in UI
4. ❌ Deploying without testing build locally
5. ❌ Claiming "fixed" before verification
6. ❌ Changing database schema without migration plan

**See:** `/docs/PREVENTING_BUILD_ERRORS.md`

---

## Essential Documentation

**Read these before starting work:**

**Tier 1 (Critical):**
1. `/docs/MOVIEGENIUS_V3_ARCHITECTURE.md` - Master plan
2. `/docs/strategies/RELEASE_TODO.md` - Production status
3. `/docs/API_REFERENCE.md` - API documentation
4. This file (CLAUDE.md) - Project instructions

**Tier 2 (Important):**
5. `/docs/architecture/LOCKED_COMPONENTS.md` - What NOT to change
6. `/docs/CODE_LOCKING_STRATEGY.md` - Component protection
7. `/docs/testing/ENGINEERING-DECISION-RULES.md` - Decision framework
8. `/docs/TERMINOLOGY_STANDARD.md` - Naming conventions
9. `/docs/GIT-SAFETY-GUIDE.md` - Git workflow
10. `/docs/PREVENTING_BUILD_ERRORS.md` - Common issues

**Tier 3 (Reference):**
11. `/docs/features/YOU_PAGE_VISION.md` - Future UX enhancements
12. `/docs/V2_SEARCH_FEATURES.md` - Deferred features
13. `/docs/TROUBLESHOOTING.md` - Debug strategies
14. `/docs/guides/DEVELOPMENT_SETUP.md` - Environment setup

---

## Collaboration Rules (Non-Negotiable)

**Implement ONLY what was explicitly agreed. Nothing more.**

1. ❌ Do NOT add parameters, options, or logic not in the agreed plan
2. ❌ Do NOT expand lists (stopwords, configs, features) beyond what was specified
3. ❌ Do NOT "improve" things while implementing something else
4. ✅ If you see something worth changing, ASK first — don't just do it
5. ✅ Show the user output/results and WAIT for direction before next step
6. ✅ When unsure whether something was agreed, stop and ask

**Why this matters:** Unrequested changes cause false positives, rework, and eroded trust. The user's ideas are consistently better than unilateral additions. Slowing down to align is faster overall.

---

## Summary

**Core Workflow:**
1. ✅ Plan for 3+ step tasks
2. ✅ Delegate research to subagents
3. ✅ Update lessons.md when corrected
4. ✅ Use TodoWrite for progress tracking
5. ✅ Verify before claiming "done"
6. ✅ Simplest solution that works
7. ✅ Collaborate — don't run ahead

**MovieGenius-Specific:**
- Respect locked components
- Test build before commit
- Factual commit messages only
- WhyWatch-first architecture (V3)
- Mobile-first design (PhoneFrame)
- Use correct terminology

**When in doubt:**
- Read `/docs/MOVIEGENIUS_V3_ARCHITECTURE.md`
- Check `/docs/architecture/LOCKED_COMPONENTS.md`
- Follow Anthropic Claude Code Guidelines above
