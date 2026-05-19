# MovieGenius iOS Testing Strategy

**Philosophy:** Ship fast, iterate on real feedback
**Approach:** Pragmatic Option A

---

## Your 3-Hour Path to TestFlight

### Hour 1: Manual Testing (90 minutes)
📄 **Follow:** `MANUAL_TESTING_CHECKLIST.md`

- [ ] Print or view on second screen
- [ ] Test on 2 devices (physical + simulator)
- [ ] Complete all 18 sections
- [ ] Note any failures

**Pass criteria:** Sections 1-7 must all pass

---

### Hour 2: Firebase Setup (30 minutes)
📄 **Follow:** `FIREBASE_SETUP_GUIDE.md`

- [ ] Create Firebase project
- [ ] Add iOS app to Firebase
- [ ] Install Firebase SDK via SPM
- [ ] Initialize in moviegeniusApp.swift
- [ ] Add dSYM upload script
- [ ] Test crash (then remove test code)

**Pass criteria:** Test crash appears in Firebase Console within 5 minutes

---

### Hour 2.5: Smoke Test (30 minutes)
📄 **Follow:** `SMOKE_TEST_SETUP.md`

- [ ] Create UI test target
- [ ] Add SmokeTests.swift file
- [ ] Add accessibility identifiers to key views
- [ ] Run test 3 times
- [ ] All 3 runs pass

**Pass criteria:** Test passes 3 times in a row

---

### Hour 3: TestFlight Upload (60 minutes)
📄 **Follow:** `TESTFLIGHT_LAUNCH_CHECKLIST.md`

- [ ] Complete pre-flight checklist
- [ ] Archive in Xcode
- [ ] Upload to App Store Connect
- [ ] Wait for processing (10-30 min)
- [ ] Install via TestFlight on your device
- [ ] Test for 30 minutes
- [ ] Check Crashlytics (should be zero crashes)

**Pass criteria:** Zero crashes in your 30-minute test session

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
   ↓
   Beta testers report issues? → YES → Fix, upload build 3
                                  NO → Expand to 20+ testers
   ↓
   99%+ crash-free rate? → YES → Prepare for App Store
                           NO → Keep iterating
```

---

## File Guide

| File | Purpose | Time | When to Use |
|------|---------|------|-------------|
| **MANUAL_TESTING_CHECKLIST.md** | Comprehensive test plan | 90 min | Before every TestFlight upload |
| **FIREBASE_SETUP_GUIDE.md** | Crash reporting setup | 30 min | Once (before Beta 1) |
| **SMOKE_TEST_SETUP.md** | Automated critical flow test | 30 min | Once (before Beta 1), run before every upload |
| **TESTFLIGHT_LAUNCH_CHECKLIST.md** | Upload & distribution guide | 60 min | Every beta release |

---

## What We're NOT Doing (And Why)

❌ **Unit tests for ViewModels**
- **Why:** 6+ hours to set up, low ROI for UI-heavy app
- **When to add:** After first production crash that would have been caught

❌ **Integration tests for APIClient**
- **Why:** Requires internet, slow, Firebase catches API issues anyway
- **When to add:** If API breaks frequently in production

❌ **Comprehensive UI test suite**
- **Why:** One smoke test covers 80% of value
- **When to add:** After specific flows break repeatedly in beta

❌ **Accessibility tests**
- **Why:** Manual VoiceOver testing is faster for now
- **When to add:** Before App Store submission (Priority 2)

❌ **Performance tests**
- **Why:** App is fast enough, Instruments is better for profiling
- **When to add:** If beta testers report lag

---

## Metrics to Track

### Week 1 (Beta 1 - Just You)
- [ ] Crash-free sessions: 100%
- [ ] App usage: 30+ minutes daily
- [ ] Manual test checklist: All items pass

### Week 2 (Beta 2 - 3-5 Friends)
- [ ] Crash-free users: 99%+
- [ ] Feedback emails: 0-2 critical bugs
- [ ] TestFlight sessions: 50+ total

### Week 3 (Beta 3 - 10-20 Testers)
- [ ] Crash-free rate: 99%+
- [ ] Top crash (if any): < 5% of users affected
- [ ] Device diversity: 5+ different iPhone models

### Week 4+ (Beta 4 - 50-100 Testers)
- [ ] Crash-free rate: 99.5%+
- [ ] Retention: 30%+ return after 3 days
- [ ] Feedback: "Ready for App Store"

---

## Emergency Procedures

### If App Crashes on Launch
1. Check Crashlytics stack trace
2. Fix the crash
3. Increment build number
4. Re-upload to TestFlight
5. Test on your device before inviting testers

### If Firebase Not Working
1. Verify GoogleService-Info.plist is in project
2. Check FirebaseApp.configure() is called first in app init
3. Verify Run Script added to Build Phases
4. Try test crash again (should appear within 5 min)

### If Smoke Test Fails
1. Read assertion message carefully
2. Run app manually to reproduce issue
3. Fix bug
4. Re-run smoke test
5. Only ship if test passes 3 times

### If Manual Test Finds Critical Bug
1. Note bug in "Issues Found" section
2. Determine: critical (blocks beta) or minor (fix later)?
3. If critical: Fix, then restart manual test from Section 1
4. If minor: Note in TestFlight "Known Issues"

### If Beta Testers Report Crash You Can't Reproduce
1. Check Crashlytics for stack trace
2. Check device details (iPhone model, iOS version)
3. Try to reproduce on same device type
4. If still can't reproduce, ask tester for steps
5. Use Crashlytics breadcrumbs to see what they did before crash

---

## Success Milestones

### ✅ Milestone 1: Beta 1 Shipped
- Manual test checklist passes
- Firebase Crashlytics configured
- Smoke test passes
- Uploaded to TestFlight
- Installed on your device
- Zero crashes in your 30-minute test

**Celebrate:** You shipped! 🎉

### ✅ Milestone 2: External Beta Live
- 3-5 testers invited
- Apple approved external testing
- Testers installed and used app
- Feedback received

**Celebrate:** Real users are using your app! 🚀

### ✅ Milestone 3: Stable Beta
- 99%+ crash-free rate
- 10+ active testers
- No critical bugs reported in 1 week

**Celebrate:** App is production-quality! 🏆

### ✅ Milestone 4: App Store Ready
- 50+ testers, 99.5%+ crash-free rate
- App Store screenshots prepared
- App description written
- Privacy policy published

**Celebrate:** You're launching! 🌟

---

## Quick Start (TL;DR)

**Today (3 hours):**
1. Complete `MANUAL_TESTING_CHECKLIST.md`
2. Set up Firebase using `FIREBASE_SETUP_GUIDE.md`
3. Create smoke test using `SMOKE_TEST_SETUP.md`
4. Upload to TestFlight using `TESTFLIGHT_LAUNCH_CHECKLIST.md`

**This Week:**
- Use app daily, check Crashlytics
- Fix any crashes
- Upload build 2 if needed

**Next Week:**
- Invite 3-5 friends to beta
- Monitor feedback
- Fix reported bugs

**Week 3:**
- Expand to 20+ testers
- Aim for 99%+ crash-free rate
- Plan App Store launch

---

## Philosophy Reminder

> "Perfect is the enemy of shipped."

- ✅ One smoke test is better than zero tests
- ✅ Manual testing catches real bugs
- ✅ Firebase tells you what actually breaks
- ✅ Beta testers find edge cases you never imagined
- ❌ Don't spend 10 hours testing code that works
- ❌ Don't delay shipping for 100% test coverage
- ❌ Don't build what you don't need yet

**Test what breaks. Ship what works. Iterate based on reality.**

---

## Questions?

- **"Should I add more tests?"** → Only after real bugs appear
- **"Is this enough for production?"** → Yes, for Beta 1. Add more later if needed.
- **"What if testers find bugs?"** → Fix them and upload new build. That's what beta is for!
- **"How long should beta last?"** → Minimum 1 week, expand until 99%+ crash-free

---

**Ready?** Start with `MANUAL_TESTING_CHECKLIST.md` now. 🚀
