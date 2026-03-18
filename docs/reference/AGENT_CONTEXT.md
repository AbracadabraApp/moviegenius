# MovieGenius Agent Context & Onboarding

## Quick Project Brief
MovieGenius is a sophisticated movie education platform with:
- AI-powered movie analysis (Claude integration)
- Educational episode system ("Genius" series)
- TMDB integration for movie data
- React/Next.js frontend with Supabase database
- Currently **zero users** but needs to be **launch-ready**

## Critical Context for All Agents
- **Scale Reality**: Zero users, will never have many - avoid enterprise over-engineering
- **Stability Priority**: Robust, simple solutions over complex optimizations
- **Feature Complete**: All educational content and movie features must work
- **Current Status**: 75% launch-ready with critical blockers

## Current Architecture
- **Frontend**: Next.js 15, React 18, TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI**: Anthropic Claude for movie analysis
- **Data**: TMDB API for movie metadata
- **Deployment**: Railway platform
- **Caching**: Redis + multi-layer caching

## Critical Files to Understand
- `/pages/movie/[id].js` - Movie detail pages (HAS 404 BUG)
- `/components/` - React UI components (HAS JSX ERRORS)
- `/lib/` - Business logic and services
- `/MULTI_AGENT_PLAN.md` - Detailed architecture analysis
- `/YOU_PAGE_VISION.md` - Product vision for user features

## Known Issues (Launch Blockers)
1. **404 Bug**: Movie pages flash content then show 404 (router.replace issue)
2. **Build Failures**: 10 JSX files have orphaned closing tags `</>`
3. **Code Organization**: Root directory cluttered with 100+ loose files
4. **Over-Engineering**: Many enterprise patterns for zero-user app

## Development Commands
```bash
npm run dev          # Start development server
npm run pre-commit   # Run all quality checks
npm run build        # Production build
npm run test         # Run Jest tests
```

## Quality Gates
- All changes must pass `npm run pre-commit`
- Respect component locks in `LOCKED_COMPONENTS.md`
- Follow code standards in `CODE-STANDARDS.md`
- Update todo list as work progresses

## Agent Coordination
- **Master Agent (Agent 1)**: Managing launch coordination and todo list
- **Frontend Agent (Agent 3)**: URGENTLY NEEDED for 404 and JSX fixes
- **Content Agent (Agent 2)**: Needed for AI system optimization
- **DevOps Agent (Agent 4)**: Needed for cleanup and deployment

## Success Criteria
- Movie pages load without 404 errors
- All builds pass without JSX syntax errors
- Clean, organized codebase structure
- All educational and movie features functional
- Stable Railway deployment

## Getting Started as New Agent
1. Read `/AGENT_COORDINATION.md` for current status
2. Acknowledge your role with the specified entry command
3. Ask for current todo list status
4. Focus on assigned critical blockers first
5. Coordinate with Master Agent before major changes

---
**Remember**: This is a feature-rich, sophisticated platform that needs robust simplicity, not enterprise complexity.