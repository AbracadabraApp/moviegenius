# iOS Testing Documentation

**Purpose:** All testing strategies, checklists, and procedures for MovieGenius iOS app
**Status:** ✅ CURRENT

---

## Quick Navigation

| Document | Purpose | Time | When to Use |
|----------|---------|------|-------------|
| **[TESTING_STRATEGY.md](TESTING_STRATEGY.md)** | Master testing roadmap | 3 hours | Before first TestFlight upload |
| **[MANUAL_CHECKLIST.md](MANUAL_CHECKLIST.md)** | Comprehensive test plan | 90 min | Before every beta release |
| **[SMOKE_TESTS.md](SMOKE_TESTS.md)** | Automated critical flow test | 30 min | Setup once, run before every upload |

---

## 3-Hour Path to TestFlight

### Hour 1: Manual Testing (90 minutes)
📄 **[MANUAL_CHECKLIST.md](MANUAL_CHECKLIST.md)**

Complete all 18 sections on physical device:
- Critical Flow Test (must pass)
- State Restoration Test (must pass)
- Cache Test (must pass)
- Memory & Performance Test
- Error Handling Test
- UI/Layout Test
- Edge Cases

**Pass criteria:** Sections 1-7 must all pass

---

### Hour 2: Firebase Setup (30 minutes)
📄 **[FIREBASE_SETUP_GUIDE.md](../FIREBASE_SETUP_GUIDE.md)** (in parent directory)

- Create Firebase project
- Install Firebase SDK via SPM
- Add dSYM upload script
- Test crash reporting

**Pass criteria:** Test crash appears in Firebase Console within 5 minutes

---

### Hour 2.5: Smoke Test (30 minutes)
📄 **[SMOKE_TESTS.md](SMOKE_TESTS.md)**

- Create UI test target
- Add accessibility identifiers
- Run automated test 3 times

**Pass criteria:** Test passes 3 times in a row

---

### Hour 3: TestFlight Upload (60 minutes)
📄 **[TESTFLIGHT_LAUNCH_CHECKLIST.md](TESTFLIGHT_LAUNCH_CHECKLIST.md)** (when created)

- Archive in Xcode
- Upload to App Store Connect
- Test on device via TestFlight
- Monitor Crashlytics

**Pass criteria:** Zero crashes in 30-minute test session

---

## Decision Tree

```
START: Manual test checklist
   ↓
   Pass? → YES → Setup Firebase
           NO → Fix bugs, retry manual test
   ↓
   Firebase working? → YES → Create smoke test
                       NO → Troubleshoot (see guide)
   ↓
   Smoke test passes? → YES → Upload to TestFlight
                        NO → Fix failing assertion, retry
   ↓
   Crash-free on your device? → YES → Invite 3-5 beta testers
                                 NO → Fix crashes, upload build 2
```

---

## Testing Philosophy

**Pragmatic Option A:**
- ✅ One smoke test > zero tests
- ✅ Manual testing catches real bugs
- ✅ Firebase shows what actually breaks
- ✅ Beta testers find edge cases
- ❌ Don't delay shipping for 100% coverage

> **"Test what breaks. Ship what works. Iterate based on reality."**

---

## What We're Testing

### ✅ Testing Now (Beta 1)
- App launch and initial load
- Browse → Collection → Movie navigation
- Search functionality
- Tab switching
- State restoration (tab persistence)
- Offline cache handling
- Error messages (user-friendly)
- Memory performance (heavy usage)

### ❌ NOT Testing Yet (Add if breaks in production)
- Unit tests for ViewModels (low ROI for UI-heavy app)
- Integration tests for APIClient (Firebase catches this)
- Comprehensive UI test suite (one smoke test is enough)
- Accessibility tests (manual VoiceOver before App Store)
- Performance tests (Instruments is better)

---

## Metrics to Track

### Week 1 (Beta 1 - Just You)
- [ ] Crash-free sessions: 100%
- [ ] Manual test checklist: All items pass
- [ ] App usage: 30+ minutes daily

### Week 2 (Beta 2 - 3-5 Friends)
- [ ] Crash-free users: 99%+
- [ ] TestFlight sessions: 50+ total
- [ ] Feedback emails: 0-2 critical bugs

### Week 3+ (Expanding Beta)
- [ ] Crash-free rate: 99.5%+
- [ ] Device diversity: 5+ iPhone models
- [ ] Retention: 30%+ return after 3 days

---

## Emergency Procedures

### If App Crashes on Launch
1. Check Crashlytics stack trace
2. Fix the crash
3. Increment build number
4. Re-upload to TestFlight
5. Test on your device before inviting testers

### If Manual Test Finds Critical Bug
1. Note bug in "Issues Found" section
2. Determine: critical (blocks beta) or minor (fix later)?
3. If critical: Fix, then restart manual test from Section 1
4. If minor: Note in TestFlight "Known Issues"

### If Smoke Test Fails
1. Read assertion message carefully
2. Run app manually to reproduce issue
3. Fix bug
4. Re-run smoke test
5. Only ship if test passes 3 times

**See:** [TESTING_STRATEGY.md](TESTING_STRATEGY.md) for complete emergency procedures

---

## Success Milestones

### ✅ Milestone 1: Beta 1 Shipped
- Manual test checklist passes
- Firebase Crashlytics configured
- Smoke test passes 3 times
- Uploaded to TestFlight
- Zero crashes in your 30-minute test

**Celebrate:** You shipped! 🎉

### ✅ Milestone 2: External Beta Live
- 3-5 testers invited
- Apple approved external testing
- Feedback received

**Celebrate:** Real users are using your app! 🚀

### ✅ Milestone 3: Stable Beta
- 99%+ crash-free rate
- 10+ active testers
- No critical bugs reported in 1 week

**Celebrate:** App is production-quality! 🏆

---

## Related Documentation

- **Firebase Setup:** [../FIREBASE_SETUP_GUIDE.md](../FIREBASE_SETUP_GUIDE.md)
- **Navigation Patterns:** [../IOS_NAVIGATION_GUIDE.md](../IOS_NAVIGATION_GUIDE.md)
- **TestFlight Process:** [TESTFLIGHT_LAUNCH_CHECKLIST.md](TESTFLIGHT_LAUNCH_CHECKLIST.md) (when created)

---

## Questions?

- **"Is this enough for production?"** → Yes, for Beta 1. Add more tests later if needed.
- **"Should I add more tests?"** → Only after real bugs appear in production.
- **"How long should beta last?"** → Minimum 1 week, expand until 99%+ crash-free.
- **"What if testers find bugs?"** → Fix them and upload new build. That's what beta is for!

---

**Ready to start testing?** Begin with [MANUAL_CHECKLIST.md](MANUAL_CHECKLIST.md) now. 🚀
