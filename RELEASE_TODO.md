# MovieGenius Site Release Todo List

**Generated:** July 5, 2025  
**Status:** 14 Pending Production Issues  
**Progress:** 20/34 Complete (58.8%)

## 🚨 High Priority Issues (12 items)

These issues must be resolved before site launch:

### UI/UX Fixes

- **#21** - Remove skip button from platforms modal (2nd modal)
- **#26** - Fix film-noir theme page styling to match dark theme of other theme
  pages
- **#29** - Fix missing site branding/string at top of episode pages
- **#33** - Fix inconsistent formatting for theme boxes across pages

### Search & Navigation

- **#22** - Fix SimpleSearch functionality not working in production
- **#23** - Fix movie browse buttons not working on search results
- **#25** - Review and fix camelCase URLs in episode routing - may cause
  production issues

### Episode Page Issues

- **#24** - Fix missing hero banners on episode pages in production
- **#27** - Fix broken covers/images on episode pages
- **#28** - Fix missing movie links in episode content - static generation not
  working in production
- **#30** - Add missing footers with related series and themes navigation to
  episode pages
- **#31** - Fix missing 'Explore Further' section on episode pages

### Infrastructure

- **#34** - Create automated deployment monitoring system with Railway CLI to
  detect and fix deployment failures

## 🔶 Medium Priority Issues (2 items)

These can be addressed after high priority items:

- **#32** - Fix MediaCards showing smaller posters than intended
- **#33** - Fix inconsistent formatting for theme boxes across pages

## 🔽 Low Priority (1 item)

- **#13** - Convert all 65 episodes to static with processed links

## ✅ Completed Items (20 items)

### Core System

- #1 - Update homepage theme name from 'Cinema's Cultural Impact' to 'Hollywood
  Transformed'
- #2 - Create theme-to-episode mapping configuration
- #3 - Redesign all 10 theme pages to list episodes
- #4 - Create episode detail page routing and display
- #5 - Test complete navigation flow (home → theme → episode)

### Movie Link System

- #6 - Analyze movie links in episode content
- #7 - Fix movie link processing in episode pages
- #8 - Select test episodes with different movie mention patterns
- #9 - Review current episode display and layout
- #10 - Build test function for movie link processing
- #11 - Test TMDB lookup quality and accuracy
- #12 - Review link styling and layout integration

### Search System Overhaul

- #14 - Implement keyword-based search with popularity ranking using TMDB API
- #15 - Replace AskInputBar with SimpleSearch in all page files (13 files)
- #16 - Replace AskInputBar with SimpleSearch in component files (3 files)

### UI Cleanup

- #17 - Remove episode number displays (Episode 1-6) from all theme pages and
  components
- #18 - Remove back icon from film-noir page and site-wide
- #19 - Remove breadcrumb trails from all episode pages
- #20 - Remove gear/settings icon and skip button from themes page

## 📊 Summary

**Total Items:** 34  
**Completed:** 20 (58.8%)  
**High Priority Pending:** 12  
**Medium Priority Pending:** 2  
**Low Priority Pending:** 1

## 🎯 Next Steps

1. **Focus on High Priority issues first** - These are blocking site launch
2. **Test each fix in production** - Many issues are production-specific
3. **Systematic approach** - Complete todos in order of priority
4. **No new features** - Only fix existing functionality until list is complete

## 🔧 Critical Production Issues

The following issues are specifically breaking the live site:

- SimpleSearch not working (#22)
- Missing hero banners (#24)
- Broken episode content (#27, #28, #31)
- Inconsistent styling (#26, #33)

These must be addressed immediately to restore full site functionality.

---

**Note:** This list represents the current state of production issues identified
through systematic testing of the live MovieGenius site. No new development
should proceed until these foundational issues are resolved.
