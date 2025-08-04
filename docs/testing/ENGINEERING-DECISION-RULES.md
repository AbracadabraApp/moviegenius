# Engineering Decision Rules
*Quick reference for daily development decisions*

## 🚦 STOP RULES - Check Before Every Change

### Red Flags Checklist
Before making ANY technical change, ask:

- [ ] **Does this solve a problem users actually experience?**
- [ ] **Is the fix size proportionate to the problem size?**
- [ ] **Could ignoring this be a valid option?**
- [ ] **Am I being driven by "modernization" rather than user needs?**
- [ ] **Have I assessed what could break?**

### Automatic NO Situations
**Don't fix if:**
- ❌ Only affects build logs/warnings with no user impact
- ❌ Problem is "code isn't modern enough" 
- ❌ Solution requires touching 10+ files
- ❌ You're solving a problem that might not exist in 6 months
- ❌ The "problem" is just a linter/tool complaint

## 🎯 Decision Matrix

| User Impact | Fix Effort | Priority | Action |
|-------------|------------|----------|---------|
| **High**    | Low        | P0       | Do now |
| **High**    | High       | P1       | Plan carefully |
| **Medium**  | Low        | P2       | Do if time permits |
| **Low**     | Any        | P3       | **Skip entirely** |
| **None**    | Any        | P4       | **Definitely skip** |

## 📋 Implementation Checklist

### Phase 1: Before Coding
- [ ] **Can I solve this without touching code?**
- [ ] **What's the absolute minimum change needed?**
- [ ] **How will I know if this worked?**
- [ ] **What's my rollback plan if this breaks?**
- [ ] **Have I tested to actually understand the current behavior?**

### Phase 2: During Implementation
- [ ] **Am I making only the minimum necessary changes?**
- [ ] **Can I test this incrementally?**
- [ ] **Does each commit leave the system in a working state?**

### Phase 3: Before Declaring Success
- [ ] **Have I tested in production-like conditions?**
- [ ] **Have affected users confirmed this fixes their problem?**
- [ ] **Did I introduce any new issues?**
- [ ] **Would I be comfortable if someone else had to maintain this?**

## ⚠️ Warning Signs in Your Own Behavior

**Stop immediately if you catch yourself:**
- Using words like "modernize," "future-proof," "best practices"
- Feeling confident immediately after making code changes
- Focusing on technical architecture over user experience  
- Treating build warnings as urgent problems
- Planning to "refactor while we're at it"
- Saying "this is the right way to do it"

**These are signs of over-engineering bias**

## 🔄 When Things Go Wrong

**Recovery Process:**
1. **Acknowledge** - "I may have overcomplicated this"
2. **Revert** - Get back to last working state FIRST
3. **Reassess** - What was the actual user problem?
4. **Minimal fix** - Smallest change that solves it
5. **User validate** - Test with real people in production

**Never:** Keep patching forward when the original approach was wrong

## 🎮 Quick Decision Examples

**✅ Good Decisions:**
- User reports navigation broken → Fix navigation
- Build fails → Fix the build error
- API returns 500s → Fix the API
- Page loads slowly for users → Optimize performance

**❌ Bad Decisions:**  
- Build warning appears → Rewrite entire module system
- Code "isn't modern" → Convert everything to new patterns
- Linter complains → Refactor unrelated code
- Framework has new features → Upgrade everything

## 📞 Emergency Procedures

**If you broke something:**
```bash
# Immediate rollback
git revert HEAD --no-edit && git push

# Check rollback points
git log --oneline -5

# Test that rollback worked
npm run build && npm run dev
```

**Don't:** Try to "fix forward" when the original change was wrong

---

## 🎯 Success Metrics

**Old (Failed) Metrics:**
- ✅ Tests passing
- ✅ Code committed  
- ✅ Architecture improved
- ✅ No linter warnings

**New (User-Focused) Metrics:**
- ✅ User can complete their intended actions
- ✅ No new problems introduced
- ✅ System more reliable than before
- ✅ Maintenance burden decreased or same

---

*Reference: Based on documented patterns of over-engineering in ENGINEERING-CASE-STUDIES.md*

**Last Updated:** July 23, 2025  
**Review:** Before every significant technical decision